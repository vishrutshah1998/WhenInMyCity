'use client'

import dynamic from 'next/dynamic'

const SparklineChart = dynamic(
  () => import('./charts/SparklineChart'),
  { ssr: false, loading: () => <div style={{ height: 64 }} /> },
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DeltaBadge({
  delta,
  direction,
}: {
  delta: number
  direction: 'up' | 'down' | 'neutral'
}) {
  const color =
    direction === 'up' ? 'var(--venue-success)'
    : direction === 'down' ? 'var(--venue-danger)'
    : 'var(--venue-text-muted)'

  const symbol = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'
  const text = direction === 'neutral' ? '—' : `${symbol} ${Math.abs(delta)}%`

  return (
    <span
      className="font-venue-nums"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        letterSpacing: '0.3px',
      }}
    >
      {text}
    </span>
  )
}

// Small SVG radial arc (28×28) showing a percentage fill. Used for Occupancy.
function RadialArc({ percent }: { percent: number }) {
  const r = 10
  const circ = 2 * Math.PI * r          // ≈ 62.83
  const filled = (Math.min(percent, 100) / 100) * circ
  // strokeDashoffset quarter-turn shifts start point to 12 o'clock
  const offset = circ * 0.25

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      {/* Track */}
      <circle cx="14" cy="14" r={r} fill="none" stroke="var(--venue-bg-hover)" strokeWidth="2.5" />
      {/* Fill */}
      <circle
        cx="14" cy="14" r={r}
        fill="none"
        stroke="var(--venue-amber)"
        strokeWidth="2.5"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '14px 14px' }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------

export interface KpiCardProps {
  label: string
  value: string | number
  delta: number
  deltaDirection: 'up' | 'down' | 'neutral'
  sparklineData?: number[]
  prefix?: string
  suffix?: string
  tooltip?: string
  subtext?: string
  // When set, shows a radial arc instead of the sparkline (used for Occupancy)
  arcPercent?: number
}

export default function KpiCard({
  label,
  value,
  delta,
  deltaDirection,
  sparklineData,
  prefix = '',
  suffix = '',
  tooltip,
  subtext,
  arcPercent,
}: KpiCardProps) {
  const hasSparkline = sparklineData && sparklineData.length > 1 && arcPercent === undefined
  const hasArc = arcPercent !== undefined

  return (
    <div
      title={tooltip}
      style={{
        background: 'var(--venue-bg-surface)',
        border: '1px solid var(--venue-border-subtle)',
        borderTop: '3px solid var(--venue-accent)',
        borderRadius: 12,
        padding: '20px 20px 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: tooltip ? 'help' : undefined,
      }}
    >
      {/* Header row: label + delta */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
        }}>
          {label}
        </span>
        <DeltaBadge delta={delta} direction={deltaDirection} />
      </div>

      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          className="font-venue-nums"
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            color: 'var(--venue-text-primary)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {prefix}{value}{suffix}
        </span>
        {hasArc && <RadialArc percent={arcPercent} />}
      </div>

      {/* Subtext (e.g. "Respond before 6pm") */}
      {subtext && (
        <div style={{
          fontSize: 11,
          color: 'var(--venue-amber)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          marginBottom: 4,
        }}>
          {subtext}
        </div>
      )}

      {/* Spacer pushes sparkline to bottom */}
      <div style={{ flex: 1, minHeight: 12 }} />

      {/* Sparkline — bleeds to card edges */}
      {hasSparkline && (
        <div style={{ marginLeft: -20, marginRight: -20, marginBottom: 0 }}>
          <SparklineChart data={sparklineData} />
        </div>
      )}

      {/* No-sparkline bottom padding */}
      {!hasSparkline && <div style={{ height: 20 }} />}
    </div>
  )
}
