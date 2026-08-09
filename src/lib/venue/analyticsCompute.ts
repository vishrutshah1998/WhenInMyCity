// ---------------------------------------------------------------------------
// Pure aggregation/formatting helpers for the Venue Analytics page. Operate
// only on real data passed in by callers (venue-analytics.ts) — no synthetic
// data generation here.
// ---------------------------------------------------------------------------

export interface DailyMetric {
  date: string             // YYYY-MM-DD
  bookings: number         // confirmed bookings
  pendingCount: number     // unconfirmed requests that day
  hours: number            // total confirmed booked hours
  revenuePaise: number     // venue's net share (paise)
  occupancyPercent: number // hours / 12 available hours × 100
  hasPendingRequest: boolean
}

export interface LeadTimeBin {
  label: string
  count: number
  daysRange: string        // human description
  isMedian?: boolean
}

export interface HourDayCell {
  day: number              // 0=Sun … 6=Sat
  hour: number             // 0–23
  count: number
}

// ---------------------------------------------------------------------------
// KPI aggregates from a slice of daily metrics
// ---------------------------------------------------------------------------

export interface KpiAggregates {
  netRevenuePaise: number
  occupancyPercent: number   // average over period
  avgBookingPaise: number
  totalBookings: number
  sparklineRevenue: number[] // last 30 data points (or fewer)
  sparklineOccupancy: number[]
}

export function computeKpis(days: DailyMetric[]): KpiAggregates {
  const netRevenuePaise = days.reduce((s, d) => s + d.revenuePaise, 0)
  const totalBookings   = days.reduce((s, d) => s + d.bookings, 0)
  const bookedDays      = days.filter(d => d.bookings > 0)
  const avgBookingPaise = bookedDays.length
    ? Math.round(netRevenuePaise / bookedDays.length)
    : 0
  const occupancyDays   = days.filter(d => d.occupancyPercent > 0)
  const occupancyPercent = occupancyDays.length
    ? Math.round(occupancyDays.reduce((s, d) => s + d.occupancyPercent, 0) / occupancyDays.length)
    : 0

  const take = Math.min(days.length, 30)
  const recentDays = days.slice(-take)
  const sparklineRevenue    = recentDays.map(d => d.revenuePaise)
  const sparklineOccupancy  = recentDays.map(d => d.occupancyPercent)

  return { netRevenuePaise, occupancyPercent, avgBookingPaise, totalBookings, sparklineRevenue, sparklineOccupancy }
}

// ---------------------------------------------------------------------------
// Revenue & occupancy trend — aggregated by week or day depending on range
// ---------------------------------------------------------------------------

export interface TrendPoint {
  label: string            // "Apr 21" or "Week 3"
  date: string             // YYYY-MM-DD (start of period)
  revenuePaise: number
  occupancyPercent: number
  bookings: number
}

export function computeTrend(days: DailyMetric[]): TrendPoint[] {
  if (days.length === 0) return []

  // ≤7 days: daily resolution; ≤90 days: weekly; else: monthly
  const resolution = days.length <= 7 ? 'day' : days.length <= 90 ? 'week' : 'month'

  if (resolution === 'day') {
    return days.map(d => ({
      label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      date: d.date,
      revenuePaise: d.revenuePaise,
      occupancyPercent: d.occupancyPercent,
      bookings: d.bookings,
    }))
  }

  if (resolution === 'week') {
    const buckets: Map<string, DailyMetric[]> = new Map()
    for (const d of days) {
      const dt = new Date(d.date)
      // ISO week start (Mon)
      const day = dt.getDay()
      const diff = (day + 6) % 7
      const monday = new Date(dt)
      monday.setDate(dt.getDate() - diff)
      const key = monday.toISOString().slice(0, 10)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(d)
    }
    return Array.from(buckets.entries()).map(([key, items]) => ({
      label: new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      date: key,
      revenuePaise: items.reduce((s, d) => s + d.revenuePaise, 0),
      occupancyPercent: Math.round(items.reduce((s, d) => s + d.occupancyPercent, 0) / items.length),
      bookings: items.reduce((s, d) => s + d.bookings, 0),
    }))
  }

  // monthly
  const buckets: Map<string, DailyMetric[]> = new Map()
  for (const d of days) {
    const key = d.date.slice(0, 7) // YYYY-MM
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(d)
  }
  return Array.from(buckets.entries()).map(([key, items]) => ({
    label: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    date: key + '-01',
    revenuePaise: items.reduce((s, d) => s + d.revenuePaise, 0),
    occupancyPercent: Math.round(items.reduce((s, d) => s + d.occupancyPercent, 0) / items.length),
    bookings: items.reduce((s, d) => s + d.bookings, 0),
  }))
}

// ---------------------------------------------------------------------------
// Revenue waterfall breakdown
// ---------------------------------------------------------------------------

export interface WaterfallData {
  grossPaise: number
  platformFeePaise: number
  processingFeePaise: number
  netPayoutPaise: number
}

export function computeWaterfall(days: DailyMetric[]): WaterfallData {
  // Gross = venue share / 0.35 × 1.0 (back-calculate total ticket revenue)
  // We treat revenuePaise as venue share (35% of gross ticket revenue)
  const venueSharePaise      = days.reduce((s, d) => s + d.revenuePaise, 0)
  const grossTicketRevPaise = Math.round(venueSharePaise / 0.35)
  const platformFeePaise    = Math.round(grossTicketRevPaise * 0.15)
  const processingFeePaise  = Math.round(grossTicketRevPaise * 0.025)
  const netPayoutPaise      = grossTicketRevPaise - platformFeePaise - processingFeePaise

  return { grossPaise: grossTicketRevPaise, platformFeePaise, processingFeePaise, netPayoutPaise }
}

// ---------------------------------------------------------------------------
// Lead time histogram — how many days in advance bookings arrive
// ---------------------------------------------------------------------------

const LEAD_TIME_BUCKETS: { label: string; daysRange: string; min: number; max: number }[] = [
  { label: 'Same day',   daysRange: '0',     min: 0,  max: 0 },
  { label: '1–3 days',   daysRange: '1–3',   min: 1,  max: 3 },
  { label: '4–7 days',   daysRange: '4–7',   min: 4,  max: 7 },
  { label: '1–2 weeks',  daysRange: '8–14',  min: 8,  max: 14 },
  { label: '2–4 weeks',  daysRange: '15–28', min: 15, max: 28 },
  { label: '1+ month',   daysRange: '29+',   min: 29, max: Infinity },
]

/**
 * Buckets real proposals by how many days elapsed between when they were
 * sent (createdAt) and the date they asked for (proposedDate).
 */
export function computeLeadTimeDistribution(
  items: { createdAt: string; proposedDate: string }[],
): { bins: LeadTimeBin[]; medianIndex: number } {
  const bins: LeadTimeBin[] = LEAD_TIME_BUCKETS.map(b => ({ label: b.label, daysRange: b.daysRange, count: 0 }))

  for (const item of items) {
    const days = Math.max(0, Math.round(
      (new Date(`${item.proposedDate}T00:00:00Z`).getTime() - new Date(item.createdAt).getTime()) / 86_400_000,
    ))
    const idx = LEAD_TIME_BUCKETS.findIndex(b => days >= b.min && days <= b.max)
    if (idx >= 0) bins[idx].count += 1
  }

  const total = bins.reduce((s, b) => s + b.count, 0)
  let cumulative = 0
  let medianIndex = 0
  for (let i = 0; i < bins.length; i++) {
    cumulative += bins[i].count
    if (total > 0 && cumulative >= total / 2) {
      medianIndex = i
      bins[i].isMedian = true
      break
    }
  }

  return { bins, medianIndex }
}

// ---------------------------------------------------------------------------
// Demand heatmap intensity
// ---------------------------------------------------------------------------

/** Returns 0–1 intensity for a count value given the max in the grid */
export function demandIntensity(count: number, maxCount: number): number {
  if (maxCount === 0 || count === 0) return 0
  return Math.min(count / maxCount, 1)
}

// ---------------------------------------------------------------------------
// Calendar insight helpers (for the insight card above the calendar heatmap)
// ---------------------------------------------------------------------------

export function getBusiestMonth(days: DailyMetric[]): string {
  const byMonth: Record<string, number> = {}
  for (const d of days) {
    const month = d.date.slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + d.revenuePaise
  }
  const best = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0]
  if (!best) return 'N/A'
  return new Date(best[0] + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function getHighestOccupancyDay(days: DailyMetric[]): string {
  const byDay: Record<number, { total: number; count: number }> = {}
  for (const d of days) {
    const dow = new Date(d.date).getDay()
    if (!byDay[dow]) byDay[dow] = { total: 0, count: 0 }
    byDay[dow].total += d.occupancyPercent
    byDay[dow].count += 1
  }
  const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  let bestDow = 6
  let bestAvg = 0
  for (const [dow, { total, count }] of Object.entries(byDay)) {
    const avg = total / count
    if (avg > bestAvg) { bestAvg = avg; bestDow = Number(dow) }
  }
  return DAY_NAMES[bestDow]
}
