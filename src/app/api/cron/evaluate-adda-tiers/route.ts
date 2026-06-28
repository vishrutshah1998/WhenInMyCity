// =============================================================================
// WIMC — Adda Tier Evaluation Cron
//
// Schedule: 0 21 * * 1  (every Monday at 21:00 UTC / 2:30 AM IST Tuesday)
// Vercel automatically injects `Authorization: Bearer <CRON_SECRET>`.
//
// Trust axis:  evaluates every active Adda against Open/Verified/Beloved/Legendary
// Velocity overlay: recomputes Trending status per city (final page only)
//
// Cursor pagination: pass ?cursor=<last_processed_id> to resume from a prior page.
// Each invocation fetches PAGE_SIZE addas. When nextCursor is non-null, more pages remain.
//
// Returns: { evaluated, upgraded, downgraded, trendingGranted, trendingCleared, cities, nextCursor, done }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateAddaTier, computeTrendingAddas } from '@/app/actions/adda-tiers'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { AddaTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[evaluate-adda-tiers] CRON_SECRET env var not set — endpoint locked')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Pagination constants
// ---------------------------------------------------------------------------

const PAGE_SIZE  = 500  // addas fetched per invocation
const BATCH_SIZE = 10   // concurrent evaluations within a page

// ---------------------------------------------------------------------------
// Tier ordering (trust axis only — Trending is an overlay)
// ---------------------------------------------------------------------------

const TIER_ORDER: Record<AddaTier, number> = {
  open:      0,
  verified:  1,
  beloved:   2,
  legendary: 3,
}

// ---------------------------------------------------------------------------
// GET /api/cron/evaluate-adda-tiers
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
    .from('adda_profiles')
    .select('id, adda_tier, name, auth_user_id')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.gt('id', cursor)
  }

  const { data: addas, error: fetchError } = await query

  if (fetchError) {
    console.error('[evaluate-adda-tiers] failed to fetch addas', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch addas' }, { status: 500 })
  }

  if (!addas || addas.length === 0) {
    console.info('[evaluate-adda-tiers] no addas to evaluate for cursor', cursor || 'start')
    return NextResponse.json({
      evaluated: 0, upgraded: 0, downgraded: 0,
      trendingGranted: 0, trendingCleared: 0, cities: 0,
      nextCursor: null, done: true,
    })
  }

  console.info(`[evaluate-adda-tiers] page: ${addas.length} addas, cursor: ${cursor || 'start'}`)

  let evaluated  = 0
  let upgraded   = 0
  let downgraded = 0
  const errors: string[] = []

  for (let i = 0; i < addas.length; i += BATCH_SIZE) {
    const batch = addas.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (adda) => {
        try {
          const result = await evaluateAddaTier(adda.id)
          evaluated++

          if (result.tierChanged) {
            const prevRank  = TIER_ORDER[result.previousTier]
            const newRank   = TIER_ORDER[result.newTier]
            const isUpgrade = newRank > prevRank

            if (isUpgrade) {
              upgraded++
              console.info('[evaluate-adda-tiers] UPGRADE', { addaId: adda.id, from: result.previousTier, to: result.newTier })
            } else {
              downgraded++
              console.info('[evaluate-adda-tiers] DOWNGRADE', { addaId: adda.id, from: result.previousTier, to: result.newTier })
            }

            // Notify the adda owner via WhatsApp
            if (adda.auth_user_id) {
              const { data: ownerProfile } = await admin
                .from('user_profiles')
                .select('phone')
                .eq('id', adda.auth_user_id)
                .maybeSingle()

              if (ownerProfile?.phone) {
                const msg = isUpgrade
                  ? buildAddaUpgradeMessage(adda.name, result.newTier)
                  : buildAddaDowngradeMessage(adda.name, result.newTier)
                await sendWhatsAppMessage(ownerProfile.phone, msg)
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[evaluate-adda-tiers] error', { addaId: adda.id, error: msg })
          errors.push(`adda:${adda.id} — ${msg}`)
        }
      }),
    )
  }

  const lastAdda   = addas[addas.length - 1]
  const nextCursor = addas.length === PAGE_SIZE ? lastAdda.id : null
  const isLastPage = nextCursor === null

  // ── 2. Trending overlay — runs on the final page only ────────────────────
  // Running on every page would produce duplicate/incorrect trending results.
  let trendingGranted = 0
  let trendingCleared = 0
  let citiesCount     = 0

  if (isLastPage) {
    const { data: cityRows } = await admin
      .from('adda_profiles')
      .select('city')
      .eq('is_active', true)

    const distinctCities = [...new Set((cityRows ?? []).map((c) => c.city))]
    citiesCount = distinctCities.length

    for (const city of distinctCities) {
      try {
        const trendingResults = await computeTrendingAddas(city)
        for (const r of trendingResults) {
          if (r.isTrending) trendingGranted++
          else trendingCleared++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[evaluate-adda-tiers] trending error', { city, error: msg })
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

  console.info('[evaluate-adda-tiers] page complete', result)
  return NextResponse.json(result)
}

// ---------------------------------------------------------------------------
// WhatsApp message builders for adda tier changes
// ---------------------------------------------------------------------------

const ADDA_TIER_LABELS: Record<AddaTier, string> = {
  open:      'Open',
  verified:  'Verified',
  beloved:   'Beloved',
  legendary: 'Legendary',
}

function buildAddaUpgradeMessage(addaName: string, newTier: AddaTier): string {
  return (
    `🎉 *${addaName}* has been upgraded to *${ADDA_TIER_LABELS[newTier]} Adda* status on WIMC! ` +
    `Your Adda's reputation is growing — keep hosting great events.`
  )
}

function buildAddaDowngradeMessage(addaName: string, newTier: AddaTier): string {
  return (
    `Hi! *${addaName}* has been updated to *${ADDA_TIER_LABELS[newTier]} Adda* on WIMC. ` +
    `Host more quality events to climb back up — your community is counting on you! 🙌`
  )
}
