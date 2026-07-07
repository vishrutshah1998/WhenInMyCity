'use client'

// Dynamically imported by RevenueTrend — never SSR'd (Recharts touches DOM on init).
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

export interface MonthlyRevenue {
  month: string       // e.g. "Nov"
  gross_paise: number
  net_paise: number
}

function formatInr(paise: number) {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--venue-bg-elevated)',
      border: '1px solid var(--venue-border-default)',
      borderRadius: 6,
      padding: '10px 14px',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 11, color: 'var(--venue-text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: 'var(--venue-text-secondary)', textTransform: 'capitalize' }}>{p.name}</span>
          <span
            className="font-venue-nums"
            style={{ fontWeight: 700, color: 'var(--venue-text-primary)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
          >
            {formatInr(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data: MonthlyRevenue[]
  averagePaise: number
}

export default function RevenueTrendChart({ data, averagePaise }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="venueAmberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--venue-amber)" stopOpacity={0.20} />
            <stop offset="95%" stopColor="var(--venue-amber)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="venueNetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--venue-success)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--venue-success)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--venue-border-subtle)" vertical={false} />

        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--venue-text-muted)', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `₹${(v / 100).toLocaleString('en-IN')}`}
          tick={{ fill: 'var(--venue-text-muted)', fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--venue-border-default)', strokeWidth: 1 }} />

        <ReferenceLine
          y={averagePaise}
          stroke="var(--venue-text-muted)"
          strokeDasharray="4 3"
          label={{
            value: `Avg ${formatInr(averagePaise)}`,
            position: 'insideTopRight',
            fill: 'var(--venue-text-muted)',
            fontSize: 10,
            fontFamily: 'var(--font-jetbrains-mono)',
          }}
        />

        {/* Gross revenue — amber */}
        <Area
          type="monotone"
          dataKey="gross_paise"
          name="gross"
          stroke="var(--venue-amber)"
          strokeWidth={2}
          fill="url(#venueAmberGradient)"
          dot={false}
          isAnimationActive={false}
        />
        {/* Net (venue share) — success green */}
        <Area
          type="monotone"
          dataKey="net_paise"
          name="net"
          stroke="var(--venue-success)"
          strokeWidth={1.5}
          fill="url(#venueNetGradient)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
