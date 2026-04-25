// ---------------------------------------------------------------------------
// Mock analytics data for the Adda Analytics page.
// All data is deterministically generated — no Math.random() — so it renders
// identically on server and client.
// TODO: replace every exported constant with real Supabase queries.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyMetric {
  date: string             // YYYY-MM-DD
  bookings: number         // confirmed bookings
  pendingCount: number     // unconfirmed requests that day
  hours: number            // total confirmed booked hours
  revenuePaise: number     // adda's net share (paise)
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

export interface BenchmarkMetric {
  metricKey: 'hourly_rate' | 'occupancy' | 'avg_booking_value'
  label: string
  unit: string
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  venueValue: number
  venuePercentile: number  // 0–100
  city: string
  sampleSize: number
}

// Adda tier hierarchy: chai_stall < nukkad < adda < mehfil
export type AddaTier = 'chai_stall' | 'nukkad' | 'adda' | 'mehfil'

export const TIER_ORDER: AddaTier[] = ['chai_stall', 'nukkad', 'adda', 'mehfil']

export function tierAtLeast(venueTier: AddaTier, minTier: AddaTier): boolean {
  return TIER_ORDER.indexOf(venueTier) >= TIER_ORDER.indexOf(minTier)
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (sine-based, returns 0–1)
// ---------------------------------------------------------------------------

function pr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ---------------------------------------------------------------------------
// Daily metrics — 480 days ending April 21 2026
// ---------------------------------------------------------------------------

const ANCHOR = new Date(2026, 3, 21) // April 21 2026 (month is 0-indexed)

// Monthly demand multipliers: Jan–Dec (0-indexed)
// India peaks: Oct (Navratri/Dussehra), Nov (Diwali), Dec (year-end parties)
// Low: June–July (summer heat in Tier-2 cities)
const SEASONAL: number[] = [
  0.70, // Jan
  0.72, // Feb
  0.68, // Mar
  0.65, // Apr
  0.58, // May
  0.45, // Jun
  0.42, // Jul
  0.55, // Aug
  0.72, // Sep
  0.95, // Oct  ← festival peak
  0.98, // Nov  ← Diwali peak
  0.88, // Dec  ← year-end
]

function generateDailyMetrics(): DailyMetric[] {
  const result: DailyMetric[] = []

  for (let i = 479; i >= 0; i--) {
    const d = new Date(ANCHOR)
    d.setDate(d.getDate() - i)

    const dayOfWeek = d.getDay()          // 0=Sun
    const month     = d.getMonth()        // 0-indexed
    const dateInt   = d.getFullYear() * 10000 + (month + 1) * 100 + d.getDate()

    const isWeekend  = dayOfWeek === 5 || dayOfWeek === 6  // Fri, Sat
    const isFriSat   = isWeekend
    const seasonal   = SEASONAL[month]
    const weekMult   = isFriSat ? 1.5 : dayOfWeek === 0 ? 1.1 : 0.85
    const bookingProb = Math.min(seasonal * weekMult * 0.55, 0.92)

    const r1 = pr(dateInt)
    const r2 = pr(dateInt + 1000)
    const r3 = pr(dateInt + 2000)

    const hasBooking  = r1 < bookingProb
    const bookings    = hasBooking ? Math.ceil(r2 * 2.5) : 0  // 1–2 bookings
    const avgHrs      = 2 + Math.floor(r3 * 3)               // 2–4 hrs each
    const hours       = hasBooking ? bookings * avgHrs : 0
    const occupancy   = Math.min(Math.round((hours / 12) * 100), 100)

    // Adda share: 35% of ₹1,500/hr = ₹525/hr = 52 500 paise/hr
    const revenuePaise = hours * 52500

    // Pending requests: separate chance, more likely on busy days
    const pendingProb  = 0.12 + (hasBooking ? 0.08 : 0)
    const hasPending   = pr(dateInt + 3000) < pendingProb
    const pendingCount = hasPending ? (pr(dateInt + 4000) > 0.7 ? 2 : 1) : 0

    result.push({
      date: d.toISOString().slice(0, 10),
      bookings,
      pendingCount,
      hours,
      revenuePaise,
      occupancyPercent: occupancy,
      hasPendingRequest: hasPending,
    })
  }

  return result
}

export const MOCK_DAILY_METRICS: DailyMetric[] = generateDailyMetrics()

// ---------------------------------------------------------------------------
// Helper: filter daily metrics by date range
// ---------------------------------------------------------------------------

export function filterByRange(from: Date, to: Date): DailyMetric[] {
  const fromStr = from.toISOString().slice(0, 10)
  const toStr   = to.toISOString().slice(0, 10)
  return MOCK_DAILY_METRICS.filter(d => d.date >= fromStr && d.date <= toStr)
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

  // Sparklines: last ≤30 data points, scaled to relative values
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
  // Gross = adda share / 0.35 × 1.0 (back-calculate total ticket revenue)
  // We treat revenuePaise as adda share (35% of gross ticket revenue)
  const addaSharePaise      = days.reduce((s, d) => s + d.revenuePaise, 0)
  const grossTicketRevPaise = Math.round(addaSharePaise / 0.35)
  const platformFeePaise    = Math.round(grossTicketRevPaise * 0.15)
  const processingFeePaise  = Math.round(grossTicketRevPaise * 0.025)
  const netPayoutPaise      = grossTicketRevPaise - platformFeePaise - processingFeePaise

  return { grossPaise: grossTicketRevPaise, platformFeePaise, processingFeePaise, netPayoutPaise }
}

// ---------------------------------------------------------------------------
// Lead time histogram — how many days in advance bookings arrive
// ---------------------------------------------------------------------------

const LEAD_TIME_DISTRIBUTION: LeadTimeBin[] = [
  { label: 'Same day',    count: 8,  daysRange: '0' },
  { label: '1–3 days',   count: 22, daysRange: '1–3' },
  { label: '4–7 days',   count: 41, daysRange: '4–7' },
  { label: '1–2 weeks',  count: 35, daysRange: '8–14' },
  { label: '2–4 weeks',  count: 18, daysRange: '15–28' },
  { label: '1+ month',   count: 9,  daysRange: '29+' },
]

// Mark median bin
;(function markMedian() {
  const total = LEAD_TIME_DISTRIBUTION.reduce((s, b) => s + b.count, 0)
  let cumulative = 0
  for (const bin of LEAD_TIME_DISTRIBUTION) {
    cumulative += bin.count
    if (cumulative >= total / 2) {
      bin.isMedian = true
      break
    }
  }
})()

export const MOCK_LEAD_TIME_BINS: LeadTimeBin[] = LEAD_TIME_DISTRIBUTION

/** Index of the median bin (for ReferenceLine) */
export const LEAD_TIME_MEDIAN_INDEX = LEAD_TIME_DISTRIBUTION.findIndex(b => b.isMedian)

// ---------------------------------------------------------------------------
// Hour × Day demand grid (7 days × 24 hours)
// ---------------------------------------------------------------------------

// Peak patterns:
//   Fri 17–21h, Sat 15–21h — highest demand
//   Sun 11–17h              — brunch/afternoon events
//   Wed 19–21h              — mid-week open mics
//   Weekday 18–20h          — workshop / corporate
function generateDemandGrid(): HourDayCell[] {
  const cells: HourDayCell[] = []

  // Base demand per (day, hour) — tuned to realistic Tier-2 venue patterns
  // day: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      let count = 0

      const isFri = day === 5
      const isSat = day === 6
      const isSun = day === 0
      const isWed = day === 3

      // Early morning / overnight: near zero
      if (hour < 9 || hour >= 23) {
        count = 0
      } else if (hour >= 17 && hour < 22 && (isFri || isSat)) {
        // Prime evening on weekend
        count = 12 + Math.floor(pr(day * 100 + hour) * 8)
      } else if (hour >= 15 && hour < 22 && isSat) {
        count = 8 + Math.floor(pr(day * 100 + hour + 50) * 6)
      } else if (hour >= 11 && hour < 17 && isSun) {
        count = 5 + Math.floor(pr(day * 100 + hour + 100) * 5)
      } else if (hour >= 18 && hour < 22 && isWed) {
        count = 6 + Math.floor(pr(day * 100 + hour + 150) * 4)
      } else if (hour >= 10 && hour < 22 && (isFri || isSat || isSun)) {
        count = 2 + Math.floor(pr(day * 100 + hour + 200) * 4)
      } else if (hour >= 18 && hour < 22) {
        // Weekday evenings
        count = 3 + Math.floor(pr(day * 100 + hour + 250) * 3)
      } else if (hour >= 10 && hour < 18) {
        // Weekday daytime (corporate, workshops)
        count = 1 + Math.floor(pr(day * 100 + hour + 300) * 2)
      }

      cells.push({ day, hour, count })
    }
  }

  return cells
}

export const MOCK_DEMAND_GRID: HourDayCell[] = generateDemandGrid()

/** Returns 0–1 intensity for a count value given the max in the grid */
export function demandIntensity(count: number, maxCount: number): number {
  if (maxCount === 0 || count === 0) return 0
  return Math.min(count / maxCount, 1)
}

export const DEMAND_GRID_MAX = Math.max(...MOCK_DEMAND_GRID.map(c => c.count))

// Peak slot description for insight card
export const DEMAND_PEAK_DESCRIPTION = 'Fri–Sat 5–9 pm'

// ---------------------------------------------------------------------------
// Competitive benchmarks (mock — based on 23 similar venues in Indore)
// ---------------------------------------------------------------------------

export const MOCK_BENCHMARKS: BenchmarkMetric[] = [
  {
    metricKey: 'hourly_rate',
    label: 'Avg Hourly Rate',
    unit: '₹/hr',
    p10: 800,
    p25: 1100,
    p50: 1500,
    p75: 2100,
    p90: 2800,
    venueValue: 1500,
    venuePercentile: 50,
    city: 'Indore',
    sampleSize: 23,
  },
  {
    metricKey: 'occupancy',
    label: 'Occupancy Rate',
    unit: '%',
    p10: 18,
    p25: 28,
    p50: 42,
    p75: 58,
    p90: 71,
    venueValue: 63,
    venuePercentile: 78,
    city: 'Indore',
    sampleSize: 23,
  },
  {
    metricKey: 'avg_booking_value',
    label: 'Avg Booking Value',
    unit: '₹',
    p10: 2800,
    p25: 4200,
    p50: 6500,
    p75: 9800,
    p90: 14000,
    venueValue: 8400,
    venuePercentile: 68,
    city: 'Indore',
    sampleSize: 23,
  },
]

// ---------------------------------------------------------------------------
// Venue mock profile (for tier-gating and context labels)
// ---------------------------------------------------------------------------

export const MOCK_VENUE_PROFILE = {
  tier: 'nukkad' as AddaTier,
  city: 'Indore',
  type: 'Art Studio',
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
