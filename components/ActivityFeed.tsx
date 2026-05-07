'use client'

import { useEffect, useRef } from 'react'

export interface FeedEvent {
  id: string
  property_id: string
  event_type: string
  title: string
  subtitle: string
  icon: string
  occurred_at: string
  age?: number // seconds since first event
}

const ICON_MAP: Record<string, string> = {
  'ti-search':        '⌖',
  'ti-map-pin':       '◈',
  'ti-photo':         '▣',
  'ti-user':          '◉',
  'ti-calculator':    '⊞',
  'ti-mail':          '◫',
  'ti-send':          '▷',
  'ti-globe':         '◎',
  'ti-bell':          '◇',
  'ti-alert-circle':  '⚠',
}

const ICON_COLOR: Record<string, string> = {
  'ti-search':        '#3B82F6',
  'ti-map-pin':       '#06B6D4',
  'ti-photo':         '#8B5CF6',
  'ti-user':          '#6B7280',
  'ti-calculator':    '#10B981',
  'ti-mail':          '#F59E0B',
  'ti-send':          '#3B82F6',
  'ti-globe':         '#06B6D4',
  'ti-bell':          '#10B981',
  'ti-alert-circle':  '#EF4444',
}

function timeAgo(occurredAt: string, now: number): string {
  const diff = Math.floor((now - new Date(occurredAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

interface Props {
  events: FeedEvent[]
  now: number
}

export default function ActivityFeed({ events, now }: Props) {
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to top when new event arrives
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  // Reverse so newest is at top
  const sorted = [...events].reverse()

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0A' }}>
      {/* Pane header */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid #1A1A1A' }}
      >
        <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#4B5563', fontWeight: 600 }}>
          ACTIVITY
        </span>
        <span style={{ fontSize: '11px', color: '#374151' }}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        <div ref={topRef} />
        {sorted.length === 0 && (
          <div className="flex items-center justify-center h-full" style={{ color: '#2D3748' }}>
            <span style={{ fontSize: '11px' }}>Waiting for pipeline…</span>
          </div>
        )}
        {sorted.map((ev, i) => {
          const icon = ICON_MAP[ev.icon] ?? '○'
          const color = ICON_COLOR[ev.icon] ?? '#6B7280'
          const isNew = i === 0

          return (
            <div
              key={ev.id}
              className={isNew ? 'event-enter' : ''}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 16px',
                borderBottom: '1px solid #111111',
                background: isNew ? '#0E0E0E' : 'transparent',
                transition: 'background 0.5s',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#111111',
                  border: `1px solid #1A1A1A`,
                  flexShrink: 0,
                  fontSize: '14px',
                  color,
                  marginTop: '1px',
                }}
              >
                {icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#E5E7EB',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {ev.title}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#4B5563',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {ev.subtitle}
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ fontSize: '10px', color: '#374151', flexShrink: 0, paddingTop: '2px' }}>
                {timeAgo(ev.occurred_at, now)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
