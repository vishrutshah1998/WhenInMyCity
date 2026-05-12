'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import type { HourDayCell } from '@/lib/adda/mock/analyticsData'
import { demandIntensity, DEMAND_GRID_MAX, DEMAND_PEAK_DESCRIPTION } from '@/lib/adda/mock/analyticsData'
import InsightCard, { Amber } from './InsightCard'

// ---------------------------------------------------------------------------
// Color interpolation: 0 = --adda-bg-elevated, 5 amber stops up to #f59e0b
// ---------------------------------------------------------------------------

function cellBackground(intensity: number): string {
  if (intensity === 0) return 'var(--adda-bg-elevated)'
  if (intensity < 0.2)  return 'rgba(245,158,11,0.12)'
  if (intensity < 0.4)  return 'rgba(245,158,11,0.28)'
  if (intensity < 0.6)  return 'rgba(245,158,11,0.48)'
  if (intensity < 0.8)  return 'rgba(245,158,11,0.68)'
  return '#f59e0b'
}

function cellColor(intensity: number): string {
  return intensity > 0.7 ? '#0a0a0a' : intensity > 0 ? 'var(--adda-text-secondary)' : 'transparent'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
})

// ---------------------------------------------------------------------------
// DemandHeatmap — 7 × 24 CSS grid
// ---------------------------------------------------------------------------

interface Props {
  grid: HourDayCell[]
  /** Slug of the current venue for deep-link to pricing rules */
  venueSlug?: string
}

export default function DemandHeatmap({ grid, venueSlug }: Props) {
  // Build lookup: day → hour → count
  const lookup: Record<number, Record<number, number>> = {}
  for (const cell of grid) {
    if (!lookup[cell.day]) lookup[cell.day] = {}
    lookup[cell.day][cell.hour] = cell.count
  }

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
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adda-text-primary)', fontFamily: 'var(--font-inter)', marginBottom: 2 }}>
          Hour × Day Demand Heatmap
        </div>
        <div style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>
          When creators most frequently request your space — set peak rates for hot slots
        </div>
      </div>

      <InsightCard>
        Highest demand: <Amber>{DEMAND_PEAK_DESCRIPTION}</Amber>. Consider a peak pricing rule for these slots.{' '}
        {venueSlug && (
          <>
            {' '}
            <Link
              href={`/adda/venue?tab=pricing&prefill=fri-sat-17-21`}
              style={{ color: 'var(--adda-amber)', textDecoration: 'underline', fontWeight: 600 }}
            >
              Create peak pricing rule →
            </Link>
          </>
        )}
      </InsightCard>

      {/* Grid container */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '36px repeat(7, 1fr)',
            gridTemplateRows: 'auto repeat(24, 22px)',
            gap: 2,
            minWidth: 420,
          }}
        >
          {/* Header row: empty corner + day labels */}
          <div />
          {DAYS.map(day => (
            <div
              key={day}
              style={{
                fontSize: 10,
                fontWeight: 600,
                textAlign: 'center',
                color: day === 'Fri' || day === 'Sat' ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                paddingBottom: 4,
                letterSpacing: '0.5px',
              }}
            >
              {day}
            </div>
          ))}

          {/* Data rows: hour label + 7 day cells */}
          {HOURS.map((hourLabel, hour) => (
            <Fragment key={hour}>
              {/* Hour label */}
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--adda-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 5,
                  letterSpacing: '-0.2px',
                }}
              >
                {hourLabel}
              </div>

              {/* 7 cells for each day */}
              {DAYS.map((_, dayIdx) => {
                const count     = lookup[dayIdx]?.[hour] ?? 0
                const intensity = demandIntensity(count, DEMAND_GRID_MAX)
                const bg        = cellBackground(intensity)
                const textColor = cellColor(intensity)

                return (
                  <div
                    key={`cell-${dayIdx}-${hour}`}
                    title={count > 0 ? `${DAYS[dayIdx]} ${hourLabel}: ${count} bookings` : undefined}
                    style={{
                      background: bg,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      color: textColor,
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      cursor: count > 0 ? 'default' : undefined,
                      transition: 'opacity 0.1s',
                    }}
                  >
                    {/* Show count only in high-demand cells to avoid clutter */}
                    {intensity >= 0.6 ? count : ''}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>No demand</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: 2,
              background: intensity === 0 ? 'var(--adda-bg-elevated)' : cellBackground(intensity),
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter)' }}>Peak demand</span>
      </div>
    </div>
  )
}
