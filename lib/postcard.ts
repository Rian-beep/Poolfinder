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

export async function generatePostcardPdf(params: PostcardParams): Promise<string> {
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '')

  const {
    propertyId,
    poolBuildCost, homeValueLift, propertyValue,
  } = params
  const address = clean(params.address)
  const town = clean(params.town)
  const postcode = clean(params.postcode)
  const copy = clean(params.copy)

  // 6×9 inches at 72 DPI = 432×648 points
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([432, 648])
  const { width, height } = page.getSize()

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Dark background
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: rgb(0.04, 0.04, 0.04),
  })

  // Accent bar at top
  page.drawRectangle({
    x: 0, y: height - 6, width, height: 6,
    color: rgb(0.23, 0.51, 0.96),
  })

  // Header — POOLFINDER.UK
  page.drawText('POOLFINDER.UK', {
    x: 24, y: height - 36,
    size: 14, font: boldFont,
    color: rgb(0.23, 0.51, 0.96),
  })

  // Address
  page.drawText(address, {
    x: 24, y: height - 58,
    size: 11, font: boldFont,
    color: rgb(1, 1, 1),
  })
  page.drawText(`${town} · ${postcode}`, {
    x: 24, y: height - 74,
    size: 9, font: regularFont,
    color: rgb(0.42, 0.45, 0.50),
  })

  // Divider
  page.drawLine({
    start: { x: 24, y: height - 90 },
    end: { x: width - 24, y: height - 90 },
    thickness: 0.5,
    color: rgb(0.12, 0.12, 0.12),
  })

  // Copy text — wrap to fit
  const maxWidth = width - 48
  const words = copy.split(' ')
  let line = ''
  let yPos = height - 112
  for (const word of words) {
    if (!word) continue
    const test = line ? `${line} ${word}` : word
    const testWidth = regularFont.widthOfTextAtSize(test, 10)
    if (testWidth > maxWidth && line) {
      page.drawText(line, { x: 24, y: yPos, size: 10, font: regularFont, color: rgb(0.85, 0.85, 0.85) })
      yPos -= 16
      line = word
    } else {
      line = test
    }
  }
  if (line) {
    page.drawText(line, { x: 24, y: yPos, size: 10, font: regularFont, color: rgb(0.85, 0.85, 0.85) })
    yPos -= 28
  }

  // Economics panel
  const panelY = yPos - 10
  const panelH = 90
  page.drawRectangle({
    x: 24, y: panelY - panelH, width: width - 48, height: panelH,
    color: rgb(0.07, 0.07, 0.07),
  })

  const metrics = [
    { label: 'PROPERTY VALUE', value: `£${propertyValue.toLocaleString()}` },
    { label: 'POOL BUILD COST', value: `£${poolBuildCost.toLocaleString()}` },
    { label: 'HOME VALUE LIFT', value: `+£${homeValueLift.toLocaleString()}` },
  ]
  const colW = (width - 48) / 3
  metrics.forEach((m, i) => {
    const x = 24 + i * colW + 10
    page.drawText(m.label, {
      x, y: panelY - 22,
      size: 6, font: boldFont,
      color: rgb(0.42, 0.45, 0.50),
    })
    page.drawText(m.value, {
      x, y: panelY - 44,
      size: 11, font: boldFont,
      color: i === 2 ? rgb(0.06, 0.72, 0.51) : rgb(1, 1, 1),
    })
    if (i < 2) {
      page.drawLine({
        start: { x: 24 + (i + 1) * colW, y: panelY - 10 },
        end: { x: 24 + (i + 1) * colW, y: panelY - panelH + 10 },
        thickness: 0.5, color: rgb(0.15, 0.15, 0.15),
      })
    }
  })

  // QR Code
  const micrositeUrl = `https://${town.toLowerCase()}-${postcode.toLowerCase().replace(/\s/g, '')}.poolfinder.uk`
  const qrDataUrl = await QRCode.toDataURL(micrositeUrl, { width: 80, margin: 1, color: { dark: '#FFFFFF', light: '#0A0A0A' } })
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'))

  const qrSize = 80
  const qrX = width - 24 - qrSize
  const qrY = 24

  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })

  page.drawText('SCAN TO VIEW', { x: qrX, y: qrY + qrSize + 6, size: 6, font: boldFont, color: rgb(0.42, 0.45, 0.50) })
  page.drawText('YOUR MICROSITE', { x: qrX, y: qrY + qrSize, size: 6, font: boldFont, color: rgb(0.42, 0.45, 0.50) })

  // Footer
  page.drawText('Would mail via Lob · 1st class · ETA 3 business days', {
    x: 24, y: 34,
    size: 7, font: regularFont,
    color: rgb(0.25, 0.25, 0.25),
  })
  page.drawText('PoolFinder UK · Confidential', {
    x: 24, y: 22,
    size: 7, font: regularFont,
    color: rgb(0.25, 0.25, 0.25),
  })

  // Bottom accent
  page.drawRectangle({ x: 0, y: 0, width, height: 4, color: rgb(0.23, 0.51, 0.96) })

  const pdfBytes = await pdfDoc.save()
  const dir = path.join(process.cwd(), 'public', 'postcards')
  fs.mkdirSync(dir, { recursive: true })
  const filename = `postcard-${propertyId}.pdf`
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, pdfBytes)

  return `/postcards/${filename}`
}
