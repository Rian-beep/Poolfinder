import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

interface PostcardParams {
  propertyId: string
  address: string
  town: string
  postcode: string
  poolBuildCost: number
  homeValueLift: number
  propertyValue: number
  satelliteImageUrl: string
  renderedImageUrl: string
  copy: string
}

async function fetchImageBytes(urlOrPath: string): Promise<Uint8Array | null> {
  try {
    // Local file path (e.g. /renders/render-xxx.png)
    if (urlOrPath.startsWith('/')) {
      const absPath = path.join(process.cwd(), 'public', urlOrPath)
      if (fs.existsSync(absPath)) {
        return new Uint8Array(fs.readFileSync(absPath))
      }
      return null
    }
    const res = await fetch(urlOrPath, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function embedImage(pdfDoc: PDFDocument, bytes: Uint8Array) {
  try { return await pdfDoc.embedPng(bytes) } catch { /* not a PNG */ }
  try { return await pdfDoc.embedJpg(bytes) } catch { /* not a JPG */ }
  return null
}

function drawImagePlaceholder(
  page: ReturnType<PDFDocument['addPage']>,
  x: number, y: number, w: number, h: number,
  label: string,
  regularFont: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.06, 0.06, 0.06) })
  page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.12, 0.12, 0.12), borderWidth: 0.5, color: rgb(0, 0, 0), opacity: 0 })
  page.drawText(label, { x: x + w / 2 - 20, y: y + h / 2, size: 7, font: regularFont, color: rgb(0.22, 0.22, 0.22) })
}

export async function generatePostcardPdf(params: PostcardParams): Promise<string> {
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '')

  const { propertyId, poolBuildCost, homeValueLift, propertyValue } = params
  const address  = clean(params.address)
  const town     = clean(params.town)
  const postcode = clean(params.postcode)
  const copy     = clean(params.copy)

  // 6x9 inches at 72 DPI = 432x648 points
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([432, 648])
  const { width, height } = page.getSize()

  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // ── Background ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.04, 0.04, 0.04) })

  // ── Top accent bar ────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: rgb(0.23, 0.51, 0.96) })

  // ── Header ────────────────────────────────────────────────────────────────
  page.drawText('POOLFINDER.UK', {
    x: 24, y: height - 34, size: 13, font: boldFont, color: rgb(0.23, 0.51, 0.96),
  })
  page.drawText('AI POOL VISUALISATION REPORT', {
    x: 24, y: height - 47, size: 6.5, font: boldFont, color: rgb(0.30, 0.32, 0.38),
  })

  // ── Address ───────────────────────────────────────────────────────────────
  page.drawText(address, {
    x: 24, y: height - 64, size: 11, font: boldFont, color: rgb(1, 1, 1),
  })
  page.drawText(`${town}  ${postcode}`, {
    x: 24, y: height - 78, size: 8.5, font: regularFont, color: rgb(0.42, 0.45, 0.50),
  })

  // ── Divider ───────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: 24, y: height - 90 },
    end:   { x: width - 24, y: height - 90 },
    thickness: 0.5, color: rgb(0.12, 0.12, 0.12),
  })

  // ── Copy text ─────────────────────────────────────────────────────────────
  const maxLineWidth = width - 48
  const words = copy.split(' ')
  let line = ''
  let yPos = height - 106
  for (const word of words) {
    if (!word) continue
    const test = line ? `${line} ${word}` : word
    if (regularFont.widthOfTextAtSize(test, 9) > maxLineWidth && line) {
      page.drawText(line, { x: 24, y: yPos, size: 9, font: regularFont, color: rgb(0.78, 0.78, 0.78) })
      yPos -= 13
      line = word
      if (yPos < height - 160) break // cap at 4 lines to preserve image space
    } else {
      line = test
    }
  }
  if (line && yPos >= height - 160) {
    page.drawText(line, { x: 24, y: yPos, size: 9, font: regularFont, color: rgb(0.78, 0.78, 0.78) })
    yPos -= 13
  }

  // ── Before / After images ─────────────────────────────────────────────────
  const imgSectionTop = yPos - 14
  const imgW   = (width - 56) / 2   // ~188pt each, 8pt gap
  const imgH   = 148
  const imgGap = 8
  const imgLeftX  = 24
  const imgRightX = 24 + imgW + imgGap
  const imgY      = imgSectionTop - imgH  // bottom of images (pdf coords = from bottom)

  // Column labels
  page.drawText('BEFORE', {
    x: imgLeftX + 6, y: imgSectionTop - 2, size: 7, font: boldFont, color: rgb(0.38, 0.40, 0.45),
  })
  page.drawText('AFTER + POOL', {
    x: imgRightX + 6, y: imgSectionTop - 2, size: 7, font: boldFont, color: rgb(0.23, 0.51, 0.96),
  })

  // Fetch both images in parallel
  const [satBytes, renderBytes] = await Promise.all([
    fetchImageBytes(params.satelliteImageUrl),
    fetchImageBytes(params.renderedImageUrl),
  ])

  // LEFT — satellite (before)
  if (satBytes) {
    const satImg = await embedImage(pdfDoc, satBytes)
    if (satImg) {
      page.drawImage(satImg, { x: imgLeftX, y: imgY, width: imgW, height: imgH })
    } else {
      drawImagePlaceholder(page, imgLeftX, imgY, imgW, imgH, 'SATELLITE VIEW', regularFont)
    }
  } else {
    drawImagePlaceholder(page, imgLeftX, imgY, imgW, imgH, 'SATELLITE VIEW', regularFont)
  }
  // Border
  page.drawRectangle({
    x: imgLeftX, y: imgY, width: imgW, height: imgH,
    borderColor: rgb(0.15, 0.15, 0.15), borderWidth: 0.5,
    color: rgb(0, 0, 0), opacity: 0,
  })

  // RIGHT — AI render (after)
  if (renderBytes) {
    const renderImg = await embedImage(pdfDoc, renderBytes)
    if (renderImg) {
      page.drawImage(renderImg, { x: imgRightX, y: imgY, width: imgW, height: imgH })
      // "AI RENDERED" badge bottom-right
      page.drawRectangle({
        x: imgRightX + imgW - 72, y: imgY + 2, width: 70, height: 13,
        color: rgb(0.55, 0.36, 0.98),
      })
      page.drawText('AI RENDERED', {
        x: imgRightX + imgW - 68, y: imgY + 5, size: 6, font: boldFont, color: rgb(1, 1, 1),
      })
    } else {
      drawImagePlaceholder(page, imgRightX, imgY, imgW, imgH, 'POOL RENDER', regularFont)
    }
  } else {
    drawImagePlaceholder(page, imgRightX, imgY, imgW, imgH, 'POOL RENDER', regularFont)
  }
  // Border
  page.drawRectangle({
    x: imgRightX, y: imgY, width: imgW, height: imgH,
    borderColor: rgb(0.23, 0.51, 0.96), borderWidth: 0.8,
    color: rgb(0, 0, 0), opacity: 0,
  })

  // ── Economics panel ───────────────────────────────────────────────────────
  const panelTop = imgY - 14
  const panelH   = 72
  const panelY   = panelTop - panelH
  page.drawRectangle({ x: 24, y: panelY, width: width - 48, height: panelH, color: rgb(0.07, 0.07, 0.07) })
  page.drawRectangle({
    x: 24, y: panelY, width: width - 48, height: panelH,
    borderColor: rgb(0.12, 0.12, 0.12), borderWidth: 0.5,
    color: rgb(0, 0, 0), opacity: 0,
  })

  const fmt = (n: number) => `GBP ${n.toLocaleString()}`
  const metrics = [
    { label: 'PROPERTY VALUE', value: fmt(propertyValue),          color: rgb(1, 1, 1) },
    { label: 'POOL BUILD COST', value: fmt(poolBuildCost),         color: rgb(1, 1, 1) },
    { label: 'VALUE LIFT',      value: `+${fmt(homeValueLift)}`,   color: rgb(0.06, 0.72, 0.51) },
  ]
  const colW = (width - 48) / 3
  metrics.forEach((m, i) => {
    const x = 24 + i * colW + 10
    page.drawText(m.label, { x, y: panelY + panelH - 18, size: 5.5, font: boldFont, color: rgb(0.38, 0.40, 0.45) })
    page.drawText(m.value, { x, y: panelY + panelH - 36, size: 9,   font: boldFont, color: m.color })
    if (i < 2) {
      page.drawLine({
        start: { x: 24 + (i + 1) * colW, y: panelY + panelH - 8 },
        end:   { x: 24 + (i + 1) * colW, y: panelY + 8 },
        thickness: 0.5, color: rgb(0.14, 0.14, 0.14),
      })
    }
  })

  // ── QR code ───────────────────────────────────────────────────────────────
  const micrositeUrl = `https://${town.toLowerCase().replace(/\s/g, '-')}-${postcode.toLowerCase().replace(/\s/g, '')}.poolfinder.uk`
  const qrDataUrl    = await QRCode.toDataURL(micrositeUrl, {
    width: 80, margin: 1, color: { dark: '#FFFFFF', light: '#0A0A0A' },
  })
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
  const qrImage  = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'))
  const qrSize   = 64
  const qrX      = width - 24 - qrSize
  const qrY      = 20

  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })
  page.drawText('SCAN TO VIEW', {
    x: qrX + 4, y: qrY + qrSize + 6, size: 5.5, font: boldFont, color: rgb(0.32, 0.34, 0.38),
  })
  page.drawText('YOUR MICROSITE', {
    x: qrX + 2, y: qrY + qrSize + 13, size: 5.5, font: boldFont, color: rgb(0.32, 0.34, 0.38),
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawText('Delivered via Lob  -  1st class post  -  ETA 3 business days', {
    x: 24, y: 34, size: 6.5, font: regularFont, color: rgb(0.20, 0.20, 0.20),
  })
  page.drawText('PoolFinder UK  -  Confidential  -  Not for redistribution', {
    x: 24, y: 22, size: 6.5, font: regularFont, color: rgb(0.16, 0.16, 0.16),
  })

  // ── Bottom accent bar ─────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 4, color: rgb(0.23, 0.51, 0.96) })

  // ── Save ──────────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()
  const dir      = path.join(process.cwd(), 'public', 'postcards')
  fs.mkdirSync(dir, { recursive: true })
  const filename = `postcard-${propertyId}.pdf`
  fs.writeFileSync(path.join(dir, filename), pdfBytes)
  return `/postcards/${filename}`
}
