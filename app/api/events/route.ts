import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')

  if (!propertyId) {
    return new Response('Missing propertyId', { status: 400 })
  }

  let lastEventId = ''
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function send(data: string) {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(data))
          } catch {
            closed = true
          }
        }
      }

      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval)
          return
        }

        try {
          const db = getDb()

          // Send new activity events
          const events = lastEventId
            ? db.prepare(
                `SELECT * FROM activity_events WHERE property_id = ? AND id > ? ORDER BY occurred_at ASC`
              ).all(propertyId, lastEventId)
            : db.prepare(
                `SELECT * FROM activity_events WHERE property_id = ? ORDER BY occurred_at ASC`
              ).all(propertyId)

          for (const ev of events as { id: string; [key: string]: unknown }[]) {
            send(`data: ${JSON.stringify({ type: 'event', payload: ev })}\n\n`)
            lastEventId = ev.id
          }

          // Send property state
          const prop = db
            .prepare('SELECT * FROM properties WHERE id = ?')
            .get(propertyId) as Record<string, unknown> | undefined

          if (prop) {
            send(`data: ${JSON.stringify({ type: 'property', payload: prop })}\n\n`)

            if (prop.status === 'complete' || prop.status === 'error') {
              send(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              clearInterval(interval)
              if (!closed) {
                closed = true
                controller.close()
              }
            }
          }
        } catch {
          clearInterval(interval)
          closed = true
          try { controller.close() } catch { /* already closed */ }
        }
      }, 500)

      // Clean up if client disconnects
      request.signal?.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
