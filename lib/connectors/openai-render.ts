import OpenAI from 'openai'
import path from 'path'
import fs from 'fs'

const POOL_PROMPT = `You are editing an aerial satellite photograph of a UK residential property. Your ONLY task is to add a luxury swimming pool to the rear garden lawn area.

STRICT PRESERVATION RULES — do NOT change any of these:
- All buildings, houses, and rooftops must remain pixel-perfect identical
- All roads, pavements, driveways, and parked cars must remain unchanged
- All neighbouring properties, fences, walls, and hedges must remain unchanged
- All trees, shrubs, and garden borders outside the pool area must remain unchanged
- The overall composition, perspective, zoom level, and colour palette must remain identical

POOL PLACEMENT — only modify the open lawn/grass area in the rear garden:
- Place one rectangular pool (approx 10m x 5m at image scale) on the largest continuous area of lawn in the back garden, oriented along the longest axis of the garden
- Pool water: deep turquoise-blue with subtle caustic light ripples and a lighter centre highlight
- Coping: 0.5m wide border of light limestone or white stone around all four edges
- Small sandstone or grey paving area at one short end of the pool (no furniture)
- The pool must sit flush with the surrounding lawn — no raised decking, no displacement of soil
- Do not add fencing, cover, equipment housing, or any other structures

The final image must look like an unedited aerial photograph — only the pool and its immediate stone surround should differ from the original.`

export async function renderPoolIntoProperty(
  satelliteImageUrl: string,
  propertyId: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[openai-render] OPENAI_API_KEY not set — skipping AI render')
    return null
  }

  try {
    const openai = new OpenAI({ apiKey })

    // Fetch the satellite image
    const res = await fetch(satelliteImageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      console.warn('[openai-render] Failed to fetch satellite image:', res.status)
      return null
    }
    const imageBuffer = Buffer.from(await res.arrayBuffer())

    // Write to a temp file — OpenAI SDK requires a File/Blob or path-like object
    const tmpDir = path.join(process.cwd(), 'tmp')
    fs.mkdirSync(tmpDir, { recursive: true })
    const tmpPath = path.join(tmpDir, `sat-${propertyId}.png`)
    fs.writeFileSync(tmpPath, imageBuffer)

    // Create a File from the buffer for the API
    const imageFile = await OpenAI.toFile(
      fs.createReadStream(tmpPath),
      `satellite-${propertyId}.png`,
      { type: 'image/png' }
    )

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: POOL_PROMPT,
      n: 1,
      size: '1024x1024',
    })

    // Clean up temp file
    try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }

    const imageData = response.data?.[0]
    if (!imageData) {
      console.warn('[openai-render] No image data in response')
      return null
    }

    // Save result — API returns base64 by default for gpt-image-1
    const outDir = path.join(process.cwd(), 'public', 'renders')
    fs.mkdirSync(outDir, { recursive: true })
    const filename = `render-${propertyId}.png`
    const outPath = path.join(outDir, filename)

    if (imageData.b64_json) {
      fs.writeFileSync(outPath, Buffer.from(imageData.b64_json, 'base64'))
    } else if (imageData.url) {
      const imgRes = await fetch(imageData.url, { signal: AbortSignal.timeout(15000) })
      if (!imgRes.ok) return null
      fs.writeFileSync(outPath, Buffer.from(await imgRes.arrayBuffer()))
    } else {
      console.warn('[openai-render] No b64_json or url in response')
      return null
    }

    return `/renders/${filename}`
  } catch (err) {
    console.error('[openai-render] Render failed:', err)
    return null
  }
}
