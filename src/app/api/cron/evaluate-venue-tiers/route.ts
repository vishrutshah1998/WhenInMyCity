// =============================================================================
// WIMC — Venue Tier Evaluation Cron
//
// Schedule: 0 21 * * 1  (every Monday at 21:00 UTC / 2:30 AM IST Tuesday)
// Vercel automatically injects `Authorization: Bearer <CRON_SECRET>`.
//
// Trust axis:  evaluates every active Venue against Open/Verified/Beloved/Legendary
// Velocity overlay: recomputes Trending status per city (final page only)
//
// Cursor pagination: pass ?cursor=<last_processed_id> to resume from a prior page.
// Each invocation fetches PAGE_SIZE venues. When nextCursor is non-null, more pages remain.
//
// Returns: { evaluated, upgraded, downgraded, trendingGranted, trendingCleared, cities, nextCursor, done }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateVenueTier, computeTrendingVenues } from '@/app/actions/venue-tiers'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { VenueTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[evaluate-venue-tiers] CRON_SECRET env var not set — endpoint locked')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Pagination constants
// ---------------------------------------------------------------------------

const PAGE_SIZE  = 500  // venues fetched per invocation
const BATCH_SIZE = 10   // concurrent evaluations within a page

// ---------------------------------------------------------------------------
// Tier ordering (trust axis only — Trending is an overlay)
// ---------------------------------------------------------------------------

const TIER_ORDER: Record<VenueTier, number> = {
  open:      0,
  verified:  1,
  beloved:   2,
  legendary: 3,
}

// ---------------------------------------------------------------------------
// GET /api/cron/evaluate-venue-tiers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') ?? ''

  // ── 1. Trust-axis evaluation (paginated) ──────────────────────────────────
  let query = admin
    .from('venue_profiles')
    .select('id, venue_tier, name, auth_user_id')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.gt('id', cursor)
  }

  const { data: venues, error: fetchError } = await query

  if (fetchError) {
    console.error('[evaluate-venue-tiers] failed to fetch venues', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }

  if (!venues || venues.length === 0) {
    console.info('[evaluate-venue-tiers] no venues to evaluate for cursor', cursor || 'start')
    return NextResponse.json({
      evaluated: 0, upgraded: 0, downgraded: 0,
      trendingGranted: 0, trendingCleared: 0, cities: 0,
      nextCursor: null, done: true,
    })
  }

  console.info(`[evaluate-venue-tiers] page: ${venues.length} venues, cursor: ${cursor || 'start'}`)

  let evaluated  = 0
  let upgraded   = 0
  let downgraded = 0
  const errors: string[] = []

  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    const batch = venues.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (venue) => {
        try {
          const result = await evaluateVenueTier(venue.id)
          evaluated++

          if (result.tierChanged) {
            const prevRank  = TIER_ORDER[result.previousTier]
            const newRank   = TIER_ORDER[result.newTier]
            const isUpgrade = newRank > prevRank

            if (isUpgrade) {
              upgraded++
              console.info('[evaluate-venue-tiers] UPGRADE', { venueId: venue.id, from: result.previousTier, to: result.newTier })
            } else {
              downgraded++
              console.info('[evaluate-venue-tiers] DOWNGRADE', { venueId: venue.id, from: result.previousTier, to: result.newTier })
            }

            // Notify the venue owner via WhatsApp
            if (venue.auth_user_id) {
              const { data: ownerProfile } = await admin
                .from('user_profiles')
                .select('phone')
                .eq('id', venue.auth_user_id)
                .maybeSingle()

              if (ownerProfile?.phone) {
                const msg = isUpgrade
                  ? buildVenueUpgradeMessage(venue.name, result.newTier)
                  : buildVenueDowngradeMessage(venue.name, result.newTier)
                await sendWhatsAppMessage(ownerProfile.phone, msg)
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[evaluate-venue-tiers] error', { venueId: venue.id, error: msg })
          errors.push(`venue:${venue.id} — ${msg}`)
        }
      }),
    )
  }

  const lastVenue  = venues[venues.length - 1]
  const nextCursor = venues.length === PAGE_SIZE ? lastVenue.id : null
  const isLastPage = nextCursor === null

  // ── 2. Trending overlay — runs on the final page only ────────────────────
  // Running on every page would produce duplicate/incorrect trending results.
  let trendingGranted = 0
  let trendingCleared = 0
  let citiesCount     = 0

  if (isLastPage) {
    const { data: cityRows } = await admin
      .from('venue_profiles')
      .select('city')
      .eq('is_active', true)

    const distinctCities = [...new Set((cityRows ?? []).map((c) => c.city))]
    citiesCount = distinctCities.length

    for (const city of distinctCities) {
      try {
        const trendingResults = await computeTrendingVenues(city)
        for (const r of trendingResults) {
          if (r.isTrending) trendingGranted++
          else trendingCleared++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[evaluate-venue-tiers] trending error', { city, error: msg })
        errors.push(`city:${city} — ${msg}`)
      }
    }
  }

  const result = {
    evaluated,
    upgraded,
    downgraded,
    trendingGranted,
    trendingCleared,
    cities: citiesCount,
    nextCursor,
    done: isLastPage,
    ...(errors.length ? { errors } : {}),
  }

  console.info('[evaluate-venue-tiers] page complete', result)
  return NextResponse.json(result)
}

// ---------------------------------------------------------------------------
// WhatsApp message builders for venue tier changes
// ---------------------------------------------------------------------------

const VENUE_TIER_LABELS: Record<VenueTier, string> = {
  open:      'Open',
  verified:  'Verified',
  beloved:   'Beloved',
  legendary: 'Legendary',
}

function buildVenueUpgradeMessage(venueName: string, newTier: VenueTier): string {
  return (
    `🎉 *${venueName}* has been upgraded to *${VENUE_TIER_LABELS[newTier]} Venue* status on WIMC! ` +
    `Your Venue's reputation is growing — keep hosting great events.`
  )
}

function buildVenueDowngradeMessage(venueName: string, newTier: VenueTier): string {
  return (
    `Hi! *${venueName}* has been updated to *${VENUE_TIER_LABELS[newTier]} Venue* on WIMC. ` +
    `Host more quality events to climb back up — your community is counting on you! 🙌`
  )
}
