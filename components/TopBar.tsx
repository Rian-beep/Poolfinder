'use client'

interface Props {
  running: boolean
  onRun: () => void
  canRun: boolean
  propertiesProcessed: number
}

const TABS = ['Activity', 'Prospects', 'Postcards', 'Bookings']

export default function TopBar({ running, onRun, canRun, propertiesProcessed }: Props) {
  return (
    <div style={{ background: '#0A0A0A', borderBottom: '1px solid #1A1A1A', flexShrink: 0 }}>
      {/* Row 1: breadcrumb + live + run button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid #141414',
        }}
      >
        <div style={{ fontSize: '11px', color: '#4B5563' }}>
          <span style={{ color: '#6B7280' }}>PoolFinder</span>
          <span style={{ color: '#2D3748', margin: '0 6px' }}>/</span>
          <span style={{ color: '#6B7280' }}>Campaigns</span>
          <span style={{ color: '#2D3748', margin: '0 6px' }}>/</span>
          <span style={{ color: '#9CA3AF', fontWeight: 600 }}>Pool — UK Mid-Market</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              className="live-dot"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981',
              }}
            />
            <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, letterSpacing: '0.1em' }}>
              LIVE
            </span>
          </div>

          <button
            onClick={onRun}
            disabled={!canRun || running}
            style={{
              background: running ? '#1A2744' : canRun ? '#1D4ED8' : '#111',
              color: running ? '#3B82F6' : canRun ? '#fff' : '#374151',
              border: `1px solid ${running ? '#2D4A8A' : canRun ? '#2563EB' : '#1F1F1F'}`,
              padding: '5px 14px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: canRun && !running ? 'pointer' : 'default',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
          >
            {running
              ? '▶ Running…'
              : propertiesProcessed >= 10
              ? '✓ All properties done'
              : '+ Run next property'}
          </button>
        </div>
      </div>

      {/* Row 2: tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <div style={{ display: 'flex' }}>
          {TABS.map((tab) => (
            <div
              key={tab}
              style={{
                padding: '8px 16px',
                fontSize: '11px',
                color: tab === 'Activity' ? '#E5E7EB' : '#374151',
                borderBottom: tab === 'Activity' ? '2px solid #3B82F6' : '2px solid transparent',
                cursor: 'default',
                letterSpacing: '0.03em',
                transition: 'color 0.15s',
              }}
            >
              {tab}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#2D3748' }}>+ auto-refresh</div>
      </div>
    </div>
  )
}
