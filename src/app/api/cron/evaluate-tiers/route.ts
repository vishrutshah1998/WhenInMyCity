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
// Returns: { evaluated: number, upgraded: number, downgraded: number, nextCursor: string|null, done: boolean }
//
// Cursor pagination: pass ?cursor=<last_processed_id> to resume from a prior page.
// Each invocation fetches PAGE_SIZE users. When nextCursor is non-null, more pages remain.
// At scale beyond ~500 active users, chain invocations manually or add a self-invoking
// POST /api/cron/evaluate-tiers/continue route (OPTION B) — see comment below.
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
// Pagination constants
// ---------------------------------------------------------------------------

const PAGE_SIZE  = 500  // users fetched per invocation
const BATCH_SIZE = 10   // concurrent evaluations within a page

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

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') ?? ''  // '' means start from beginning

  const thirtyDaysAgo    = new Date(Date.now() - 30  * 24 * 60 * 60 * 1000).toISOString()
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  // Single paginated fetch: active users OR stale elevated users, ordered by id for stable cursor pagination.
  let query = admin
    .from('user_profiles')
    .select('id, user_tier, phone')
    .or(
      [
        `last_event_hosted_at.gte.${thirtyDaysAgo}`,
        `events_attended_count.gt.0`,
        `and(user_tier.in.(local,lantern),last_event_hosted_at.lt.${oneEightyDaysAgo})`,
      ].join(',')
    )
    .order('id', { ascending: true })
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.gt('id', cursor)
  }

  const { data: users, error: fetchError } = await query

  if (fetchError) {
    console.error('[evaluate-tiers] failed to fetch users', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  if (!users || users.length === 0) {
    console.info('[evaluate-tiers] no users to evaluate for cursor', cursor || 'start')
    return NextResponse.json({ evaluated: 0, upgraded: 0, downgraded: 0, nextCursor: null, done: true })
  }

  console.info(`[evaluate-tiers] page: ${users.length} users, cursor: ${cursor || 'start'}`)

  let upgraded   = 0
  let downgraded = 0
  const errors: string[] = []

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

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

  const lastUser   = users[users.length - 1]
  const nextCursor = users.length === PAGE_SIZE ? lastUser.id : null

  const result = {
    evaluated:  users.length,
    upgraded,
    downgraded,
    nextCursor,
    done: nextCursor === null,
    ...(errors.length ? { errors } : {}),
  }

  console.info('[evaluate-tiers] page complete', { ...result, cursor: cursor || 'start' })
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
