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

// zoom=19, scale=2 → 1280×1280px at the same field-of-view as zoom=19 — sharp and clean
export async function getSatelliteImageUrl(lat: number, lng: number, zoom = 19): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (key && await isMapsKeyValid(key)) {
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: String(zoom),
      size: '640x640',
      scale: '2',
      maptype: 'satellite',
      key,
    })
    return `https://maps.googleapis.com/maps/api/staticmap?${params}`
  }
  const seed = Math.abs(Math.round(lat * 1000 + lng * 100))
  return `https://picsum.photos/seed/${seed}/1280/1280`
}
