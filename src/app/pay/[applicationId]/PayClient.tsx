'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getCountryCallingCode } from 'libphonenumber-js'
import { initiatePaymentForApplication } from '@/app/actions/event-applications'
import { confirmRSVPPayment } from '@/app/actions/rsvp'
import { sendRsvpGuestOtp, verifyRsvpGuestOtp } from '@/app/actions/guest-otp'
import { signOut } from '@/app/actions/auth'
import { calculateChargeAmount } from '@/types/events'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplicationData {
  id:                string
  event_id:          string
  applicant_user_id: string | null
  applicant_name:    string
  applicant_phone:   string
  answer:            string | null
  ticket_tier_id:    string | null
  status:            'pending' | 'approved' | 'declined' | 'waitlisted' | 'expired'
  payment_deadline:  string | null
  rsvp_id:           string | null
  created_at:        string
}

interface EventData {
  id:                string
  slug:              string
  title:             string
  cover_image_url:   string | null
  starts_at:         string
  venue_name:        string
  venue_address:     string
  google_maps_url:   string | null
  ticket_price:      number
  ticket_tiers:      unknown
  whatsapp_group_url: string | null
  status:            string
}

interface Props {
  application:     ApplicationData
  event:           EventData
  isAuthenticated: boolean
  sessionUserId:   string | null
}

type RawTier = { id: string; name: string; price_paise: number; description: string }

// Declare Razorpay on window for TypeScript — same declaration event-page.tsx uses.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: () => void): void }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

// Same 2-hour urgency window and three-state shape as PaidApplicationsClient
// (src/app/dashboard/events/[id]/applications/PaidApplicationsClient.tsx) —
// same threshold logic, reimplemented against this page's own Tailwind-based
// design language rather than that dashboard page's --wimc-* CSS-variable
// styling, since the two pages don't share a visual system.
const URGENT_WINDOW_MS = 2 * 60 * 60 * 1000

function deadlineUrgency(deadlineIso: string): 'normal' | 'urgent' | 'elapsed' {
  const msLeft = new Date(deadlineIso).getTime() - Date.now()
  if (msLeft <= 0) return 'elapsed'
  if (msLeft <= URGENT_WINDOW_MS) return 'urgent'
  return 'normal'
}

export default function PayClient({ application, event, isAuthenticated, sessionUserId }: Props) {
  const router = useRouter()

  const tiers = (event.ticket_tiers as RawTier[] | null) ?? []
  const selectedTier = application.ticket_tier_id ? tiers.find((t) => t.id === application.ticket_tier_id) : null
  const unitPrice = selectedTier ? selectedTier.price_paise : event.ticket_price
  const estimatedTotal = calculateChargeAmount(unitPrice, 1)

  const urgency = application.payment_deadline ? deadlineUrgency(application.payment_deadline) : 'normal'
  // Treat an elapsed deadline as expired even if the (separate) sweep cron
  // hasn't flipped the DB status yet — same defensive independence
  // initiatePaymentForApplication itself applies server-side.
  const deadlineElapsed = application.payment_deadline ? new Date(application.payment_deadline) < new Date() : false
  const effectivelyExpired = application.status === 'expired' || (application.status === 'approved' && deadlineElapsed)

  // A currently-authenticated viewer whose session doesn't match who this
  // application belongs to (including a guest application — applicant_user_id
  // null never "matches" a real session). Flagged explicitly rather than
  // silently proceeding, since initiateRSVP resolves the booking's identity
  // from the LIVE session, not from the application row.
  const identityMismatch = isAuthenticated && application.applicant_user_id !== sessionUserId

  // Guest phone verification — the applicant's original apply-time OTP
  // verification is long expired by the time approval + this page happen,
  // so it must be re-triggered here regardless. Only relevant when there's
  // no session at all; reuses sendRsvpGuestOtp/verifyRsvpGuestOtp as-is.
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpChannel, setOtpChannel] = useState<'sms' | 'whatsapp'>('whatsapp')
  const [otpPending, setOtpPending] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const isIndia = application.applicant_phone.startsWith('+91')
  const dialCode = isIndia ? getCountryCallingCode('IN') : null

  const [payPending, setPayPending] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [alreadyBookedQrToken, setAlreadyBookedQrToken] = useState<string | null | undefined>(undefined)
  // Two of the three named failure modes are recognized by matching
  // initiateRSVP/initiatePaymentForApplication's exact error strings (same
  // convention this codebase already uses everywhere — there's no error-
  // code system) so they get their own honest, non-alarming StatusScreen
  // instead of being dumped into the generic red payError text.
  const [expiredAtPayTime, setExpiredAtPayTime] = useState(false)
  const [soldOutAtPayTime, setSoldOutAtPayTime] = useState(false)

  async function sendOtp(channel: 'sms' | 'whatsapp') {
    setOtpError(null)
    setOtpPending(true)
    const r = await sendRsvpGuestOtp(application.applicant_phone, channel)
    setOtpPending(false)
    if (!r.success) { setOtpError(r.error ?? 'Could not send verification code.'); return }
    setOtpChannel(r.channel)
    setOtpSent(true)
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otpCode)) { setOtpError('Enter the 6-digit code sent to your phone.'); return }
    setOtpError(null)
    setOtpPending(true)
    const r = await verifyRsvpGuestOtp(application.applicant_phone, otpCode)
    setOtpPending(false)
    if (!r.success) { setOtpError(r.error ?? 'Incorrect code.'); return }
    setOtpVerified(true)
  }

  // ── Razorpay handoff — same mechanics as event-page.tsx's
  // openRazorpayCheckout: dynamically load Checkout.js, open it against the
  // real order initiatePaymentForApplication just created, and on success
  // call the same unmodified confirmRSVPPayment. Not extracted into a shared
  // helper — event-page.tsx doesn't export its version, and this codebase's
  // established convention (see the digital-purchase-flow duplication noted
  // in CLAUDE.md) is to duplicate a small flow like this across call sites
  // rather than force a shared abstraction across two different page contexts.
  async function openRazorpayCheckout(order: {
    razorpayOrderId: string
    amount: number
    orderId: string
  }) {
    if (!window.Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Razorpay'))
        document.head.appendChild(script)
      })
    }

    const rzp = new window.Razorpay({
      key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
      amount:      order.amount,
      currency:    'INR',
      name:        'When In My City',
      description: event.title,
      order_id:    order.razorpayOrderId,
      image:       event.cover_image_url ?? undefined,
      prefill:     { name: application.applicant_name, contact: application.applicant_phone },
      theme:       { color: '#E8572A' },
      modal:       { backdropclose: false, escape: false },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const result = await confirmRSVPPayment({
          rsvpId:            order.orderId,
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
        if (result.success && result.qrToken) {
          router.push(`/ticket/${result.qrToken}`)
        } else {
          setPayError(result.error ?? 'Payment verification failed. Please contact support.')
        }
      },
    })
    rzp.on('payment.failed', () => {
      setPayError('Payment failed. Please try again.')
    })
    rzp.open()
  }

  async function handlePayClick() {
    setPayError(null)

    if (!isAuthenticated && !otpVerified) {
      // Shouldn't be reachable — the Pay button is disabled until verified —
      // but guard anyway rather than silently letting initiateRSVP's own
      // guest-OTP gate reject it with a less specific error.
      setOtpError('Please verify your phone number first.')
      return
    }

    setPayPending(true)
    const result = await initiatePaymentForApplication(application.id)
    setPayPending(false)

    if (result.alreadyBooked) {
      setAlreadyBookedQrToken(result.qrToken)
      return
    }

    if (result.error) {
      if (result.error === "This application's payment window has expired. Please submit a new application.") {
        setExpiredAtPayTime(true)
      } else if (result.error === 'Sorry, this event is sold out.') {
        setSoldOutAtPayTime(true)
      } else {
        setPayError(result.error)
      }
      return
    }

    if (!result.razorpayOrderId) {
      // Defensive — a paid-gated application always resolves to a paid
      // order (ticket_price > 0 by construction, see events.ts's
      // isGatableEvent), so this branch shouldn't be reachable.
      setPayError('Something went wrong setting up payment. Please try again.')
      return
    }

    await openRazorpayCheckout({
      razorpayOrderId: result.razorpayOrderId,
      amount:          result.amount,
      orderId:         result.orderId,
    })
  }

  // ── Non-approved / expired states ──────────────────────────────────────────

  if (application.status === 'pending' || application.status === 'waitlisted') {
    return (
      <StatusScreen
        icon="schedule" iconColor="text-amber-700" iconBg="bg-amber-100"
        title="Still under review"
        body="The host hasn't decided on your application yet. You'll get a WhatsApp message as soon as they do."
        event={event}
      />
    )
  }

  if (application.status === 'declined') {
    return (
      <StatusScreen
        icon="event_busy" iconColor="text-on-surface-variant" iconBg="bg-surface-container-high"
        title="Not approved this time"
        body="The host didn't approve this application. You're welcome to check the event page for other options."
        event={event}
      />
    )
  }

  if (effectivelyExpired || expiredAtPayTime) {
    return (
      <StatusScreen
        icon="timer_off" iconColor="text-error" iconBg="bg-error-container"
        title="Payment window closed"
        body="Your window to pay for this spot has passed. Approval doesn't hold a spot indefinitely — you're welcome to submit a new application if spots remain."
        event={event}
        action={
          <Link
            href={`/events/${event.slug}`}
            className="w-full block text-center bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-xl font-headline font-bold shadow-[0_12px_32px_rgba(171,46,0,0.15)]"
          >
            Apply again
          </Link>
        }
      />
    )
  }

  if (soldOutAtPayTime) {
    return (
      <StatusScreen
        icon="event_busy" iconColor="text-on-surface-variant" iconBg="bg-surface-container-high"
        title="This event filled up"
        body="Other approved applicants completed payment first and the event is now at capacity. Approval doesn't reserve a spot until payment clears — this is expected when more people are approved than there's room for, not an error on your end."
        event={event}
        action={
          <Link
            href={`/events/${event.slug}`}
            className="w-full block text-center bg-surface-container-high text-on-surface py-4 rounded-xl font-headline font-bold"
          >
            Back to event page
          </Link>
        }
      />
    )
  }

  if (alreadyBookedQrToken) {
    return (
      <StatusScreen
        icon="confirmation_number" iconColor="text-white" iconBg="bg-[#006a43]"
        title="Already booked"
        body="This application already has a confirmed booking."
        event={event}
        action={
          <Link
            href={`/ticket/${alreadyBookedQrToken}`}
            className="w-full block text-center bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-xl font-headline font-bold shadow-[0_12px_32px_rgba(171,46,0,0.15)]"
          >
            View my ticket
          </Link>
        }
      />
    )
  }
  if (alreadyBookedQrToken === null) {
    // rsvp_id was set but payment isn't captured yet (still 'pending' —
    // the webhook/reconcile cron hasn't caught up). Honest, not an error.
    return (
      <StatusScreen
        icon="hourglass_top" iconColor="text-amber-700" iconBg="bg-amber-100"
        title="Payment processing"
        body="A payment for this application is already in progress. Check back in a minute — this page will update once it clears."
        event={event}
      />
    )
  }

  // ── Approved, within the window: the actual pay UI ──────────────────────────

  const urgencyColor = urgency === 'urgent' ? 'text-amber-700' : 'text-on-surface-variant'
  const urgencyBg = urgency === 'urgent' ? 'bg-amber-50 border-amber-200' : 'bg-surface-container-low border-transparent'

  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col items-center px-4 py-10" data-noise="true">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <span className="font-display font-black text-lg text-on-surface uppercase tracking-tighter">WIMC</span>
        </header>

        <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(171,46,0,0.08)] mb-6">
          {event.cover_image_url && (
            <div className="relative h-32 w-full">
              <Image src={event.cover_image_url} alt={event.title} fill className="object-cover" />
            </div>
          )}
          <div className="px-6 py-6">
            <div className="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-[rgba(0,106,67,0.1)] text-[#006a43]">
              You&apos;re approved
            </div>
            <h1 className="font-headline font-bold text-2xl text-on-surface mb-2">{event.title}</h1>
            <p className="text-on-surface-variant text-sm">{application.applicant_name}</p>
            <div className="mt-4 flex flex-col gap-1.5 text-sm text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span suppressHydrationWarning>{formatDate(event.starts_at)}, {formatTime(event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">location_on</span>
                <span>{event.venue_name}{event.venue_address ? `, ${event.venue_address}` : ''}</span>
              </div>
              {selectedTier && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">sell</span>
                  <span>{selectedTier.name}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Payment deadline — normal/urgent/elapsed treatment, same 2h
            threshold as PaidApplicationsClient. */}
        {application.payment_deadline && (
          <div className={`rounded-xl p-4 mb-6 border ${urgencyBg}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${urgencyColor}`}>
              {urgency === 'urgent' ? 'Pay soon — closing shortly' : 'Pay by'}
            </p>
            <p className={`font-headline font-bold ${urgencyColor}`} suppressHydrationWarning>
              {formatDeadline(application.payment_deadline)}
            </p>
          </div>
        )}

        {/* Price estimate */}
        <div className="bg-surface-container-low rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">You&apos;ll pay</span>
          <span className="font-headline font-bold text-lg text-on-surface">{formatPrice(estimatedTotal)}</span>
        </div>

        {identityMismatch ? (
          <div className="bg-error-container/40 border border-error/30 rounded-xl p-5 mb-6">
            <p className="font-headline font-bold text-on-surface mb-1">Signed in as a different account</p>
            <p className="text-sm text-on-surface-variant mb-4">
              This application isn&apos;t linked to the WIMC account you&apos;re currently signed into. Sign out to continue
              — you&apos;ll be able to verify with the phone number the application was submitted with.
            </p>
            <button
              onClick={() => signOut()}
              className="w-full py-3 rounded-lg bg-surface-container-high text-on-surface font-semibold hover:bg-surface-container-highest transition-colors"
            >
              Sign out and continue
            </button>
          </div>
        ) : (
          <>
            {!isAuthenticated && !otpVerified && (
              <div className="bg-surface-container-high rounded-xl p-5 mb-6 flex flex-col gap-3">
                <div>
                  <span className="block font-headline font-bold text-on-surface text-sm">Verify your number</span>
                  <span className="text-xs text-on-surface-variant">
                    Your earlier verification has expired — we need to re-confirm it&apos;s really you before payment.
                  </span>
                </div>
                {!otpSent ? (
                  <button
                    type="button"
                    disabled={otpPending}
                    onClick={() => sendOtp(isIndia ? 'sms' : 'whatsapp')}
                    className="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-50"
                  >
                    {otpPending ? 'Sending…' : `Send code to ${isIndia ? '+91' : dialCode ? `+${dialCode}` : ''} ${application.applicant_phone.slice(-10)}`}
                  </button>
                ) : (
                  <>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-surface-container-lowest border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-outline transition-all text-on-surface placeholder:text-outline-variant font-mono text-lg tracking-[0.3em] text-center"
                    />
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        disabled={otpPending}
                        onClick={() => sendOtp(otpChannel)}
                        className="text-xs font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                      >
                        Resend code
                      </button>
                      {isIndia && otpChannel === 'sms' && (
                        <button
                          type="button"
                          disabled={otpPending}
                          onClick={() => sendOtp('whatsapp')}
                          className="text-xs font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                        >
                          Try WhatsApp instead
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={otpPending || otpCode.length !== 6}
                      onClick={verifyOtp}
                      className="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-50"
                    >
                      {otpPending ? 'Verifying…' : 'Verify'}
                    </button>
                  </>
                )}
                {otpError && (
                  <p className="text-error text-sm flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                    {otpError}
                  </p>
                )}
              </div>
            )}

            {payError && (
              <p className="text-error text-sm flex items-start gap-1.5 mb-4">
                <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                {payError}
              </p>
            )}

            <button
              type="button"
              disabled={payPending || (!isAuthenticated && !otpVerified)}
              onClick={handlePayClick}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-3 shadow-[0_12px_32px_rgba(171,46,0,0.15)] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {payPending ? 'Processing…' : `Pay ${formatPrice(estimatedTotal)}`}
              {!payPending && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </>
        )}
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; }`}</style>
    </div>
  )
}

// ─── Status screen (non-payable states) ────────────────────────────────────────

function StatusScreen({ icon, iconColor, iconBg, title, body, event, action }: {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  body: string
  event: EventData
  action?: React.ReactNode
}) {
  return (
    <div className="bg-background text-on-surface font-sans min-h-screen flex flex-col items-center px-4 py-10" data-noise="true">
      <div className="w-full max-w-md text-center">
        <header className="mb-8">
          <span className="font-display font-black text-lg text-on-surface uppercase tracking-tighter">WIMC</span>
        </header>
        <div className={`inline-flex items-center justify-center w-20 h-20 ${iconBg} rounded-full mb-6`}>
          <span className={`material-symbols-outlined ${iconColor} text-4xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">{title}</h1>
        <p className="text-on-surface-variant mb-4">{body}</p>
        <p className="text-sm text-on-surface-variant font-semibold mb-8">{event.title}</p>
        {action}
      </div>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; }`}</style>
    </div>
  )
}
