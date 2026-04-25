'use client'

import dynamic from 'next/dynamic'
import type { DailyMetric } from '@/lib/adda/mock/analyticsData'
import InsightCard, { Amber } from './InsightCard'

// Nivo calendar requires a DOM — load only on the client.
const ResponsiveCalendar = dynamic(
  () => import('@nivo/calendar').then(m => m.ResponsiveCalendar),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>
          Loading calendar…
        </span>
      </div>
    ),
  },
)

// ---------------------------------------------------------------------------
// Amber sequential color scale (5 stops)
// ---------------------------------------------------------------------------

const CALENDAR_COLORS = [
  'rgba(245,158,11,0.18)',
  'rgba(245,158,11,0.38)',
  'rgba(245,158,11,0.58)',
  '#d97706',
  '#f59e0b',
]

// ---------------------------------------------------------------------------
// Custom tooltip for a calendar day
// ---------------------------------------------------------------------------

function DayTooltip({ day, value, data }: { day: string; value: number; data: DailyMetric | undefined }) {
  const date = new Date(day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div style={{
      background: 'var(--adda-bg-elevated)',
      border: '1px solid var(--adda-border-default)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      color: 'var(--adda-text-primary)',
      minWidth: 180,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--adda-text-secondary)' }}>{date}</div>
      {data ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--adda-text-muted)' }}>Bookings</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--adda-amber)' }}>{data.bookings}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--adda-text-muted)' }}>Hours booked</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{data.hours}h</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--adda-text-muted)' }}>Revenue</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--adda-amber)' }}>
              ₹{Math.round(data.revenuePaise / 100).toLocaleString('en-IN')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--adda-text-muted)' }}>Occupancy</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{data.occupancyPercent}%</span>
          </div>
          {data.hasPendingRequest && (
            <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--adda-amber)', borderTop: '1px solid var(--adda-border-subtle)', paddingTop: 5 }}>
              ⬤ Pending request on this day
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--adda-text-muted)' }}>No bookings</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CalendarHeatmap
// ---------------------------------------------------------------------------

interface Props {
  days: DailyMetric[]
  busiestMonth: string
  highestOccupancyDay: string
}

export default function CalendarHeatmap({ days, busiestMonth, highestOccupancyDay }: Props) {
  // Build lookup for tooltip data
  const byDate = new Map(days.map(d => [d.date, d]))

  // Nivo calendar data — value = occupancyPercent (0-100)
  const calData = days
    .filter(d => d.occupancyPercent > 0)
    .map(d => ({ day: d.date, value: d.occupancyPercent }))

  // Date range: first → last day in dataset
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const fromDate = sorted[0]?.date ?? '2025-01-01'
  const toDate   = sorted[sorted.length - 1]?.date ?? '2026-04-21'

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
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adda-text-primary)', fontFamily: 'var(--font-inter)', marginBottom: 4 }}>
          365-Day Occupancy Calendar
        </div>
      </div>

      <InsightCard>
        Your busiest month was{' '}
        <Amber>{busiestMonth}</Amber>.{' '}
        <Amber>{highestOccupancyDay}</Amber> are your highest-occupancy day — consider promoting weekend slots further in advance.
      </InsightCard>

      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>Low</span>
        {CALENDAR_COLORS.map((c, i) => (
          <span key={i} style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>High occupancy</span>

        {/* Pending dot legend */}
        <span style={{ marginLeft: 12, fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--adda-amber)', border: '1px solid var(--adda-amber)' }} />
          Pending request
        </span>
      </div>

      <div style={{ height: 180 }}>
        <ResponsiveCalendar
          data={calData}
          from={fromDate}
          to={toDate}
          emptyColor="var(--adda-bg-elevated)"
          colors={CALENDAR_COLORS}
          yearSpacing={40}
          monthBorderColor="var(--adda-bg-base)"
          monthBorderWidth={2}
          dayBorderWidth={2}
          dayBorderColor="var(--adda-bg-base)"
          theme={{
            text: {
              fontSize: 10,
              fill: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui',
            },
            tooltip: {
              container: {
                background: 'transparent',
                boxShadow: 'none',
                padding: 0,
              },
            },
          }}
          tooltip={({ day, value }) => (
            <DayTooltip day={day} value={Number(value)} data={byDate.get(day)} />
          )}
        />
      </div>

      {/* Note about pending dot overlay */}
      {/*
        TODO: nivo/calendar does not expose per-cell render hooks in v0.87.
        Pending request dots are shown in the tooltip but not as visual overlays.
        To add visual dots: replace ResponsiveCalendar with a custom CSS grid calendar.
      */}
    </div>
  )
}
