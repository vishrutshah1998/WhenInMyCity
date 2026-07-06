'use client'

import { useState, useMemo } from 'react'
import type { CalendarEvent } from '@/lib/adda/mock/calendarEvents'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOfWeek(anchor: Date): Date {
  const dow = anchor.getDay() // 0=Sun
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(d.getDate() + n)
  return out
}

function fmtTime(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ---------------------------------------------------------------------------
// Status helpers — match AddaCalendarClient colour conventions
// ---------------------------------------------------------------------------

function statusColor(status: CalendarEvent['status']): string {
  switch (status) {
    case 'confirmed': return 'var(--adda-amber)'
    case 'pending':   return '#d97706'
    case 'tentative': return '#d97706'
    case 'blocked':   return 'var(--adda-text-muted)'
    case 'external':  return '#10b981'
    case 'buffer':    return 'var(--adda-text-muted)'
    default:          return 'var(--adda-text-muted)'
  }
}

function statusDotBg(status: CalendarEvent['status']): string {
  switch (status) {
    case 'confirmed': return 'var(--adda-amber)'
    case 'pending':   return 'transparent'
    case 'tentative': return 'transparent'
    case 'blocked':   return 'var(--adda-bg-overlay, #27272a)'
    case 'external':  return '#10b981'
    default:          return 'transparent'
  }
}

function statusLabel(status: CalendarEvent['status']): string {
  switch (status) {
    case 'confirmed': return 'Confirmed'
    case 'pending':   return 'Pending'
    case 'tentative': return 'Hold'
    case 'blocked':   return 'Blocked'
    case 'external':  return 'External'
    case 'buffer':    return 'Buffer'
    default:          return status
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DayCell({
  day,
  isToday,
  isSelected,
  dotCount,
  hasPending,
  onSelect,
}: {
  day: Date
  isToday: boolean
  isSelected: boolean
  dotCount: number
  hasPending: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 0 8px',
        minHeight: 72,
        flex: 1,
        borderRadius: 10,
        border: isSelected
          ? '1.5px solid var(--adda-amber)'
          : isToday
            ? '1px solid rgba(245,158,11,0.4)'
            : '1px solid transparent',
        background: isSelected
          ? 'rgba(245,158,11,0.12)'
          : isToday
            ? 'rgba(245,158,11,0.05)'
            : 'transparent',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      {/* Weekday abbr */}
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        color: isSelected || isToday ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        letterSpacing: '0.4px',
        lineHeight: 1,
      }}>
        {DAY_ABBR[day.getDay()]}
      </span>

      {/* Date number */}
      <span style={{
        fontSize: 18,
        fontWeight: isSelected || isToday ? 700 : 400,
        color: isSelected || isToday ? 'var(--adda-amber)' : 'var(--adda-text-primary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        lineHeight: 1,
      }}>
        {day.getDate()}
      </span>

      {/* Booking indicator */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', minHeight: 8 }}>
        {dotCount > 0 && (
          <div style={{
            width: dotCount > 2 ? 16 : dotCount * 7,
            height: 4,
            borderRadius: 2,
            background: 'var(--adda-amber)',
            opacity: isSelected ? 1 : 0.7,
          }} />
        )}
        {hasPending && dotCount === 0 && (
          <div style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            border: '1.5px dashed #d97706',
          }} />
        )}
      </div>
    </button>
  )
}

function AgendaItem({ event }: { event: CalendarEvent }) {
  const color = statusColor(event.status)
  const dotBg = statusDotBg(event.status)
  const isPending = event.status === 'pending' || event.status === 'tentative'
  const isBuffer = event.status === 'buffer'

  if (isBuffer) return null // buffers not shown in agenda

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '14px 0',
      borderBottom: '1px solid var(--adda-border-subtle)',
    }}>
      {/* Time column */}
      <div style={{
        flexShrink: 0,
        width: 72,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingTop: 2,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--adda-text-primary)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
        }}>
          {fmtTime(event.start)}
        </span>
        <span style={{
          fontSize: 11,
          color: 'var(--adda-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
        }}>
          {fmtTime(event.end)}
        </span>
      </div>

      {/* Left accent bar */}
      <div style={{
        flexShrink: 0,
        width: 3,
        alignSelf: 'stretch',
        borderRadius: 2,
        background: isPending
          ? 'repeating-linear-gradient(to bottom, #d97706 0px, #d97706 4px, transparent 4px, transparent 8px)'
          : color,
        opacity: event.status === 'blocked' ? 0.5 : 1,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotBg,
            border: isPending ? `1.5px dashed ${color}` : 'none',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--adda-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {event.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11,
            color,
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontWeight: 500,
            letterSpacing: '0.03em',
          }}>
            {statusLabel(event.status)}
          </span>
          {event.creatorName && (
            <>
              <span style={{ color: 'var(--adda-border-default)', fontSize: 10 }}>·</span>
              <span style={{
                fontSize: 12,
                color: 'var(--adda-text-secondary)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}>
                {event.creatorName}
              </span>
            </>
          )}
          {event.hourlyRate && event.status === 'confirmed' && (
            <>
              <span style={{ color: 'var(--adda-border-default)', fontSize: 10 }}>·</span>
              <span style={{
                fontSize: 11,
                color: 'var(--adda-amber)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}>
                ₹{Math.round(event.hourlyRate * (event.end.getTime() - event.start.getTime()) / 3_600_000_00) / 10}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  events: CalendarEvent[]
  onBlockTime?: () => void
}

export default function MobileCalendarView({ events, onBlockTime }: Props) {
  const today = useMemo(() => new Date(), [])
  const [weekAnchor, setWeekAnchor] = useState(() => getMondayOfWeek(today))
  const [selectedDate, setSelectedDate] = useState(today)

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
  [weekAnchor])

  const todayKey = toDateKey(today)
  const selectedKey = toDateKey(selectedDate)

  // Map date key → real bookings (exclude buffer display events)
  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      if (ev.status === 'buffer') continue
      const key = toDateKey(ev.start)
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(ev)
    }
    // Sort each day's events by start time
    for (const [, list] of m) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime())
    }
    return m
  }, [events])

  const selectedDayEvents = eventsByDate.get(selectedKey) ?? []

  const weekLabel = useMemo(() => {
    const end = addDays(weekAnchor, 6)
    const sameMonth = weekAnchor.getMonth() === end.getMonth()
    if (sameMonth) {
      return `${MONTH_NAMES[weekAnchor.getMonth()]} ${weekAnchor.getDate()}–${end.getDate()}, ${weekAnchor.getFullYear()}`
    }
    return `${MONTH_NAMES[weekAnchor.getMonth()]} ${weekAnchor.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  }, [weekAnchor])

  function goToPrevWeek() {
    setWeekAnchor(prev => addDays(prev, -7))
  }
  function goToNextWeek() {
    setWeekAnchor(prev => addDays(prev, 7))
  }
  function goToToday() {
    setWeekAnchor(getMondayOfWeek(today))
    setSelectedDate(today)
  }

  return (
    <div className="adda-theme" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--adda-bg-base)',
      color: 'var(--adda-text-primary)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── Week navigation header ── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px 0',
        borderBottom: '1px solid var(--adda-border-subtle)',
        background: 'var(--adda-bg-surface)',
      }}>
        {/* Month label + nav */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {weekLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={goToToday}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--adda-border-default)',
                background: 'transparent',
                color: 'var(--adda-amber)',
                fontSize: 11,
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              TODAY
            </button>
            <button
              onClick={goToPrevWeek}
              aria-label="Previous week"
              style={{
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
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            <button
              onClick={goToNextWeek}
              aria-label="Next week"
              style={{
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
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
          </div>
        </div>

        {/* Day cells strip */}
        <div style={{
          display: 'flex',
          gap: 2,
          paddingBottom: 12,
        }}>
          {weekDays.map(day => {
            const key = toDateKey(day)
            const dayEvents = eventsByDate.get(key) ?? []
            const confirmedCount = dayEvents.filter(e => e.status === 'confirmed').length
            const hasPending = dayEvents.some(e => e.status === 'pending' || e.status === 'tentative')
            return (
              <DayCell
                key={key}
                day={day}
                isToday={key === todayKey}
                isSelected={key === selectedKey}
                dotCount={confirmedCount}
                hasPending={hasPending}
                onSelect={() => setSelectedDate(day)}
              />
            )
          })}
        </div>
      </div>

      {/* ── Agenda list ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 16px',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* Date heading */}
        <div style={{
          padding: '14px 0 2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: selectedKey === todayKey ? 'var(--adda-amber)' : 'var(--adda-text-secondary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            {selectedKey === todayKey ? 'Today' : `${DAY_ABBR[selectedDate.getDay()]}, ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}`}
          </span>
          {selectedDayEvents.length > 0 && (
            <span style={{
              fontSize: 11,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
            }}>
              {selectedDayEvents.length} booking{selectedDayEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {selectedDayEvents.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 56,
            gap: 12,
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 40,
              color: 'var(--adda-border-default)',
            }}>
              event_available
            </span>
            <span style={{
              fontSize: 14,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              No bookings this day
            </span>
            {onBlockTime && (
              <button
                onClick={onBlockTime}
                style={{
                  marginTop: 8,
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px dashed var(--adda-amber-border, rgba(245,158,11,0.4))',
                  background: 'transparent',
                  color: 'var(--adda-amber)',
                  fontSize: 12,
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                + BLOCK TIME
              </button>
            )}
          </div>
        ) : (
          /* Booking list */
          <div>
            {selectedDayEvents.map(event => (
              <AgendaItem key={event.id} event={event} />
            ))}
            {/* Bottom padding for mobile nav */}
            <div style={{ height: 80 }} />
          </div>
        )}
      </div>
    </div>
  )
}
