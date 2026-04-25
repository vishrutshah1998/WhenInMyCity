// =============================================================================
// WIMC — Maker Tier Evaluation Cron
//
// Runs daily at 2am IST (20:30 UTC previous day) via Vercel Cron.
// Fetches all active Makers (last event within 30 days) and re-evaluates
// their tier against the TIER_THRESHOLDS constants.
//
// Protection:
//   Vercel automatically injects `Authorization: Bearer <CRON_SECRET>` when
//   invoking cron routes. For local testing, send the header manually.
//
// Returns: { evaluated: number, upgraded: number, downgraded: number }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateMakerTier, triggerTierCelebration } from '@/app/actions/tier'
import type { MakerTier } from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[evaluate-tiers] CRON_SECRET env var not set — endpoint locked')
    return false
  }
  const authHeader = request.headers.get('authorization') ?? ''
  return authHeader === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Tier ordering helper
// ---------------------------------------------------------------------------

const TIER_ORDER: Record<MakerTier, number> = {
  mohalla: 0,
  nukkad:  1,
  chowk:   2,
  maidan:  3,
}

// ---------------------------------------------------------------------------
// GET /api/cron/evaluate-tiers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Fetch Makers who have hosted at least one event in the last 30 days.
  // These are the accounts most likely to have tier-affecting activity.
  // Inactive Makers (> 180 days) are still included so downgrade logic can fire.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: activeMakers, error: fetchError } = await admin
    .from('user_profiles')
    .select('id, maker_tier')
    .eq('user_role', 'maker')
    .gte('last_event_hosted_at', thirtyDaysAgo)
    .order('last_event_hosted_at', { ascending: false })

  if (fetchError) {
    console.error('[evaluate-tiers] failed to fetch makers', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch makers' }, { status: 500 })
  }

  // Also fetch Makers who may be eligible for downgrade (inactive > 180 days).
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleMakers } = await admin
    .from('user_profiles')
    .select('id, maker_tier')
    .eq('user_role', 'maker')
    .lt('last_event_hosted_at', oneEightyDaysAgo)
    // Only look at non-Mohalla tiers (Mohalla can't be downgraded further).
    .in('maker_tier', ['nukkad', 'chowk'])
    // Exclude Maidan — never auto-downgraded.
    .neq('maker_tier', 'maidan')

  // Merge and deduplicate by id.
  const allMakers = [
    ...(activeMakers ?? []),
    ...(staleMakers ?? []).filter(
      (s) => !(activeMakers ?? []).find((a) => a.id === s.id),
    ),
  ]

  if (!allMakers.length) {
    return NextResponse.json({ evaluated: 0, upgraded: 0, downgraded: 0 })
  }

  console.info(`[evaluate-tiers] evaluating ${allMakers.length} makers`)

  let upgraded  = 0
  let downgraded = 0
  const errors: string[] = []

  // Process in batches of 10 to avoid overwhelming the DB.
  const BATCH_SIZE = 10

  for (let i = 0; i < allMakers.length; i += BATCH_SIZE) {
    const batch = allMakers.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (maker) => {
        try {
          const result = await evaluateMakerTier(maker.id)

          if (result.tierChanged) {
            const previousRank = TIER_ORDER[result.currentTier]
            const newRank      = TIER_ORDER[result.newTier]

            if (newRank > previousRank) {
              upgraded++
              // Trigger celebration flag so the dashboard can show upgrade UI.
              await triggerTierCelebration(maker.id)

              // Log the WhatsApp notification message (actual sending TBD).
              console.info('[evaluate-tiers] UPGRADE — WhatsApp notification queued', {
                makerId:      maker.id,
                previousTier: result.currentTier,
                newTier:      result.newTier,
                message:      buildUpgradeMessage(result.newTier),
              })
            } else {
              downgraded++

              console.info('[evaluate-tiers] DOWNGRADE — WhatsApp notification queued', {
                makerId:      maker.id,
                previousTier: result.currentTier,
                newTier:      result.newTier,
                message:      buildDowngradeMessage(result.newTier),
              })
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[evaluate-tiers] error processing maker', { makerId: maker.id, error: msg })
          errors.push(`maker:${maker.id} — ${msg}`)
        }
      }),
    )
  }

  const result = {
    evaluated: allMakers.length,
    upgraded,
    downgraded,
    ...(errors.length ? { errors } : {}),
  }

  console.info('[evaluate-tiers] run complete', result)

  return NextResponse.json(result)
}

// ---------------------------------------------------------------------------
// WhatsApp notification message builders (logged for now)
// ---------------------------------------------------------------------------

function buildUpgradeMessage(newTier: MakerTier): string {
  const tierLabels: Record<MakerTier, string> = {
    mohalla: 'Mohalla',
    nukkad:  'Nukkad',
    chowk:   'Chowk',
    maidan:  'Maidan',
  }
  return (
    `🎉 Congratulations! You've been upgraded to the *${tierLabels[newTier]}* tier on WIMC! ` +
    `Your community is growing — keep hosting amazing events. Open the app to see your new perks.`
  )
}

function buildDowngradeMessage(newTier: MakerTier): string {
  const tierLabels: Record<MakerTier, string> = {
    mohalla: 'Mohalla',
    nukkad:  'Nukkad',
    chowk:   'Chowk',
    maidan:  'Maidan',
  }
  return (
    `Hi! Your WIMC tier has been updated to *${tierLabels[newTier]}* due to inactivity. ` +
    `Host your next event to climb back up — your community is waiting! 🙌`
  )
}
