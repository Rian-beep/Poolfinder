'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import ActivityFeed, { FeedEvent } from '@/components/ActivityFeed'
import PropertyView from '@/components/PropertyView'
import MetadataStrip from '@/components/MetadataStrip'
import { Property } from '@/lib/db'

export default function Dashboard() {
  const [property, setProperty] = useState<Property | null>(null)
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [running, setRunning] = useState(false)
  const [propertiesProcessed, setPropertiesProcessed] = useState(0)
  const [now, setNow] = useState(Date.now())
  const eventSourceRef = useRef<EventSource | null>(null)
  const seenEventIds = useRef<Set<string>>(new Set())

  // Tick the clock for "X ago" timestamps
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const startPipeline = useCallback(async () => {
    if (running) return
    closeEventSource()
    seenEventIds.current.clear()

    setRunning(true)
    setEvents([])
    setProperty(null)

    let propertyId: string
    try {
      const res = await fetch('/api/run-pipeline', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Failed to start pipeline')
        setRunning(false)
        return
      }
      const data = await res.json()
      propertyId = data.propertyId
    } catch {
      alert('Network error starting pipeline')
      setRunning(false)
      return
    }

    // Subscribe to SSE stream
    const es = new EventSource(`/api/events?propertyId=${propertyId}`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as {
          type: 'event' | 'property' | 'done'
          payload?: FeedEvent | Property
        }

        if (msg.type === 'event') {
          const ev = msg.payload as FeedEvent
          if (!seenEventIds.current.has(ev.id)) {
            seenEventIds.current.add(ev.id)
            setEvents((prev) => [...prev, ev])
          }
        } else if (msg.type === 'property') {
          setProperty(msg.payload as Property)
        } else if (msg.type === 'done') {
          setRunning(false)
          setPropertiesProcessed((p) => p + 1)
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setRunning(false)
      es.close()
    }
  }, [running, closeEventSource])

  // Cleanup on unmount
  useEffect(() => () => closeEventSource(), [closeEventSource])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0A0A0A',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <TopBar
        running={running}
        onRun={startPipeline}
        canRun={!running && propertiesProcessed < 10}
        propertiesProcessed={propertiesProcessed}
      />

      {/* Main two-pane */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', borderBottom: '1px solid #1A1A1A' }}>
        {/* Left pane — Activity feed (40%) */}
        <div
          style={{
            width: '40%',
            borderRight: '1px solid #1A1A1A',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <ActivityFeed events={events} now={now} />
        </div>

        {/* Right pane — Property view (60%) */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <PropertyView property={property} />
        </div>
      </div>

      {/* Bottom metadata strip */}
      <div
        style={{
          height: '44px',
          flexShrink: 0,
          borderTop: '1px solid #1A1A1A',
          background: '#080808',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <MetadataStrip property={property} running={running} />
      </div>
    </div>
  )
}
