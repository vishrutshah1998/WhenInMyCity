// =============================================================================
// WIMC — User Tier Evaluation Cron
//
// Runs daily at 2am IST (20:30 UTC previous day) via Vercel Cron.
// Evaluates all active users against the unified Wanderer→Local→Lantern→Beacon
// tier ladder and updates user_profiles accordingly.
//
// Protection:
//   Vercel automatically injects `Authorization: Bearer <CRON_SECRET>` when
//   invoking cron routes. For local testing, send the header manually.
//
// Returns: { evaluated: number, upgraded: number, downgraded: number }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateUserTier, triggerTierCelebration } from '@/app/actions/tier'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { UserTier } from '@/types/marketplace'

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

const TIER_ORDER: Record<UserTier, number> = {
  wanderer: 0,
  local:    1,
  lantern:  2,
  beacon:   3,
}

// ---------------------------------------------------------------------------
// GET /api/cron/evaluate-tiers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Evaluate users active in the last 30 days (attended or hosted events).
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: activeUsers, error: fetchError } = await admin
    .from('user_profiles')
    .select('id, user_tier, phone')
    .or(`last_event_hosted_at.gte.${thirtyDaysAgo},events_attended_count.gt.0`)
    .order('updated_at', { ascending: false })

  if (fetchError) {
    console.error('[evaluate-tiers] failed to fetch users', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // Also catch Local/Lantern users at risk of downgrade due to inactivity.
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleUsers } = await admin
    .from('user_profiles')
    .select('id, user_tier, phone')
    .in('user_tier', ['local', 'lantern'])
    .lt('last_event_hosted_at', oneEightyDaysAgo)

  // Merge and deduplicate.
  const seen = new Set<string>()
  const allUsers: { id: string; user_tier: string; phone: string | null }[] = []
  for (const u of [...(activeUsers ?? []), ...(staleUsers ?? [])]) {
    if (!seen.has(u.id)) { seen.add(u.id); allUsers.push(u) }
  }

  if (!allUsers.length) {
    return NextResponse.json({ evaluated: 0, upgraded: 0, downgraded: 0 })
  }

  console.info(`[evaluate-tiers] evaluating ${allUsers.length} users`)

  let upgraded   = 0
  let downgraded = 0
  const errors: string[] = []

  const BATCH_SIZE = 10

  for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
    const batch = allUsers.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (user) => {
        try {
          const result = await evaluateUserTier(user.id)

          if (result.tierChanged) {
            const previousRank = TIER_ORDER[result.currentTier]
            const newRank      = TIER_ORDER[result.newTier]

            if (newRank > previousRank) {
              upgraded++
              await triggerTierCelebration(user.id)
              console.info('[evaluate-tiers] UPGRADE', {
                userId: user.id, previousTier: result.currentTier, newTier: result.newTier,
              })
              // Grant 3 streak freeze tokens when reaching Local tier for the first time.
              if (result.newTier === 'local' && result.currentTier === 'wanderer') {
                await admin
                  .from('user_profiles')
                  .update({ streak_freeze_tokens: 3 })
                  .eq('id', user.id)
              }
              if (user.phone) {
                await sendWhatsAppMessage(user.phone, buildUpgradeMessage(result.newTier))
              }
            } else {
              downgraded++
              console.info('[evaluate-tiers] DOWNGRADE', {
                userId: user.id, previousTier: result.currentTier, newTier: result.newTier,
              })
              if (user.phone) {
                await sendWhatsAppMessage(user.phone, buildDowngradeMessage(result.newTier))
              }
            }
          } else if (result.recoveryStarted) {
            console.info('[evaluate-tiers] BEACON RECOVERY START', { userId: user.id })
            if (user.phone) {
              await sendWhatsAppMessage(user.phone, buildRecoveryMessage())
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[evaluate-tiers] error processing user', { userId: user.id, error: msg })
          errors.push(`user:${user.id} — ${msg}`)
        }
      }),
    )
  }

  const result = {
    evaluated: allUsers.length,
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

const TIER_LABELS: Record<UserTier, string> = {
  wanderer: 'Wanderer',
  local:    'Local',
  lantern:  'Lantern',
  beacon:   'Beacon',
}

function buildUpgradeMessage(newTier: UserTier): string {
  return (
    `🎉 You've been upgraded to *${TIER_LABELS[newTier]}* on WIMC! ` +
    `Your city is noticing — keep showing up. Open the app to see your new perks.`
  )
}

function buildDowngradeMessage(newTier: UserTier): string {
  return (
    `Hi! Your WIMC tier has been updated to *${TIER_LABELS[newTier]}*. ` +
    `Keep attending and hosting events to climb back up — your community is waiting! 🙌`
  )
}

function buildRecoveryMessage(): string {
  return (
    `⚠️ Your *Beacon* status has entered a 90-day recovery period on WIMC. ` +
    `Your badge is dimmed and perks are frozen, but your rank won't drop yet. ` +
    `Meet all Beacon criteria before the window closes to stay at Beacon. Open the app for details.`
  )
}
