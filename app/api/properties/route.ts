import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  const properties = db
    .prepare('SELECT * FROM properties ORDER BY created_at DESC LIMIT 20')
    .all()
  return NextResponse.json(properties)
}
