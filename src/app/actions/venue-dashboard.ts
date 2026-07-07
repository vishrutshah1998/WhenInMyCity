'use server'

// =============================================================================
// WIMC — Adda dashboard server actions
// Data-fetching and write actions called by the Adda owner's dashboard UI.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { calculateRevenueSplit } from '@/lib/revenue'
import type {
  AddaProfile,
  AddaAvailability,
  MakerAddaProposal,
  Event,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single entry in the Adda's recent revenue stream. */
export interface RevenueEntry {
  event_id: string
  event_title: string
  event_date: string
  ticket_revenue_paise: number
  adda_share_paise: number
  attendee_count: number
}

/** Aggregate statistics for the Adda dashboard hero section. */
export interface AddaDashboardStats {
  total_events_hosted: number
  total_revenue_paise: number
  average_maker_rating: number
  this_month_events: number
}

// ---------------------------------------------------------------------------
// Ownership helper
// ---------------------------------------------------------------------------

/**
 * Resolves the `adda_profiles` row owned by the currently authenticated user.
 * Returns `null` if the user has no Adda profile.
 */
async function resolveOwnedAdda(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<AddaProfile | null> {
  const { data, error } = await admin
    .from('adda_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) console.error('[resolveOwnedAdda]', error.message)
  return data ?? null
}

// ---------------------------------------------------------------------------
// getAddaDashboardData
// ---------------------------------------------------------------------------

/**
 * Returns all data needed to render the Adda dashboard in a single round-trip.
 *
 * Fetches:
 *  - Full Adda profile
 *  - Upcoming published events at this Adda (next 60 days)
 *  - Pending + counter-offered proposals
 *  - Recent revenue entries (last 10 completed events)
 *  - This month's availability slots
 *  - Aggregate stats
 *
 * Access control: `requireAuth()` + ownership check via `auth_user_id`.
 *
 * @param addaId  The `adda_profiles.id` to load. Must belong to the caller.
 */
export async function getAddaDashboardData(addaId: string): Promise<{
  adda: AddaProfile
  upcomingEvents: Event[]
  pendingProposals: MakerAddaProposal[]
  recentRevenue: RevenueEntry[]
  availabilityThisMonth: AddaAvailability[]
  stats: AddaDashboardStats
} | { error: string }> {
  const { user } = await requireAuth('/business/venue/dashboard')

  // Validate addaId is a UUID
  const uuidResult = z.string().uuid().safeParse(addaId)
  if (!uuidResult.success) return { error: 'Invalid Adda ID.' }

  const admin = createAdminClient()

  const adda = await resolveOwnedAdda(user.id, admin)
  if (!adda || adda.id !== addaId) {
    return { error: 'Adda not found or you do not own this profile.' }
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
    // Upcoming events linked to this adda
    admin
      .from('events')
      .select('*')
      .eq('venue_id', addaId)
      .eq('status', 'published')
      .gte('starts_at', now)
      .lte('starts_at', endOfMonth)
      .order('starts_at', { ascending: true })
      .limit(20),

    // Pending or counter-offered proposals
    admin
      .from('maker_adda_proposals')
      .select('*')
      .eq('adda_id', addaId)
      .in('status', ['pending', 'counter_offered'])
      .order('created_at', { ascending: false })
      .limit(20),

    // Last 10 completed events with RSVPs
    admin
      .from('events')
      .select('id, title, starts_at, ticket_price')
      .eq('venue_id', addaId)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(10),

    // This month's availability
    admin
      .from('adda_availability')
      .select('*')
      .eq('adda_id', addaId)
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
        adda_share_paise:    split.venuePaise,
        attendee_count:      agg.count,
      })
    }
  }

  // This-month event count
  const { count: thisMonthCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', addaId)
    .gte('starts_at', monthStart)
    .lte('starts_at', monthEnd)

  const stats: AddaDashboardStats = {
    total_events_hosted:  adda.total_events_hosted,
    total_revenue_paise:  adda.total_revenue_earned_paise,
    average_maker_rating: adda.average_maker_rating,
    this_month_events:    thisMonthCount ?? 0,
  }

  return {
    adda,
    upcomingEvents:         upcomingResult.data ?? [],
    pendingProposals:       pendingProposalsResult.data ?? [],
    recentRevenue,
    availabilityThisMonth:  availabilityResult.data ?? [],
    stats,
  }
}
