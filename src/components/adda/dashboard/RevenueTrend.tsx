'use client'

import dynamic from 'next/dynamic'
import type { MonthlyRevenue } from './charts/RevenueTrendChart'

const RevenueTrendChart = dynamic(
  () => import('./charts/RevenueTrendChart'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 240, display: 'grid', placeItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>
          Loading chart…
        </span>
      </div>
    ),
  },
)

interface Props {
  data: MonthlyRevenue[]
}

export default function RevenueTrend({ data }: Props) {
  const averagePaise = data.length
    ? Math.round(data.reduce((s, d) => s + d.gross_paise, 0) / data.length)
    : 0

  return (
    <div style={{
      background: 'var(--adda-bg-surface)',
      border: '1px solid var(--adda-border-subtle)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--adda-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--adda-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Revenue Trend
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            marginTop: 2,
          }}>
            Last 6 months · Gross vs Net (your share)
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { color: 'var(--adda-amber)',   label: 'Gross' },
            { color: 'var(--adda-success)', label: 'Net' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
              <span style={{
                fontSize: 11,
                color: 'var(--adda-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ padding: '8px 4px 4px' }}>
        <RevenueTrendChart data={data} averagePaise={averagePaise} />
      </div>
    </div>
  )
}
