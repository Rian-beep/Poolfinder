// Verify Maps Static API is enabled for this key (cached after first check)
let mapsKeyVerified: boolean | null = null

async function isMapsKeyValid(key: string): Promise<boolean> {
  if (mapsKeyVerified !== null) return mapsKeyVerified
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?center=51.5,0&zoom=10&size=1x1&maptype=satellite&key=${key}`,
      { signal: AbortSignal.timeout(5000) }
    )
    mapsKeyVerified = res.ok
    return mapsKeyVerified
  } catch {
    mapsKeyVerified = false
    return false
  }
}

export async function getSatelliteImageUrl(lat: number, lng: number, zoom = 20): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (key && await isMapsKeyValid(key)) {
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: String(zoom),
      size: '640x640',
      maptype: 'satellite',
      key,
    })
    return `https://maps.googleapis.com/maps/api/staticmap?${params}`
  }
  // Fallback: placeholder seeded by coordinates
  const seed = Math.abs(Math.round(lat * 1000 + lng * 100))
  return `https://picsum.photos/seed/${seed}/640/480`
}

export async function getRenderedImageUrl(lat: number, lng: number): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (key && await isMapsKeyValid(key)) {
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '20',
      size: '640x480',
      maptype: 'satellite',
      key,
    })
    return `https://maps.googleapis.com/maps/api/staticmap?${params}`
  }
  const seed = Math.abs(Math.round(lat * 1000 + lng * 100)) + 7
  return `https://picsum.photos/seed/${seed}/640/480`
}
