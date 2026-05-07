'use client'

import { Property } from '@/lib/db'

interface Props {
  property: Property | null
  running: boolean
}

const STAGE_LABELS: Record<number, string> = {
  0: 'Initialising',
  1: 'Scanning lot',
  2: 'Zone filter',
  3: 'Rendering pool',
  4: 'Finding agent',
  5: 'Calculating ROI',
  6: 'Generating postcard',
  7: 'Mailing postcard',
  8: 'Publishing microsite',
  9: 'Complete',
}

const TOTAL_STEPS = 9

export default function MetadataStrip({ property, running }: Props) {
  const step = property?.step_number ?? 0
  const stageLabel = STAGE_LABELS[step] ?? 'Initialising'
  const progress = Math.min(step / TOTAL_STEPS, 1)

  const fmt = (n: number | null | undefined, prefix = '£') =>
    n != null ? `${prefix}${n.toLocaleString()}` : '—'

  const postcodePdf = property?.postcard_pdf_path

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        gap: 0,
        overflow: 'hidden',
      }}
    >
      {/* Badges */}
      {[
        property?.built_year && property?.lot_size_sqft
          ? `Built ${property.built_year} · ${property.lot_size_sqft.toLocaleString()} sqft`
          : 'Built — · — sqft',
        `🏠 ${fmt(property?.property_value)}`,
        `£ ${fmt(property?.pool_build_cost)} pool`,
        `+${fmt(property?.home_value_lift)} lift`,
      ].map((badge, i) => (
        <div
          key={i}
          style={{
            padding: '0 16px',
            borderRight: '1px solid #1A1A1A',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            color: '#9CA3AF',
          }}
        >
          {badge}
        </div>
      ))}

      {/* Postcard PDF link */}
      {postcodePdf && (
        <div style={{ padding: '0 16px', borderRight: '1px solid #1A1A1A' }}>
          <a
            href={postcodePdf}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '11px', color: '#3B82F6', textDecoration: 'none' }}
          >
            📄 Postcard PDF
          </a>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Stage + progress */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '10px',
              color: running ? '#3B82F6' : step >= TOTAL_STEPS ? '#10B981' : '#6B7280',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            {stageLabel}
          </span>
          <span style={{ fontSize: '10px', color: '#374151', marginLeft: '8px' }}>
            {Math.min(step, TOTAL_STEPS)}/{TOTAL_STEPS}
          </span>
        </div>
        <div
          style={{
            height: '2px',
            background: '#1A1A1A',
            overflow: 'hidden',
          }}
        >
          <div
            className={running ? 'bar-active' : ''}
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: step >= TOTAL_STEPS ? '#10B981' : '#3B82F6',
              transition: 'width 0.6s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  )
}
