'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import DateRangeBar, {
  rangeFromParams,
  compareFromParams,
  presetToDates,
  previousPeriod,
} from './DateRangeBar'
import KpiSection from './KpiSection'
import RevOccTrendChart from './RevOccTrendChart'
import WaterfallChart from './WaterfallChart'
import CalendarHeatmap from './CalendarHeatmap'
import DemandHeatmap from './DemandHeatmap'
import PageViewsChart from './PageViewsChart'
import InsightCard, { Amber } from './InsightCard'

import {
  computeKpis,
  computeTrend,
  computeWaterfall,
  getBusiestMonth,
  getHighestOccupancyDay,
} from '@/lib/venue/mock/analyticsData'

import type { VenueAnalyticsData, ProposalFunnel } from '@/app/actions/venue-analytics'

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--venue-text-muted)',
      fontFamily: 'var(--font-jetbrains-mono), monospace',
      letterSpacing: '0.7px',
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 32,
    }}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Booking funnel section (real data)
// ---------------------------------------------------------------------------

function ProposalFunnelSection({ funnel }: { funnel: ProposalFunnel }) {
  const { received, accepted, eventsCompleted } = funnel
  const acceptRate = received > 0 ? Math.round((accepted / received) * 100) : 0

  const steps = [
    {
      label: 'Proposals received',
      value: received,
      color: 'var(--venue-text-secondary)',
      desc: 'Booking requests from makers',
    },
    {
      label: 'Accepted',
      value: accepted,
      color: 'var(--venue-amber)',
      desc: acceptRate > 0 ? `${acceptRate}% acceptance rate` : 'No accepted proposals yet',
    },
    {
      label: 'Events completed',
      value: eventsCompleted,
      color: '#5DD9D0',
      desc: 'Past events that ran at your venue',
    },
  ]

  return (
    <div style={{
      background: 'var(--venue-bg-surface)',
      border: '1px solid var(--venue-border-subtle)',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: 'var(--venue-text-primary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: 20,
      }}>
        Booking Funnel
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {steps.map(({ label, value, color, desc }, i) => (
          <div
            key={label}
            style={{
              flex: 1, textAlign: 'center', padding: '0 20px',
              borderRight: i < steps.length - 1 ? '1px solid var(--venue-border-subtle)' : 'none',
            }}
          >
            <div style={{
              fontSize: 40, fontWeight: 800, color,
              fontFamily: 'var(--font-syne, system-ui, sans-serif)',
              lineHeight: 1,
            }}>
              {value}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--venue-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginTop: 8,
            }}>
              {label}
            </div>
            <div style={{
              fontSize: 11, color: 'var(--venue-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginTop: 3,
            }}>
              {desc}
            </div>

            {/* Funnel arrow between steps */}
            {i < steps.length - 1 && (
              <div style={{
                position: 'absolute',
                // not easily positioned — handled by border between flex items
              }} />
            )}
          </div>
        ))}
      </div>

      {received === 0 && (
        <div style={{
          textAlign: 'center', marginTop: 16, paddingTop: 16,
          borderTop: '1px solid var(--venue-border-subtle)',
          fontSize: 12, color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          No proposals yet — your funnel will populate as makers discover and book your space.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state (no data yet)
// ---------------------------------------------------------------------------

function EmptyState({ venueSlug }: { venueSlug: string }) {
  return (
    <div style={{
      padding: '0 28px 48px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: 480, gap: 20,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 64, height: 64,
        background: 'rgba(93,217,208,0.08)',
        border: '1px solid rgba(93,217,208,0.2)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#5DD9D0' }}>
          analytics
        </span>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          fontSize: 18, fontWeight: 700,
          color: 'var(--venue-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          marginBottom: 8,
        }}>
          No data yet
        </div>
        <div style={{
          fontSize: 13, color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          lineHeight: 1.6,
        }}>
          Analytics will populate as creators discover and book your venue. Share your listing to get started.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href={`/venue/${venueSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            background: '#5DD9D0', color: '#07070A',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
          View your listing
        </Link>
        <Link
          href="/business/venue/creators"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            background: 'transparent',
            border: '1px solid var(--venue-border-default)',
            color: 'var(--venue-text-secondary)',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_search</span>
          Check proposals
        </Link>
      </div>

      <div style={{
        fontSize: 9, color: 'var(--venue-text-muted)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        Analytics update in real time
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AnalyticsPageClient
// ---------------------------------------------------------------------------

interface Props {
  venueName: string
  venueSlug: string
  realData: VenueAnalyticsData
}

export default function AnalyticsPageClient({ venueName: _venueName, venueSlug, realData }: Props) {
  const searchParams = useSearchParams()

  const currentRange = rangeFromParams(searchParams)
  const compareOn    = compareFromParams(searchParams)

  const { from, to }             = useMemo(() => presetToDates(currentRange), [currentRange])
  const { from: prevFrom, to: prevTo } = useMemo(() => previousPeriod(from, to), [from, to])

  // Real daily metrics (all history)
  const allMetrics = realData.dailyMetrics

  // Filter to selected date range
  const currentDays = useMemo(() => {
    const fromStr = from.toISOString().slice(0, 10)
    const toStr   = to.toISOString().slice(0, 10)
    return allMetrics.filter(d => d.date >= fromStr && d.date <= toStr)
  }, [from, to, allMetrics])

  const prevDays = useMemo(() => {
    const fromStr = prevFrom.toISOString().slice(0, 10)
    const toStr   = prevTo.toISOString().slice(0, 10)
    return allMetrics.filter(d => d.date >= fromStr && d.date <= toStr)
  }, [prevFrom, prevTo, allMetrics])

  // Aggregates
  const kpis     = useMemo(() => computeKpis(currentDays), [currentDays])
  const prevKpis = useMemo(() => (compareOn ? computeKpis(prevDays) : null), [compareOn, prevDays])
  const totalBookings     = useMemo(() => currentDays.reduce((s, d) => s + d.bookings, 0), [currentDays])
  const prevTotalBookings = useMemo(() => prevDays.reduce((s, d) => s + d.bookings, 0), [prevDays])

  // Trend
  const trend     = useMemo(() => computeTrend(currentDays), [currentDays])
  const prevTrend = useMemo(() => (compareOn ? computeTrend(prevDays) : undefined), [compareOn, prevDays])

  // Waterfall (approximation — venue share ÷ 0.35 back-calculates gross)
  const waterfall = useMemo(() => computeWaterfall(currentDays), [currentDays])

  // Calendar insight labels (full history, not range-filtered)
  const busiestMonth       = useMemo(() => getBusiestMonth(allMetrics),       [allMetrics])
  const highestOccupancyDay = useMemo(() => getHighestOccupancyDay(allMetrics), [allMetrics])

  const avgOccupancy = kpis.occupancyPercent

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!realData.hasData) {
    return <EmptyState venueSlug={venueSlug} />
  }

  return (
    <div style={{ padding: '0 28px 48px' }}>

      {/* ── Date range controls ─────────────────────────────────────────────── */}
      <DateRangeBar currentRange={currentRange} compareEnabled={compareOn} />

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <KpiSection
        kpis={kpis}
        prevKpis={prevKpis}
        totalBookings={totalBookings}
        prevTotalBookings={prevTotalBookings}
      />

      {/* ── Revenue & Occupancy Trend ────────────────────────────────────────── */}
      <SectionHeading>Revenue & Occupancy Trend</SectionHeading>

      {avgOccupancy > 0 ? (
        <InsightCard>
          Average occupancy this period: <Amber>{avgOccupancy}%</Amber>.{' '}
          <Amber>{highestOccupancyDay}</Amber> are your highest-occupancy day — consider promoting those slots further in advance.
        </InsightCard>
      ) : (
        <InsightCard>
          No bookings with revenue in this date range. Try a longer window or check back after your next event.
        </InsightCard>
      )}

      <RevOccTrendChart data={trend} compareData={compareOn ? prevTrend : undefined} />

      {/* ── Revenue Breakdown ───────────────────────────────────────────────── */}
      <SectionHeading>Revenue Breakdown</SectionHeading>

      <WaterfallChart data={waterfall} />

      {/* ── Booking Funnel (all-time) ────────────────────────────────────────── */}
      <SectionHeading>Booking Funnel</SectionHeading>

      <ProposalFunnelSection funnel={realData.proposalFunnel} />

      {/* ── Occupancy Calendar (all history) ────────────────────────────────── */}
      <SectionHeading>Occupancy Calendar</SectionHeading>

      <CalendarHeatmap
        days={allMetrics}
        busiestMonth={busiestMonth}
        highestOccupancyDay={highestOccupancyDay}
      />

      {/* ── Hour × Day Demand Pattern ────────────────────────────────────────── */}
      <SectionHeading>Hour × Day Demand Pattern</SectionHeading>

      <DemandHeatmap grid={realData.demandGrid} venueSlug={venueSlug} />

      {/* ── Page Views ──────────────────────────────────────────────────────── */}
      <SectionHeading>Page Views</SectionHeading>

      <PageViewsChart trafficStats={realData.trafficStats} venueSlug={venueSlug} />

    </div>
  )
}
