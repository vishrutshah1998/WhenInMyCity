// =============================================================================
// WIMC — Razorpay Webhook Handler
//
// Razorpay sends signed POST requests to this endpoint when payment events
// occur (captured, failed, refunded, etc.).
//
// CRITICAL RULES for webhook handlers:
//   1. Always return HTTP 200, even on errors.
//      If we return 4xx/5xx, Razorpay retries for up to 24 hours, amplifying
//      any DB issues.  Instead, log errors and let the reconciliation cron
//      clean up.
//
//   2. Verify the signature before touching any data.
//      Razorpay signs the raw body with RAZORPAY_WEBHOOK_SECRET (different
//      from the API key secret).  An unsigned request is rejected silently.
//
//   3. Be idempotent.
//      Razorpay can deliver the same event multiple times (retries, network
//      blips).  We record the x-razorpay-event-id in webhook_events and skip
//      any event we've already processed.
//
//   4. Read the raw body for signature verification.
//      Parsing the body first (JSON.parse) changes the byte representation and
//      will break the HMAC check.  We read as text and parse separately.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { calculateChargeAmount } from '@/types/events'

// Always return 200 — see rule #1 above.
const OK = () => NextResponse.json({ received: true }, { status: 200 })

// ---------------------------------------------------------------------------
// Webhook payload types (minimal — we only extract what we need)
// ---------------------------------------------------------------------------

interface RazorpayWebhookPayload {
  event: string          // e.g. 'payment.captured'
  payload: {
    payment?: {
      entity: {
        id: string               // pay_xxx
        order_id: string         // order_xxx
        status: string
        amount: number           // paise
      }
    }
    refund?: {
      entity: {
        id: string               // rfnd_xxx
        payment_id: string       // pay_xxx
        amount: number
        status: string
      }
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/razorpay
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Read raw body (MUST happen before any parsing) ───────────────────
  // Next.js App Router request bodies can only be consumed once.  Reading as
  // text here means we can verify the signature AND parse JSON from the same
  // string without cloning.
  const rawBody = await request.text()

  // ── 2. Verify webhook signature ──────────────────────────────────────────
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  let signatureValid: boolean
  try {
    signatureValid = verifyWebhookSignature(rawBody, signature)
  } catch (err) {
    // Missing env var — log and return 200 so Razorpay doesn't hammer us.
    console.error('[webhook] signature verification error', err)
    return OK()
  }

  if (!signatureValid) {
    // Not from Razorpay — log and discard silently.
    console.warn('[webhook] invalid signature — possible spoofed request', {
      signatureHeader: signature.slice(0, 12) + '...',
    })
    return OK()
  }

  // ── 3. Parse payload ─────────────────────────────────────────────────────
  let body: RazorpayWebhookPayload
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookPayload
  } catch {
    console.error('[webhook] JSON parse failed — body was not valid JSON')
    return OK()
  }

  // ── 4. Idempotency check ─────────────────────────────────────────────────
  // x-razorpay-event-id is a stable unique ID per webhook delivery.
  const webhookEventId = request.headers.get('x-razorpay-event-id') ?? ''

  if (!webhookEventId) {
    // Older Razorpay integrations may not include this header.
    // Log a warning but continue processing — don't block.
    console.warn('[webhook] missing x-razorpay-event-id header; idempotency not guaranteed')
  }

  const admin = createAdminClient()

  if (webhookEventId) {
    // Try to insert the event ID.  If it already exists (duplicate delivery)
    // the insert will fail on the PRIMARY KEY constraint.
    const { error: idempotencyError } = await admin
      .from('webhook_events')
      .insert({
        id: webhookEventId,
        event_type: body.event,
        payload: JSON.parse(rawBody),
      })

    if (idempotencyError) {
      if (idempotencyError.code === '23505') {
        // Duplicate — already processed.
        console.info('[webhook] duplicate event skipped', { webhookEventId, event: body.event })
        return OK()
      }
      // Other DB error — log and continue (don't block processing).
      console.error('[webhook] idempotency insert failed', idempotencyError.message)
    }
  }

  // ── 5. Route to event handler ────────────────────────────────────────────
  console.info('[webhook] processing event', {
    webhookEventId,
    event: body.event,
  })

  try {
    switch (body.event) {
      case 'payment.captured':
        await handlePaymentCaptured(admin, body)
        break

      case 'payment.failed':
        await handlePaymentFailed(admin, body)
        break

      case 'refund.processed':
        await handleRefundProcessed(admin, body)
        break

      default:
        // Unknown event type — log and ignore.  New Razorpay event types
        // should not break existing functionality.
        console.info('[webhook] unhandled event type', body.event)
    }
  } catch (err) {
    // Catch-all: log but ALWAYS return 200 (rule #1).
    console.error('[webhook] handler threw an error', {
      event: body.event,
      webhookEventId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return OK()
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * payment.captured — Razorpay has collected and settled the funds.
 *
 * Finds all pending RSVP rows for this order and marks them 'captured'.
 * This is the webhook safety net for cases where `confirmRSVPPayment` was
 * not called (app crash, network failure, user closed the app after payment).
 *
 * Also reconciles `amount_paid` on rows `confirmRSVPPayment` already
 * captured (that fast path can beat this webhook to the punch) — this
 * handler is the only writer that receives Razorpay's own captured-amount
 * figure, so it double-checks the per-ticket amount even when it isn't the
 * one flipping payment_status.
 */
async function handlePaymentCaptured(
  admin: AdminClient,
  body: RazorpayWebhookPayload,
): Promise<void> {
  const payment = body.payload.payment?.entity
  if (!payment) {
    console.error('[webhook:payment.captured] missing payment entity in payload')
    return
  }

  const { id: paymentId, order_id: orderId, amount } = payment

  // Load every RSVP row sharing this order — both still-pending rows (the
  // common "webhook is the safety net" case) and already-captured rows (the
  // common "confirmRSVPPayment beat us here" case) — so amount_paid can be
  // reconciled either way.
  const { data: orderRows, error: fetchError } = await admin
    .from('rsvps')
    .select('id, payment_status, amount_paid, platform_fee_paise, maker_payout_paise, venue_fee_paise')
    .eq('razorpay_order_id', orderId)

  if (fetchError) {
    console.error('[webhook:payment.captured] failed to load order rows', {
      orderId, paymentId, error: fetchError.message,
    })
    return
  }

  if (!orderRows?.length) {
    // Not an RSVP order — check whether it's a digital-product purchase
    // (DigitalProductBlock / ShopTheLookBlock both create orders through
    // initiateDigitalPurchase, which shares this order-id pattern).
    await handleDigitalPurchaseCaptured(admin, orderId, paymentId, amount)
    return
  }

  // All tickets within one order share the same tier/price (one initiateRSVP
  // call = one tier selection for the whole cart), so the per-ticket amount
  // can be derived once from any row's frozen revenue-split fields — which
  // sum to exactly the base ticket price locked in at booking time.
  const perTicketBasePaise =
    (orderRows[0].platform_fee_paise ?? 0) +
    (orderRows[0].maker_payout_paise ?? 0) +
    (orderRows[0].venue_fee_paise ?? 0)
  const expectedAmountPaid = calculateChargeAmount(perTicketBasePaise, 1)

  const orderTotalExpected = expectedAmountPaid * orderRows.length
  if (Math.abs(orderTotalExpected - amount) > orderRows.length) {
    // A paisa or two of drift from per-ticket GST rounding is expected;
    // anything larger suggests the tier price changed after checkout, or a bug.
    console.warn('[webhook:payment.captured] amount mismatch vs Razorpay', {
      orderId, paymentId, orderTotalExpected, razorpayAmount: amount,
    })
  }

  const pendingIds = orderRows.filter((r) => r.payment_status === 'pending').map((r) => r.id)
  const staleCapturedIds = orderRows
    .filter((r) => r.payment_status === 'captured' && r.amount_paid !== expectedAmountPaid)
    .map((r) => r.id)

  let updated: { id: string; attendee_name: string; attendee_phone: string; qr_code_token: string; amount_paid: number | null; event_id: string }[] = []

  if (pendingIds.length) {
    const { data, error } = await admin
      .from('rsvps')
      .update({
        payment_status: 'captured',
        razorpay_payment_id: paymentId,
        amount_paid: expectedAmountPaid,
      })
      .in('id', pendingIds)
      .select('id, attendee_name, attendee_phone, qr_code_token, amount_paid, event_id')

    if (error) {
      console.error('[webhook:payment.captured] DB update failed', {
        orderId, paymentId, error: error.message,
      })
      return
    }
    updated = data ?? []
  }

  if (staleCapturedIds.length) {
    // confirmRSVPPayment already flipped these to captured but the fast
    // path either hadn't landed the amount_paid fix yet or computed a
    // stale figure — reconcile amount_paid only, nothing else on the row,
    // and don't resend notifications (already sent when it was captured).
    const { error } = await admin
      .from('rsvps')
      .update({ amount_paid: expectedAmountPaid })
      .in('id', staleCapturedIds)

    if (error) {
      console.error('[webhook:payment.captured] amount_paid reconciliation failed', {
        orderId, paymentId, error: error.message,
      })
    }
  }

  console.info('[webhook:payment.captured] confirmed', {
    orderId,
    paymentId,
    ticketsUpdated: updated.length,
    ticketsReconciled: staleCapturedIds.length,
  })

  if (!updated.length) return

  // Fetch event details for the confirmation message (all RSVPs share the same event).
  const eventId = updated[0].event_id
  const { data: event } = await admin
    .from('events')
    .select('title, starts_at, venue_name, venue_address, ticket_price, slug')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return

  const { data: creator } = await admin
    .from('user_profiles')
    .select('username')
    .eq('id', (await admin.from('events').select('creator_id').eq('id', eventId).maybeSingle()).data?.creator_id ?? '')
    .maybeSingle()

  const eventDate = new Date(event.starts_at).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'
  const eventPageUrl = creator?.username ? `${appUrl}/${creator.username}/${event.slug}` : appUrl
  const priceRupees = event.ticket_price ? `₹${Math.round(event.ticket_price / 100)}` : 'Free'

  for (const rsvp of updated) {
    const qrUrl = `${appUrl}/api/qr/${rsvp.qr_code_token}`

    const whatsappMsg = [
      `✅ Booking confirmed! You're going to "${event.title}"`,
      `📅 ${eventDate}`,
      `📍 ${event.venue_name}${event.venue_address ? `, ${event.venue_address}` : ''}`,
      `🎫 Show your QR at the door: ${qrUrl}`,
    ].join('\n')

    sendWhatsAppMessage(rsvp.attendee_phone, whatsappMsg).catch((err) => {
      console.error('[webhook:payment.captured] WhatsApp send failed', { rsvpId: rsvp.id, error: String(err) })
    })
  }
}

/**
 * payment.failed — The payment attempt was declined or timed out.
 *
 * Marks the pending RSVPs as 'failed', releasing the spots back to the pool.
 * The 10-minute pending window in the capacity check already handles most
 * cases, but this explicit update ensures accurate capacity reporting.
 */
async function handlePaymentFailed(
  admin: AdminClient,
  body: RazorpayWebhookPayload,
): Promise<void> {
  const payment = body.payload.payment?.entity
  if (!payment) {
    console.error('[webhook:payment.failed] missing payment entity in payload')
    return
  }

  const { id: paymentId, order_id: orderId } = payment

  const { data: updated, error } = await admin
    .from('rsvps')
    .update({
      payment_status: 'failed',
      razorpay_payment_id: paymentId,
    })
    .eq('razorpay_order_id', orderId)
    .eq('payment_status', 'pending')
    .select('id')

  if (error) {
    console.error('[webhook:payment.failed] DB update failed', {
      orderId, paymentId, error: error.message,
    })
    return
  }

  console.info('[webhook:payment.failed] released spots', {
    orderId,
    paymentId,
    ticketsReleased: updated?.length ?? 0,
  })

  if (!updated?.length) {
    // Not an RSVP order — check whether it's a digital-product purchase.
    await handleDigitalPurchaseFailed(admin, orderId, paymentId)
  }
}

/**
 * payment.captured (digital purchase branch) — mirrors what
 * confirmDigitalPurchase does client-side (mark 'paid'), as a safety net for
 * when the buyer's tab closes before that callback fires. See the
 * `digital_purchases has no webhook reconciliation` entry in CLAUDE.md.
 */
async function handleDigitalPurchaseCaptured(
  admin: AdminClient,
  orderId: string,
  paymentId: string,
  amount: number,
): Promise<void> {
  const { data: purchase, error: fetchError } = await admin
    .from('digital_purchases')
    .select('id, status, amount_paise')
    .eq('razorpay_order_id', orderId)
    .maybeSingle()

  if (fetchError) {
    console.error('[webhook:payment.captured] failed to load digital_purchases row', {
      orderId, paymentId, error: fetchError.message,
    })
    return
  }

  if (!purchase) {
    // Neither an RSVP nor a known digital purchase order — most likely the
    // Razorpay order was created but the digital_purchases insert failed
    // right after (see the ORPHANED-order log in initiateDigitalPurchase).
    console.info('[webhook:payment.captured] order not found in rsvps or digital_purchases', {
      orderId, paymentId,
    })
    return
  }

  if (purchase.status === 'paid') {
    // Already confirmed — either by confirmDigitalPurchase's client path or
    // a prior delivery of this same webhook. No-op.
    return
  }

  if (purchase.status !== 'pending') {
    console.warn('[webhook:payment.captured] digital purchase not pending, skipping', {
      orderId, paymentId, status: purchase.status,
    })
    return
  }

  if (purchase.amount_paise !== amount) {
    console.warn('[webhook:payment.captured] digital purchase amount mismatch vs Razorpay', {
      orderId, paymentId, expected: purchase.amount_paise, razorpayAmount: amount,
    })
  }

  const { error: updateError } = await admin
    .from('digital_purchases')
    .update({ status: 'paid', razorpay_payment_id: paymentId })
    .eq('id', purchase.id)
    .eq('status', 'pending')   // idempotency guard against a race with confirmDigitalPurchase

  if (updateError) {
    console.error('[webhook:payment.captured] digital_purchases update failed', {
      orderId, paymentId, error: updateError.message,
    })
    return
  }

  console.info('[webhook:payment.captured] digital purchase confirmed', { orderId, paymentId })
}

/**
 * payment.failed (digital purchase branch) — marks a pending purchase as
 * failed so the buyer isn't left staring at an infinite loading state.
 */
async function handleDigitalPurchaseFailed(
  admin: AdminClient,
  orderId: string,
  paymentId: string,
): Promise<void> {
  const { data: updated, error } = await admin
    .from('digital_purchases')
    .update({ status: 'failed', razorpay_payment_id: paymentId })
    .eq('razorpay_order_id', orderId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error('[webhook:payment.failed] digital_purchases update failed', {
      orderId, paymentId, error: error.message,
    })
    return
  }

  if (updated?.length) {
    console.info('[webhook:payment.failed] digital purchase marked failed', { orderId, paymentId })
  }
}

/**
 * refund.processed — A refund has been settled back to the customer.
 *
 * Locates the RSVP by `razorpay_payment_id` (not order ID — a refund is
 * always tied to a specific payment) and marks it 'refunded'.
 *
 * Note: `cancelEvent` already marks RSVPs as 'refunded' when it initiates
 * refunds.  This webhook is the authoritative confirmation that funds were
 * actually returned.  The update is a no-op if already 'refunded'.
 */
async function handleRefundProcessed(
  admin: AdminClient,
  body: RazorpayWebhookPayload,
): Promise<void> {
  const refund = body.payload.refund?.entity
  if (!refund) {
    console.error('[webhook:refund.processed] missing refund entity in payload')
    return
  }

  const { id: refundId, payment_id: paymentId } = refund

  const { data: updated, error } = await admin
    .from('rsvps')
    .update({ payment_status: 'refunded' })
    .eq('razorpay_payment_id', paymentId)
    .neq('payment_status', 'refunded')   // idempotency
    .select('id')

  if (error) {
    console.error('[webhook:refund.processed] DB update failed', {
      refundId, paymentId, error: error.message,
    })
    return
  }

  console.info('[webhook:refund.processed] marked as refunded', {
    refundId,
    paymentId,
    ticketsUpdated: updated?.length ?? 0,
  })
}
