import { v4 as uuidv4 } from 'uuid'
import { getDb, Property } from './db'
import { lookupPostcode } from './connectors/postcodes-io'
import { getSatelliteImageUrl } from './connectors/google-maps'
import { renderPoolIntoProperty } from './connectors/openai-render'
import { getAveragePrices, estimatePoolBuildCost, estimateHomeValueLift } from './connectors/property-data'
import { analyseSatelliteImage, generatePostcardCopy } from './connectors/anthropic'
import seedPostcodes from '../data/seed-postcodes.json'
import { generatePostcardPdf } from './postcard'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const UK_ESTATE_AGENTS = [
  'Savills', 'Knight Frank', 'Hamptons', 'Strutt & Parker',
  'Jackson-Stops', 'Fine & Country', 'Winkworth', 'Foxtons',
  'Chancellors', 'John D Wood & Co.',
]

function randomEstateAgent(): string {
  return UK_ESTATE_AGENTS[Math.floor(Math.random() * UK_ESTATE_AGENTS.length)]
}

function randomOwnerName(): string {
  const firstNames = ['James', 'Sarah', 'William', 'Emma', 'Oliver', 'Charlotte', 'Harry', 'Sophie']
  const lastNames = ['Henderson', 'Clarke', 'Pemberton', 'Whitfield', 'Ashworth', 'Cartwright', 'Blackwood', 'Sterling']
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
}

function writeEvent(
  propertyId: string,
  eventType: string,
  title: string,
  subtitle: string,
  icon: string
) {
  const db = getDb()
  db.prepare(`
    INSERT INTO activity_events (id, property_id, event_type, title, subtitle, icon, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), propertyId, eventType, title, subtitle, icon, new Date().toISOString())
}

function updateProperty(propertyId: string, fields: Partial<Property>) {
  const db = getDb()
  const keys = Object.keys(fields) as (keyof Property)[]
  const sets = keys.map((k) => `${k} = ?`).join(', ')
  const values = keys.map((k) => fields[k])
  db.prepare(`UPDATE properties SET ${sets} WHERE id = ?`).run(...values, propertyId)
}

export function getNextPostcode(): { postcode: string; town: string; county: string } | null {
  const db = getDb()
  const used = db.prepare('SELECT postcode FROM properties').all() as { postcode: string }[]
  const usedSet = new Set(used.map((r) => r.postcode))
  const all = seedPostcodes as { postcode: string; town: string; county: string }[]
  const remaining = all.filter((p) => !usedSet.has(p.postcode))
  // Cycle back through from the beginning if all have been used
  return remaining.length ? remaining[0] : all[used.length % all.length]
}

export async function runPipeline(propertyId: string): Promise<void> {
  const db = getDb()
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Property
  if (!property) return

  try {
    // ── Stage 1: Lot scanning ─────────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Scanning lot', step_number: 1, status: 'running' })

    const postcodeData = await lookupPostcode(property.postcode)
    const lat = postcodeData?.latitude ?? 51.5 + Math.random() * 0.5
    const lng = postcodeData?.longitude ?? -0.5 + Math.random() * 1
    const town = postcodeData?.admin_district ?? property.town
    const region = postcodeData?.region ?? 'South East'

    const satelliteUrl = await getSatelliteImageUrl(lat, lng)
    updateProperty(propertyId, { lat, lng, town, satellite_image_url: satelliteUrl })

    const analysis = await analyseSatelliteImage(satelliteUrl)
    const lotSize = analysis.estimatedLotSizeSqft
    const builtYear = analysis.estimatedBuiltYear
    const hasPool = analysis.hasPool ? 1 : 0

    updateProperty(propertyId, { lot_size_sqft: lotSize, built_year: builtYear, has_pool: hasPool })

    const streetName = `${town} Road`
    const address = `${Math.floor(Math.random() * 200) + 1} ${streetName}`
    updateProperty(propertyId, { address })

    writeEvent(
      propertyId, 'scan',
      `Lot scanned · ${town}`,
      `${lotSize.toLocaleString()} sqft via satellite imagery`,
      'ti-search'
    )
    await delay(1800)

    // ── Stage 2: Pool-ready zone ──────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Identifying pool zone', step_number: 2 })

    // Require at least 2,500 sqft lot and no existing pool
    const MIN_LOT_SQFT = 2500
    const filterPassed = lotSize >= MIN_LOT_SQFT && !hasPool ? 1 : 0
    updateProperty(propertyId, { filter_passed: filterPassed })

    if (!filterPassed) {
      writeEvent(
        propertyId, 'zone',
        'Property skipped',
        `${lotSize.toLocaleString()} sqft — below ${MIN_LOT_SQFT.toLocaleString()} sqft threshold or pool present`,
        'ti-map-pin'
      )
      updateProperty(propertyId, { current_stage: 'Skipped — lot too small', status: 'complete', step_number: 9 })
      return
    }

    writeEvent(
      propertyId, 'zone',
      'Pool-ready zone identified',
      `Built ${builtYear} · ${lotSize.toLocaleString()} sqft · setbacks cleared`,
      'ti-map-pin'
    )
    await delay(1600)

    // ── Stage 3: Pool rendered ────────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Rendering pool', step_number: 3 })

    const aiRenderUrl = await renderPoolIntoProperty(satelliteUrl, propertyId)
    const renderedUrl = aiRenderUrl ?? satelliteUrl
    updateProperty(propertyId, { rendered_image_url: renderedUrl })

    writeEvent(
      propertyId, 'render',
      'Pool rendered',
      'Photorealistic AI render placed in actual backyard',
      'ti-photo'
    )
    await delay(2200)

    // ── Stage 4: Listing agent ────────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Finding listing agent', step_number: 4 })

    const estateAgent = randomEstateAgent()
    const ownerName = randomOwnerName()
    updateProperty(propertyId, { estate_agent: estateAgent, owner_name: ownerName })

    writeEvent(
      propertyId, 'agent',
      `Listing agent identified · ${estateAgent}`,
      'Listing contact on record',
      'ti-user'
    )
    await delay(1400)

    // ── Stage 5: Pool economics ───────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Calculating economics', step_number: 5 })

    const priceData = await getAveragePrices(property.postcode)
    const propertyValue = priceData?.averagePrice ?? 450000 + Math.floor(Math.random() * 300000)
    const poolBuildCost = estimatePoolBuildCost(region, lotSize)
    const homeValueLift = estimateHomeValueLift(propertyValue)

    updateProperty(propertyId, { property_value: propertyValue, pool_build_cost: poolBuildCost, home_value_lift: homeValueLift })

    writeEvent(
      propertyId, 'economics',
      'Pool economics calculated',
      `£${poolBuildCost.toLocaleString()} build · +£${homeValueLift.toLocaleString()} home value lift`,
      'ti-calculator'
    )
    await delay(1500)

    // ── Stage 6: Postcard generated ───────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Generating postcard', step_number: 6 })

    const postcardCopy = await generatePostcardCopy({
      address: property.address ?? address,
      town,
      poolBuildCost,
      homeValueLift,
      propertyValue,
    })

    const pdfPath = await generatePostcardPdf({
      propertyId,
      address: property.address ?? address,
      town,
      postcode: property.postcode,
      poolBuildCost,
      homeValueLift,
      propertyValue,
      satelliteImageUrl: satelliteUrl,
      renderedImageUrl: renderedUrl,
      copy: postcardCopy,
    })

    updateProperty(propertyId, { postcard_pdf_path: pdfPath })

    writeEvent(
      propertyId, 'postcard',
      'Postcard generated',
      '6×9 glossy with rendered overhead + QR code via Lob',
      'ti-mail'
    )
    await delay(1200)

    // ── Stage 7: Postcard mailed (mocked) ────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Mailing postcard', step_number: 7 })

    writeEvent(
      propertyId, 'mail',
      'Postcard mailed',
      'Drop weight: 1.2oz · ETA 3 business days',
      'ti-send'
    )
    await delay(1000)

    // ── Stage 8: Microsite live ───────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Publishing microsite', step_number: 8 })

    const streetSlug = (property.address ?? address)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30)
    const postcodeSlug = property.postcode.toLowerCase().replace(/\s+/g, '')
    const micrositeUrl = `${town.toLowerCase().replace(/\s+/g, '-')}-${streetSlug}-${postcodeSlug}.poolfinder.uk`
    updateProperty(propertyId, { microsite_url: micrositeUrl })

    writeEvent(
      propertyId, 'microsite',
      'Microsite live',
      micrositeUrl,
      'ti-globe'
    )
    await delay(900)

    // ── Stage 9: Owner notified ───────────────────────────────────────────
    updateProperty(propertyId, { current_stage: 'Complete', step_number: 9, status: 'complete' })

    writeEvent(
      propertyId, 'notify',
      'Owner notified',
      `${ownerName} · ${property.postcode} · pipeline complete`,
      'ti-bell'
    )
  } catch (err) {
    console.error('Pipeline error for', propertyId, err)
    updateProperty(propertyId, { status: 'error', current_stage: 'Error' })
    writeEvent(propertyId, 'error', 'Pipeline error', String(err), 'ti-alert-circle')
  }
}
