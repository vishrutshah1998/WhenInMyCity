'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { AddaAvailability } from '@/types/database'

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const SLOT_ABBR: Record<string, string> = {
  morning: 'AM',
  afternoon: 'PM',
  evening: 'Eve',
  full_day: 'All',
}

function getMondayOfCurrentWeek(): Date {
  const today = new Date()
  const dow = today.getDay() // 0=Sun … 6=Sat
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  availability: AddaAvailability[]
}

export default function WeekStrip({ availability }: Props) {
  const monday = getMondayOfCurrentWeek()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const todayKey = toDateKey(new Date())

  // Build date → slot list map
  const slotMap = useMemo(() => {
    const m = new Map<string, AddaAvailability[]>()
    for (const slot of availability) {
      if (!m.has(slot.date)) m.set(slot.date, [])
      m.get(slot.date)!.push(slot)
    }
    return m
  }, [availability])

  function blockStyle(status: string): React.CSSProperties {
    switch (status) {
      case 'confirmed':
        return {
          background: 'var(--venue-confirmed)',
          color: '#000',
        }
      case 'pending':
        return {
          background: 'var(--venue-pending)',
          border: '1px dashed var(--venue-amber)',
          color: 'var(--venue-amber)',
        }
      case 'blocked':
        return {
          background: 'var(--venue-blocked)',
          border: '1px dotted var(--venue-border-default)',
          color: 'var(--venue-text-muted)',
        }
      default:
        return {
          background: 'var(--venue-bg-hover)',
          color: 'var(--venue-text-muted)',
        }
    }
  }

  return (
    <div style={{
      background: 'var(--venue-bg-surface)',
      border: '1px solid var(--venue-border-subtle)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--venue-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--venue-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          This Week
        </span>
        <Link
          href="/business/venue/calendar"
          style={{
            fontSize: 12,
            color: 'var(--venue-amber)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Full calendar
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
        </Link>
      </div>

      {/* Day columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1,
        padding: '12px 16px 16px',
        height: 160,
      }}>
        {days.map(day => {
          const key = toDateKey(day)
          const isToday = key === todayKey
          const slots = slotMap.get(key) ?? []

          return (
            <Link
              key={key}
              href="/business/venue/calendar"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 4px',
                borderRadius: 8,
                border: isToday ? '1px solid var(--venue-amber)' : '1px solid transparent',
                background: isToday ? 'var(--venue-amber-tint)' : 'transparent',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 160ms ease',
                minWidth: 0,
              }}
            >
              {/* Day abbreviation */}
              <span style={{
                fontSize: 10,
                fontWeight: 500,
                color: isToday ? 'var(--venue-amber)' : 'var(--venue-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                letterSpacing: '0.5px',
              }}>
                {DAY_ABBR[day.getDay()]}
              </span>

              {/* Date number */}
              <span
                className="font-adda-nums"
                style={{
                  fontSize: 15,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--venue-amber)' : 'var(--venue-text-primary)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  lineHeight: 1,
                }}
              >
                {day.getDate()}
              </span>

              {/* Booking blocks — stacked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', flex: 1 }}>
                {slots.slice(0, 3).map(slot => (
                  <div
                    key={slot.id}
                    title={`${slot.slot_type} · ${slot.status}`}
                    style={{
                      ...blockStyle(slot.status),
                      borderRadius: 3,
                      padding: '1px 3px',
                      fontSize: 9,
                      fontWeight: 600,
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      textAlign: 'center',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {SLOT_ABBR[slot.slot_type] ?? slot.slot_type}
                  </div>
                ))}
                {slots.length > 3 && (
                  <div style={{
                    fontSize: 9,
                    color: 'var(--venue-text-muted)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                  }}>
                    +{slots.length - 3}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: '8px 20px 12px',
        borderTop: '1px solid var(--venue-border-subtle)',
      }}>
        {[
          { label: 'Confirmed', color: 'var(--venue-confirmed)' },
          { label: 'Pending',   color: 'var(--venue-amber)' },
          { label: 'Blocked',   color: 'var(--venue-bg-overlay)' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{
              fontSize: 10,
              color: 'var(--venue-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
