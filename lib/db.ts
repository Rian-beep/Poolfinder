import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = path.join(process.cwd(), 'poolfinder.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  const schema = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8')
  db.exec(schema)

  return db
}

export interface Property {
  id: string
  address: string | null
  postcode: string
  town: string
  lat: number | null
  lng: number | null
  built_year: number | null
  lot_size_sqft: number | null
  satellite_image_url: string | null
  rendered_image_url: string | null
  has_pool: number
  filter_passed: number
  owner_name: string | null
  estate_agent: string | null
  property_value: number | null
  pool_build_cost: number | null
  home_value_lift: number | null
  postcard_pdf_path: string | null
  microsite_url: string | null
  status: string
  current_stage: string | null
  step_number: number
  created_at: string
}

export interface ActivityEvent {
  id: string
  property_id: string
  event_type: string
  title: string
  subtitle: string
  icon: string
  occurred_at: string
}
