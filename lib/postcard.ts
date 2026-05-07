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

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
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

  // ── Satellite image (fetched server-side, CORS-free) ──────────────────────
  const imgBytes = await fetchImageBytes(params.satelliteImageUrl)
  if (imgBytes) {
    try {
      const embedded = await pdfDoc.embedPng(imgBytes)
      // Image area: full width minus margins, 130pt tall
      const imgW = width - 48
      const imgH = 130
      const imgX = 24
      const imgY = height - 44 - imgH
      page.drawImage(embedded, { x: imgX, y: imgY, width: imgW, height: imgH })

      // Thin border around image
      page.drawRectangle({
        x: imgX, y: imgY, width: imgW, height: imgH,
        borderColor: rgb(0.15, 0.15, 0.15), borderWidth: 0.5,
        color: rgb(0, 0, 0), opacity: 0,
      })

      // "POOL RENDERED" label bottom-right of image
      page.drawRectangle({
        x: imgX + imgW - 88, y: imgY + 2, width: 86, height: 14,
        color: rgb(0.55, 0.36, 0.98),
      })
      page.drawText('POOL RENDERED', {
        x: imgX + imgW - 84, y: imgY + 5, size: 6, font: boldFont, color: rgb(1, 1, 1),
      })
    } catch {
      // Image embedding failed — draw placeholder box
      page.drawRectangle({
        x: 24, y: height - 174, width: width - 48, height: 130,
        color: rgb(0.08, 0.08, 0.08),
      })
      page.drawText('SATELLITE VIEW', {
        x: 24 + (width - 48) / 2 - 30, y: height - 114, size: 8, font: regularFont, color: rgb(0.25, 0.25, 0.25),
      })
    }
  }

  const contentY = imgBytes ? height - 186 : height - 52

  // ── Address ───────────────────────────────────────────────────────────────
  page.drawText(address, {
    x: 24, y: contentY, size: 11, font: boldFont, color: rgb(1, 1, 1),
  })
  page.drawText(`${town} - ${postcode}`, {
    x: 24, y: contentY - 15, size: 9, font: regularFont, color: rgb(0.42, 0.45, 0.50),
  })

  // ── Divider ───────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: 24, y: contentY - 26 },
    end:   { x: width - 24, y: contentY - 26 },
    thickness: 0.5, color: rgb(0.12, 0.12, 0.12),
  })

  // ── Copy text ─────────────────────────────────────────────────────────────
  const maxWidth = width - 48
  const words = copy.split(' ')
  let line = ''
  let yPos = contentY - 42
  for (const word of words) {
    if (!word) continue
    const test      = line ? `${line} ${word}` : word
    const testWidth = regularFont.widthOfTextAtSize(test, 9.5)
    if (testWidth > maxWidth && line) {
      page.drawText(line, { x: 24, y: yPos, size: 9.5, font: regularFont, color: rgb(0.82, 0.82, 0.82) })
      yPos -= 14
      line = word
    } else {
      line = test
    }
  }
  if (line) {
    page.drawText(line, { x: 24, y: yPos, size: 9.5, font: regularFont, color: rgb(0.82, 0.82, 0.82) })
    yPos -= 22
  }

  // ── Economics panel ───────────────────────────────────────────────────────
  const panelY = yPos - 8
  const panelH = 80
  page.drawRectangle({ x: 24, y: panelY - panelH, width: width - 48, height: panelH, color: rgb(0.07, 0.07, 0.07) })

  const metrics = [
    { label: 'PROPERTY VALUE', value: `GBP${propertyValue.toLocaleString()}` },
    { label: 'POOL BUILD COST', value: `GBP${poolBuildCost.toLocaleString()}` },
    { label: 'VALUE LIFT',      value: `+GBP${homeValueLift.toLocaleString()}` },
  ]
  const colW = (width - 48) / 3
  metrics.forEach((m, i) => {
    const x = 24 + i * colW + 8
    page.drawText(m.label, { x, y: panelY - 18, size: 6,  font: boldFont,    color: rgb(0.42, 0.45, 0.50) })
    page.drawText(m.value, { x, y: panelY - 38, size: 10, font: boldFont,    color: i === 2 ? rgb(0.06, 0.72, 0.51) : rgb(1, 1, 1) })
    if (i < 2) {
      page.drawLine({
        start: { x: 24 + (i + 1) * colW, y: panelY - 8 },
        end:   { x: 24 + (i + 1) * colW, y: panelY - panelH + 8 },
        thickness: 0.5, color: rgb(0.15, 0.15, 0.15),
      })
    }
  })

  // ── QR code ───────────────────────────────────────────────────────────────
  const micrositeUrl = `https://${town.toLowerCase()}-${postcode.toLowerCase().replace(/\s/g, '')}.poolfinder.uk`
  const qrDataUrl    = await QRCode.toDataURL(micrositeUrl, {
    width: 80, margin: 1, color: { dark: '#FFFFFF', light: '#0A0A0A' },
  })
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
  const qrImage  = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'))
  const qrSize   = 72
  const qrX      = width - 24 - qrSize
  const qrY      = 28

  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })
  page.drawText('SCAN FOR MICROSITE', { x: qrX - 2, y: qrY + qrSize + 5, size: 6, font: boldFont, color: rgb(0.38, 0.40, 0.45) })

  // ── Footer ────────────────────────────────────────────────────────────────
  page.drawText('Would mail via Lob - 1st class - ETA 3 business days', {
    x: 24, y: 36, size: 7, font: regularFont, color: rgb(0.22, 0.22, 0.22),
  })
  page.drawText('PoolFinder UK - Confidential', {
    x: 24, y: 24, size: 7, font: regularFont, color: rgb(0.22, 0.22, 0.22),
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
