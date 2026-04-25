'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { LeadTimeBin } from '@/lib/adda/mock/analyticsData'
import { LEAD_TIME_MEDIAN_INDEX } from '@/lib/adda/mock/analyticsData'

// ---------------------------------------------------------------------------
// Custom rounded bar shape
// ---------------------------------------------------------------------------

function RoundedBar(props: any) {
  const { x, y, width, height, fill } = props
  if (height <= 0) return null
  const r = Math.min(4, height / 2, width / 2)
  return (
    <path
      d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h${-width} v${-(height - r)} a${r},${r} 0 0 1 ${r},${-r}z`}
      fill={fill}
    />
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const bin: LeadTimeBin = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--adda-bg-elevated)',
      border: '1px solid var(--adda-border-default)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      color: 'var(--adda-text-primary)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--adda-amber)' }}>
        {bin.count} bookings
      </div>
      {bin.isMedian && (
        <div style={{ fontSize: 10, color: 'var(--adda-text-muted)', marginTop: 3 }}>← median</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface Props {
  bins: LeadTimeBin[]
  medianIndex: number
}

export default function LeadTimeChart({ bins, medianIndex }: Props) {
  const medianBin = bins[medianIndex]

  return (
    <div
      style={{
        background: 'var(--adda-bg-surface)',
        border: '1px solid var(--adda-border-subtle)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adda-text-primary)', fontFamily: 'var(--font-inter)', marginBottom: 2 }}>
          Booking Lead Time
        </div>
        <div style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>
          How far in advance creators book your space
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={bins} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--adda-border-subtle)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}
            axisLine={{ stroke: 'var(--adda-border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
            axisLine={false}
            tickLine={false}
            width={24}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {/* Median reference line at the median bin's X position */}
          <ReferenceLine
            x={medianBin?.label}
            stroke="rgba(245,158,11,0.6)"
            strokeDasharray="5 4"
            label={{
              value: 'median',
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'var(--adda-amber)',
              fontFamily: 'var(--font-jetbrains-mono)',
            }}
          />

          <Bar dataKey="count" shape={<RoundedBar />} isAnimationActive={false}>
            {bins.map((bin, idx) => (
              <Cell
                key={idx}
                fill={idx === medianIndex ? 'var(--adda-amber)' : 'rgba(245,158,11,0.45)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Insight */}
      {medianBin && (
        <div style={{
          marginTop: 14,
          padding: '8px 12px',
          background: 'var(--adda-bg-elevated)',
          borderRadius: 7,
          fontSize: 12,
          color: 'var(--adda-text-secondary)',
          fontFamily: 'var(--font-inter)',
          lineHeight: 1.5,
        }}>
          Most bookings arrive{' '}
          <span style={{ color: 'var(--adda-amber)', fontWeight: 600 }}>
            {medianBin.daysRange} days
          </span>{' '}
          before the event — set your instant-accept window to match.
        </div>
      )}
    </div>
  )
}
