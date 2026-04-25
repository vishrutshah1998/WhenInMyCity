// =============================================================================
// WIMC — Weekly Digest Cron
//
// Runs every Sunday at ~9am IST (03:30 UTC).
// For each Explorer with digest_frequency = 'weekly':
//   - Calls getPersonalisedFeed to fetch their top 5 upcoming events.
//   - Logs the digest content that would be sent via WhatsApp (v2).
//
// Vercel cron schedule: "0 3 30 * 0"  (Sunday 3:30am UTC ≈ 9am IST)
//
// Protected by CRON_SECRET — Vercel injects
// `Authorization: Bearer <CRON_SECRET>` automatically.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersonalisedFeed } from '@/lib/recommendations'

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
      .select('id, auth_user_id, display_name, city, notification_preferences')
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

        // v2: send via WhatsApp Business API.
        // For now, log what would be sent.
        const eventSummaries = feed.map((e, i) =>
          `${i + 1}. ${e.title} — ${new Date(e.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} @ ${e.venue_name}`,
        )

        console.log('[weekly-digest] [v2-whatsapp]', {
          explorerId: explorer.id,
          message: [
            `Hey ${explorer.display_name}! Here's what's happening in ${explorer.city} this week:`,
            ...eventSummaries,
            `Explore more: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/explore`,
          ].join('\n'),
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
