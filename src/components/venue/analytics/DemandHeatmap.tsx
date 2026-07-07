'use client'

import { Fragment, useMemo } from 'react'
import Link from 'next/link'
import type { HourDayCell } from '@/lib/venue/mock/analyticsData'
import { demandIntensity } from '@/lib/venue/mock/analyticsData'
import InsightCard, { Amber } from './InsightCard'
import { useIsMobile } from '@/hooks/useIsMobile'

// ---------------------------------------------------------------------------
// Color interpolation: 0 = --venue-bg-elevated, 5 amber stops up to #f59e0b
// ---------------------------------------------------------------------------

function cellBackground(intensity: number): string {
  if (intensity === 0) return 'var(--venue-bg-elevated)'
  if (intensity < 0.2)  return 'rgba(245,158,11,0.12)'
  if (intensity < 0.4)  return 'rgba(245,158,11,0.28)'
  if (intensity < 0.6)  return 'rgba(245,158,11,0.48)'
  if (intensity < 0.8)  return 'rgba(245,158,11,0.68)'
  return '#f59e0b'
}

function cellColor(intensity: number): string {
  return intensity > 0.7 ? '#0a0a0a' : intensity > 0 ? 'var(--venue-text-secondary)' : 'transparent'
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

// Mobile time-bands.
// Hours are averaged (not summed) so bands of different lengths
// produce comparable intensities (Early = 6 h, Night = 3 h).
const BANDS = [
  { label: 'Early',     hours: [0, 1, 2, 3, 4, 5]          }, // 12am–6am
  { label: 'Morning',   hours: [6, 7, 8, 9, 10, 11]        }, // 6am–12pm
  { label: 'Afternoon', hours: [12, 13, 14, 15, 16]        }, // 12pm–5pm
  { label: 'Evening',   hours: [17, 18, 19, 20]            }, // 5pm–9pm
  { label: 'Night',     hours: [21, 22, 23]                }, // 9pm–12am
]

// ---------------------------------------------------------------------------
// DemandHeatmap — 7 × 24 CSS grid (desktop) / 7 × 5 band grid (mobile)
// ---------------------------------------------------------------------------

interface Props {
  grid: HourDayCell[]
  /** Slug of the current venue for deep-link to pricing rules */
  venueSlug?: string
}

export default function DemandHeatmap({ grid, venueSlug }: Props) {
  const isMobile = useIsMobile()

  // Compute max from actual grid data (not mock constant)
  const gridMax = useMemo(() => Math.max(...grid.map(c => c.count), 1), [grid])

  // Compute peak description from real data (used on desktop insight card)
  const peakDescription = useMemo(() => {
    if (grid.every(c => c.count === 0)) return null
    const peak = grid.reduce((best, c) => (c.count > best.count ? c : best), grid[0])
    return `${DAYS[peak.day]} ${HOURS[peak.hour]}`
  }, [grid])

  // Build lookup: day → hour → count
  const lookup = useMemo(() => {
    const lkp: Record<number, Record<number, number>> = {}
    for (const cell of grid) {
      if (!lkp[cell.day]) lkp[cell.day] = {}
      lkp[cell.day][cell.hour] = cell.count
    }
    return lkp
  }, [grid])

  // Mobile: average count per (band, day) — average keeps different-length
  // bands on the same scale when computing relative intensity.
  const bandGrid = useMemo(() =>
    BANDS.map(band => ({
      label: band.label,
      days: DAYS.map((_, dayIdx) => {
        const counts = band.hours.map(h => lookup[dayIdx]?.[h] ?? 0)
        return counts.reduce((a, b) => a + b, 0) / counts.length
      }),
    })),
    [lookup],
  )

  const bandMax = useMemo(
    () => Math.max(...bandGrid.flatMap(b => b.days), 1),
    [bandGrid],
  )

  // Top 3 (band, day) slots by average count — drives the mobile insight header
  const hotBandSlots = useMemo(() => {
    const all: { label: string; avg: number }[] = []
    bandGrid.forEach(band => {
      band.days.forEach((avg, dayIdx) => {
        if (avg > 0) all.push({ label: `${DAYS[dayIdx]} ${band.label}`, avg })
      })
    })
    return all.sort((a, b) => b.avg - a.avg).slice(0, 3)
  }, [bandGrid])

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
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--venue-text-primary)', fontFamily: 'var(--font-inter)', marginBottom: 2 }}>
          Hour × Day Demand Heatmap
        </div>
        <div style={{ fontSize: 11, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter)' }}>
          When creators most frequently request your space — set peak rates for hot slots
        </div>
      </div>

      {/* Insight card — band-level on mobile, exact-hour on desktop */}
      {isMobile ? (
        hotBandSlots.length > 0 ? (
          <InsightCard>
            Busiest: <Amber>{hotBandSlots[0].label}</Amber>.{' '}
            {hotBandSlots.length > 1 && (
              <>Also hot: <Amber>{hotBandSlots.slice(1).map(s => s.label).join(' · ')}</Amber>.{' '}</>
            )}
            {venueSlug && (
              <Link
                href="/business/venue/venue?tab=pricing"
                style={{ color: 'var(--venue-amber)', textDecoration: 'underline', fontWeight: 600 }}
              >
                Set peak pricing →
              </Link>
            )}
          </InsightCard>
        ) : (
          <InsightCard>Not enough data yet — demand patterns appear as bookings come in.</InsightCard>
        )
      ) : (
        peakDescription ? (
          <InsightCard>
            Highest demand: <Amber>{peakDescription}</Amber>. Consider a peak pricing rule for this slot.{' '}
            {venueSlug && (
              <Link
                href="/business/venue/venue?tab=pricing"
                style={{ color: 'var(--venue-amber)', textDecoration: 'underline', fontWeight: 600 }}
              >
                Create peak pricing rule →
              </Link>
            )}
          </InsightCard>
        ) : (
          <InsightCard>
            No booking data yet. Your hour × day demand pattern will appear here as creators book your space.
          </InsightCard>
        )
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Grid — mobile: 7 × 5 band grid; desktop: 7 × 24 hour grid         */}
      {/* ----------------------------------------------------------------- */}

      {isMobile ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '64px repeat(7, 1fr)',
            gridTemplateRows: 'auto repeat(5, 34px)',
            gap: 2,
            marginTop: 12,
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
                color: day === 'Fri' || day === 'Sat' ? 'var(--venue-amber)' : 'var(--venue-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                paddingBottom: 4,
                letterSpacing: '0.5px',
              }}
            >
              {day}
            </div>
          ))}

          {/* 5 band rows: band label + 7 day cells */}
          {bandGrid.map(band => (
            <Fragment key={band.label}>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--venue-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 6,
                  letterSpacing: '-0.2px',
                }}
              >
                {band.label}
              </div>

              {band.days.map((avg, dayIdx) => {
                const intensity = demandIntensity(avg, bandMax)
                return (
                  <div
                    key={`band-${band.label}-${dayIdx}`}
                    style={{
                      background: cellBackground(intensity),
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      color: cellColor(intensity),
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                    }}
                  >
                    {intensity >= 0.6 ? Math.round(avg) : ''}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      ) : (
        /* Desktop: original 7 × 24 hour grid */
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
                  color: day === 'Fri' || day === 'Sat' ? 'var(--venue-amber)' : 'var(--venue-text-muted)',
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
                    color: 'var(--venue-text-muted)',
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
                  const intensity = demandIntensity(count, gridMax)

                  return (
                    <div
                      key={`cell-${dayIdx}-${hour}`}
                      title={count > 0 ? `${DAYS[dayIdx]} ${hourLabel}: ${count} bookings` : undefined}
                      style={{
                        background: cellBackground(intensity),
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        color: cellColor(intensity),
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        cursor: count > 0 ? 'default' : undefined,
                        transition: 'opacity 0.1s',
                      }}
                    >
                      {intensity >= 0.6 ? count : ''}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Color scale legend — same on both */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter)' }}>No demand</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: 2,
              background: intensity === 0 ? 'var(--venue-bg-elevated)' : cellBackground(intensity),
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter)' }}>Peak demand</span>
      </div>
    </div>
  )
}
