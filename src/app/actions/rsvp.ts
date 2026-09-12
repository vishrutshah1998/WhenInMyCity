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
import { isGuestPhoneVerified } from '@/app/actions/guest-otp'
import { sendWhatsAppTemplate, recordWhatsAppSendFailure } from '@/lib/whatsapp'
import type { UserTier, ApplicationStatus } from '@/types/database'

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
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be a valid E.164 number, e.g. +919876543210'),
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

  // Guests (no WIMC session) must have OTP-verified this phone number via
  // sendRsvpGuestOtp/verifyRsvpGuestOtp within the last 15 minutes — a
  // lightweight anti-abuse check since guest bookings otherwise carry no
  // identity verification at all. Authenticated users skip this: they're
  // already OTP-verified through Supabase sign-in.
  if (!attendeeUserId) {
    const verified = await isGuestPhoneVerified(attendeePhone)
    if (!verified) {
      return { ...EMPTY, error: 'Please verify your phone number before booking.' }
    }
  }

  const admin = createAdminClient()

  // ── 3. Fetch and validate the event ─────────────────────────────────────
  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, status, ticket_price, capacity, title, starts_at, creator_id, venue_id, early_access_at, ticket_tiers, venue_name, venue_address, slug')
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

    // Free RSVPs have no payment webhook to send a confirmation from, so send
    // it here — the only record a guest (no account) gets of their booking
    // beyond what's shown in-app before they close the tab.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'
    const eventDate = new Date(event.starts_at).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    for (const row of inserted) {
      const venueLine = `${event.venue_name}${event.venue_address ? `, ${event.venue_address}` : ''}`
      sendWhatsAppTemplate(attendeePhone, 'rsvp_confirmed_v3', 'en', [
        event.title, eventDate, venueLine, 'Free',
      ], [{ index: 0, urlParameter: row.qr_code_token }]).catch((err) => {
        console.error('[initiateRSVP] free-RSVP WhatsApp send failed', { rsvpId: row.id, error: String(err) })
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
    .select('id, payment_status, razorpay_order_id, event_id, attendee_user_id, platform_fee_paise, maker_payout_paise, venue_fee_paise')
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
  // amount_paid is derived from this row's own frozen revenue-split fields
  // (locked in at booking time by initiateRSVP) rather than recomputed from
  // the event/tier, which can change after checkout. Every row in an order
  // shares the same tier/price, so the anchor row's figure applies to all.
  const anchorBasePaise =
    (anchor.platform_fee_paise ?? 0) + (anchor.maker_payout_paise ?? 0) + (anchor.venue_fee_paise ?? 0)
  const amountPaid = calculateChargeAmount(anchorBasePaise, 1)

  const { data: updated, error: updateError } = await admin
    .from('rsvps')
    .update({
      payment_status: 'captured',
      razorpay_payment_id: razorpayPaymentId,
      amount_paid: amountPaid,
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
    .select('id, attendee_name, checked_in, payment_status, attendee_user_id, application_status')
    .eq('qr_code_token', qrToken)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!rsvp) {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Ticket not found for this event.' }
  }
  if (rsvp.payment_status !== 'captured') {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'Payment not confirmed for this ticket.' }
  }
  if (rsvp.application_status && rsvp.application_status !== 'approved') {
    return { success: false, alreadyCheckedIn: false, attendeeName: null, error: 'This application has not been approved yet.' }
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
  /** 'going' | 'maybe' | null — null for ticketed/paid bookings, which have no casual intent. */
  casual_intent: 'going' | 'maybe' | 'not_going' | null
}

/**
 * Returns all captured RSVPs for an event, ordered by check-in status then name.
 * Excludes casual "Can't go" responses — they aren't attendees. Also excludes
 * a still-pending/declined/waitlisted application (see migration 079) — those
 * aren't confirmed attendees until the host approves them; see
 * getEventApplications for the review queue. Caller must be the event's creator.
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
    .select('id, attendee_name, attendee_phone, checked_in, checked_in_at, amount_paid, created_at, casual_intent')
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')
    .or('casual_intent.is.null,casual_intent.neq.not_going')
    .or('application_status.is.null,application_status.eq.approved')
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
    .select('id, checked_in, payment_status, attendee_user_id, application_status')
    .eq('id', rsvpId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!rsvp) return { success: false, error: 'Attendee not found.' }
  if (rsvp.payment_status !== 'captured') return { success: false, error: 'Payment not confirmed.' }
  if (rsvp.application_status && rsvp.application_status !== 'approved') {
    return { success: false, error: 'This application has not been approved yet.' }
  }
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
  /**
   * Gate state for a casual "going" RSVP (migration 079) — NULL for a
   * ticketed booking, an ungated casual RSVP, or a 'maybe'/'not_going'
   * response. event-page.tsx uses this to distinguish a still-pending
   * application from an actually-confirmed one; both used to render
   * identically since this field didn't exist here until this fix.
   */
  applicationStatus: ApplicationStatus | null
  /** Going/Maybe/Can't-go signal for a casual RSVP. NULL for a ticketed booking. */
  casualIntent: 'going' | 'maybe' | 'not_going' | null
}

/**
 * Returns the authenticated user's existing RSVP for an event, if any —
 * ticketed booking or casual response alike. Used by the event public page
 * to reflect existing state instead of the plain booking form.
 *
 * NOTE: `payment_status = 'captured'` is a real filter for ticketed events
 * (excludes pending/failed/refunded purchases) but is a no-op for casual
 * events — every casual row is 'captured' regardless of casual_intent or
 * application_status, since no money is ever involved. Distinguishing a
 * confirmed casual "going" from 'maybe'/'not_going'/a pending application is
 * the caller's job, using the two fields below — this function used to
 * silently collapse all of those into one "you have an RSVP" signal.
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
    .select('id, qr_code_token, razorpay_order_id, ticket_tier_name, application_status, casual_intent')
    .eq('event_id', eventId)
    .eq('attendee_user_id', user.id)
    .eq('payment_status', 'captured')
    .maybeSingle()

  if (!data) return { rsvp: null }
  return {
    rsvp: {
      rsvpId:            data.id,
      qrToken:           data.qr_code_token,
      orderId:           data.razorpay_order_id,
      tierName:          data.ticket_tier_name ?? null,
      applicationStatus: data.application_status,
      casualIntent:      data.casual_intent,
    },
  }
}

// ---------------------------------------------------------------------------
// casualRSVP
// ---------------------------------------------------------------------------

/**
 * Decides the application_status a casual RSVP row should carry after a
 * Going/Maybe/Not Going save (see migration 079). Only 'going' is ever
 * gated; an already-'approved' applicant re-confirming 'going' stays
 * 'approved' rather than being bumped back into the pending queue.
 */
function resolveApplicationStatus(
  intent: 'going' | 'maybe' | 'not_going',
  requiresApproval: boolean,
  existingStatus: ApplicationStatus | null,
): ApplicationStatus | null {
  if (intent !== 'going' || !requiresApproval) return null
  if (existingStatus === 'approved') return 'approved'
  return 'pending'
}

/**
 * Records a Going / Maybe / Not Going signal for a free casual event.
 *
 * Intent is stored in the `casual_intent` column (see migration 074).
 * Upserts so the user can change their mind without creating duplicate rows.
 *
 * If the event has `requires_approval` set, a 'going' response is held as
 * `application_status = 'pending'` instead of counting as an attendee right
 * away — see migration 079. `payment_status` stays 'captured' throughout;
 * there's no money involved in a free event, so nothing needs to be held.
 * Only 'going' is ever gated — 'maybe'/'not_going' pass through unchanged.
 * An already-'approved' applicant who re-confirms 'going' is NOT bumped back
 * into the pending queue.
 */
export async function casualRSVP(params: {
  eventId: string
  intent: 'going' | 'maybe' | 'not_going'
  answer?: string
}): Promise<{ error: string | null; applicationStatus: ApplicationStatus | null }> {
  const FAIL = { applicationStatus: null }
  const eventIdParsed = z.string().uuid().safeParse(params.eventId)
  const intentParsed = z.enum(['going', 'maybe', 'not_going']).safeParse(params.intent)
  const answerParsed = z.string().trim().max(500).optional().safeParse(params.answer)
  if (!eventIdParsed.success || !intentParsed.success || !answerParsed.success) {
    return { error: 'Invalid input.', ...FAIL }
  }
  const answer = answerParsed.data

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, status, starts_at, ticket_price, requires_approval, application_question')
    .eq('id', params.eventId)
    .maybeSingle()

  if (!event) return { error: 'Event not found.', ...FAIL }
  if (event.status !== 'published') return { error: 'This event is not available for RSVP.', ...FAIL }
  if (new Date(event.starts_at) <= new Date()) return { error: 'This event has already started.', ...FAIL }
  if (event.ticket_price !== 0) return { error: 'Casual RSVP is only available for free events.', ...FAIL }

  if (params.intent === 'going' && event.requires_approval && event.application_question && !answer) {
    return { error: 'Please answer the question to apply.', ...FAIL }
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.display_name ?? 'Guest'

  // Upsert: update casual_intent if already RSVPed, otherwise insert a fresh row
  const { data: existing } = await admin
    .from('rsvps')
    .select('id, application_status')
    .eq('event_id', params.eventId)
    .eq('attendee_user_id', user.id)
    .eq('payment_status', 'captured')
    .maybeSingle()

  const newApplicationStatus = resolveApplicationStatus(
    params.intent, event.requires_approval, existing?.application_status ?? null,
  )

  if (existing) {
    const { error: updateError } = await admin
      .from('rsvps')
      .update({
        casual_intent: params.intent,
        application_status: newApplicationStatus,
        ...(params.intent === 'going' ? { application_answer: answer ?? null } : {}),
      })
      .eq('id', existing.id)

    if (updateError) return { error: 'Failed to update your RSVP.', ...FAIL }
  } else {
    const { error: insertError } = await admin
      .from('rsvps')
      .insert({
        event_id:            params.eventId,
        attendee_user_id:    user.id,
        payment_status:      'captured' as const,
        amount_paid:         0,
        attendee_name:       displayName,
        attendee_phone:      '',
        casual_intent:       params.intent,
        application_status:  newApplicationStatus,
        application_answer:  params.intent === 'going' ? (answer ?? null) : null,
        platform_fee_paise:  0,
        maker_payout_paise:  0,
        venue_fee_paise:     0,
        split_tier:          null,
        discovery_source:    'direct' as const,
      })

    if (insertError) return { error: 'Failed to save your RSVP.', ...FAIL }
  }

  return { error: null, applicationStatus: newApplicationStatus }
}

// ---------------------------------------------------------------------------
// casualRSVPGuest
// ---------------------------------------------------------------------------

const CasualRSVPGuestSchema = z.object({
  eventId: z.string().uuid('eventId must be a valid UUID'),
  intent:  z.enum(['going', 'maybe', 'not_going']),
  name:    z.string().trim().min(1, 'Please enter your name.').max(100, 'Name must be at most 100 characters'),
  phone:   z.string().regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number.'),
  answer:  z.string().trim().max(500, 'Answer must be at most 500 characters').optional(),
})

/**
 * Records a Going / Maybe / Not Going signal for a free casual event from an
 * unauthenticated visitor — name + phone, OTP-verified via the same
 * sendRsvpGuestOtp/verifyRsvpGuestOtp pair used by the ticketed guest-
 * checkout flow (guest-otp.ts). No account is created and no persona/
 * interest onboarding runs; `attendee_user_id` stays null, mirroring the
 * guest rows initiateRSVP already writes for ticketed bookings.
 *
 * Dedupes on (event, phone) rather than a user id — a guest can revisit and
 * change their mind (going → maybe) without creating duplicate rows, same
 * as the authenticated casualRSVP above.
 *
 * If the event has `requires_approval` set, a 'going' response is held as
 * `application_status = 'pending'` instead of counting as an attendee right
 * away — see migration 079 and resolveApplicationStatus above.
 * payment_status stays 'captured' throughout, so this dedupe query (keyed
 * on payment_status='captured') needs no changes: a pending applicant's row
 * is still captured, and a repeat visit still matches it and updates in
 * place instead of inserting a duplicate.
 */
export async function casualRSVPGuest(params: {
  eventId: string
  intent: 'going' | 'maybe' | 'not_going'
  name: string
  phone: string
  answer?: string
}): Promise<{ error: string | null; applicationStatus: ApplicationStatus | null }> {
  const FAIL = { applicationStatus: null }
  const parsed = CasualRSVPGuestSchema.safeParse(params)
  if (!parsed.success) return { error: parsed.error.errors[0].message, ...FAIL }
  const { eventId, intent, name, phone, answer } = parsed.data

  const verified = await isGuestPhoneVerified(phone)
  if (!verified) return { error: 'Please verify your phone number before continuing.', ...FAIL }

  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, status, starts_at, ticket_price, title, venue_name, venue_address, slug, requires_approval, application_question')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return { error: 'Event not found.', ...FAIL }
  if (event.status !== 'published') return { error: 'This event is not available for RSVP.', ...FAIL }
  if (new Date(event.starts_at) <= new Date()) return { error: 'This event has already started.', ...FAIL }
  if (event.ticket_price !== 0) return { error: 'Casual RSVP is only available for free events.', ...FAIL }

  if (intent === 'going' && event.requires_approval && event.application_question && !answer) {
    return { error: 'Please answer the question to apply.', ...FAIL }
  }

  const { data: existing } = await admin
    .from('rsvps')
    .select('id, casual_intent, application_status')
    .eq('event_id', eventId)
    .is('attendee_user_id', null)
    .eq('attendee_phone', phone)
    .eq('payment_status', 'captured')
    .maybeSingle()

  const newApplicationStatus = resolveApplicationStatus(
    intent, event.requires_approval, existing?.application_status ?? null,
  )

  if (existing) {
    const { error: updateError } = await admin
      .from('rsvps')
      .update({
        attendee_name: name,
        casual_intent: intent,
        application_status: newApplicationStatus,
        ...(intent === 'going' ? { application_answer: answer ?? null } : {}),
      })
      .eq('id', existing.id)

    if (updateError) return { error: 'Failed to update your RSVP.', ...FAIL }
  } else {
    const { error: insertError } = await admin
      .from('rsvps')
      .insert({
        event_id:            eventId,
        attendee_user_id:    null,
        payment_status:      'captured' as const,
        amount_paid:         0,
        attendee_name:       name,
        attendee_phone:      phone,
        casual_intent:       intent,
        application_status:  newApplicationStatus,
        application_answer:  intent === 'going' ? (answer ?? null) : null,
        platform_fee_paise:  0,
        maker_payout_paise:  0,
        venue_fee_paise:     0,
        split_tier:          null,
        discovery_source:    'direct' as const,
      })

    if (insertError) return { error: 'Failed to save your RSVP.', ...FAIL }
  }

  // Immediate confirmation only. The day-before reminder is handled separately
  // by the event-reminders cron (src/app/api/cron/event-reminders/route.ts),
  // which now runs via a Netlify Scheduled Function (netlify/functions/
  // event-reminders.mts) rather than the vercel.json cron config Netlify never
  // executed. That cron queries captured RSVPs without filtering on
  // casual_intent, so casual "going"/"maybe" guests are picked up too. Skip
  // here for "not_going" — nothing to confirm or remind. Sent on every
  // going/maybe save (not just new rows) so switching from maybe → going
  // gets its own confirmation.
  //
  // A 'going' response gated into application_status='pending' gets the
  // "application received" template instead of the normal confirmation —
  // it isn't confirmed as an attendee yet.
  if (newApplicationStatus === 'pending') {
    const eventDateOnly = new Date(event.starts_at).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    })
    const eventTimeOnly = new Date(event.starts_at).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    })
    sendWhatsAppTemplate(phone, 'rsvp_application_received_v1', 'en', [
      event.title, eventDateOnly, eventTimeOnly,
    ], [{ index: 0, urlParameter: event.slug }]).catch((err) => {
      console.error('[casualRSVPGuest] application-received WhatsApp send failed', { eventId, error: String(err) })
      recordWhatsAppSendFailure({
        templateName: 'rsvp_application_received_v1', recipientPhone: phone, error: err,
        eventId, contextId: existing?.id ?? null,
      })
    })
  } else if (intent !== 'not_going') {
    const eventDateOnly = new Date(event.starts_at).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    })
    const eventTimeOnly = new Date(event.starts_at).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    })
    const label = intent === 'going' ? 'Going' : 'Maybe'
    sendWhatsAppTemplate(phone, 'rsvp_casual_confirmed_v2', 'en', [
      label, event.title, eventDateOnly, eventTimeOnly,
    ], [{ index: 0, urlParameter: event.slug }]).catch((err) => {
      console.error('[casualRSVPGuest] WhatsApp send failed', { eventId, error: String(err) })
    })
  }

  return { error: null, applicationStatus: newApplicationStatus }
}

// ---------------------------------------------------------------------------
// getEventApplications
// ---------------------------------------------------------------------------

export interface ApplicationRow {
  id:                      string
  attendee_name:           string
  attendee_phone:          string
  application_status:      ApplicationStatus | null
  application_answer:      string | null
  application_decided_at:  string | null
  created_at:              string
  /**
   * True if this phone number has any other captured, non-declined RSVP
   * (application_status IS NULL or 'approved') against a past event by this
   * same creator — a signal the host can use to fast-track a known regular.
   */
  isReturningGuest:        boolean
}

/**
 * Returns the review queue of gated 'going' applications for an event
 * (see migration 079), optionally filtered to one application_status.
 * Caller must be the event's creator.
 */
export async function getEventApplications(
  eventId: string,
  status?: ApplicationStatus,
): Promise<{ data: ApplicationRow[] | null; error: string | null }> {
  const eventIdParsed = z.string().uuid().safeParse(eventId)
  if (!eventIdParsed.success) return { data: null, error: 'Invalid event ID.' }

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

  let query = admin
    .from('rsvps')
    .select('id, attendee_name, attendee_phone, application_status, application_answer, application_decided_at, created_at')
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')
    .not('application_status', 'is', null)

  if (status) query = query.eq('application_status', status)

  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) return { data: null, error: error.message }
  if (!data?.length) return { data: [], error: null }

  // Returning-guest check: same phone number has a captured, non-declined/
  // non-waitlisted RSVP against a past event by this same creator.
  const phones = [...new Set(data.map((r) => r.attendee_phone).filter(Boolean))]
  const now = new Date().toISOString()

  const { data: pastEvents } = await admin
    .from('events')
    .select('id')
    .eq('creator_id', event.creator_id)
    .neq('id', eventId)
    .lt('starts_at', now)

  const pastEventIds = (pastEvents ?? []).map((e) => e.id)

  let returningPhones = new Set<string>()
  if (pastEventIds.length && phones.length) {
    const { data: pastRsvps } = await admin
      .from('rsvps')
      .select('attendee_phone')
      .in('event_id', pastEventIds)
      .in('attendee_phone', phones)
      .eq('payment_status', 'captured')
      .or('application_status.is.null,application_status.eq.approved')

    returningPhones = new Set((pastRsvps ?? []).map((r) => r.attendee_phone))
  }

  const applications: ApplicationRow[] = data.map((r) => ({
    ...r,
    isReturningGuest: returningPhones.has(r.attendee_phone),
  }))

  return { data: applications, error: null }
}

// ---------------------------------------------------------------------------
// decideApplication / bulkDecideApplications
// ---------------------------------------------------------------------------

const DecisionSchema = z.enum(['approved', 'declined', 'waitlisted'])

async function sendApplicationDecisionWhatsApp(
  decision: 'approved' | 'declined',
  rsvp: { id: string; attendee_name: string; attendee_phone: string },
  event: { id: string; title: string; slug: string; starts_at: string },
): Promise<void> {
  if (!rsvp.attendee_phone) return

  const eventDateOnly = new Date(event.starts_at).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  })
  const eventTimeOnly = new Date(event.starts_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })

  // Meta's approved decline template is named 'rsvp_application_decline' —
  // no '_v1', and "decline" not "declined" — confirmed 2026-09-11 against
  // WhatsApp Manager after 'rsvp_application_declined_v1' 404'd outright.
  const templateName = decision === 'approved' ? 'rsvp_application_approved_v1' : 'rsvp_application_decline'
  const templateParams = decision === 'approved'
    ? [event.title, eventDateOnly, eventTimeOnly]
    : [event.title, eventDateOnly]

  try {
    // rsvp_application_decline has no button component in Meta — passing a
    // button param for it 400s ("Template does not contain button
    // components"). Only the approved template has one.
    const buttons = decision === 'approved' ? [{ index: 0, urlParameter: event.slug }] : undefined
    await sendWhatsAppTemplate(rsvp.attendee_phone, templateName, 'en', templateParams, buttons)
  } catch (err) {
    console.error('[decideApplication] WhatsApp send failed', { decision, error: String(err) })
    await recordWhatsAppSendFailure({
      templateName, recipientPhone: rsvp.attendee_phone, error: err,
      eventId: event.id, contextId: rsvp.id,
    })
  }
}

/**
 * Approves, declines, or waitlists a single application. Idempotency guard:
 * only transitions out of 'pending'/'waitlisted' — an already-decided
 * ('approved'/'declined') row is left untouched. Records an audit trail
 * (application_decided_at/application_decided_by) on every decision.
 * Caller must be the event's creator.
 */
export async function decideApplication(
  eventId: string,
  rsvpId: string,
  decision: 'approved' | 'declined' | 'waitlisted',
): Promise<{ success: boolean; error?: string }> {
  const eventIdParsed = z.string().uuid().safeParse(eventId)
  const rsvpIdParsed = z.string().uuid().safeParse(rsvpId)
  const decisionParsed = DecisionSchema.safeParse(decision)
  if (!eventIdParsed.success || !rsvpIdParsed.success || !decisionParsed.success) {
    return { success: false, error: 'Invalid input.' }
  }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, creator_id, title, slug, starts_at')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { success: false, error: 'Event not found.' }
  }

  const { data: rsvp } = await admin
    .from('rsvps')
    .select('id, attendee_name, attendee_phone, application_status')
    .eq('id', rsvpId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!rsvp) return { success: false, error: 'Application not found.' }
  if (rsvp.application_status !== 'pending' && rsvp.application_status !== 'waitlisted') {
    return { success: false, error: 'This application has already been decided.' }
  }

  const { error } = await admin
    .from('rsvps')
    .update({
      application_status:     decision,
      application_decided_at: new Date().toISOString(),
      application_decided_by: user.id,
    })
    .eq('id', rsvpId)
    .in('application_status', ['pending', 'waitlisted'])   // idempotency guard

  if (error) return { success: false, error: 'Failed to update application.' }

  if (decision === 'approved' || decision === 'declined') {
    sendApplicationDecisionWhatsApp(decision, rsvp, event).catch(() => {})
  }

  return { success: true }
}

/**
 * Decides up to 200 applications at once. Applies the same idempotency
 * guard as decideApplication (only transitions out of pending/waitlisted)
 * and the same audit trail. Caller must be the event's creator.
 */
export async function bulkDecideApplications(
  eventId: string,
  rsvpIds: string[],
  decision: 'approved' | 'declined' | 'waitlisted',
): Promise<{ success: boolean; decided: number; error?: string }> {
  const eventIdParsed = z.string().uuid().safeParse(eventId)
  const rsvpIdsParsed = z.array(z.string().uuid()).min(1).max(200).safeParse(rsvpIds)
  const decisionParsed = DecisionSchema.safeParse(decision)
  if (!eventIdParsed.success || !rsvpIdsParsed.success || !decisionParsed.success) {
    return { success: false, decided: 0, error: 'Invalid input.' }
  }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, creator_id, title, slug, starts_at')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { success: false, decided: 0, error: 'Event not found.' }
  }

  const { data: rsvps } = await admin
    .from('rsvps')
    .select('id, attendee_name, attendee_phone, application_status')
    .eq('event_id', eventId)
    .in('id', rsvpIdsParsed.data)
    .in('application_status', ['pending', 'waitlisted'])   // idempotency guard

  if (!rsvps?.length) return { success: true, decided: 0 }

  const decidedIds = rsvps.map((r) => r.id)
  const { error } = await admin
    .from('rsvps')
    .update({
      application_status:     decision,
      application_decided_at: new Date().toISOString(),
      application_decided_by: user.id,
    })
    .in('id', decidedIds)
    .in('application_status', ['pending', 'waitlisted'])   // idempotency guard

  if (error) return { success: false, decided: 0, error: 'Failed to update applications.' }

  if (decision === 'approved' || decision === 'declined') {
    await Promise.all(rsvps.map((rsvp) => sendApplicationDecisionWhatsApp(decision, rsvp, event).catch(() => {})))
  }

  return { success: true, decided: decidedIds.length }
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
 * sorted most-recent first. Used by /explore/dashboard/tickets.
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
