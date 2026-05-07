const BASE_URL = 'https://api.propertydata.co.uk'

async function apiFetch(endpoint: string, params: Record<string, string>) {
  const key = process.env.PROPERTY_DATA_API_KEY
  if (!key) return null
  const qs = new URLSearchParams({ key, ...params })
  try {
    const res = await fetch(`${BASE_URL}${endpoint}?${qs}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export interface PropertyPrices {
  averagePrice: number
  transactions: number
}

export async function getAveragePrices(postcode: string): Promise<PropertyPrices | null> {
  const clean = postcode.replace(/\s+/g, '')
  const data = await apiFetch('/prices', { postcode: clean })
  if (!data || data.status !== 'success') return null
  const detached = data.data?.detached
  if (detached?.average_price) {
    return {
      averagePrice: detached.average_price,
      transactions: detached.transactions || 0,
    }
  }
  // Fall back to overall average
  const overall = data.data?.all
  if (overall?.average_price) {
    return {
      averagePrice: overall.average_price,
      transactions: overall.transactions || 0,
    }
  }
  return null
}

export async function getSoldPrices(postcode: string): Promise<number | null> {
  const clean = postcode.replace(/\s+/g, '')
  const data = await apiFetch('/sold-prices', { postcode: clean, type: 'detached' })
  if (!data || data.status !== 'success') return null
  const transactions = data.data?.transactions
  if (!transactions || !transactions.length) return null
  // Return most recent sold price
  return transactions[0]?.price || null
}

// Regional pool build cost estimates (£)
const REGIONAL_BUILD_COSTS: Record<string, [number, number]> = {
  'London': [45000, 75000],
  'South East': [38000, 60000],
  'East of England': [32000, 52000],
  'South West': [30000, 50000],
  'East Midlands': [28000, 45000],
  'West Midlands': [28000, 45000],
  'Yorkshire and The Humber': [25000, 40000],
  'North West': [25000, 40000],
  'North East': [22000, 38000],
  'Wales': [22000, 38000],
  'Scotland': [25000, 42000],
}

export function estimatePoolBuildCost(region: string, lotSizeSqft: number): number {
  const range = REGIONAL_BUILD_COSTS[region] ?? [30000, 50000]
  const base = range[0] + (range[1] - range[0]) * Math.min(lotSizeSqft / 3000, 1)
  return Math.round(base / 1000) * 1000
}

export function estimateHomeValueLift(propertyValue: number): number {
  // UK pools typically add 5-7% to property value
  const pct = 0.05 + Math.random() * 0.02
  return Math.round((propertyValue * pct) / 1000) * 1000
}
