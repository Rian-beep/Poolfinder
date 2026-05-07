export function getSatelliteImageUrl(lat: number, lng: number, zoom = 19): string {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return `https://picsum.photos/seed/${Math.round(lat * 1000)}/640/480`
  }
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: '640x480',
    maptype: 'satellite',
    key,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}

export function getRenderedImageUrl(lat: number, lng: number): string {
  // Return the zoomed-in satellite view as the "rendered" image
  // In production this would be replaced by an Imagen/Stable Diffusion call
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return `https://picsum.photos/seed/${Math.round(lng * 1000)}/640/480`
  }
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '20',
    size: '640x480',
    maptype: 'satellite',
    key,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}
