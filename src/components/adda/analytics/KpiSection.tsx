'use client'

import KpiCard from '@/components/adda/dashboard/KpiCard'
import type { KpiAggregates } from '@/lib/adda/mock/analyticsData'

interface Props {
  kpis: KpiAggregates
  prevKpis: KpiAggregates | null   // null when compare is off
  totalBookings: number
  prevTotalBookings: number
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return 0
  return Math.round(((current - previous) / previous) * 100)
}

function formatInr(paise: number): string {
  const rupees = Math.round(paise / 100)
  if (rupees >= 100000) return `${(rupees / 100000).toFixed(1)}L`
  if (rupees >= 1000)   return `${(rupees / 1000).toFixed(1)}k`
  return rupees.toLocaleString('en-IN')
}

export default function KpiSection({ kpis, prevKpis, totalBookings, prevTotalBookings }: Props) {
  const revDelta     = prevKpis ? pctDelta(kpis.netRevenuePaise, prevKpis.netRevenuePaise) : 0
  const occDelta     = prevKpis ? kpis.occupancyPercent - prevKpis.occupancyPercent : 0
  const avgDelta     = prevKpis ? pctDelta(kpis.avgBookingPaise, prevKpis.avgBookingPaise) : 0
  const bkgDelta     = prevKpis ? pctDelta(totalBookings, prevTotalBookings) : 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <KpiCard
        label="Net Revenue"
        prefix="₹"
        value={formatInr(kpis.netRevenuePaise)}
        delta={revDelta}
        deltaDirection={revDelta > 5 ? 'up' : revDelta < -5 ? 'down' : 'neutral'}
        sparklineData={kpis.sparklineRevenue}
        tooltip="Your adda's net share of ticket revenue for the selected period."
      />
      <KpiCard
        label="Occupancy Rate"
        suffix="%"
        value={kpis.occupancyPercent}
        delta={Math.abs(occDelta)}
        deltaDirection={occDelta > 0 ? 'up' : occDelta < 0 ? 'down' : 'neutral'}
        arcPercent={kpis.occupancyPercent}
        tooltip="Average occupancy across days that had at least one booking."
      />
      <KpiCard
        label="Avg Booking Value"
        prefix="₹"
        value={formatInr(kpis.avgBookingPaise)}
        delta={avgDelta}
        deltaDirection={avgDelta > 0 ? 'up' : avgDelta < 0 ? 'down' : 'neutral'}
        sparklineData={kpis.sparklineOccupancy}
        tooltip="Average adda share per confirmed booking day."
      />
      <KpiCard
        label="Total Bookings"
        value={totalBookings}
        delta={bkgDelta}
        deltaDirection={bkgDelta > 0 ? 'up' : bkgDelta < 0 ? 'down' : 'neutral'}
        tooltip="Confirmed bookings in the selected period."
      />
    </div>
  )
}
