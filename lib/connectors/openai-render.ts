import OpenAI from 'openai'
import path from 'path'
import fs from 'fs'

const POOL_PROMPT = `This is a real aerial satellite photograph taken directly overhead (nadir view, 90 degrees) of a UK residential property. Seamlessly composite a luxury swimming pool into the rear garden.

WHAT MUST NOT CHANGE — preserve these exactly:
- Every building, rooftop, chimney, and wall
- Every road, pavement, driveway, and parked vehicle
- Every neighbouring garden, fence, hedge, and boundary
- All trees and shrubs outside the pool area
- The satellite image grain, colour grading, and lighting direction

HOW TO PLACE THE POOL — modify only the open grass/lawn in the rear garden:
- Find the largest unobstructed rectangular area of lawn behind the main house
- Place a single rectangular pool aligned with the garden's longest axis, sized proportionally to the garden (roughly 10m × 5m real-world)
- View is directly from above: the pool appears as a flat rectangle — no perspective, no depth illusion, no 3-D rendering
- Water colour: medium-dark teal/blue (hex approx #1E7EA1) — not cartoon-bright; realistic as seen from satellite altitude
- Subtle caustic shimmer pattern across the water surface, very faint
- White or pale limestone coping 0.6m wide around all four pool edges — flat, seen from above
- A small area of pale stone paving at one short end only (no sun loungers, no furniture, no cover)
- Pool edges must be sharp and straight, flush with the surrounding lawn — no shadows, no raised structure

OUTPUT: the result must be indistinguishable from an unedited satellite photograph. A viewer should believe the pool was really there when the satellite passed over.`

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
