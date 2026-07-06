'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { DailyMetric } from '@/lib/adda/mock/analyticsData'
import InsightCard, { Amber } from './InsightCard'
import { useIsMobile } from '@/hooks/useIsMobile'

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
// Amber sequential color scale (5 stops) — shared by desktop Nivo + mobile grid
// ---------------------------------------------------------------------------

const CALENDAR_COLORS = [
  'rgba(245,158,11,0.18)',
  'rgba(245,158,11,0.38)',
  'rgba(245,158,11,0.58)',
  '#d97706',
  '#f59e0b',
]

function occupancyColor(pct: number): string {
  if (pct <= 0)  return 'var(--adda-bg-elevated)'
  if (pct <= 20) return CALENDAR_COLORS[0]
  if (pct <= 40) return CALENDAR_COLORS[1]
  if (pct <= 60) return CALENDAR_COLORS[2]
  if (pct <= 80) return CALENDAR_COLORS[3]
  return CALENDAR_COLORS[4]
}

// ---------------------------------------------------------------------------
// Custom tooltip for a calendar day (desktop only)
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
// Mobile month grid — single-month view with prev/next nav
// ---------------------------------------------------------------------------

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const NAV_BTN: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid var(--adda-border-subtle)',
  background: 'transparent',
  color: 'var(--adda-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}

function MobileMonthGrid({
  byDate,
  initialYear,
  initialMonth,
}: {
  byDate: Map<string, DailyMetric>
  initialYear: number
  initialMonth: number
}) {
  const [year, setYear]   = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  function goToPrev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function goToNext() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build the flat array of day-numbers (null = padding cell outside this month)
  const cells = useMemo(() => {
    const firstDow   = new Date(year, month, 1).getDay()       // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr: (number | null)[] = [
      ...Array<null>(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    // Pad to a complete final week
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  return (
    <div>
      {/* Month label + nav — styled to match MobileCalendarView */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--adda-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={goToPrev} aria-label="Previous month" style={NAV_BTN}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
          <button onClick={goToNext} aria-label="Next month" style={NAV_BTN}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Day-of-week header — 2-letter abbreviations, 7 equal columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {DAY_ABBR.map(d => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: d === 'Fr' || d === 'Sa' ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              paddingBottom: 4,
              letterSpacing: '0.3px',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells — aspectRatio:1 + 1fr columns = cells scale to any width */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((dayNum, i) => {
          if (dayNum === null) {
            return (
              <div
                key={`pad-${i}`}
                style={{ aspectRatio: '1', borderRadius: 4, background: 'transparent' }}
              />
            )
          }

          const mm      = String(month + 1).padStart(2, '0')
          const dd      = String(dayNum).padStart(2, '0')
          const dateStr = `${year}-${mm}-${dd}`
          const metric  = byDate.get(dateStr)
          const pct     = metric?.occupancyPercent ?? 0
          const hasPending = metric?.hasPendingRequest ?? false
          const bg        = occupancyColor(pct)
          const textColor = pct > 60 ? '#0a0a0a' : pct > 0 ? 'var(--adda-text-secondary)' : 'var(--adda-text-muted)'

          return (
            <div
              key={dateStr}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: bg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                color: textColor,
                lineHeight: 1,
              }}>
                {dayNum}
              </span>
              {hasPending && (
                <div style={{
                  position: 'absolute',
                  bottom: 3,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--adda-amber)',
                  opacity: 0.85,
                }} />
              )}
            </div>
          )
        })}
      </div>
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
  const isMobile = useIsMobile()

  // Shared lookup: date string → DailyMetric (used by desktop tooltip and mobile grid)
  const byDate = useMemo(() => new Map(days.map(d => [d.date, d])), [days])

  // Desktop: Nivo calendar data — value = occupancyPercent (0–100)
  const calData = days
    .filter(d => d.occupancyPercent > 0)
    .map(d => ({ day: d.date, value: d.occupancyPercent }))

  // Desktop: date range first → last day in dataset
  const sorted   = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const fromDate = sorted[0]?.date ?? '2025-01-01'
  const toDate   = sorted[sorted.length - 1]?.date ?? '2026-04-21'

  // Mobile: open on the most recent month with data, fallback to today
  const { initialYear, initialMonth } = useMemo(() => {
    if (days.length === 0) {
      const now = new Date()
      return { initialYear: now.getFullYear(), initialMonth: now.getMonth() }
    }
    const lastDate = sorted[sorted.length - 1].date
    const d = new Date(lastDate + 'T12:00:00') // noon avoids TZ edge cases
    return { initialYear: d.getFullYear(), initialMonth: d.getMonth() }
  }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* ----------------------------------------------------------------- */}
      {/* Calendar — mobile: single-month grid; desktop: Nivo year view      */}
      {/* ----------------------------------------------------------------- */}

      {isMobile ? (
        <MobileMonthGrid
          byDate={byDate}
          initialYear={initialYear}
          initialMonth={initialMonth}
        />
      ) : (
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
      )}
    </div>
  )
}
