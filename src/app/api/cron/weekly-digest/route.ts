// =============================================================================
// WIMC — Weekly Digest Cron
//
// Runs every Sunday at ~9am IST (03:30 UTC).
// For each Explorer with digest_frequency = 'weekly':
//   - Calls getPersonalisedFeed to fetch their top 5 upcoming events.
//   - Creates an in-app notification pointing at the Circles feed.
//
// This is a weekly_digest in-app notification, not a WhatsApp send — WhatsApp
// Utility templates cannot carry promotional/recommendation content like this
// (Meta would reject it), so per product research this digest stays in-app
// only. It used to attempt a free-text sendWhatsAppMessage() here, which
// would have failed against cold recipients (no open customer-service
// window) once real WhatsApp credentials were added — removed 2026-08-30 in
// favor of the in-app notification below rather than left silently broken.
//
// Schedule: "30 3 * * 0"  (Sunday 3:30am UTC ≈ 9am IST), triggered by a
// Netlify Scheduled Function (netlify/functions/weekly-digest.mts).
//
// Protected by CRON_SECRET — the scheduled function sends
// `Authorization: Bearer <CRON_SECRET>`.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonalisedFeed } from '@/lib/recommendations'
import { createNotification } from '@/app/actions/notifications'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[weekly-digest] CRON_SECRET not set — endpoint locked')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// GET /api/cron/weekly-digest
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Fetch all Explorer profiles that want a weekly digest.
  // We process them in pages of 200 to bound memory usage per cron run.
  const PAGE_SIZE = 200
  let offset      = 0
  let processed   = 0
  let hasMore     = true

  while (hasMore) {
    const { data: explorers, error: fetchError } = await admin
      .from('explorer_profiles')
      .select('id, auth_user_id, display_name, city, notification_preferences, interest_tags')
      .range(offset, offset + PAGE_SIZE - 1)

    if (fetchError) {
      console.error('[weekly-digest] fetch explorers failed', fetchError.message)
      return NextResponse.json({ error: 'Failed to fetch explorers' }, { status: 500 })
    }

    if (!explorers?.length) {
      hasMore = false
      break
    }

    for (const explorer of explorers) {
      const prefs = explorer.notification_preferences as
        | { whatsapp?: boolean; digest_frequency?: string }
        | null

      // Skip explorers who don't want a weekly digest.
      if (prefs?.digest_frequency !== 'weekly') continue

      try {
        const feed = await getPersonalisedFeed(explorer.id, {
          limit: 5,
          city:  explorer.city,
        })

        if (!feed.length) continue

        const eventSummaries = feed.map((e) =>
          `${e.title} — ${new Date(e.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} @ ${e.venue_name}`,
        )

        await createNotification({
          recipientId: explorer.auth_user_id,
          type:        'weekly_digest',
          title:       `Your week in ${explorer.city} ✨`,
          body:        eventSummaries.join(' · '),
          actionUrl:   '/circles',
        })
        processed++
      } catch (err) {
        console.error(
          '[weekly-digest] error processing explorer',
          { explorerId: explorer.id },
          String(err),
        )
      }
    }

    hasMore = explorers.length === PAGE_SIZE
    offset += PAGE_SIZE
  }

  console.info('[weekly-digest] run complete', { processed })
  return NextResponse.json({ processed })
}
