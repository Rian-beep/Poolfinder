export interface PostcodeResult {
  postcode: string
  latitude: number
  longitude: number
  admin_district: string
  parish: string | null
  region: string
  country: string
}

export async function lookupPostcode(postcode: string): Promise<PostcodeResult | null> {
  try {
    const encoded = encodeURIComponent(postcode.trim())
    const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 200) return null
    return {
      postcode: data.result.postcode,
      latitude: data.result.latitude,
      longitude: data.result.longitude,
      admin_district: data.result.admin_district,
      parish: data.result.parish,
      region: data.result.region,
      country: data.result.country,
    }
  } catch {
    return null
  }
}
