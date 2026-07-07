'use client'

import type { BenchmarkMetric } from '@/lib/adda/mock/analyticsData'

// ---------------------------------------------------------------------------
// Percentile band chart — custom SVG, no extra deps
// Renders: p10–p90 light band, p25–p75 dark band, p50 median line, venue dot
// ---------------------------------------------------------------------------

interface BandChartProps extends BenchmarkMetric {
  width: number
  height: number
}

function paise2Inr(v: number, unit: string): string {
  if (unit === '%') return `${v}%`
  if (unit === '₹/hr') return `₹${v.toLocaleString('en-IN')}`
  return `₹${v.toLocaleString('en-IN')}`
}

function BandChart({ p10, p25, p50, p75, p90, venueValue, venuePercentile, unit, width, height }: BandChartProps) {
  const PAD_L = 8
  const PAD_R = 8
  const PAD_T = 24
  const PAD_B = 24
  const W = width - PAD_L - PAD_R
  const H = height - PAD_T - PAD_B

  const min = p10 * 0.85
  const max = p90 * 1.15
  const scale = (v: number) => PAD_L + ((v - min) / (max - min)) * W

  const x10 = scale(p10)
  const x25 = scale(p25)
  const x50 = scale(p50)
  const x75 = scale(p75)
  const x90 = scale(p90)
  const xV  = scale(venueValue)
  const yMid = PAD_T + H / 2

  const isTopQuartile = venuePercentile >= 75

  return (
    <div style={{ position: 'relative' }}>
      {/* Top-quartile badge */}
      {isTopQuartile && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'var(--venue-amber-tint)',
          border: '1px solid var(--venue-amber-border)',
          borderRadius: 5,
          padding: '2px 7px',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--venue-amber)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          zIndex: 1,
        }}>
          Top {100 - venuePercentile + 1}%
        </div>
      )}

      <svg width={width} height={height}>
        {/* p10–p90 light band */}
        <rect
          x={x10}
          y={PAD_T}
          width={x90 - x10}
          height={H}
          fill="rgba(245,158,11,0.08)"
          rx={3}
        />

        {/* p25–p75 IQR band */}
        <rect
          x={x25}
          y={PAD_T + H * 0.2}
          width={x75 - x25}
          height={H * 0.6}
          fill="rgba(245,158,11,0.18)"
          rx={3}
        />

        {/* p50 median line */}
        <line
          x1={x50} y1={PAD_T + 2}
          x2={x50} y2={PAD_T + H - 2}
          stroke="rgba(245,158,11,0.5)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />

        {/* Axis line */}
        <line
          x1={PAD_L} y1={PAD_T + H}
          x2={PAD_L + W} y2={PAD_T + H}
          stroke="var(--venue-border-subtle)"
          strokeWidth={1}
        />

        {/* Tick labels: p10, p50, p90 */}
        {[
          { x: x10, v: p10 },
          { x: x50, v: p50 },
          { x: x90, v: p90 },
        ].map(({ x, v }) => (
          <text
            key={v}
            x={x}
            y={PAD_T + H + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--venue-text-muted)"
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            {paise2Inr(v, unit)}
          </text>
        ))}

        {/* Venue dot */}
        <circle cx={xV} cy={yMid} r={6} fill="var(--venue-amber)" />
        <circle cx={xV} cy={yMid} r={3} fill="var(--venue-bg-base)" />

        {/* "You" label above the dot */}
        <text
          x={xV}
          y={PAD_T - 6}
          textAnchor="middle"
          fontSize={9.5}
          fill="var(--venue-amber)"
          fontWeight={600}
          fontFamily="var(--font-inter), system-ui"
        >
          You
        </text>
        <text
          x={xV}
          y={PAD_T - 6 + 11}
          textAnchor="middle"
          fontSize={8.5}
          fill="var(--venue-text-muted)"
          fontFamily="var(--font-jetbrains-mono), monospace"
        >
          {paise2Inr(venueValue, unit)}
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BenchmarkPanel — three side-by-side band charts, tier-gated
// ---------------------------------------------------------------------------

interface Props {
  benchmarks: BenchmarkMetric[]
  venueTierSufficient: boolean
  city: string
}

export default function BenchmarkPanel({ benchmarks, venueTierSufficient, city }: Props) {
  const sampleSize = benchmarks[0]?.sampleSize ?? 0
  const hasEnoughData = sampleSize >= 5

  return (
    <div
      style={{
        background: 'var(--venue-bg-surface)',
        border: '1px solid var(--venue-border-subtle)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--venue-text-primary)', fontFamily: 'var(--font-inter)', marginBottom: 2 }}>
            Competitive Benchmarking
          </div>
          {hasEnoughData && (
            <div style={{ fontSize: 11, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Based on {sampleSize} similar venues in {city}
            </div>
          )}
        </div>

        {/* Tier badge */}
        {!venueTierSufficient && (
          <div style={{
            padding: '3px 8px',
            background: 'var(--venue-bg-elevated)',
            border: '1px solid var(--venue-border-default)',
            borderRadius: 5,
            fontSize: 10.5,
            color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter)',
          }}>
            Nukkad tier required
          </div>
        )}
      </div>

      {/* Not on required tier */}
      {!venueTierSufficient && (
        <div style={{
          padding: '28px 24px',
          textAlign: 'center',
          color: 'var(--venue-text-muted)',
          fontSize: 13,
          fontFamily: 'var(--font-inter)',
          borderRadius: 8,
          background: 'var(--venue-bg-elevated)',
          border: '1px dashed var(--venue-border-default)',
        }}>
          Upgrade your Adda to <strong style={{ color: 'var(--venue-text-secondary)' }}>Nukkad tier</strong> to unlock
          competitive benchmarking against similar Addas in {city}.
        </div>
      )}

      {/* Insufficient data */}
      {venueTierSufficient && !hasEnoughData && (
        <div style={{
          padding: '28px 24px',
          textAlign: 'center',
          color: 'var(--venue-text-muted)',
          fontSize: 13,
          fontFamily: 'var(--font-inter)',
          borderRadius: 8,
          background: 'var(--venue-bg-elevated)',
          border: '1px dashed var(--venue-border-default)',
        }}>
          Not enough data yet — benchmarking unlocks when more venues in your area join WIMC.
          <br />
          <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
            Currently {sampleSize} venue{sampleSize !== 1 ? 's' : ''} in {city} (need 5+).
          </span>
        </div>
      )}

      {/* Charts */}
      {venueTierSufficient && hasEnoughData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {benchmarks.map(bm => (
            <div
              key={bm.metricKey}
              style={{
                background: 'var(--venue-bg-elevated)',
                borderRadius: 8,
                padding: '14px 12px 8px',
              }}
            >
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--venue-text-secondary)',
                fontFamily: 'var(--font-inter)',
                marginBottom: 2,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}>
                {bm.label}
              </div>
              <BandChart {...bm} width={220} height={90} />
              <div style={{ fontSize: 10, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter)', marginTop: 2 }}>
                p25–p75 band · p10–p90 range · median line
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
