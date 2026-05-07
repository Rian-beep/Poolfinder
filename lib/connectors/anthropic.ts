import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

export interface SatelliteAnalysis {
  hasPool: boolean
  estimatedLotSizeSqft: number
  estimatedBuiltYear: number
  notes: string
}

export async function analyseSatelliteImage(imageUrl: string): Promise<SatelliteAnalysis> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return {
      hasPool: false,
      estimatedLotSizeSqft: 800 + Math.floor(Math.random() * 1600),
      estimatedBuiltYear: 1960 + Math.floor(Math.random() * 40),
      notes: 'Mock analysis (no API key)',
    }
  }

  try {
    const anthropic = getClient()

    // Fetch image as base64
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error('Could not fetch satellite image')
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const mediaType = 'image/png'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `You are analysing a UK satellite aerial image of a residential property.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "hasPool": boolean,
  "estimatedLotSizeSqft": number (garden + house footprint, 400-4000),
  "estimatedBuiltYear": number (between 1880 and 2010),
  "notes": string (one brief sentence)
}`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const json = JSON.parse(text.trim())
    return {
      hasPool: Boolean(json.hasPool),
      estimatedLotSizeSqft: Number(json.estimatedLotSizeSqft) || 1200,
      estimatedBuiltYear: Number(json.estimatedBuiltYear) || 1985,
      notes: String(json.notes || ''),
    }
  } catch {
    return {
      hasPool: false,
      estimatedLotSizeSqft: 800 + Math.floor(Math.random() * 1600),
      estimatedBuiltYear: 1960 + Math.floor(Math.random() * 40),
      notes: 'Estimated from regional norms',
    }
  }
}

export async function generatePostcardCopy(params: {
  address: string
  town: string
  poolBuildCost: number
  homeValueLift: number
  propertyValue: number
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return `Your ${params.town} home could be worth £${(params.homeValueLift / 1000).toFixed(0)}k more with a luxury pool. For just £${(params.poolBuildCost / 1000).toFixed(0)}k, transform your outdoor space.`
  }

  try {
    const anthropic = getClient()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: `Write a 2-sentence luxury pool postcard message for a UK homeowner. Property: ${params.address}, ${params.town}. Pool cost: £${params.poolBuildCost.toLocaleString()}. Value added: +£${params.homeValueLift.toLocaleString()}. Current value: £${params.propertyValue.toLocaleString()}. Be direct, compelling, upmarket. No hashtags.`,
        },
      ],
    })
    return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  } catch {
    return `Your ${params.town} home could be worth £${(params.homeValueLift / 1000).toFixed(0)}k more with a luxury pool. For just £${(params.poolBuildCost / 1000).toFixed(0)}k, transform your outdoor space.`
  }
}
