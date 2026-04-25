'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import DateRangeBar, {
  rangeFromParams,
  compareFromParams,
  presetToDates,
  previousPeriod,
} from './DateRangeBar'
import KpiSection from './KpiSection'
import RevOccTrendChart from './RevOccTrendChart'
import WaterfallChart from './WaterfallChart'
import LeadTimeChart from './LeadTimeChart'
import CalendarHeatmap from './CalendarHeatmap'
import DemandHeatmap from './DemandHeatmap'
import BenchmarkPanel from './BenchmarkPanel'
import InsightCard, { Amber } from './InsightCard'

import {
  MOCK_DAILY_METRICS,
  MOCK_LEAD_TIME_BINS,
  LEAD_TIME_MEDIAN_INDEX,
  MOCK_DEMAND_GRID,
  MOCK_BENCHMARKS,
  MOCK_VENUE_PROFILE,
  filterByRange,
  computeKpis,
  computeTrend,
  computeWaterfall,
  getBusiestMonth,
  getHighestOccupancyDay,
  tierAtLeast,
} from '@/lib/adda/mock/analyticsData'

// ---------------------------------------------------------------------------
// Section heading helper
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--adda-text-muted)',
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
// AnalyticsPageClient
// ---------------------------------------------------------------------------

interface Props {
  venueName: string
  venueSlug: string
}

export default function AnalyticsPageClient({ venueName, venueSlug }: Props) {
  const searchParams = useSearchParams()

  const currentRange  = rangeFromParams(searchParams)
  const compareOn     = compareFromParams(searchParams)

  // Compute date bounds for current + previous period
  const { from, to } = useMemo(() => presetToDates(currentRange), [currentRange])
  const { from: prevFrom, to: prevTo } = useMemo(
    () => previousPeriod(from, to),
    [from, to],
  )

  // Filter daily metrics
  const currentDays = useMemo(() => filterByRange(from, to), [from, to])
  const prevDays    = useMemo(() => filterByRange(prevFrom, prevTo), [prevFrom, prevTo])

  // KPIs
  const kpis     = useMemo(() => computeKpis(currentDays), [currentDays])
  const prevKpis = useMemo(() => (compareOn ? computeKpis(prevDays) : null), [compareOn, prevDays])
  const totalBookings     = useMemo(() => currentDays.reduce((s, d) => s + d.bookings, 0), [currentDays])
  const prevTotalBookings = useMemo(() => prevDays.reduce((s, d) => s + d.bookings, 0), [prevDays])

  // Trend
  const trend     = useMemo(() => computeTrend(currentDays), [currentDays])
  const prevTrend = useMemo(() => (compareOn ? computeTrend(prevDays) : undefined), [compareOn, prevDays])

  // Waterfall
  const waterfall = useMemo(() => computeWaterfall(currentDays), [currentDays])

  // Calendar insight labels (always use full dataset for calendar)
  const busiestMonth       = useMemo(() => getBusiestMonth(MOCK_DAILY_METRICS), [])
  const highestOccupancyDay = useMemo(() => getHighestOccupancyDay(MOCK_DAILY_METRICS), [])

  // Tier gating
  const benchmarkUnlocked = tierAtLeast(MOCK_VENUE_PROFILE.tier, 'nukkad')

  // Revenue insight label (for trend section)
  const avgOccupancy = kpis.occupancyPercent
  const peakDayLabel = 'Saturday afternoons'

  return (
    <div style={{ padding: '0 28px 48px' }}>

      {/* ── Date range controls ─────────────────────────────────────────────── */}
      <DateRangeBar currentRange={currentRange} compareEnabled={compareOn} />

      {/* ── Section 1: KPI Row ──────────────────────────────────────────────── */}
      <KpiSection
        kpis={kpis}
        prevKpis={prevKpis}
        totalBookings={totalBookings}
        prevTotalBookings={prevTotalBookings}
      />

      {/* ── Section 2: Revenue & Occupancy Trend ────────────────────────────── */}
      <SectionHeading>Revenue & Occupancy Trend</SectionHeading>

      <InsightCard>
        Your occupancy peaks on <Amber>{peakDayLabel}</Amber> — consider a peak rate for this window.
        Average occupancy this period: <Amber>{avgOccupancy}%</Amber>.
      </InsightCard>

      <RevOccTrendChart data={trend} compareData={compareOn ? prevTrend : undefined} />

      {/* ── Section 3: Two-column middle row ────────────────────────────────── */}
      <SectionHeading>Revenue Breakdown & Booking Lead Times</SectionHeading>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <WaterfallChart data={waterfall} />
        <LeadTimeChart bins={MOCK_LEAD_TIME_BINS} medianIndex={LEAD_TIME_MEDIAN_INDEX} />
      </div>

      {/* ── Section 4: Occupancy Calendar ───────────────────────────────────── */}
      <SectionHeading>Occupancy Calendar</SectionHeading>

      <CalendarHeatmap
        days={MOCK_DAILY_METRICS}
        busiestMonth={busiestMonth}
        highestOccupancyDay={highestOccupancyDay}
      />

      {/* ── Section 5: Hour × Day Demand Heatmap ────────────────────────────── */}
      <SectionHeading>Hour × Day Demand Heatmap</SectionHeading>

      <DemandHeatmap grid={MOCK_DEMAND_GRID} venueSlug={venueSlug} />

      {/* ── Section 6: Competitive Benchmarking ─────────────────────────────── */}
      <SectionHeading>Competitive Benchmarking</SectionHeading>

      <BenchmarkPanel
        benchmarks={MOCK_BENCHMARKS}
        venueTierSufficient={benchmarkUnlocked}
        city={MOCK_VENUE_PROFILE.city}
      />

    </div>
  )
}
