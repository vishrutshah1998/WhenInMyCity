'use server'

// =============================================================================
// WIMC — Paid-event application approval (Phase B)
//
// Companion to migration 079 (rsvp.ts's getEventApplications/decideApplication/
// bulkDecideApplications), which gates free/casual "going" RSVPs directly on
// rsvps. This file covers the same shortlisting idea for PAID gated events,
// where the booking (an rsvps row) does not exist until payment succeeds — so
// there is nothing on rsvps to gate before that point. event_applications
// (migration 080) tracks the entire pre-payment phase on its own.
//
// Approval never touches Razorpay or reserves a spot — it only opens a
// time-limited window (event.application_payment_window_minutes) during
// which the guest can pay through the EXISTING, unmodified initiateRSVP /
// confirmRSVPPayment flow (rsvp.ts). Capacity is deliberately never checked
// here — only initiateRSVP enforces it, at the moment someone actually pays.
// A host may approve more applicants than remaining capacity; late payers
// simply hit initiateRSVP's existing "sold out" / "only N spots left" errors.
// This is intentional, expected behavior, not a gap.
//
// The expiry sweep that transitions overdue 'approved' rows to 'expired' is
// a separate pass — not built here. 'expired' is a permanent terminal state:
// a guest who misses their window must submit a brand new application.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { isGuestPhoneVerified } from '@/app/actions/guest-otp'
import { isApplicationStatusPhoneVerified } from '@/app/actions/application-status-otp'
import { checkRSVPRateLimit } from '@/lib/ratelimit'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { initiateRSVP } from '@/app/actions/rsvp'
import type { TicketTier } from '@/types/events'
import type { ApplicationStatus, EventApplicationStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// applyToEvent
// ---------------------------------------------------------------------------

const ApplyToEventSchema = z.object({
  eventId:      z.string().uuid('eventId must be a valid UUID'),
  name:         z.string().trim().min(1, 'Please enter your name.').max(100, 'Name must be at most 100 characters'),
  phone:        z.string().regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number.'),
  answer:       z.string().trim().max(500, 'Answer must be at most 500 characters').optional(),
  ticketTierId: z.string().optional(),
})

/**
 * Submits (or updates a still-pending) application to a paid gated event.
 *
 * Mirrors initiateRSVP's guest/authed handling (rsvp.ts) rather than Phase
 * A's split casualRSVP/casualRSVPGuest pattern: name/phone are always taken
 * from params (not pulled from the profile), and guests must have a
 * recently OTP-verified phone via sendRsvpGuestOtp/verifyRsvpGuestOtp — the
 * same guard initiateRSVP applies, reused as-is since guest-otp.ts is
 * generic (keyed only by phone + purpose).
 *
 * Dedup is intentionally narrower than Phase A's casualRSVP: only an
 * EXISTING 'pending' row for this applicant is matched and updated. A
 * terminal row (declined/waitlisted/expired) is left untouched and a fresh
 * row is inserted instead — re-matching a decided row would silently erase
 * a host's prior decision, which casualRSVP's broader match never risks
 * (a free RSVP row IS the booking; there's nothing to "re-decide" there).
 */
export async function applyToEvent(params: {
  eventId: string
  name: string
  phone: string
  answer?: string
  ticketTierId?: string
}): Promise<{ applicationId: string | null; error: string | null }> {
  // Reuses initiateRSVP's rate limit as-is (same 'rsvp' bucket) — applying
  // costs the applicant nothing (no OTP re-check, no Razorpay call), so
  // without this an attacker could otherwise flood the review queue for
  // free. The identity gate below (guest OTP verification) is a separate,
  // narrower protection and not a substitute for this.
  const rl = await checkRSVPRateLimit()
  if (!rl.success) return { applicationId: null, error: rl.error! }

  const parsed = ApplyToEventSchema.safeParse(params)
  if (!parsed.success) return { applicationId: null, error: parsed.error.errors[0].message }
  const { eventId, name, phone, answer, ticketTierId } = parsed.data

  // ── Resolve caller (optional — guests are allowed, same as initiateRSVP) ─
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const applicantUserId = user?.id ?? null

  if (!applicantUserId) {
    const verified = await isGuestPhoneVerified(phone)
    if (!verified) {
      return { applicationId: null, error: 'Please verify your phone number before applying.' }
    }
  }

  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, status, starts_at, ticket_price, ticket_tiers, requires_approval, application_question')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return { applicationId: null, error: 'Event not found.' }
  if (event.status !== 'published') return { applicationId: null, error: 'This event is not available for applications.' }
  if (new Date(event.starts_at) <= new Date()) return { applicationId: null, error: 'This event has already started.' }
  if (!event.requires_approval) return { applicationId: null, error: 'This event does not require an application.' }

  const tiers = event.ticket_tiers as TicketTier[] | null
  const isPaid = event.ticket_price > 0 || !!tiers?.some((t) => t.price_paise > 0)
  if (!isPaid) {
    return { applicationId: null, error: 'This event is free — use the RSVP button instead.' }
  }

  // Tier validation — same shape as initiateRSVP's tier resolution (rsvp.ts
  // step 4b), minus the capacity check: capacity is deliberately never
  // checked at application time, only at payment time. A tierless
  // application on a tiered event must be rejected here rather than left to
  // dead-end at initiatePaymentForApplication later.
  let resolvedTierId: string | null = null
  if (tiers?.length) {
    if (!ticketTierId) {
      return { applicationId: null, error: 'Please select a ticket tier.' }
    }
    const tier = tiers.find((t) => t.id === ticketTierId)
    if (!tier) {
      return { applicationId: null, error: 'Selected ticket tier is no longer available.' }
    }
    resolvedTierId = tier.id
  }

  if (event.application_question && !answer) {
    return { applicationId: null, error: 'Please answer the question to apply.' }
  }

  let existingQuery = admin
    .from('event_applications')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'pending')

  existingQuery = applicantUserId
    ? existingQuery.eq('applicant_user_id', applicantUserId)
    : existingQuery.is('applicant_user_id', null).eq('applicant_phone', phone)

  const { data: existing } = await existingQuery.maybeSingle()

  if (existing) {
    const { error: updateError } = await admin
      .from('event_applications')
      .update({
        applicant_name:  name,
        applicant_phone: phone,
        answer:          answer ?? null,
        ticket_tier_id:  resolvedTierId,
      })
      .eq('id', existing.id)

    if (updateError) return { applicationId: null, error: 'Failed to update your application.' }
    return { applicationId: existing.id, error: null }
  }

  const { data: inserted, error: insertError } = await admin
    .from('event_applications')
    .insert({
      event_id:           eventId,
      applicant_user_id:  applicantUserId,
      applicant_name:     name,
      applicant_phone:    phone,
      answer:             answer ?? null,
      ticket_tier_id:     resolvedTierId,
      status:             'pending' as const,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[applyToEvent] insert failed', insertError?.message)
    return { applicationId: null, error: 'Failed to submit your application.' }
  }

  return { applicationId: inserted.id, error: null }
}

// ---------------------------------------------------------------------------
// getMyEventApplicationStatus / getMyEventApplicationStatusGuest
// ---------------------------------------------------------------------------

export interface MyEventApplicationStatus {
  status:          ApplicationStatus | null
  /** The application's id — needed to link an 'approved' status to /pay/[applicationId] (see initiatePaymentForApplication/PayClient below). Null whenever status is null. */
  applicationId:   string | null
  /** Only meaningful when status is 'approved' — the window to complete payment before this application lapses to 'expired'. Same field PaidApplicationsClient surfaces to the host, shown here to the applicant instead. */
  paymentDeadline: string | null
}

/**
 * Returns the authenticated user's most recent paid-gated application status
 * for this event (migration 080), if any. Companion to rsvp.ts's
 * getMyRSVPForEvent, which only ever reads `rsvps` — a paid application has
 * no rsvps row until payment succeeds (see file header), so without this a
 * returning authenticated applicant had no way to see their pending/
 * approved/declined/waitlisted status at all. Silent/automatic exactly like
 * getMyRSVPForEvent — no OTP involved, keyed on the session's user id.
 *
 * 'expired' collapses to null: it's a permanent terminal state (see
 * initiatePaymentForApplication below) whose only path forward is a brand
 * new application, so it should read identically to "no application yet."
 */
export async function getMyEventApplicationStatus(
  eventId: string,
): Promise<MyEventApplicationStatus> {
  const EMPTY = { status: null, applicationId: null, paymentDeadline: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return EMPTY

  const admin = createAdminClient()
  const { data } = await admin
    .from('event_applications')
    .select('id, status, payment_deadline')
    .eq('event_id', eventId)
    .eq('applicant_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || data.status === 'expired') return EMPTY
  return { status: data.status, applicationId: data.id, paymentDeadline: data.payment_deadline }
}

/**
 * Guest-facing counterpart to getMyEventApplicationStatus. An unauthenticated
 * applicant has no session to key a lookup on, so this is a deliberate,
 * OTP-gated action the guest triggers themselves ("Check my application
 * status" on the event page) rather than something loaded automatically —
 * there's nothing to silently key on until the phone is verified.
 *
 * Reuses the guest-lookup query shape from applyToEvent's dedup check
 * (matched on phone, since a guest application always has
 * applicant_user_id = null) but drops its `.eq('status', 'pending')` filter
 * and takes the most recent row instead — a status check should reflect
 * whatever the guest's latest application says, not just a still-open one.
 */
export async function getMyEventApplicationStatusGuest(
  eventId: string,
  phone: string,
): Promise<MyEventApplicationStatus & { error: string | null }> {
  const EMPTY = { status: null, applicationId: null, paymentDeadline: null }

  const eventIdParsed = z.string().uuid().safeParse(eventId)
  if (!eventIdParsed.success) return { ...EMPTY, error: 'Invalid event.' }

  const verified = await isApplicationStatusPhoneVerified(phone)
  if (!verified) return { ...EMPTY, error: 'Please verify your phone number first.' }

  const admin = createAdminClient()
  const { data } = await admin
    .from('event_applications')
    .select('id, status, payment_deadline')
    .eq('event_id', eventId)
    .is('applicant_user_id', null)
    .eq('applicant_phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || data.status === 'expired') return { ...EMPTY, error: null }
  return { status: data.status, applicationId: data.id, paymentDeadline: data.payment_deadline, error: null }
}

// ---------------------------------------------------------------------------
// getPaidEventApplications
// ---------------------------------------------------------------------------

export interface PaidApplicationRow {
  id:                string
  applicant_name:    string
  applicant_phone:   string
  status:            EventApplicationStatus
  answer:            string | null
  ticket_tier_id:    string | null
  decided_at:        string | null
  payment_deadline:  string | null
  expired_at:        string | null
  rsvp_id:           string | null
  created_at:        string
  /**
   * True if this phone number has any other captured, non-declined RSVP
   * (application_status IS NULL or 'approved') against a past event by this
   * same creator — same definition as Phase A's getEventApplications
   * (rsvp.ts). Checked against `rsvps`, not `event_applications`: that's
   * where an actual completed booking lands regardless of whether it came
   * from a normal ticketed purchase, a Phase A casual RSVP, or a Phase B
   * paid application that has since been paid (linked via rsvp_id).
   */
  isReturningGuest:  boolean
}

/**
 * Returns the review queue of applications to a paid gated event (migration
 * 080), optionally filtered to one status. Caller must be the event's
 * creator. Kept in this file rather than extending Phase A's
 * getEventApplications (rsvp.ts) because the two query different tables
 * with different row shapes (event_applications has no payment_status —
 * every row here is inherently unpaid until rsvp_id is set) — a shared
 * function would need a table-switch inside it anyway.
 */
export async function getPaidEventApplications(
  eventId: string,
  status?: EventApplicationStatus,
): Promise<{ data: PaidApplicationRow[] | null; error: string | null }> {
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
    .from('event_applications')
    .select('id, applicant_name, applicant_phone, status, answer, ticket_tier_id, decided_at, payment_deadline, expired_at, rsvp_id, created_at')
    .eq('event_id', eventId)

  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) return { data: null, error: error.message }
  if (!data?.length) return { data: [], error: null }

  const phones = [...new Set(data.map((r) => r.applicant_phone).filter(Boolean))]
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

  const applications: PaidApplicationRow[] = data.map((r) => ({
    ...r,
    isReturningGuest: returningPhones.has(r.applicant_phone),
  }))

  return { data: applications, error: null }
}

// ---------------------------------------------------------------------------
// decidePaidApplication
// ---------------------------------------------------------------------------

const DecisionSchema = z.enum(['approved', 'declined', 'waitlisted'])

/**
 * Sends the decision WhatsApp notification. Approve fires the new paid-gated
 * template with a human-readable payment deadline and a pay-now button
 * carrying the application id; decline reuses Phase A's existing decline
 * template (rsvp.ts) as-is — a decline reads identically whether the event
 * was free or paid, so no paid-specific variant is needed. Waitlist sends
 * nothing, matching Phase A's decideApplication.
 */
async function notifyApplicationDecision(
  decision: 'approved' | 'declined',
  application: { id: string; applicant_phone: string },
  event: { title: string; slug: string; starts_at: string },
  paymentDeadline: string | null,
): Promise<void> {
  if (!application.applicant_phone) return

  try {
    if (decision === 'approved') {
      const deadlineDateStr = paymentDeadline
        ? new Date(paymentDeadline).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
          })
        : ''
      const deadlineTimeStr = paymentDeadline
        ? new Date(paymentDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : ''

      // NOTE: rsvp_application_approved_paid_v1 is a placeholder name — this
      // template does not exist in Meta Business Manager yet, so this send
      // will fail silently (caught + logged below) until it's created and
      // approved there. Same situation as every placeholder template
      // introduced in migration 079 (rsvp.ts).
      await sendWhatsAppTemplate(application.applicant_phone, 'rsvp_application_approved_paid_v1', 'en', [
        event.title, deadlineDateStr, deadlineTimeStr,
      ], [{ index: 0, urlParameter: application.id }])
    } else {
      const eventDateOnly = new Date(event.starts_at).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
      })
      await sendWhatsAppTemplate(application.applicant_phone, 'rsvp_application_declined_v1', 'en', [
        event.title, eventDateOnly,
      ], [{ index: 0, urlParameter: event.slug }])
    }
  } catch (err) {
    console.error('[decidePaidApplication] WhatsApp send failed', { decision, error: String(err) })
  }
}

/**
 * Approves, declines, or waitlists a single paid-gated application.
 *
 * Approve computes payment_deadline from event.application_payment_window_minutes
 * — if that column is NULL (no DB default by design, see migration 080),
 * this rejects with a clear error rather than inventing its own fallback
 * default, which would defeat the point of leaving the column un-defaulted.
 *
 * Same idempotency guard as migration 079's decideApplication: only
 * transitions out of 'pending'/'waitlisted'. Caller must be the event's
 * creator.
 */
export async function decidePaidApplication(
  eventId: string,
  applicationId: string,
  decision: 'approved' | 'declined' | 'waitlisted',
): Promise<{ success: boolean; error?: string }> {
  const eventIdParsed = z.string().uuid().safeParse(eventId)
  const applicationIdParsed = z.string().uuid().safeParse(applicationId)
  const decisionParsed = DecisionSchema.safeParse(decision)
  if (!eventIdParsed.success || !applicationIdParsed.success || !decisionParsed.success) {
    return { success: false, error: 'Invalid input.' }
  }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, creator_id, title, slug, starts_at, application_payment_window_minutes')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { success: false, error: 'Event not found.' }
  }

  const { data: application } = await admin
    .from('event_applications')
    .select('id, applicant_phone, status')
    .eq('id', applicationId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!application) return { success: false, error: 'Application not found.' }
  if (application.status !== 'pending' && application.status !== 'waitlisted') {
    return { success: false, error: 'This application has already been decided.' }
  }

  let paymentDeadline: string | null = null

  if (decision === 'approved') {
    if (!event.application_payment_window_minutes) {
      return { success: false, error: 'This event has no payment window configured.' }
    }
    const decidedAt = new Date()
    paymentDeadline = new Date(
      decidedAt.getTime() + event.application_payment_window_minutes * 60_000,
    ).toISOString()

    const { error } = await admin
      .from('event_applications')
      .update({
        status:           'approved',
        decided_at:       decidedAt.toISOString(),
        decided_by:       user.id,
        payment_deadline: paymentDeadline,
      })
      .eq('id', applicationId)
      .in('status', ['pending', 'waitlisted'])   // idempotency guard

    if (error) return { success: false, error: 'Failed to update application.' }
  } else {
    const { error } = await admin
      .from('event_applications')
      .update({
        status:     decision,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      })
      .eq('id', applicationId)
      .in('status', ['pending', 'waitlisted'])   // idempotency guard

    if (error) return { success: false, error: 'Failed to update application.' }
  }

  if (decision === 'approved' || decision === 'declined') {
    notifyApplicationDecision(decision, application, event, paymentDeadline).catch(() => {})
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// bulkDecidePaidApplications
// ---------------------------------------------------------------------------

/**
 * Decides up to 200 paid-gated applications at once. Decline/waitlist mirror
 * Phase A's bulkDecideApplications (rsvp.ts) exactly in shape.
 *
 * Approve takes one additional parameter — a single creator-picked absolute
 * deadline applied IDENTICALLY to every row in the batch. No per-applicant
 * stagger: unlike decidePaidApplication (which derives payment_deadline from
 * event.application_payment_window_minutes), this path takes the deadline
 * directly from the caller and validates it once, not per-applicant —
 * deadline must be in the future and before the event starts. Same
 * idempotency guard and audit trail as decidePaidApplication; that
 * single-row action and application_payment_window_minutes are untouched by
 * this function.
 */
export async function bulkDecidePaidApplications(
  eventId: string,
  applicationIds: string[],
  decision: 'approved' | 'declined' | 'waitlisted',
  paymentDeadline?: string,
): Promise<{ success: boolean; decided: number; error?: string }> {
  const eventIdParsed = z.string().uuid().safeParse(eventId)
  const applicationIdsParsed = z.array(z.string().uuid()).min(1).max(200).safeParse(applicationIds)
  const decisionParsed = DecisionSchema.safeParse(decision)
  if (!eventIdParsed.success || !applicationIdsParsed.success || !decisionParsed.success) {
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

  let sharedDeadline: string | null = null

  if (decision === 'approved') {
    const deadlineParsed = z.string().datetime().safeParse(paymentDeadline)
    if (!deadlineParsed.success) {
      return { success: false, decided: 0, error: 'Please pick a payment deadline.' }
    }
    const deadlineDate = new Date(deadlineParsed.data)
    if (deadlineDate <= new Date()) {
      return { success: false, decided: 0, error: 'Payment deadline must be in the future.' }
    }
    if (deadlineDate >= new Date(event.starts_at)) {
      return { success: false, decided: 0, error: 'Payment deadline must be before the event starts.' }
    }
    sharedDeadline = deadlineDate.toISOString()
  }

  const { data: applications } = await admin
    .from('event_applications')
    .select('id, applicant_phone, status')
    .eq('event_id', eventId)
    .in('id', applicationIdsParsed.data)
    .in('status', ['pending', 'waitlisted'])   // idempotency guard

  if (!applications?.length) return { success: true, decided: 0 }

  const decidedIds = applications.map((a) => a.id)
  const decidedAt = new Date().toISOString()

  const { error } = await admin
    .from('event_applications')
    .update(
      decision === 'approved'
        ? { status: decision, decided_at: decidedAt, decided_by: user.id, payment_deadline: sharedDeadline }
        : { status: decision, decided_at: decidedAt, decided_by: user.id },
    )
    .in('id', decidedIds)
    .in('status', ['pending', 'waitlisted'])   // idempotency guard

  if (error) return { success: false, decided: 0, error: 'Failed to update applications.' }

  if (decision === 'approved' || decision === 'declined') {
    await Promise.all(
      applications.map((application) =>
        notifyApplicationDecision(decision, application, event, sharedDeadline).catch(() => {}),
      ),
    )
  }

  return { success: true, decided: decidedIds.length }
}

// ---------------------------------------------------------------------------
// initiatePaymentForApplication
// ---------------------------------------------------------------------------

/**
 * Guest/applicant-facing "pay now" step: validates an approved application
 * and, if still within its payment window, calls the EXISTING, unmodified
 * initiateRSVP (rsvp.ts) exactly as every other caller does. Does not
 * modify initiateRSVP and does not duplicate any of its logic (capacity,
 * pricing, GST, revenue split, Razorpay order creation) — this action is
 * purely: validate the application, delegate to initiateRSVP, link the
 * result back.
 *
 * No new locking/idempotency mechanism beyond the rsvp_id short-circuit
 * below, by design — a genuine double-click race that slips past it just
 * creates a second abandoned pending rsvp row, which the EXISTING
 * reconcile-payments cron already cleans up within 15 minutes.
 *
 * IMPORTANT — guest OTP re-verification: initiateRSVP's guest path requires
 * isGuestPhoneVerified(phone) to be true (verified within the last 15
 * minutes). An application approved hours or days earlier means that
 * verification has long since expired. The caller-facing UI (not built in
 * this pass) MUST re-run sendRsvpGuestOtp/verifyRsvpGuestOtp for
 * application.applicant_phone before invoking this action for a guest
 * applicant, or initiateRSVP will reject with "Please verify your phone
 * number before booking." guest-otp.ts (sendRsvpGuestOtp/verifyRsvpGuestOtp)
 * is generic — keyed only by phone + purpose — so it's reusable here as-is;
 * no changes were needed or made to it.
 */
export async function initiatePaymentForApplication(applicationId: string): Promise<{
  orderId: string
  qrToken: string | null
  razorpayOrderId: string | null
  amount: number
  isFree: boolean
  alreadyBooked: boolean
  error: string | null
}> {
  const EMPTY = {
    orderId: '', qrToken: null, razorpayOrderId: null, amount: 0,
    isFree: false, alreadyBooked: false, error: '',
  }

  const parsed = z.string().uuid().safeParse(applicationId)
  if (!parsed.success) return { ...EMPTY, error: 'Invalid application ID.' }

  const admin = createAdminClient()

  const { data: application } = await admin
    .from('event_applications')
    .select('id, event_id, applicant_name, applicant_phone, ticket_tier_id, status, payment_deadline, rsvp_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (!application) return { ...EMPTY, error: 'Application not found.' }

  // Already booked — short-circuit rather than calling initiateRSVP again.
  if (application.rsvp_id) {
    const { data: rsvp } = await admin
      .from('rsvps')
      .select('id, qr_code_token, razorpay_order_id, amount_paid, payment_status')
      .eq('id', application.rsvp_id)
      .maybeSingle()

    return {
      orderId:         application.rsvp_id,
      qrToken:         rsvp?.payment_status === 'captured' ? (rsvp.qr_code_token ?? null) : null,
      razorpayOrderId: rsvp?.razorpay_order_id ?? null,
      amount:          rsvp?.amount_paid ?? 0,
      isFree:          false,
      alreadyBooked:   true,
      error:           null,
    }
  }

  if (application.status !== 'approved') {
    return { ...EMPTY, error: 'This application is no longer active.' }
  }

  // Defensive expiry check — don't rely solely on the (future) expiry sweep
  // cron having run yet. A payment window that has elapsed is treated as
  // expired here regardless of what event_applications.status currently says.
  if (application.payment_deadline && new Date(application.payment_deadline) < new Date()) {
    return { ...EMPTY, error: "This application's payment window has expired. Please submit a new application." }
  }

  const result = await initiateRSVP({
    eventId:       application.event_id,
    attendeeName:  application.applicant_name,
    attendeePhone: application.applicant_phone,
    quantity:      1,
    ticketTierId:  application.ticket_tier_id ?? undefined,
  })

  if (result.error || !result.orderId) {
    return { ...result, alreadyBooked: false }
  }

  const { error: linkError } = await admin
    .from('event_applications')
    .update({ rsvp_id: result.orderId })
    .eq('id', applicationId)

  if (linkError) {
    // The booking itself succeeded — this is a bookkeeping failure only.
    // Log for manual reconciliation rather than telling the guest their
    // payment failed (it didn't).
    console.error('[initiatePaymentForApplication] failed to link rsvp_id', {
      applicationId, rsvpId: result.orderId, error: linkError.message,
    })
  }

  return { ...result, alreadyBooked: false }
}
