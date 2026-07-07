'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { calculateRevenueSplit } from '@/lib/revenue'
import type { DailyMetric, HourDayCell } from '@/lib/venue/mock/analyticsData'

export interface ProposalFunnel {
  received: number
  accepted: number
  eventsCompleted: number
}

export interface VenueTrafficStats {
  totalViews: number
  byDay:      { date: string; count: number }[]
  windowDays: number
}

export interface VenueAnalyticsData {
  dailyMetrics: DailyMetric[]
  proposalFunnel: ProposalFunnel
  demandGrid: HourDayCell[]
  trafficStats: VenueTrafficStats
  hasData: boolean
}

function emptyTrafficStats(windowDays: number): VenueTrafficStats {
  return { totalViews: 0, byDay: [], windowDays }
}

/**
 * Returns page-view counts for an Venue's public page over the last
 * `windowDays` days, sourced from `block_analytics`
 * (owner_type='venue', event_type='view'). See migration 049.
 */
async function getVenueTrafficStats(venueId: string, windowDays = 30): Promise<VenueTrafficStats> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('block_analytics')
    .select('occurred_at')
    .eq('owner_type', 'venue')
    .eq('owner_id', venueId)
    .eq('event_type', 'view')
    .gte('occurred_at', since)

  if (error || !data) return emptyTrafficStats(windowDays)

  const dayMap: Record<string, number> = {}
  for (const row of data) {
    const day = row.occurred_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }

  const byDay: { date: string; count: number }[] = []
  for (let d = windowDays - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    byDay.push({ date, count: dayMap[date] ?? 0 })
  }

  return { totalViews: data.length, byDay, windowDays }
}

function emptyDemandGrid(): HourDayCell[] {
  const grid: HourDayCell[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.push({ day, hour, count: 0 })
    }
  }
  return grid
}

export async function getVenueAnalytics(venueId: string): Promise<VenueAnalyticsData | null> {
  try {
    const { user } = await requireAuth()
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: venue } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('id', venueId)
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!venue) return null

    // Fetch all past events at this venue + proposal funnel + traffic stats in parallel
    const [eventsResult, proposalsResult, trafficStats] = await Promise.all([
      admin
        .from('events')
        .select('id, starts_at, ends_at, ticket_price, status')
        .eq('venue_id', venueId)
        .in('status', ['published', 'completed'])
        .lt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true }),
      supabase
        .from('maker_venue_proposals')
        .select('status')
        .eq('venue_id', venueId),
      getVenueTrafficStats(venueId),
    ])

    const events = eventsResult.data ?? []
    const proposals = proposalsResult.data ?? []

    const proposalFunnel: ProposalFunnel = {
      received: proposals.length,
      accepted: proposals.filter(p => p.status === 'accepted').length,
      eventsCompleted: events.filter(e => e.status === 'completed').length,
    }

    if (!events.length) {
      return {
        dailyMetrics: [],
        proposalFunnel,
        demandGrid: emptyDemandGrid(),
        trafficStats,
        hasData: proposals.length > 0 || trafficStats.totalViews > 0,
      }
    }

    const eventIds = events.map(e => e.id)

    const { data: rsvps } = await admin
      .from('rsvps')
      .select('event_id, amount_paid')
      .in('event_id', eventIds)
      .eq('payment_status', 'captured')

    // Per-event RSVP aggregates
    const rsvpMap = new Map<string, { count: number; gross: number }>()
    for (const r of rsvps ?? []) {
      const agg = rsvpMap.get(r.event_id) ?? { count: 0, gross: 0 }
      rsvpMap.set(r.event_id, {
        count: agg.count + 1,
        gross: agg.gross + (r.amount_paid ?? 0),
      })
    }

    // Build daily metrics + demand grid in one pass
    const dayMap = new Map<string, { bookings: number; hours: number; revenuePaise: number }>()
    const demandCounts = new Map<string, number>()

    for (const ev of events) {
      // Demand grid: count by (day-of-week, start-hour) for ALL events (not just those with RSVPs)
      const dt = new Date(ev.starts_at)
      const dow = dt.getDay()   // 0=Sun
      const hour = dt.getHours()
      const demandKey = `${dow}:${hour}`
      demandCounts.set(demandKey, (demandCounts.get(demandKey) ?? 0) + 1)

      // Revenue metrics: only events with captured RSVPs contribute
      const agg = rsvpMap.get(ev.id)
      if (!agg || agg.count === 0) continue

      const split = calculateRevenueSplit(ev.ticket_price, agg.count, 'wanderer', true)

      // Hours: prefer ends_at − starts_at; fall back to 3h default
      let hours = 3
      if (ev.ends_at) {
        const diffMs = new Date(ev.ends_at).getTime() - dt.getTime()
        hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)))
      }

      const date = ev.starts_at.slice(0, 10)
      const existing = dayMap.get(date) ?? { bookings: 0, hours: 0, revenuePaise: 0 }
      dayMap.set(date, {
        bookings: existing.bookings + 1,
        hours: existing.hours + hours,
        revenuePaise: existing.revenuePaise + split.venuePaise,
      })
    }

    const AVAILABLE_HOURS_PER_DAY = 12
    const dailyMetrics: DailyMetric[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { bookings, hours, revenuePaise }]) => ({
        date,
        bookings,
        pendingCount: 0,
        hours,
        revenuePaise,
        occupancyPercent: Math.min(100, Math.round((hours / AVAILABLE_HOURS_PER_DAY) * 100)),
        hasPendingRequest: false,
      }))

    const demandGrid: HourDayCell[] = []
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        demandGrid.push({ day, hour, count: demandCounts.get(`${day}:${hour}`) ?? 0 })
      }
    }

    const hasData = dailyMetrics.length > 0 || proposalFunnel.received > 0 || trafficStats.totalViews > 0

    return { dailyMetrics, proposalFunnel, demandGrid, trafficStats, hasData }
  } catch {
    return null
  }
}
