'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { VenueTrafficStats } from '@/app/actions/venue-analytics'

interface Props {
  trafficStats: VenueTrafficStats
  venueSlug: string
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--venue-bg-elevated)',
        border: '1px solid var(--venue-border-default)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: 'var(--venue-text-primary)',
        minWidth: 120,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--venue-text-secondary)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#a78bfa' }}>Views</span>
        <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 600 }}>
          {payload[0].value}
        </span>
      </div>
    </div>
  )
}

export default function PageViewsChart({ trafficStats, venueSlug }: Props) {
  const { totalViews, byDay, windowDays } = trafficStats

  const chartData = byDay.map(d => ({
    label: d.date.slice(5).replace('-', '/'),   // MM/DD
    count: d.count,
  }))

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--venue-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            marginBottom: 2,
          }}>
            Page Views
          </div>
          <div style={{ fontSize: 11, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter)' }}>
            Visits to your public listing over the last {windowDays} days
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color: 'var(--venue-text-primary)',
            fontFamily: 'var(--font-syne, system-ui, sans-serif)', lineHeight: 1,
          }}>
            {totalViews}
          </div>
          <div style={{ fontSize: 10, color: 'var(--venue-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            total views
          </div>
        </div>
      </div>

      {totalViews === 0 ? (
        <div style={{
          padding: '24px 0',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 12, color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            maxWidth: 380, margin: '0 auto', lineHeight: 1.6,
          }}>
            No visits to{' '}
            <span style={{ color: 'var(--venue-amber)', fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 11 }}>
              wheninmycity.com/venue/{venueSlug}
            </span>{' '}
            recorded in this window yet.
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--venue-border-subtle)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--venue-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
              axisLine={{ stroke: 'var(--venue-border-subtle)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--venue-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--venue-bg-elevated)' }} />
            <Bar dataKey="count" name="Views" fill="#a78bfa" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
