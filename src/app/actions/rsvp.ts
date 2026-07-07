'use server'

// =============================================================================
// WIMC — RSVP + Payment Flow
//
// THE ORDER-FIRST PATTERN (critical for real-money flows)
// ─────────────────────────────────────────────────────────
// Naïve payment flows create the order AFTER the payment succeeds.  This
// creates a window where a user pays but we haven't recorded the booking yet:
//   - Our server crashes after charge but before DB insert → user paid, got no ticket
//   - User closes the app mid-flow → charge succeeds, no record exists
//
// WIMC uses the ORDER-FIRST pattern:
//   1. Create the RSVP row in DB (status='pending') — spot is provisionally held
//   2. Create the Razorpay order — amount is locked
//   3. Return order details to the client — user pays on their device
//   4. Client calls confirmRSVPPayment with signature — we verify and mark 'captured'
//   5. Webhook fires payment.captured as a safety net — idempotent update
//
// If the user never pays:
//   - The RSVP row stays 'pending'
//   - The reconciliation cron (every 15 min) checks Razorpay and marks it 'failed'
//   - Pending RSVPs < 10 min old count against capacity to prevent overselling
//     while a payment is in-flight
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  RazorpayApiError,
} from '@/lib/razorpay'
import { calculateChargeAmount } from '@/types/events'
import { calculateRevenueSplit } from '@/lib/revenue'
import { checkRSVPRateLimit } from '@/lib/ratelimit'
import { bumpUserMetric } from '@/lib/metrics'
import { updateAttendanceStreak } from '@/lib/streak'
import { redeemReferralCode } from '@/app/actions/referral'
import { createNotification } from '@/app/actions/notifications'
import type { UserTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

const InitiateRSVPSchema = z.object({
  eventId: z.string().uuid('eventId must be a valid UUID'),
  attendeeName: z
    .string()
    .min(1, 'Attendee name is required')
    .max(100, 'Attendee name must be at most 100 characters'),
  attendeePhone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, 'Phone must be a valid Indian mobile in +91XXXXXXXXXX format'),
  quantity: z
    .number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 tickets per booking'),
  ticketTierId:  z.string().optional(),
  referralCode:  z.string().max(20).optional(),
  discoverySource: z.enum(['creator_link', 'platform_discovery', 'direct']).optional(),
})

const ConfirmRSVPSchema = z.object({
  rsvpId: z.string().uuid('rsvpId must be a valid UUID'),
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
})

// ---------------------------------------------------------------------------
// Spot reservation logic
// ---------------------------------------------------------------------------

/**
 * Counts how many spots are currently occupied for an event:
 *   - Confirmed (payment_status = 'captured')
 *   - In-flight (payment_status = 'pending', created within the last 10 min)
 *
 * The 10-minute window for pending RSVPs prevents two users from simultaneously
 * booking the last spot, while ensuring that abandoned payment attempts don't
 * block the event forever.
 *
 * NOTE: There is a narrow race-condition window between this count and the
 * subsequent INSERT.  For typical Tier-2 India event sizes (< 200 capacity),
 * the probability of a meaningful oversell is very low.  A database-level
 * solution (e.g. a Postgres function with FOR UPDATE) would eliminate this
 * entirely if needed at higher scale.
 */
async function countOccupiedSpots(eventId: string): Promise<number> {
  const admin = createAdminClient()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { count: confirmed } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')

  const { count: inFlight } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('payment_status', 'pending')
    .gte('created_at', tenMinutesAgo)

  return (confirmed ?? 0) + (inFlight ?? 0)
}

// ---------------------------------------------------------------------------
// initiateRSVP
// ---------------------------------------------------------------------------

/**
 * Step 1 of the payment flow: validate the booking, create DB records, and
 * return a Razorpay order for the client to complete.
 *
 * For FREE events:
 *   - Creates captured RSVP row(s) immediately — no payment step.
 *   - Returns `{ isFree: true, razorpayOrderId: null }`.
 *
 * For PAID events (ORDER-FIRST):
 *   a) Check event is published + has spots.
 *   b) Insert `quantity` RSVP rows with payment_status='pending'.
 *      All rows share the same `razorpay_order_id` so the webhook and
 *      confirm action can update all tickets in one pass.
 *   c) Create a Razorpay order for the total amount (with GST if applicable).
 *   d) Return order details to the client.
 *
 * The caller should pass the returned `razorpayOrderId` to Razorpay
 * Checkout.js (UPI Intent flow).  On payment success, call
 * `confirmRSVPPayment` with the signature.
 */
export async function initiateRSVP(params: {
  eventId: string
  attendeeName: string
  attendeePhone: string
  quantity: number
  ticketTierId?: string
  referralCode?: string
  discoverySource?: 'creator_link' | 'platform_discovery' | 'direct'
}): Promise<{
  orderId: string           // WIMC RSVP ID of the first ticket (anchor for confirm)
  qrToken: string | null    // real qr_code_token — set for free events, null for paid (set after confirmRSVPPayment)
  razorpayOrderId: string | null
  amount: number            // total amount in paise (including GST if applicable)
  isFree: boolean
  error: string | null
}> {
  const EMPTY = { orderId: '', qrToken: null, razorpayOrderId: null, amount: 0, isFree: false, error: '' }

  const rl = await checkRSVPRateLimit()
  if (!rl.success) return { ...EMPTY, error: rl.error! }

  // ── 1. Validate input ────────────────────────────────────────────────────
  const parsed = InitiateRSVPSchema.safeParse(params)
  if (!parsed.success) {
    return { ...EMPTY, error: parsed.error.errors[0].message }
  }

  const { eventId, attendeeName, attendeePhone, quantity, ticketTierId, referralCode, discoverySource } = parsed.data
  const resolvedDiscoverySource = discoverySource ?? 'direct'

  // ── 2. Resolve the authenticated user (optional — guests are allowed) ───
  // We attempt to get the session; if the user isn't logged in, that's fine.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const attendeeUserId = user?.id ?? null

  const admin = createAdminClient()

  // ── 3. Fetch and validate the event ─────────────────────────────────────
  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, status, ticket_price, capacity, title, starts_at, creator_id, venue_id, early_access_at, ticket_tiers')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError || !event) {
    return { ...EMPTY, error: 'Event not found.' }
  }

  if (event.status !== 'published') {
    return { ...EMPTY, error: 'This event is not available for booking.' }
  }

  if (new Date(event.starts_at) <= new Date()) {
    return { ...EMPTY, error: 'Bookings for this event are closed.' }
  }

  // ── 4. Early-access gate (S15-T1) ────────────────────────────────────────
  if (event.early_access_at && new Date() < new Date(event.early_access_at)) {
    const tierOrder: Record<string, number> = { wanderer: 0, local: 1, lantern: 2, beacon: 3 }
    let attendeeTierRank = 0  // guests treated as wanderers

    if (attendeeUserId) {
      const { data: attendeeProfile } = await admin
        .from('user_profiles')
        .select('user_tier')
        .eq('id', attendeeUserId)
        .maybeSingle()
      attendeeTierRank = tierOrder[attendeeProfile?.user_tier ?? 'wanderer'] ?? 0
    }

    if (attendeeTierRank < 1) {
      const until = new Date(event.early_access_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
      })
      return { ...EMPTY, error: `Early access only — open to everyone after ${until}. Reach Local tier to book now.` }
    }
  }

  // ── 4b. Fan tier resolution ──────────────────────────────────────────────
  type RawTier = { id: string; name: string; price_paise: number; description: string; capacity: number | null }
  let resolvedTierPrice = event.ticket_price
  let resolvedTierId: string | null = null
  let resolvedTierName: string | null = null

  const tiers = event.ticket_tiers as RawTier[] | null
  if (tiers?.length) {
    if (!ticketTierId) {
      return { ...EMPTY, error: 'Please select a ticket tier.' }
    }
    const tier = tiers.find((t) => t.id === ticketTierId)
    if (!tier) {
      return { ...EMPTY, error: 'Selected ticket tier is no longer available.' }
    }
    resolvedTierPrice = tier.price_paise
    resolvedTierId    = tier.id
    resolvedTierName  = tier.name

    // Per-tier capacity check (in addition to global capacity)
    if (tier.capacity !== null) {
      const { count: tierOccupied } = await admin
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('ticket_tier_id', tier.id)
        .in('payment_status', ['captured', 'pending'])
      const tierUsed = tierOccupied ?? 0
      if (tierUsed + quantity > tier.capacity) {
        const tierLeft = Math.max(0, tier.capacity - tierUsed)
        if (tierLeft === 0) return { ...EMPTY, error: `The "${tier.name}" tier is sold out.` }
        return { ...EMPTY, error: `Only ${tierLeft} spot${tierLeft === 1 ? '' : 's'} left in the "${tier.name}" tier.` }
      }
    }
  }

  // ── 4c. Referral code — overrides price to 0 for one ticket ────────────
  let appliedReferralCode: string | null = null
  if (referralCode) {
    const normalized = referralCode.trim().toUpperCase()
    const { data: refRow } = await admin
      .from('referral_codes')
      .select('id, event_id, redeemed_at, expires_at')
      .eq('code', normalized)
      .maybeSingle()

    if (!refRow) return { ...EMPTY, error: 'Referral code not found.' }
    if (refRow.event_id !== eventId) return { ...EMPTY, error: 'This code is for a different event.' }
    if (refRow.redeemed_at) return { ...EMPTY, error: 'This referral code has already been used.' }
    if (new Date(refRow.expires_at) < new Date()) return { ...EMPTY, error: 'This referral code has expired.' }

    // Code is valid — make the booking free (applies to first ticket; quantity forced to 1)
    resolvedTierPrice = 0
    appliedReferralCode = normalized
  }

  // ── 5. Capacity check ────────────────────────────────────────────────────
  if (event.capacity !== null) {
    const occupied = await countOccupiedSpots(eventId)
    if (occupied + quantity > event.capacity) {
      const remaining = Math.max(0, event.capacity - occupied)
      if (remaining === 0) {
        return { ...EMPTY, error: 'Sorry, this event is sold out.' }
      }
      return {
        ...EMPTY,
        error: `Only ${remaining} spot${remaining === 1 ? '' : 's'} left. Please reduce your quantity.`,
      }
    }
  }

  // ── 6. FREE event — create captured RSVPs immediately ───────────────────
  if (resolvedTierPrice === 0) {
    // Build one row per ticket so each person gets their own QR code.
    const rows = Array.from({ length: quantity }, () => ({
      event_id: eventId,
      attendee_name: attendeeName,
      attendee_phone: attendeePhone,
      attendee_user_id: attendeeUserId,
      payment_status: 'captured' as const,
      amount_paid: 0,
      platform_fee_paise: 0,
      maker_payout_paise: 0,
      venue_fee_paise: 0,
      split_tier: null,
      ticket_tier_id:   resolvedTierId,
      ticket_tier_name: resolvedTierName,
      discovery_source: resolvedDiscoverySource,
    }))

    const { data: inserted, error: insertError } = await admin
      .from('rsvps')
      .insert(rows)
      .select('id, qr_code_token')

    if (insertError || !inserted?.length) {
      console.error('[initiateRSVP] free RSVP insert failed', insertError?.message)
      return { ...EMPTY, error: 'Failed to complete your booking. Please try again.' }
    }

    if (attendeeUserId) {
      bumpUserMetric(admin, attendeeUserId, 'rsvps_total_count', quantity, 'initiateRSVP')
    }

    // Mark referral code as redeemed (fire-and-forget — RSVP already created)
    if (appliedReferralCode) {
      redeemReferralCode(appliedReferralCode, inserted[0].id).catch((err) => {
        console.error('[initiateRSVP] referral code redemption failed', err)
      })
    }

    return {
      orderId: inserted[0].id,
      qrToken: inserted[0].qr_code_token,
      razorpayOrderId: null,
      amount: 0,
      isFree: true,
      error: null,
    }
  }

  // ── 7. PAID event — ORDER-FIRST pattern ─────────────────────────────────

  // 7a. Calculate total charge (per-person GST rule: SAC 998596)
  const totalAmount = calculateChargeAmount(resolvedTierPrice, quantity)

  // 6b. Create the Razorpay order BEFORE inserting RSVP rows.
  //     If Razorpay is down, we fail early without touching the DB.
  let razorpayOrderId: string
  try {
    // receipt = short unique string for idempotency (max 40 chars)
    // Format: rsvp_<6-char event suffix>_<6-char user suffix>_<timestamp suffix>
    const receipt = [
      'rsvp',
      eventId.slice(-6),
      (attendeeUserId ?? attendeePhone).slice(-6),
      Date.now().toString(36).slice(-6),
    ].join('_').slice(0, 40)

    const order = await createRazorpayOrder({
      amount: totalAmount,
      currency: 'INR',
      receipt,
      notes: {
        event_id: eventId,
        event_title: event.title.slice(0, 50),
        attendee_phone: attendeePhone,
        quantity: String(quantity),
        ...(attendeeUserId ? { user_id: attendeeUserId } : {}),
      },
    })

    razorpayOrderId = order.id
  } catch (err) {
    const msg = err instanceof RazorpayApiError ? err.message : 'Payment service unavailable'
    console.error('[initiateRSVP] Razorpay order creation failed', err)
    return { ...EMPTY, error: msg }
  }

  // 7c. Compute per-ticket revenue split locked to the creator's current tier.
  const { data: creatorProfile } = await admin
    .from('user_profiles')
    .select('user_tier, created_at')
    .eq('id', event.creator_id)
    .maybeSingle()

  const creatorTier    = (creatorProfile?.user_tier ?? 'wanderer') as UserTier
  const hasVenue       = event.venue_id != null
  const perTicket      = calculateRevenueSplit(resolvedTierPrice, 1, creatorTier, hasVenue)

  // S15-T3: First 90 days free for new Lanterns — platform takes no cut.
  const creatorCreatedAt = creatorProfile?.created_at ? new Date(creatorProfile.created_at) : null
  const isFirstYearFree  = creatorTier === 'lantern' &&
    creatorCreatedAt != null &&
    Date.now() - creatorCreatedAt.getTime() < 90 * 24 * 60 * 60 * 1000

  const platformFeePaise = isFirstYearFree ? 0 : perTicket.platformPaise
  const makerPayoutPaise = isFirstYearFree
    ? perTicket.makerPaise + perTicket.platformPaise
    : perTicket.makerPaise

  // 6d. Insert pending RSVP rows — one per ticket, all sharing the same
  //     razorpay_order_id.  This is the "order" that holds the spots.
  //     The webhook and confirmRSVPPayment find all tickets by order ID.
  const rows = Array.from({ length: quantity }, () => ({
    event_id: eventId,
    attendee_name: attendeeName,
    attendee_phone: attendeePhone,
    attendee_user_id: attendeeUserId,
    payment_status: 'pending' as const,
    razorpay_order_id: razorpayOrderId,
    platform_fee_paise: platformFeePaise,
    maker_payout_paise: makerPayoutPaise,
    venue_fee_paise:    perTicket.venuePaise,
    split_tier:         creatorTier,
    ticket_tier_id:     resolvedTierId,
    ticket_tier_name:   resolvedTierName,
    discovery_source:   resolvedDiscoverySource,
    // amount_paid is set when payment is confirmed
  }))

  const { data: inserted, error: insertError } = await admin
    .from('rsvps')
    .insert(rows)
    .select('id')

  if (insertError || !inserted?.length) {
    console.error('[initiateRSVP] paid RSVP insert failed', insertError?.message)
    // Razorpay order exists but we have no DB record — this is a problem.
    // Log for manual reconciliation; the cron will detect the orphaned order.
    console.error('[initiateRSVP] ORPHANED Razorpay order requires manual review', {
      razorpayOrderId,
      eventId,
      attendeePhone,
    })
    return { ...EMPTY, error: 'Failed to reserve your spot. Please try again.' }
  }

  return {
    orderId: inserted[0].id,
    qrToken: null,
    razorpayOrderId,
    amount: totalAmount,
    isFree: false,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// checkRSVPStatus
// ---------------------------------------------------------------------------

/**
 * Polls the payment status of an RSVP by ID.
 *
 * Called by the client after launching a UPI Intent deeplink.  The webhook
 * handler updates `payment_status` to 'captured' when Razorpay fires
 * `payment.captured`; this action lets the client detect that transition
 * without requiring Razorpay Checkout.js or a client-side signature.
 *
 * Uses the admin client so it works for guest checkouts (no auth session).
 *
 * qr_code_token is intentionally NOT returned here — it is the check-in
 * credential and must only be served to authenticated owners of the booking.
 * Returning it to any caller with the UUID would be an IDOR.
 */
export async function checkRSVPStatus(rsvpId: string): Promise<{
  status: 'pending' | 'captured' | 'failed' | 'refunded' | 'not_found'
}> {
  const parsed = z.string().uuid().safeParse(rsvpId)
  if (!parsed.success) return { status: 'not_found' }

  const admin = createAdminClient()
  const { data } = await admin
    .from('rsvps')
    .select('payment_status')
    .eq('id', rsvpId)
    .maybeSingle()

  if (!data) return { status: 'not_found' }

  return {
    status: data.payment_status as 'pending' | 'captured' | 'failed' | 'refunded',
  }
}

// ---------------------------------------------------------------------------
// confirmRSVPPayment
// ---------------------------------------------------------------------------

/**
 * Step 2 of the payment flow: verify the Razorpay signature and mark the
 * booking as confirmed.
 *
 * Called by the client immediately after Razorpay Checkout.js reports success.
 * The signature MUST be verified server-side before trusting the payment —
 * a malicious client could call this with a fake paymentId otherwise.
 *
 * Finds all RSVP rows sharing the same `razorpay_order_id` (handles quantity
 * > 1 bookings where multiple tickets were created in a single order) and
 * updates all of them atomically.
 *
 * The `payment.captured` webhook is a secondary safety net for the same
 * update, using the same idempotent logic.  Whichever arrives first wins;
 * the second one is a no-op.
 *
 * @returns `qrToken` — the QR code token for the first ticket.  For multi-
 * ticket bookings the caller should query for all tokens by `razorpayOrderId`.
 */
export async function confirmRSVPPayment(params: {
  rsvpId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<{
  success: boolean
  qrToken: string | null
  error: string | null
}> {
  const FAIL = { success: false, qrToken: null, error: '' }

  // ── 1. Validate input ────────────────────────────────────────────────────
  const parsed = ConfirmRSVPSchema.safeParse(params)
  if (!parsed.success) {
    return { ...FAIL, error: parsed.error.errors[0].message }
  }

  const { rsvpId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    parsed.data

  // ── 2. Verify Razorpay signature ─────────────────────────────────────────
  // This is the CRITICAL security check.  Without it, anyone could call this
  // endpoint with a known order ID to mark themselves as paid.
  const isValid = verifyPaymentSignature({
    order_id: razorpayOrderId,
    payment_id: razorpayPaymentId,
    signature: razorpaySignature,
  })

  if (!isValid) {
    console.error('[confirmRSVPPayment] INVALID SIGNATURE', {
      rsvpId,
      razorpayOrderId,
      razorpayPaymentId,
    })
    return { ...FAIL, error: 'Payment verification failed. Please contact support.' }
  }

  const admin = createAdminClient()

  // ── 3. Verify the anchor RSVP exists and is pending ──────────────────────
  // Guards against replay attacks: if already captured, return success (idempotent).
  const { data: anchor, error: fetchError } = await admin
    .from('rsvps')
    .select('id, payment_status, razorpay_order_id, event_id, attendee_user_id')
    .eq('id', rsvpId)
    .maybeSingle()

  if (fetchError || !anchor) {
    return { ...FAIL, error: 'Booking record not found.' }
  }

  // Validate that the order ID matches (prevents using one payment to confirm a different booking).
  if (anchor.razorpay_order_id !== razorpayOrderId) {
    console.error('[confirmRSVPPayment] order ID mismatch', {
      rsvpId,
      expected: anchor.razorpay_order_id,
      received: razorpayOrderId,
    })
    return { ...FAIL, error: 'Payment verification failed. Please contact support.' }
  }

  if (anchor.payment_status === 'captured') {
    // Already processed (webhook beat us here) — return success idempotently.
    const { data: existing } = await admin
      .from('rsvps')
      .select('qr_code_token')
      .eq('id', rsvpId)
      .single()
    return { success: true, qrToken: existing?.qr_code_token ?? null, error: null }
  }

  if (anchor.payment_status === 'failed' || anchor.payment_status === 'refunded') {
    return { ...FAIL, error: 'This booking has already been cancelled or refunded.' }
  }

  // ── 4. Update ALL RSVPs sharing this order (handles quantity > 1) ────────
  const { data: updated, error: updateError } = await admin
    .from('rsvps')
    .update({
      payment_status: 'captured',
      razorpay_payment_id: razorpayPaymentId,
    })
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('payment_status', 'pending')   // idempotency guard
    .select('id, qr_code_token')

  if (updateError || !updated?.length) {
    console.error('[confirmRSVPPayment] update failed', {
      updateError: updateError?.message,
      razorpayOrderId,
      razorpayPaymentId,
    })
    return { ...FAIL, error: 'Failed to confirm your booking. Please contact support.' }
  }

  // Increment the attendee's rsvps_total_count now that payment is confirmed.
  if (anchor.attendee_user_id) {
    bumpUserMetric(admin, anchor.attendee_user_id, 'rsvps_total_count', updated.length, 'confirmRSVPPayment')
  }

  // Notify the event creator about the new ticket sale (fire-and-forget).
  void (async () => {
    try {
      const { data: ev } = await admin
        .from('events')
        .select('creator_id, title')
        .eq('id', anchor.event_id)
        .maybeSingle()
      if (ev?.creator_id && ev.creator_id !== anchor.attendee_user_id) {
        await createNotification({
          recipientId: ev.creator_id,
          type: 'new_rsvp',
          title: `New ticket sold — ${ev.title}`,
          body: `${updated.length > 1 ? `${updated.length} tickets` : 'A ticket'} just sold for your event.`,
          actionUrl: '/dashboard/events',
        })
      }
    } catch {}
  })()

  // Return the first ticket's QR token (anchor RSVP).
  const anchorRow = updated.find((r) => r.id === rsvpId) ?? updated[0]

  return {
    success: true,
    qrToken: anchorRow.qr_code_token,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// getConfirmedRSVPToken
// ---------------------------------------------------------------------------

/**
 * Returns the QR check-in token for a captured RSVP.
 *
 * Requires BOTH the RSVP UUID and the Razorpay order ID — two independent
 * random secrets that are only known to the person who initiated the booking.
 * This prevents IDOR: a UUID alone (which might leak in a URL or log) is
 * insufficient without the order ID.
 *
 * Only returns a token when payment_status = 'captured'.
 */
export async function getConfirmedRSVPToken(
  rsvpId: string,
  razorpayOrderId: string,
): Promise<{ qrToken: string | null }> {
  const idParsed = z.string().uuid().safeParse(rsvpId)
  const orderParsed = z.string().min(8).max(64).safeParse(razorpayOrderId)
  if (!idParsed.success || !orderParsed.success) return { qrToken: null }

  const admin = createAdminClient()
  const { data } = await admin
    .from('rsvps')
    .select('qr_code_token, payment_status')
    .eq('id', rsvpId)
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('payment_status', 'captured')
    .maybeSingle()

  return { qrToken: data?.qr_code_token ?? null }
}

// ---------------------------------------------------------------------------
// checkInAttendee
// ---------------------------------------------------------------------------

/**
 * Marks an RSVP as checked-in using the QR token printed on the attendee's ticket.
 *
 * Verifies that:
 *   - The token belongs to an RSVP for this event with payment_status = 'captured'
 *   - The caller is the event's creator
 *
 * Idempotent: returns success if already checked in, with a flag so the UI
 * can differentiate a fresh check-in from a duplicate scan.
 */
export async function checkInAttendee(
  eventId: string,
  qrToken: string,
): Promise<{ success: boolean; alreadyCheckedIn: boolean; attendeeName: string | null; error: string | null }> {
  const eventParsed = z.string().uuid().safeParse(eventId)
  const tokenParsed = z.string().uuid().safeParse(qrToken)
  if (!eventParsed.success || !tokenParsed.success) {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Invalid QR code.' }
  }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  // Verify caller owns the event.
  const { data: event } = await admin
    .from('events')
    .select('id, creator_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Event not found.' }
  }

  // Find the RSVP by token + event.
  const { data: rsvp } = await admin
    .from('rsvps')
    .select('id, attendee_name, checked_in, payment_status, attendee_user_id')
    .eq('qr_code_token', qrToken)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!rsvp) {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Ticket not found for this event.' }
  }
  if (rsvp.payment_status !== 'captured') {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Payment not confirmed for this ticket.' }
  }
  if (rsvp.checked_in) {
    return { success: true, alreadyCheckedIn: true, attendeeName: rsvp.attendee_name, error: null }
  }

  const { error: updateError } = await admin
    .from('rsvps')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('id', rsvp.id)

  if (updateError) {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Check-in failed. Please try again.' }
  }

  if (rsvp.attendee_user_id) {
    bumpUserMetric(admin, rsvp.attendee_user_id, 'events_attended_count', 1, 'checkInAttendee')
    updateAttendanceStreak(admin, rsvp.attendee_user_id)
  }

  return { success: true, alreadyCheckedIn: false, attendeeName: rsvp.attendee_name, error: null }
}

// ---------------------------------------------------------------------------
// getEventAttendees
// ---------------------------------------------------------------------------

export interface AttendeeRow {
  id:            string
  attendee_name: string
  attendee_phone: string
  checked_in:    boolean
  checked_in_at: string | null
  amount_paid:   number | null
  created_at:    string
}

/**
 * Returns all captured RSVPs for an event, ordered by check-in status then name.
 * Caller must be the event's creator.
 */
export async function getEventAttendees(
  eventId: string,
): Promise<{ data: AttendeeRow[] | null; error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, creator_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { data: null, error: 'Event not found.' }
  }

  const { data, error } = await admin
    .from('rsvps')
    .select('id, attendee_name, attendee_phone, checked_in, checked_in_at, amount_paid, created_at')
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')
    .order('checked_in', { ascending: true })
    .order('attendee_name', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data as AttendeeRow[], error: null }
}

// ---------------------------------------------------------------------------
// checkInAttendeeById
// ---------------------------------------------------------------------------

/**
 * Manual check-in override — marks an RSVP as checked-in by its row ID.
 * Used by the attendee list view when the creator taps "Check in" manually.
 * Caller must be the event's creator.
 */
export async function checkInAttendeeById(
  eventId: string,
  rsvpId: string,
): Promise<{ success: boolean; error?: string }> {
  const eventParsed = z.string().uuid().safeParse(eventId)
  const rsvpParsed  = z.string().uuid().safeParse(rsvpId)
  if (!eventParsed.success || !rsvpParsed.success) {
    return { success: false, error: 'Invalid ID.' }
  }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, creator_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { success: false, error: 'Event not found.' }
  }

  const { data: rsvp } = await admin
    .from('rsvps')
    .select('id, checked_in, payment_status, attendee_user_id')
    .eq('id', rsvpId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!rsvp) return { success: false, error: 'Attendee not found.' }
  if (rsvp.payment_status !== 'captured') return { success: false, error: 'Payment not confirmed.' }
  if (rsvp.checked_in) return { success: true }

  const { error } = await admin
    .from('rsvps')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('id', rsvpId)

  if (error) return { success: false, error: error.message }

  if (rsvp.attendee_user_id) {
    bumpUserMetric(admin, rsvp.attendee_user_id, 'events_attended_count', 1, 'checkInAttendeeById')
    updateAttendanceStreak(admin, rsvp.attendee_user_id)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// getMyRSVPForEvent
// ---------------------------------------------------------------------------

export interface MyRSVP {
  rsvpId:    string
  qrToken:   string
  orderId:   string | null
  tierName:  string | null
}

/**
 * Returns the authenticated user's confirmed RSVP for an event, if any.
 * Used by the event public page to show an existing ticket instead of the
 * booking form.
 */
export async function getMyRSVPForEvent(
  eventId: string,
): Promise<{ rsvp: MyRSVP | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rsvp: null }

  const admin = createAdminClient()
  const { data } = await admin
    .from('rsvps')
    .select('id, qr_code_token, razorpay_order_id, ticket_tier_name')
    .eq('event_id', eventId)
    .eq('attendee_user_id', user.id)
    .eq('payment_status', 'captured')
    .maybeSingle()

  if (!data) return { rsvp: null }
  return {
    rsvp: {
      rsvpId:   data.id,
      qrToken:  data.qr_code_token,
      orderId:  data.razorpay_order_id,
      tierName: data.ticket_tier_name ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// casualRSVP
// ---------------------------------------------------------------------------

/**
 * Records a Going / Maybe / Not Going signal for a free casual event.
 *
 * Intent is stored in attendee_name as a bracket prefix ("[going] Name",
 * "[maybe] Name", "[not_going] Name") to avoid a schema migration.
 * Upserts so the user can change their mind without creating duplicate rows.
 */
export async function casualRSVP(params: {
  eventId: string
  intent: 'going' | 'maybe' | 'not_going'
}): Promise<{ error: string | null }> {
  const eventIdParsed = z.string().uuid().safeParse(params.eventId)
  const intentParsed = z.enum(['going', 'maybe', 'not_going']).safeParse(params.intent)
  if (!eventIdParsed.success || !intentParsed.success) return { error: 'Invalid input.' }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, status, starts_at, ticket_price')
    .eq('id', params.eventId)
    .maybeSingle()

  if (!event) return { error: 'Event not found.' }
  if (event.status !== 'published') return { error: 'This event is not available for RSVP.' }
  if (new Date(event.starts_at) <= new Date()) return { error: 'This event has already started.' }
  if (event.ticket_price !== 0) return { error: 'Casual RSVP is only available for free events.' }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.display_name ?? 'Guest'
  const prefixedName = `[${params.intent}] ${displayName}`

  // Upsert: update attendee_name if already RSVPed, otherwise insert a fresh row
  const { data: existing } = await admin
    .from('rsvps')
    .select('id')
    .eq('event_id', params.eventId)
    .eq('attendee_user_id', user.id)
    .eq('payment_status', 'captured')
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await admin
      .from('rsvps')
      .update({ attendee_name: prefixedName })
      .eq('id', existing.id)

    if (updateError) return { error: 'Failed to update your RSVP.' }
  } else {
    const { error: insertError } = await admin
      .from('rsvps')
      .insert({
        event_id:            params.eventId,
        attendee_user_id:    user.id,
        payment_status:      'captured' as const,
        amount_paid:         0,
        attendee_name:       prefixedName,
        attendee_phone:      '',
        platform_fee_paise:  0,
        maker_payout_paise:  0,
        venue_fee_paise:     0,
        split_tier:          null,
        discovery_source:    'direct' as const,
      })

    if (insertError) return { error: 'Failed to save your RSVP.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getMyTickets
// ---------------------------------------------------------------------------

export interface MyTicket {
  rsvpId:          string
  qrToken:         string
  amountPaid:      number
  checkedIn:       boolean
  checkedInAt:     string | null
  eventId:         string
  eventSlug:       string
  eventTitle:      string
  eventCoverUrl:   string | null
  eventStartsAt:   string
  eventEndsAt:     string | null
  venueName:       string
  creatorName:     string | null
  creatorUsername: string | null
}

/**
 * Returns all confirmed (captured) tickets for the authenticated explorer,
 * sorted most-recent first. Used by /explore/tickets.
 */
export async function getMyTickets(): Promise<{ tickets: MyTicket[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tickets: [], error: null }

  const admin = createAdminClient()

  const { data: rsvps, error } = await admin
    .from('rsvps')
    .select('id, qr_code_token, amount_paid, checked_in, checked_in_at, event_id')
    .eq('attendee_user_id', user.id)
    .eq('payment_status', 'captured')
    .order('created_at', { ascending: false })

  if (error) return { tickets: [], error: error.message }
  if (!rsvps?.length) return { tickets: [], error: null }

  const eventIds = [...new Set(rsvps.map((r) => r.event_id))]
  const { data: events } = await admin
    .from('events')
    .select('id, slug, title, cover_image_url, starts_at, ends_at, venue_name, creator_id')
    .in('id', eventIds)

  const eventMap = new Map((events ?? []).map((e) => [e.id, e]))

  const creatorIds = [...new Set((events ?? []).map((e) => e.creator_id))]
  const { data: creators } = creatorIds.length
    ? await admin
        .from('user_profiles')
        .select('id, display_name, username')
        .in('id', creatorIds)
    : { data: [] }

  const creatorMap = new Map((creators ?? []).map((c) => [c.id, c]))

  const tickets: MyTicket[] = rsvps.flatMap((r) => {
    const ev = eventMap.get(r.event_id)
    if (!ev) return []
    const creator = creatorMap.get(ev.creator_id)
    return [{
      rsvpId:          r.id,
      qrToken:         r.qr_code_token,
      amountPaid:      r.amount_paid ?? 0,
      checkedIn:       r.checked_in,
      checkedInAt:     r.checked_in_at,
      eventId:         ev.id,
      eventSlug:       ev.slug,
      eventTitle:      ev.title,
      eventCoverUrl:   ev.cover_image_url,
      eventStartsAt:   ev.starts_at,
      eventEndsAt:     ev.ends_at,
      venueName:       ev.venue_name,
      creatorName:     creator?.display_name ?? null,
      creatorUsername: creator?.username ?? null,
    }]
  })

  return { tickets, error: null }
}
