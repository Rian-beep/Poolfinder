'use client'

import { Property } from '@/lib/db'

interface Props {
  property: Property | null
}

export default function PropertyView({ property }: Props) {
  if (!property) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: '#0D0D0D', border: '1px solid #161616' }}
      >
        <div style={{ textAlign: 'center', color: '#1F2937' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⬡</div>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em' }}>NO PROPERTY LOADED</div>
          <div style={{ fontSize: '10px', color: '#111827', marginTop: '4px' }}>
            Click &ldquo;Run next property&rdquo; to begin
          </div>
        </div>
      </div>
    )
  }

  const showRendered = !!property.rendered_image_url && property.step_number >= 3
  const imageUrl = showRendered ? property.rendered_image_url : property.satellite_image_url
  const lotSize = property.lot_size_sqft
    ? `${property.lot_size_sqft.toLocaleString()} sqft`
    : '— sqft'

  return (
    <div className="relative h-full flex flex-col" style={{ background: '#0D0D0D' }}>
      {/* Map / Image container */}
      <div className="relative flex-1 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={imageUrl}
            src={imageUrl}
            alt="Property satellite view"
            className="img-fade"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: showRendered ? 'saturate(1.1) brightness(1.05)' : 'saturate(0.85)',
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center h-full"
            style={{ background: '#0D0D0D' }}
          >
            <div style={{ color: '#1F2937', fontSize: '11px', letterSpacing: '0.1em' }}>
              {property.status === 'running' ? 'FETCHING SATELLITE IMAGE…' : 'AWAITING IMAGE'}
            </div>
          </div>
        )}

        {/* Rendered badge */}
        {showRendered && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(139,92,246,0.85)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '3px 8px',
            }}
          >
            POOL RENDERED
          </div>
        )}

        {/* Top-left: address overlay */}
        {property.address && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.75)',
              padding: '5px 10px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span style={{ fontSize: '10px', color: '#E5E7EB' }}>
              📍 {property.address}, {property.postcode}
            </span>
          </div>
        )}

        {/* Top-right: lot size */}
        {property.lot_size_sqft && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: showRendered ? '110px' : '10px',
              background: 'rgba(0,0,0,0.75)',
              padding: '5px 10px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
              {lotSize} · pool-ready
            </span>
          </div>
        )}

        {/* Bottom-left: confidential badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            padding: '4px 10px',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: '#4B5563',
              fontWeight: 600,
            }}
          >
            C2 — HOMEOWNER · CONFIDENTIAL — {(property.town ?? '').toUpperCase()}
          </span>
        </div>

        {/* Scanning overlay when running stage 1 */}
        {property.step_number === 1 && property.status === 'running' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(59,130,246,0.04)',
              border: '1px solid rgba(59,130,246,0.15)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: '50%',
                left: 0,
                right: 0,
                height: '1px',
                background: 'rgba(59,130,246,0.4)',
                animation: 'pulse-bar 1s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
