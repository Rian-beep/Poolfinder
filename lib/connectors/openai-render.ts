import OpenAI from 'openai'
import path from 'path'
import fs from 'fs'

const POOL_PROMPT = `This is a UK residential property viewed from above. Add a luxury rectangular outdoor swimming pool with crystal-clear blue water to the rear garden / backyard. The pool should:
- Be positioned naturally within the existing garden space, oriented to fit the available lawn area
- Have a modern rectangular shape with clean white or light stone coping around the edge
- Show realistic water with subtle caustic light patterns and a slight turquoise-blue colour
- Include a small patio/decking area alongside one end
- Look photorealistic and seamlessly integrated with the existing garden landscaping
- Not overlap any buildings, fences, driveways, or trees
Keep all other parts of the image exactly as they are. The result should look like a genuine aerial photograph of the property with a real pool installed.`

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
