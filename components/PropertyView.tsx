'use client'

import { Property } from '@/lib/db'

interface Props {
  property: Property | null
}

// SVG pool overlay — positioned in the lower-centre of the image (backyard zone)
function PoolSvgOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '43%',
        left: '35%',
        width: '22%',
        height: '31%',
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 100 130" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="poolWater" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0D5FC4" stopOpacity="0.94" />
            <stop offset="45%"  stopColor="#1A8EEF" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#1270CC" stopOpacity="0.94" />
          </linearGradient>
          <linearGradient id="deckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#D8CEB8" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#C8BE9C" stopOpacity="0.90" />
          </linearGradient>
        </defs>

        {/* Concrete deck surround */}
        <rect x="-10" y="-10" width="120" height="150" fill="url(#deckGrad)" rx="1" />

        {/* Pool water */}
        <rect x="0" y="0" width="100" height="130" fill="url(#poolWater)" />

        {/* Lane divider ropes */}
        <line x1="5" y1="32"  x2="95" y2="32"  stroke="rgba(255,255,255,0.30)" strokeWidth="1.8" strokeDasharray="3,3" />
        <line x1="5" y1="65"  x2="95" y2="65"  stroke="rgba(255,255,255,0.30)" strokeWidth="1.8" strokeDasharray="3,3" />
        <line x1="5" y1="97"  x2="95" y2="97"  stroke="rgba(255,255,255,0.30)" strokeWidth="1.8" strokeDasharray="3,3" />

        {/* Entry steps at bottom */}
        <rect x="30" y="116" width="40" height="7"  fill="rgba(190,225,255,0.55)" />
        <rect x="35" y="123" width="30" height="5"  fill="rgba(190,225,255,0.40)" />

        {/* Entry steps at top */}
        <rect x="30" y="0"   width="40" height="6"  fill="rgba(190,225,255,0.45)" />

        {/* Water shimmer highlight */}
        <ellipse cx="33" cy="26" rx="24" ry="7" fill="rgba(230,248,255,0.20)" transform="rotate(-18 33 26)" />
        <ellipse cx="60" cy="80" rx="16" ry="5" fill="rgba(230,248,255,0.12)" transform="rotate(-10 60 80)" />

        {/* Deck edge lines */}
        <rect x="-10" y="-10" width="120" height="150" fill="none"
              stroke="rgba(255,255,255,0.18)" strokeWidth="1" rx="1" />
      </svg>
    </div>
  )
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
  const isAiRender = showRendered && (property.rendered_image_url ?? '').startsWith('/renders/')
  // Use AI render when available, otherwise fall back to satellite image
  const imageUrl = isAiRender ? property.rendered_image_url : property.satellite_image_url
  const lotSize = property.lot_size_sqft
    ? `${property.lot_size_sqft.toLocaleString()} sqft`
    : '— sqft'

  return (
    <div className="relative h-full flex flex-col" style={{ background: '#0D0D0D' }}>
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
              filter: showRendered ? 'saturate(1.15) brightness(1.05)' : 'saturate(0.85)',
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ background: '#0D0D0D' }}>
            <div style={{ color: '#1F2937', fontSize: '11px', letterSpacing: '0.1em' }}>
              {property.status === 'running' ? 'FETCHING SATELLITE IMAGE…' : 'AWAITING IMAGE'}
            </div>
          </div>
        )}

        {/* SVG pool overlay — only when no AI render available */}
        {showRendered && !isAiRender && <PoolSvgOverlay />}

        {/* POOL RENDERED badge */}
        {showRendered && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(139,92,246,0.90)',
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

        {/* Address overlay */}
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

        {/* Lot size */}
        {property.lot_size_sqft && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: showRendered ? '130px' : '10px',
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

        {/* Confidential badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            padding: '4px 10px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ fontSize: '9px', letterSpacing: '0.08em', color: '#4B5563', fontWeight: 600 }}>
            C2 — HOMEOWNER · CONFIDENTIAL — {(property.town ?? '').toUpperCase()}
          </span>
        </div>

        {/* Scan line during stage 1 */}
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
