import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { getNextPostcode, runPipeline } from '@/lib/pipeline'

export async function POST() {
  const db = getDb()

  const seed = getNextPostcode()
  if (!seed) {
    return NextResponse.json({ error: 'All seed postcodes have been processed' }, { status: 400 })
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO properties (id, postcode, town, status, current_stage, step_number, created_at)
    VALUES (?, ?, ?, 'pending', 'Initialising', 0, ?)
  `).run(id, seed.postcode, seed.town, new Date().toISOString())

  // Fire pipeline without awaiting — it runs in the background
  void runPipeline(id)

  return NextResponse.json({ propertyId: id, postcode: seed.postcode, town: seed.town })
}
