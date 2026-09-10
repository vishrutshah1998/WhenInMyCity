// =============================================================================
// WIMC — Paid-Gated Application Expiry Sweep (Phase B, migration 080)
//
// Runs every 15 minutes via a Netlify Scheduled Function
// (netlify/functions/expire-applications.mts). Finds event_applications rows
// that are still 'approved', have an elapsed payment_deadline, and were
// never paid (rsvp_id IS NULL), and flips them to 'expired' — a permanent
// terminal state (see migration 080). A guest who misses their window must
// submit a brand new application; this cron never resets a row back to
// 'approved'/'pending', and 'expired' is never reset either.
//
// decided_at/decided_by are NEVER touched here — those record the host's
// original approval decision, not this system action. Overwriting them
// would lose real information ("host approved X, guest simply didn't pay"
// is different from "host never decided") — see migration 080's
// event_applications_decided_at_requires_decision constraint and comments.
//
// Why this doesn't recover any capacity: capacity was never reserved for an
// approved-but-unpaid application in the first place — initiateRSVP only
// checks capacity at the moment someone actually pays (see rsvp.ts /
// event-applications.ts). This cron exists purely so the host-facing review
// queue and applicant-facing state are accurate — not to free a held spot,
// because nothing was held. initiatePaymentForApplication (event-
// applications.ts) already defensively rejects a payment attempt against an
// elapsed payment_deadline regardless of whether this cron has run yet, so a
// late-running sweep can never let a guest pay past their window — it only
// affects how promptly the DB status (and therefore the UI) reflects reality.
//
// Fires rsvp_application_expired_v1 (placeholder — not yet created/approved
// in Meta Business Manager, so sends fail silently, caught + logged, until
// it is) once per row that actually transitions to 'expired' in this pass.
// Kept as a single bulk UPDATE, not a per-row loop: .update().select() with
// an embedded event:event_id(...) relation (same embedding Supabase-js
// pattern already used for the failed-refund step in reconcile-payments/
// route.ts) returns everything the message needs — applicant_phone plus the
// event's title/slug/starts_at — straight off the UPDATE's RETURNING, so
// there's no reason to give up the bulk write to get per-row data for sends.
//

// Cursor pagination: pass ?cursor=<last_processed_id> to resume from a prior
// page. Each invocation fetches PAGE_SIZE overdue rows, ordered by id, past
// whatever id was passed as cursor. Same PAGE_SIZE/cursor/nextCursor/done
// contract as reconcile-payments/evaluate-tiers/evaluate-venue-tiers, chained
// by the Netlify function within the same 25s time budget — see
// netlify/functions/expire-applications.mts. Pagination matters here because
// a single event's applicants approved close together (or several creators'
// events landing on the same round-number payment-window boundary) can put
// many rows on the exact same payment_deadline at once — a flat single-page
// query could silently undercount on a busy tick.
//
// PAGE_SIZE=500 (not reconcile-payments' 100): this cron does a single bulk
// DB UPDATE with no per-row external API call (no Razorpay, no WhatsApp), so
// it has none of reconcile-payments' per-row Razorpay-rate-limit throttling
// concern — matches the DB-only evaluate-tiers/evaluate-venue-tiers crons
// instead.
//
// Protect this endpoint with a shared CRON_SECRET so it cannot be triggered
// by arbitrary external requests. The Netlify Scheduled Function that calls
// this route sends `Authorization: Bearer <CRON_SECRET>` — for other
// platforms/local testing, send the header manually.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[expire-applications] CRON_SECRET env var not set — endpoint locked')
    return false
  }

  const authHeader = request.headers.get('authorization') ?? ''
  return authHeader === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Pagination constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 500

// ---------------------------------------------------------------------------
// Expiry notification
// ---------------------------------------------------------------------------

type ExpiredRow = {
  applicant_phone: string
  event: { title: string; slug: string; starts_at: string } | { title: string; slug: string; starts_at: string }[] | null
}

/**
 * Body is deliberately factual only — "your window closed, you're welcome
 * to apply again if spots remain" — no promotional/forward-looking framing.
 * Same lesson as rsvp_application_declined_v1, which got reclassified to
 * Marketing in Meta for reading as a nudge rather than a plain status
 * update; this template is written to avoid that from the start.
 *
 * Never awaited by the caller (fire-and-forget with catch+log) — matches
 * every other WhatsApp send in this codebase (rsvp.ts, event-
 * applications.ts, reconcile-payments/route.ts): a notification failure
 * must never block or fail the cron itself.
 */
async function notifyExpiry(row: ExpiredRow): Promise<void> {
  if (!row.applicant_phone) return
  const event = Array.isArray(row.event) ? row.event[0] : row.event
  if (!event) return

  const eventDateOnly = new Date(event.starts_at).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  })

  try {
    // NOTE: rsvp_application_expired_v1 is a placeholder name — this
    // template does not exist in Meta Business Manager yet, so this send
    // will fail silently (caught + logged below) until it's created and
    // approved there. Same situation as every placeholder template
    // introduced for this event_applications flow (event-applications.ts).
    await sendWhatsAppTemplate(row.applicant_phone, 'rsvp_application_expired_v1', 'en', [
      event.title, eventDateOnly,
    ], [{ index: 0, urlParameter: event.slug }])
  } catch (err) {
    console.error('[expire-applications] WhatsApp send failed', { error: String(err) })
  }
}

// ---------------------------------------------------------------------------
// GET /api/cron/expire-applications
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') ?? ''   // '' means start from beginning of this tick

  const now = new Date().toISOString()

  // ── 1. Find overdue, still-unpaid, still-approved applications ──────────
  let overdueQuery = admin
    .from('event_applications')
    .select('id')
    .eq('status', 'approved')
    .is('rsvp_id', null)
    .lt('payment_deadline', now)
    .order('id', { ascending: true })
    .limit(PAGE_SIZE)

  if (cursor) {
    overdueQuery = overdueQuery.gt('id', cursor)
  }

  const { data: overdue, error: fetchError } = await overdueQuery

  if (fetchError) {
    console.error('[expire-applications] failed to fetch overdue applications', fetchError.message)
    return NextResponse.json({ error: 'Failed to fetch overdue applications' }, { status: 500 })
  }

  if (!overdue?.length) {
    return NextResponse.json({ expired: 0, nextCursor: null, done: true })
  }

  console.info(`[expire-applications] found ${overdue.length} overdue application(s), cursor: ${cursor || 'start'}`)

  // ── 2. Flip them to 'expired' in one bulk update ─────────────────────────
  // Guarded by the same status/rsvp_id predicate as the SELECT above, so a
  // row that got paid (rsvp_id set) in the gap between the two is left
  // alone — an idempotency guard against the payment race, not a host-
  // decision race: decidePaidApplication's own guard only allows
  // pending/waitlisted → *, so a host can never revive an 'approved' row.
  const ids = overdue.map((a) => a.id)
  const expiredAt = new Date().toISOString()

  const { data: updated, error: updateError } = await admin
    .from('event_applications')
    .update({ status: 'expired', expired_at: expiredAt })
    .in('id', ids)
    .eq('status', 'approved')
    .is('rsvp_id', null)
    .select('id, applicant_phone, event:event_id (title, slug, starts_at)')

  if (updateError) {
    console.error('[expire-applications] update failed', updateError.message)
    return NextResponse.json({ error: 'Failed to expire applications' }, { status: 500 })
  }

  const expiredCount = updated?.length ?? 0
  if (expiredCount !== overdue.length) {
    console.info('[expire-applications] some rows skipped (paid in the race window between select and update)', {
      fetched: overdue.length, expired: expiredCount,
    })
  }

  // Fire-and-forget, not awaited — see notifyExpiry's doc comment.
  for (const row of updated ?? []) {
    notifyExpiry(row).catch(() => {})
  }

  const nextCursor = overdue.length === PAGE_SIZE ? overdue[overdue.length - 1].id : null

  const result = {
    expired: expiredCount,
    nextCursor,
    done: nextCursor === null,
  }

  console.info('[expire-applications] page complete', { ...result, cursor: cursor || 'start' })

  return NextResponse.json(result)
}
