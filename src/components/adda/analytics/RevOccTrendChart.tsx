'use client'

import { useState } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrendPoint } from '@/lib/adda/mock/analyticsData'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'both' | 'revenue' | 'occupancy'

interface Props {
  data: TrendPoint[]
  compareData?: TrendPoint[]   // previous period, shown as dashed lines
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--adda-bg-elevated)',
        border: '1px solid var(--adda-border-default)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: 'var(--adda-text-primary)',
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--adda-text-secondary)' }}>
        {label}
      </div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: entry.color, opacity: entry.strokeDasharray ? 0.7 : 1 }}>
            {entry.name}
          </span>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 600 }}>
            {entry.dataKey.includes('occupancy')
              ? `${entry.value}%`
              : `₹${Math.round(entry.value / 100).toLocaleString('en-IN')}`
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RevOccTrendChart
// ---------------------------------------------------------------------------

export default function RevOccTrendChart({ data, compareData }: Props) {
  const [mode, setMode] = useState<ViewMode>('both')

  const allZero = data.length === 0 || data.every(d => d.revenuePaise === 0 && d.occupancyPercent === 0)

  // Compute average occupancy for the reference line
  const avgOcc = data.length
    ? Math.round(data.reduce((s, d) => s + d.occupancyPercent, 0) / data.length)
    : 0

  const showRevenue   = mode === 'both' || mode === 'revenue'
  const showOccupancy = mode === 'both' || mode === 'occupancy'

  // Merge current + compare data into a single array keyed by label
  type Row = TrendPoint & { prevRevenuePaise?: number; prevOccupancyPercent?: number }
  const chartData: Row[] = data.map((d, i) => ({
    ...d,
    prevRevenuePaise:    compareData?.[i]?.revenuePaise,
    prevOccupancyPercent: compareData?.[i]?.occupancyPercent,
  }))

  return (
    <div
      style={{
        background: 'var(--adda-bg-surface)',
        border: '1px solid var(--adda-border-subtle)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--adda-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            marginBottom: 2,
          }}>
            Revenue & Occupancy Trend
          </div>
          <div style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>
            Correlate marketing campaigns with booking spikes
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['both', 'revenue', 'occupancy'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '4px 10px',
                borderRadius: 5,
                fontSize: 11.5,
                fontFamily: 'var(--font-inter)',
                fontWeight: 500,
                cursor: 'pointer',
                border: mode === m ? '1px solid var(--adda-amber-border)' : '1px solid var(--adda-border-default)',
                background: mode === m ? 'var(--adda-amber-tint)' : 'transparent',
                color: mode === m ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
              }}
            >
              {m === 'both' ? 'Both' : m === 'revenue' ? 'Revenue only' : 'Occupancy only'}
            </button>
          ))}
        </div>
      </div>

      {allZero ? (
        <div style={{
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--adda-bg-elevated)',
          borderRadius: 8,
        }}>
          <span style={{
            fontSize: 13,
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            No bookings with revenue in this range
          </span>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 28, bottom: 0, left: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--adda-border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
                axisLine={{ stroke: 'var(--adda-border-subtle)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              {/* Left Y: Revenue (₹) */}
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tickFormatter={v => `₹${(v / 10000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
                axisLine={false}
                tickLine={false}
                width={52}
                hide={!showRevenue}
              />
              {/* Right Y: Occupancy (%) */}
              <YAxis
                yAxisId="occupancy"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 10, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
                axisLine={false}
                tickLine={false}
                width={38}
                hide={!showOccupancy}
              />
              <Tooltip content={<ChartTooltip />} />

              {/* Revenue area */}
              {showRevenue && (
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenuePaise"
                  name="Revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="rgba(245,158,11,0.08)"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {/* Revenue compare (dashed) */}
              {showRevenue && compareData && (
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="prevRevenuePaise"
                  name="Revenue (prev)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Occupancy line */}
              {showOccupancy && (
                <Line
                  yAxisId="occupancy"
                  type="monotone"
                  dataKey="occupancyPercent"
                  name="Occupancy"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {/* Occupancy compare (dashed) */}
              {showOccupancy && compareData && (
                <Line
                  yAxisId="occupancy"
                  type="monotone"
                  dataKey="prevOccupancyPercent"
                  name="Occupancy (prev)"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Average occupancy reference line */}
              {showOccupancy && avgOcc > 0 && (
                <ReferenceLine
                  yAxisId="occupancy"
                  y={avgOcc}
                  stroke="rgba(56,189,248,0.4)"
                  strokeDasharray="4 3"
                  label={{
                    value: `Avg ${avgOcc}%`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#38bdf8',
                    fontFamily: 'var(--font-jetbrains-mono)',
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingLeft: 4 }}>
            {showRevenue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--adda-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 16, height: 2, background: '#f59e0b', borderRadius: 1 }} />
                Revenue (₹)
              </div>
            )}
            {showOccupancy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--adda-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 16, height: 2, background: '#38bdf8', borderRadius: 1 }} />
                Occupancy (%)
              </div>
            )}
            {compareData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--adda-text-muted)' }}>
                <span style={{
                  display: 'inline-block', width: 16, height: 2,
                  background: 'repeating-linear-gradient(90deg, var(--adda-text-muted) 0 5px, transparent 5px 9px)',
                }} />
                Previous period
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
