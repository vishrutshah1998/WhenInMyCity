// =============================================================================
// WIMC — Payment Reconciliation Cron
//
// Runs every 15 minutes (configure in vercel.json or your cron provider).
// Finds RSVP rows that are still 'pending' after 15 minutes — meaning the
// Razorpay webhook either hasn't fired or was missed — and syncs their true
// status from the Razorpay API.
//
// Why this is necessary:
//   - Webhooks are best-effort: network failures, Supabase downtime, or a
//     deployment restart can cause a webhook to be missed.
//   - Pending RSVPs count against capacity for 10 minutes.  Without
//     reconciliation, failed payments would remain 'pending' indefinitely,
//     permanently blocking spots.
//   - Financial accuracy: 'pending' RSVPs cannot be refunded or reported.
//
// Recommended cron schedule: */15 * * * * (every 15 minutes)
//
// Protect this endpoint with a shared CRON_SECRET so it cannot be triggered
// by arbitrary external requests:
//
//   # vercel.json
//   {
//     "crons": [{
//       "path": "/api/cron/reconcile-payments",
//       "schedule": "*/15 * * * *"
//     }]
//   }
//
// Vercel automatically injects `Authorization: Bearer <CRON_SECRET>` when
// invoking cron routes.  For other platforms, send the header manually.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPaymentStatus, refundPayment, RazorpayApiError } from '@/lib/razorpay'
import { triggerPostEventRating } from '@/app/actions/explorer'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { bumpUserMetric } from '@/lib/metrics'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

/**
 * Verifies the `Authorization: Bearer <CRON_SECRET>` header.
 * Returns true if the secret matches, false otherwise.
 *
 * We use a simple string comparison (not timing-safe) because the secret is
 * not a cryptographic value — it's just an access control token for an
 * internal endpoint.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // If not set, lock down the endpoint completely.
    console.error('[reconcile] CRON_SECRET env var not set — endpoint locked')
    return false
  }

  const authHeader = request.headers.get('authorization') ?? ''
  return authHeader === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// GET /api/cron/reconcile-payments
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // ── 1. Find stale pending RSVPs ──────────────────────────────────────────
  // An RSVP is "stale" if it has been pending for > 15 minutes.
  // We use 15 min here (vs the 10-min window in capacity checks) to give the
  // webhook extra time to arrive before we start reconciling.
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: staleRsvps, error: fetchError } = await admin
    .from('rsvps')
    .select('id, razorpay_order_id, razorpay_payment_id, event_id')
    .eq('payment_status', 'pending')
    .lt('created_at', cutoff)
    // Limit per run to avoid long-running requests that might time out.
    // Any remaining stale RSVPs will be caught on the next cron run.
    .limit(100)

  if (fetchError) {
    console.error('[reconcile] failed to fetch stale RSVPs', fetchError.message)
    return NextResponse.json(
      { error: 'Failed to fetch stale RSVPs' },
      { status: 500 },
    )
  }

  if (!staleRsvps?.length) {
    return NextResponse.json({ fixed: 0, still_pending: 0, checked: 0 })
  }

  console.info(`[reconcile] found ${staleRsvps.length} stale pending RSVPs`)

  // ── 2. Resolve each stale RSVP ───────────────────────────────────────────
  // We need the Razorpay payment ID to call fetchPaymentStatus.
  // Pending RSVPs may not yet have a payment ID if the user never completed
  // the checkout flow — treat those as definitively failed.

  let fixed = 0
  let stillPending = 0
  const errors: string[] = []

  // Process in parallel batches of 5 to avoid hammering Razorpay's rate limit.
  // Razorpay's standard rate limit is 100 req/s; 5 concurrent is very safe.
  const BATCH_SIZE = 5

  for (let i = 0; i < staleRsvps.length; i += BATCH_SIZE) {
    const batch = staleRsvps.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (rsvp) => {
        try {
          // ── No payment ID: user never reached Razorpay ─────────────────
          if (!rsvp.razorpay_payment_id) {
            // The order was created but the user abandoned the payment.
            // Mark as failed to release the spot.
            await admin
              .from('rsvps')
              .update({ payment_status: 'failed' })
              .eq('id', rsvp.id)
              .eq('payment_status', 'pending')   // idempotency

            console.info('[reconcile] abandoned RSVP → failed (no payment ID)', {
              rsvpId: rsvp.id,
              orderId: rsvp.razorpay_order_id,
            })
            fixed++
            return
          }

          // ── Fetch actual status from Razorpay ──────────────────────────
          const status = await fetchPaymentStatus(rsvp.razorpay_payment_id)

          switch (status) {
            case 'captured': {
              const { error } = await admin
                .from('rsvps')
                .update({ payment_status: 'captured' })
                .eq('id', rsvp.id)
                .eq('payment_status', 'pending')

              if (error) {
                console.error('[reconcile] DB update failed for captured', {
                  rsvpId: rsvp.id, error: error.message,
                })
              } else {
                console.info('[reconcile] RSVP → captured (missed webhook)', {
                  rsvpId: rsvp.id,
                  paymentId: rsvp.razorpay_payment_id,
                })
                fixed++
              }
              break
            }

            case 'failed': {
              const { error } = await admin
                .from('rsvps')
                .update({ payment_status: 'failed' })
                .eq('id', rsvp.id)
                .eq('payment_status', 'pending')

              if (error) {
                console.error('[reconcile] DB update failed for failed payment', {
                  rsvpId: rsvp.id, error: error.message,
                })
              } else {
                console.info('[reconcile] RSVP → failed', {
                  rsvpId: rsvp.id,
                  paymentId: rsvp.razorpay_payment_id,
                })
                fixed++
              }
              break
            }

            case 'refunded': {
              const { error } = await admin
                .from('rsvps')
                .update({ payment_status: 'refunded' })
                .eq('id', rsvp.id)
                .eq('payment_status', 'pending')

              if (error) {
                console.error('[reconcile] DB update failed for refunded', {
                  rsvpId: rsvp.id, error: error.message,
                })
              } else {
                fixed++
              }
              break
            }

            case 'authorized': {
              // Payment exists and is authorized but not yet captured.
              // This can happen with certain bank flows.  Log for review
              // but don't mark as failed — give it another cron cycle.
              console.warn('[reconcile] RSVP still authorized (not captured)', {
                rsvpId: rsvp.id,
                paymentId: rsvp.razorpay_payment_id,
              })
              stillPending++
              break
            }
          }
        } catch (err) {
          const msg = err instanceof RazorpayApiError
            ? `Razorpay ${err.status}: ${err.message}`
            : String(err)

          console.error('[reconcile] error processing RSVP', {
            rsvpId: rsvp.id,
            paymentId: rsvp.razorpay_payment_id,
            error: msg,
          })
          errors.push(`rsvp:${rsvp.id} — ${msg}`)
          stillPending++
        }
      }),
    )
  }

  const result = {
    checked: staleRsvps.length,
    fixed,
    still_pending: stillPending,
    ...(errors.length ? { errors } : {}),
  }

  console.info('[reconcile] run complete', result)

  // ── 3. Trigger post-event rating prompts for events that ended ~24h ago ──
  // We look for events whose ends_at is between 24h and 25h ago so that each
  // 15-minute cron run only processes the window once (avoiding duplicates).
  const ratingWindowStart = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  const ratingWindowEnd   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: ratingEvents, error: ratingFetchError } = await admin
    .from('events')
    .select('id')
    .eq('status', 'published')
    .not('ends_at', 'is', null)
    .gte('ends_at', ratingWindowStart)
    .lte('ends_at', ratingWindowEnd)

  if (ratingFetchError) {
    console.error('[reconcile] rating trigger fetch failed', ratingFetchError.message)
  } else if (ratingEvents?.length) {
    console.info(`[reconcile] triggering rating prompts for ${ratingEvents.length} event(s)`)
    for (const ev of ratingEvents) {
      triggerPostEventRating(ev.id).catch((err) => {
        console.error('[reconcile] triggerPostEventRating failed', { eventId: ev.id }, String(err))
      })

      // Mark unchecked-in attendees as no-shows.
      const { data: noShows } = await admin
        .from('rsvps')
        .select('id, attendee_user_id')
        .eq('event_id', ev.id)
        .eq('payment_status', 'captured')
        .eq('checked_in', false)
        .not('attendee_user_id', 'is', null)

      for (const rsvp of noShows ?? []) {
        if (!rsvp.attendee_user_id) continue
        bumpUserMetric(admin, rsvp.attendee_user_id, 'no_shows_count', 1, 'reconcile:no_shows')
      }

      if (noShows?.length) {
        console.info(`[reconcile] recorded ${noShows.length} no-show(s) for event ${ev.id}`)
      }
    }
  }

  // ── 4. Send 24-hour event reminders ─────────────────────────────────────
  // Look for events starting in 23–25 hours so each 15-min cron run covers
  // the window exactly once without duplicates.
  const reminderWindowStart = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  const reminderWindowEnd   = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()

  const { data: upcomingEvents, error: reminderFetchError } = await admin
    .from('events')
    .select('id, title, starts_at, venue_name, venue_address, slug, creator_id')
    .eq('status', 'published')
    .gte('starts_at', reminderWindowStart)
    .lte('starts_at', reminderWindowEnd)

  if (reminderFetchError) {
    console.error('[reconcile] reminder fetch failed', reminderFetchError.message)
  } else if (upcomingEvents?.length) {
    console.info(`[reconcile] sending 24h reminders for ${upcomingEvents.length} event(s)`)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'

    for (const ev of upcomingEvents) {
      const { data: rsvps } = await admin
        .from('rsvps')
        .select('id, attendee_name, attendee_phone')
        .eq('event_id', ev.id)
        .eq('payment_status', 'captured')

      if (!rsvps?.length) continue

      const { data: creator } = await admin
        .from('user_profiles')
        .select('username')
        .eq('id', ev.creator_id)
        .maybeSingle()

      const eventPageUrl = creator?.username
        ? `${appUrl}/${creator.username}/${ev.slug}`
        : appUrl

      const eventDate = new Date(ev.starts_at).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })

      for (const rsvp of rsvps) {
        const whatsappMsg = [
          `🌟 See you tomorrow at "${ev.title}"!`,
          `📅 ${eventDate}`,
          `📍 ${ev.venue_name}${ev.venue_address ? `, ${ev.venue_address}` : ''}`,
          `🎫 View your QR code: ${eventPageUrl}`,
        ].join('\n')

        sendWhatsAppMessage(rsvp.attendee_phone, whatsappMsg).catch((err) => {
          console.error('[reconcile] reminder WhatsApp failed', { rsvpId: rsvp.id, error: String(err) })
        })
      }
    }
  }

  // ── 5. Retry failed refunds ──────────────────────────────────────────────
  // RSVPs with payment_status = 'refund_failed' were set during event
  // cancellation when the Razorpay refund call errored.  Retry up to 20
  // per cron run; any remainder will be caught on the next cycle.
  const { data: failedRefunds } = await admin
    .from('rsvps')
    .select('id, razorpay_payment_id, attendee_name, attendee_phone, event_id')
    .eq('payment_status', 'refund_failed')
    .limit(20)

  if (failedRefunds?.length) {
    console.info(`[reconcile] retrying ${failedRefunds.length} failed refund(s)`)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'

    await Promise.all(
      failedRefunds.map(async (rsvp) => {
        if (!rsvp.razorpay_payment_id) return

        const { refund_id, error: refundErr } = await refundPayment(rsvp.razorpay_payment_id)

        if (refundErr || !refund_id) {
          console.error('[reconcile] refund retry failed', {
            rsvpId: rsvp.id, paymentId: rsvp.razorpay_payment_id, refundErr,
          })
          return
        }

        await admin
          .from('rsvps')
          .update({ payment_status: 'refunded' })
          .eq('id', rsvp.id)

        console.info('[reconcile] refund retry succeeded', { rsvpId: rsvp.id })

        if (rsvp.attendee_phone) {
          sendWhatsAppMessage(
            rsvp.attendee_phone,
            `Hi ${rsvp.attendee_name}, your refund for the cancelled event has been processed and will reflect within 5–7 business days. Sorry for the delay! — When In My City`,
          ).catch(() => {})
        }
      }),
    )
  }

  return NextResponse.json(result)
}
