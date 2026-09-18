'use server'

// =============================================================================
// WIMC — Venue dashboard server actions
// Data-fetching and write actions called by the Venue owner's dashboard UI.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { calculateRevenueSplit } from '@/lib/revenue'
import { getVenueBookings, type ProposalWithMaker } from '@/app/actions/venue-bookings'
import type {
  VenueProfile,
  VenueAvailability,
  Event,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single entry in the Venue's recent revenue stream. */
export interface RevenueEntry {
  event_id: string
  event_title: string
  event_date: string
  ticket_revenue_paise: number
  venue_share_paise: number
  attendee_count: number
}

/** Aggregate statistics for the Venue dashboard hero section. */
export interface VenueDashboardStats {
  total_events_hosted: number
  total_revenue_paise: number
  average_maker_rating: number
  this_month_events: number
}

// ---------------------------------------------------------------------------
// Ownership helper
// ---------------------------------------------------------------------------

/**
 * Resolves the `venue_profiles` row owned by the currently authenticated user.
 * Returns `null` if the user has no Venue profile.
 */
async function resolveOwnedVenue(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<VenueProfile | null> {
  const { data, error } = await admin
    .from('venue_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) console.error('[resolveOwnedVenue]', error.message)
  return data ?? null
}

// ---------------------------------------------------------------------------
// getVenueDashboardData
// ---------------------------------------------------------------------------

/**
 * Returns all data needed to render the Venue dashboard in a single round-trip.
 *
 * Fetches:
 *  - Full Venue profile
 *  - Upcoming published events at this Venue (next 60 days)
 *  - Pending + counter-offered proposals
 *  - Recent revenue entries (last 10 completed events)
 *  - This month's availability slots
 *  - Aggregate stats
 *
 * Access control: `requireAuth()` + ownership check via `auth_user_id`.
 *
 * @param venueId  The `venue_profiles.id` to load. Must belong to the caller.
 */
export async function getVenueDashboardData(venueId: string): Promise<{
  venue: VenueProfile
  upcomingEvents: Event[]
  pendingProposals: ProposalWithMaker[]
  recentRevenue: RevenueEntry[]
  availabilityThisMonth: VenueAvailability[]
  stats: VenueDashboardStats
} | { error: string }> {
  const { user } = await requireAuth('/business/venue/dashboard')

  // Validate venueId is a UUID
  const uuidResult = z.string().uuid().safeParse(venueId)
  if (!uuidResult.success) return { error: 'Invalid Venue ID.' }

  const admin = createAdminClient()

  const venue = await resolveOwnedVenue(user.id, admin)
  if (!venue || venue.id !== venueId) {
    return { error: 'Venue not found or you do not own this profile.' }
  }

  const now = new Date().toISOString()
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const [
    upcomingResult,
    pendingProposalsResult,
    revenueResult,
    availabilityResult,
  ] = await Promise.all([
    // Upcoming events linked to this venue
    admin
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'published')
      .gte('starts_at', now)
      .lte('starts_at', endOfMonth)
      .order('starts_at', { ascending: true })
      .limit(20),

    // Pending or counter-offered proposals, joined with maker profile info
    getVenueBookings(venueId, ['pending', 'counter_offered']),

    // Last 10 completed events with RSVPs
    admin
      .from('events')
      .select('id, title, starts_at, ticket_price')
      .eq('venue_id', venueId)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(10),

    // This month's availability
    admin
      .from('venue_availability')
      .select('*')
      .eq('venue_id', venueId)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: true }),
  ])

  // Build revenue entries by fetching RSVP counts per event
  const revenueEvents = revenueResult.data ?? []
  const recentRevenue: RevenueEntry[] = []

  if (revenueEvents.length) {
    const eventIds = revenueEvents.map((e) => e.id)

    const { data: rsvpCounts } = await admin
      .from('rsvps')
      .select('event_id, amount_paid')
      .in('event_id', eventIds)
      .eq('payment_status', 'captured')

    const countMap = new Map<string, { count: number; total: number }>()
    for (const r of rsvpCounts ?? []) {
      const existing = countMap.get(r.event_id) ?? { count: 0, total: 0 }
      countMap.set(r.event_id, {
        count: existing.count + 1,
        total: existing.total + (r.amount_paid ?? 0),
      })
    }

    for (const ev of revenueEvents) {
      const agg = countMap.get(ev.id) ?? { count: 0, total: 0 }
      // Use mohalla split as conservative default (actual split stored separately)
      const split = calculateRevenueSplit(ev.ticket_price, agg.count, 'wanderer', true)
      recentRevenue.push({
        event_id:            ev.id,
        event_title:         ev.title,
        event_date:          ev.starts_at,
        ticket_revenue_paise: agg.total,
        venue_share_paise:    split.venuePaise,
        attendee_count:      agg.count,
      })
    }
  }

  // This-month event count
  const { count: thisMonthCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .gte('starts_at', monthStart)
    .lte('starts_at', monthEnd)

  const stats: VenueDashboardStats = {
    total_events_hosted:  venue.total_events_hosted,
    total_revenue_paise:  venue.total_revenue_earned_paise,
    average_maker_rating: venue.average_maker_rating,
    this_month_events:    thisMonthCount ?? 0,
  }

  return {
    venue,
    upcomingEvents:         upcomingResult.data ?? [],
    pendingProposals:       pendingProposalsResult.proposals,
    recentRevenue,
    availabilityThisMonth:  availabilityResult.data ?? [],
    stats,
  }
}

// ---------------------------------------------------------------------------
// getVenueDashboardPageData
// ---------------------------------------------------------------------------

/**
 * Superset of getVenueDashboardData for the dashboard page itself — resolves
 * the caller's own Venue profile (rather than requiring an already-known
 * venueId) and bundles the extra reads the page needs (workspace-switcher
 * personas, confirmed-booking flag, tier-card review count) into the same
 * round-trip. Lets VenueDashboardPage be a Client Component that fetches via
 * one action call, mirroring CreatorDashboardPage/DashboardPage's pattern —
 * see the VenueCarouselContext relocation-safety note on VenueDashboardPage
 * for why.
 */
export async function getVenueDashboardPageData(): Promise<
  | { needsOnboarding: true }
  | {
      needsOnboarding: false
      venue: VenueProfile
      upcomingEvents: Event[]
      pendingProposals: ProposalWithMaker[]
      recentRevenue: RevenueEntry[]
      availabilityThisMonth: VenueAvailability[]
      stats: VenueDashboardStats
      personas: string[]
      hasAnyConfirmedBooking: boolean
      reviewCount: number
    }
  | { error: string }
> {
  const { user } = await requireAuth('/business/venue/dashboard')
  const admin = createAdminClient()

  const venue = await resolveOwnedVenue(user.id, admin)
  if (!venue) return { needsOnboarding: true }

  const [dashboardResult, userProfileResult, confirmedProposalResult] = await Promise.all([
    getVenueDashboardData(venue.id),
    admin.from('user_profiles').select('personas').eq('id', user.id).maybeSingle(),
    admin
      .from('maker_venue_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue.id)
      .eq('status', 'accepted'),
  ])

  if ('error' in dashboardResult) return dashboardResult

  const rawPersonas = (userProfileResult.data?.personas ?? []) as string[]
  const personas = rawPersonas.includes('venue') ? rawPersonas : [...rawPersonas, 'venue']
  const hasAnyConfirmedBooking = (confirmedProposalResult.count ?? 0) > 0

  // Review count for the tier progress card.
  const { data: eventIds } = await admin
    .from('events')
    .select('id')
    .eq('venue_id', venue.id)
    .in('status', ['published', 'completed'])

  const eventIdList = (eventIds ?? []).map((e) => e.id)
  const reviewCount = eventIdList.length > 0
    ? ((await admin
        .from('explorer_event_history')
        .select('id', { count: 'exact', head: true })
        .in('event_id', eventIdList)
        .not('rating', 'is', null)
      ).count ?? 0)
    : 0

  return {
    needsOnboarding: false,
    ...dashboardResult,
    personas,
    hasAnyConfirmedBooking,
    reviewCount,
  }
}
