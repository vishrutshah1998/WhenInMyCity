'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts'
import type { WaterfallData } from '@/lib/adda/mock/analyticsData'

// ---------------------------------------------------------------------------
// Waterfall chart via stacked bars: invisible offset bar + colored value bar
// ---------------------------------------------------------------------------

interface Props {
  data: WaterfallData
}

interface WaterfallRow {
  name: string
  offset: number
  value: number
  fill: string
  isDeduction: boolean
  isResult: boolean
  pct: string
  label: string
}

function paise2Inr(p: number): string {
  const r = Math.round(p / 100)
  return r >= 1000 ? `₹${(r / 1000).toFixed(1)}k` : `₹${r}`
}

function buildRows(data: WaterfallData): WaterfallRow[] {
  const { grossPaise: gross, platformFeePaise: plat, processingFeePaise: proc, netPayoutPaise: net } = data

  return [
    {
      name: 'Gross Revenue',
      offset: 0,
      value: gross,
      fill: '#f59e0b',
      isDeduction: false,
      isResult: false,
      pct: '100%',
      label: paise2Inr(gross),
    },
    {
      name: 'Platform Fee',
      offset: net + proc,
      value: plat,
      fill: '#ef4444',
      isDeduction: true,
      isResult: false,
      pct: '15%',
      label: `−${paise2Inr(plat)}`,
    },
    {
      name: 'Processing',
      offset: net,
      value: proc,
      fill: '#fb923c',
      isDeduction: true,
      isResult: false,
      pct: '~2.5%',
      label: `−${paise2Inr(proc)}`,
    },
    {
      name: 'Net Payout',
      offset: 0,
      value: net,
      fill: '#10b981',
      isDeduction: false,
      isResult: true,
      pct: `${Math.round((net / gross) * 100)}%`,
      label: paise2Inr(net),
    },
  ]
}

function CustomLabel(props: any) {
  const { x, y, width, height, value } = props
  if (height < 24) return null
  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 4}
      textAnchor="middle"
      fill="#fff"
      fontSize={11}
      fontFamily="var(--font-jetbrains-mono), monospace"
      fontWeight={600}
    >
      {value}
    </text>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row: WaterfallRow = payload[0]?.payload
  if (!row) return null
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
      <div style={{ color: row.fill, fontFamily: 'var(--font-jetbrains-mono)' }}>
        {row.label} ({row.pct})
      </div>
    </div>
  )
}

export default function WaterfallChart({ data }: Props) {
  const rows = buildRows(data)
  const maxY  = data.grossPaise

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
          Revenue Breakdown
        </div>
        <div style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>
          From gross ticket revenue to your actual payout
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barSize={56}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--adda-border-subtle)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}
            axisLine={{ stroke: 'var(--adda-border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, maxY * 1.05]}
            tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`}
            tick={{ fontSize: 10, fill: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {/* Invisible offset bar to "float" deduction bars */}
          <Bar dataKey="offset" stackId="wf" fill="transparent" isAnimationActive={false} />

          {/* Visible value bar */}
          <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {rows.map((row, idx) => (
              <Cell key={idx} fill={row.fill} fillOpacity={row.isDeduction ? 0.75 : 1} />
            ))}
            <LabelList dataKey="label" content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Plain-language summary */}
      <div
        style={{
          marginTop: 14,
          padding: '8px 12px',
          background: 'var(--adda-bg-elevated)',
          borderRadius: 7,
          fontSize: 12,
          color: 'var(--adda-text-secondary)',
          fontFamily: 'var(--font-inter)',
          lineHeight: 1.5,
        }}
      >
        WIMC keeps{' '}
        <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {paise2Inr(data.platformFeePaise + data.processingFeePaise)}
        </span>{' '}
        per period. Your net payout is{' '}
        <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {paise2Inr(data.netPayoutPaise)}
        </span>.
      </div>
    </div>
  )
}
