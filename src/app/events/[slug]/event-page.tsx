'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { initiateRSVP, checkRSVPStatus, getConfirmedRSVPToken, confirmRSVPPayment } from '@/app/actions/rsvp'
import type { MyRSVP } from '@/app/actions/rsvp'
import type { Event } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  display_name: string
  avatar_url: string | null
  username: string
  creator_type: string
  is_verified: boolean
}

export interface EventReview {
  rating:        number
  review:        string | null
  rated_at:      string | null
  reviewer_name: string
}

interface EventPageProps {
  event:     Event
  rsvpCount: number
  spotsLeft: number | null
  creator:   CreatorProfile | null
  reviews?:  EventReview[]
  myRSVP?:   MyRSVP | null
}

type Sheet = 'none' | 'step1' | 'step2' | 'confirmed'

interface ConfirmedData {
  qrToken: string | null
  isFree: boolean
  razorpayOrderId: string | null
  amount: number
  rsvpId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toUpperCase()
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

function formatCreatorType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function qrImageUrl(token: string): string {
  const data = encodeURIComponent(`WIMC-${token}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${data}&color=3b0a00&bgcolor=ffffff&margin=8`
}

function ticketNumber(token: string): string {
  return `WIMC-${token.slice(0, 6).toUpperCase()}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconBox({ icon }: { icon: string }) {
  return (
    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-primary">{icon}</span>
    </div>
  )
}

function SheetBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
      onClick={onClick}
    />
  )
}

function SheetGrabber() {
  return (
    <div className="w-full flex justify-center py-3">
      <div className="w-12 h-1.5 bg-outline-variant/40 rounded-full" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

// Declare Razorpay on window for TypeScript
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: () => void): void }
  }
}

export default function EventPage({ event, rsvpCount, spotsLeft, creator, reviews = [], myRSVP = null }: EventPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheet, setSheet] = useState<Sheet>(() => myRSVP ? 'confirmed' : 'none')
  const [descExpanded, setDescExpanded] = useState(false)

  // Step 1 form
  const [name, setName] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [step1Error, setStep1Error] = useState<string | null>(null)

  // Step 2 / confirmed data — pre-populate from server-fetched existing booking
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(
    myRSVP
      ? { qrToken: myRSVP.qrToken, isFree: !myRSVP.orderId, razorpayOrderId: myRSVP.orderId, amount: 0, rsvpId: myRSVP.rsvpId }
      : null,
  )

  const [copied, setCopied] = useState(false)

  // UPI payment state
  const [paymentPolling, setPaymentPolling] = useState(false)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [showUPIQR, setShowUPIQR] = useState(false)
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const phone = phoneDigits ? `+91${phoneDigits}` : ''
  const soldOut = spotsLeft !== null && spotsLeft === 0
  const isPast = new Date(event.starts_at) <= new Date()
  const canBook = event.status === 'published' && !soldOut && !isPast
  const maxQty = Math.min(10, spotsLeft ?? 10)
  const totalPaise = event.ticket_price * quantity
  const gstApplies = event.ticket_price >= 50000 // ₹500+ per ticket

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/events/${event.slug}`
    const shareData = { title: event.title, text: `Check out ${event.title} on When In My City!`, url: shareUrl }
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData) } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true); setTimeout(() => setCopied(false), 2000)
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }, [event.slug, event.title])

  // ── Step 1 submit ──────────────────────────────────────────────────────────

  function handleStep1Submit() {
    setStep1Error(null)
    if (!name.trim()) { setStep1Error('Please enter your name.'); return }
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      setStep1Error('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    startTransition(async () => {
      const result = await initiateRSVP({
        eventId: event.id,
        attendeeName: name.trim(),
        attendeePhone: phone,
        quantity,
      })

      if (result.error) { setStep1Error(result.error); return }

      if (result.isFree) {
        setConfirmed({
          qrToken: result.qrToken,
          isFree: true,
          razorpayOrderId: null,
          amount: 0,
          rsvpId: result.orderId,
        })
        setSheet('confirmed')
        return
      }

      // Paid: launch Razorpay Checkout.js modal
      const orderData = {
        qrToken: null,
        isFree: false,
        razorpayOrderId: result.razorpayOrderId!,
        amount: result.amount,
        rsvpId: result.orderId,
      }
      setConfirmed(orderData)
      await openRazorpayCheckout(orderData, name.trim(), phone)
    })
  }

  // ── Razorpay Standard Checkout ─────────────────────────────────────────────

  async function openRazorpayCheckout(
    order: ConfirmedData,
    attendeeName: string,
    attendeePhone: string,
  ) {
    // Dynamically load Razorpay Checkout.js once
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
      prefill:     { name: attendeeName, contact: attendeePhone },
      theme:       { color: '#E8572A' },
      modal:       { backdropclose: false, escape: false },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const result = await confirmRSVPPayment({
          rsvpId:            order.rsvpId,
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
        if (result.success) {
          setConfirmed((prev) => prev ? { ...prev, qrToken: result.qrToken } : prev)
          setSheet('confirmed')
        } else {
          setStep1Error(result.error ?? 'Payment verification failed. Contact support.')
          setSheet('step1')
        }
      },
    })
    rzp.on('payment.failed', () => {
      setStep1Error('Payment failed. Please try again.')
      setSheet('step1')
    })
    rzp.open()
  }

  // ── Step 2: UPI Intent helpers (fallback / legacy) ──────────────────────────

  /**
   * Builds the shared UPI query-string parameters.
   * Amount is converted from paise → rupees (UPI spec requires rupees).
   * Returns null if the merchant VPA env var is not configured.
   */
  function buildUPIParams(razorpayOrderId: string, amountPaise: number): string | null {
    const vpa = process.env.NEXT_PUBLIC_RAZORPAY_UPI_VPA
    if (!vpa) return null
    return [
      `pa=${encodeURIComponent(vpa)}`,
      `pn=${encodeURIComponent('When In My City')}`,
      `am=${(amountPaise / 100).toFixed(2)}`,
      `cu=INR`,
      `tr=${encodeURIComponent(razorpayOrderId)}`,
      `tn=${encodeURIComponent(event.title.slice(0, 50))}`,
    ].join('&')
  }

  /** Generic UPI URL (any app, used for QR code) */
  function buildGenericUPIUrl(): string | null {
    if (!confirmed?.razorpayOrderId) return null
    const params = buildUPIParams(confirmed.razorpayOrderId, confirmed.amount)
    if (!params) return null
    return `upi://pay?${params}`
  }

  /**
   * Polls the server every 3 s (up to 90 s) until the webhook has marked
   * the RSVP as 'captured'.  Confirms the booking and advances to the
   * success screen on capture.
   */
  function startPolling(rsvpId: string) {
    setPaymentPolling(true)
    setPollingError(null)

    let attempts = 0
    const MAX_ATTEMPTS = 30 // 30 × 3 s = 90 s

    const doPoll = async () => {
      attempts++
      try {
        const result = await checkRSVPStatus(rsvpId)

        if (result.status === 'captured') {
          if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current)
          // Fetch the QR token securely: requires both rsvpId AND razorpayOrderId
          // so a UUID alone (which might leak) is insufficient to get the ticket.
          const order = confirmed?.razorpayOrderId ?? ''
          const { qrToken } = await getConfirmedRSVPToken(rsvpId, order)
          setConfirmed((prev) => prev ? { ...prev, qrToken } : prev)
          setPaymentPolling(false)
          setShowUPIQR(false)
          setSheet('confirmed')
          return
        }

        if (result.status === 'failed') {
          setPaymentPolling(false)
          setPollingError('Payment was declined. Please try again.')
          return
        }

        if (attempts >= MAX_ATTEMPTS) {
          setPaymentPolling(false)
          setPollingError(
            'Payment not confirmed yet. If you completed the payment, your ticket will appear shortly — check back in a minute.',
          )
          return
        }

        pollingTimerRef.current = setTimeout(doPoll, 3000)
      } catch {
        setPaymentPolling(false)
        setPollingError('Could not reach the server. Please check your connection.')
      }
    }

    // Give the user 3 s to complete the payment in their UPI app before the
    // first poll so we don't burn a request before the webhook fires.
    pollingTimerRef.current = setTimeout(doPoll, 3000)
  }

  function cancelPolling() {
    if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current)
    setPaymentPolling(false)
    setPollingError(null)
  }

  /**
   * Launches the UPI app via a deep-link and immediately starts polling
   * for the webhook confirmation.
   *
   * Scheme reference:
   *   Google Pay  → tez://upi/pay?…
   *   PhonePe     → phonepe://pay?…
   *   Paytm       → paytmmp://pay?…
   *
   * If the app is not installed the OS ignores the scheme and the user
   * stays in the browser — the polling times out gracefully with a message.
   */
  function handleUPIDeeplink(scheme: 'tez' | 'phonepe' | 'paytmmp') {
    if (!confirmed?.razorpayOrderId) return
    const params = buildUPIParams(confirmed.razorpayOrderId, confirmed.amount)
    if (!params) {
      setPollingError('Payment not configured. Please contact support.')
      return
    }

    const schemeMap = {
      tez: `tez://upi/pay?${params}`,
      phonepe: `phonepe://pay?${params}`,
      paytmmp: `paytmmp://pay?${params}`,
    }

    window.location.href = schemeMap[scheme]
    startPolling(confirmed.rsvpId)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">

      {/* ── Header ── */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md">
        <div className="flex items-center px-4 h-16 max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="ml-4 font-headline font-semibold text-lg text-primary">When In My City</h1>
          <button
            onClick={handleShare}
            title="Share event"
            className="ml-auto p-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 relative"
          >
            {copied
              ? <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              : <span className="material-symbols-outlined text-primary">share</span>
            }
          </button>
        </div>
      </header>

      <main className="pt-16 pb-32">

        {/* ── Hero ── */}
        <section className="relative w-full h-[380px] sm:h-[442px] overflow-hidden">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-surface-container-high" />
          )}
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* ── Content canvas ── */}
        <article className="max-w-2xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 space-y-10">

          {/* ── Event header card ── */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_12px_32px_rgba(171,46,0,0.06)]">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {event.status !== 'published' ? (
                <span className="px-3 py-1 rounded-full bg-error/20 text-error text-[10px] font-bold uppercase tracking-widest capitalize">
                  {event.status}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold uppercase tracking-widest">
                  Live
                </span>
              )}
              {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && (
                <span className="text-primary font-bold text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  🔥 {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left!
                </span>
              )}
              {soldOut && (
                <span className="text-error font-bold text-sm">Sold out</span>
              )}
            </div>

            <h2 className="font-headline font-bold text-2xl text-on-surface mb-6 leading-tight">
              {event.title}
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <IconBox icon="calendar_today" />
                <div>
                  <p className="font-semibold text-on-surface" suppressHydrationWarning>{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</p>
                  {event.ends_at && (
                    <p className="text-sm text-on-surface-variant" suppressHydrationWarning>Until {formatTime(event.ends_at)}</p>
                  )}
                  {rsvpCount > 0 && (
                    <p className="text-sm text-on-surface-variant">{rsvpCount} {rsvpCount === 1 ? 'person' : 'people'} going</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <IconBox icon="location_on" />
                <div>
                  <p className="font-semibold text-on-surface">{event.venue_name}</p>
                  <p className="text-sm text-on-surface-variant">{event.venue_address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <IconBox icon="confirmation_number" />
                <div>
                  <p className="font-semibold text-on-surface">{formatPrice(event.ticket_price)}{event.ticket_price > 0 ? ' per person' : ''}</p>
                  {event.ticket_price >= 50000 && (
                    <p className="text-sm text-on-surface-variant">18% GST applies</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Host section ── */}
          {creator && (
            <section>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-4 px-1">Your Host</h3>
              <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {creator.avatar_url ? (
                      <Image
                        src={creator.avatar_url}
                        alt={creator.display_name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover"
                        />  
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary text-xl font-bold">
                          {creator.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {creator.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-tertiary rounded-full p-1 border-2 border-surface-container-low">
                        <span
                          className="material-symbols-outlined text-[10px] text-white"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >verified</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface leading-tight">Hosted by {creator.display_name}</p>
                    <p className="text-sm text-on-surface-variant">{formatCreatorType(creator.creator_type)}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/${creator.username}`)}
                  className="bg-surface-container-highest px-4 py-2 rounded-lg text-sm font-bold text-on-surface-variant hover:brightness-95 transition-all"
                >
                  View
                </button>
              </div>
            </section>
          )}

          {/* ── About section ── */}
          {event.description && (
            <section>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-4 px-1">About the Experience</h3>
              <div className="text-on-surface-variant leading-relaxed">
                <p className={descExpanded ? '' : 'line-clamp-4'}>
                  {event.description}
                </p>
                {event.description.length > 200 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="text-primary font-bold inline-flex items-center gap-1 mt-2 hover:underline"
                  >
                    {descExpanded ? 'Read less' : 'Read more'}
                    <span className="material-symbols-outlined text-sm">
                      {descExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* ── Location snapshot ── */}
          <section className="bg-surface-container-high rounded-xl p-2 h-48 overflow-hidden relative">
            {event.google_maps_url ? (
              <a
                href={event.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full"
              >
                <div className="w-full h-full rounded-lg bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-outline">map</span>
                </div>
              </a>
            ) : (
              <div className="w-full h-full rounded-lg bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-outline">map</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-primary text-on-primary p-3 rounded-full shadow-lg">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div
                className="bg-surface-container-lowest/80 backdrop-blur p-3 rounded-lg flex items-center justify-between"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant truncate mr-2">
                  {event.venue_name}
                </span>
                {event.google_maps_url && (
                  <a
                    href={event.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary font-bold shrink-0"
                  >
                    Open Directions
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── Reviews section ── */}
          {(event.rating_count > 0 || reviews.length > 0) && (
            <section id="reviews">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-headline font-bold text-lg text-on-surface">Attendee Reviews</h3>
                {event.rating_count > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <span
                          key={s}
                          className="material-symbols-outlined text-base"
                          style={{ fontVariationSettings: `'FILL' ${s <= Math.round(event.average_rating) ? 1 : 0}`, color: '#F59E0B' }}
                        >star</span>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-on-surface">{event.average_rating.toFixed(1)}</span>
                    <span className="text-sm text-on-surface-variant">({event.rating_count})</span>
                  </div>
                )}
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r, i) => (
                    <div key={i} className="bg-surface-container-low rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {r.reviewer_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm text-on-surface">{r.reviewer_name}</span>
                        </div>
                        <div className="flex">
                          {[1,2,3,4,5].map((s) => (
                            <span
                              key={s}
                              className="material-symbols-outlined text-sm"
                              style={{ fontVariationSettings: `'FILL' ${s <= r.rating ? 1 : 0}`, color: '#F59E0B' }}
                            >star</span>
                          ))}
                        </div>
                      </div>
                      {r.review && (
                        <p className="text-sm text-on-surface-variant leading-relaxed">&ldquo;{r.review}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant px-1">Be among the first to review this experience after attending.</p>
              )}
            </section>
          )}

        </article>
      </main>

      {/* ── Sticky CTA ── */}
      <nav className="fixed bottom-0 left-0 w-full p-4 flex justify-center z-50">
        <div className="w-full max-w-2xl bg-surface/70 backdrop-blur-md">
          {myRSVP ? (
            <button
              onClick={() => setSheet('confirmed')}
              className="bg-gradient-to-r from-[#006a43] to-[#00875a] text-white rounded-lg px-8 py-4 w-full flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wider shadow-[0_-8px_24px_rgba(0,106,67,0.2)] hover:brightness-110 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
              View My Ticket
            </button>
          ) : canBook ? (
            <button
              onClick={() => setSheet('step1')}
              className="bg-gradient-to-r from-[#AB2E00] to-[#CF4519] text-white rounded-lg px-8 py-4 w-full flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wider shadow-[0_-8px_24px_rgba(171,46,0,0.12)] hover:brightness-110 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              {event.ticket_price === 0 ? 'RSVP Now — Free' : `Get Tickets — ${formatPrice(event.ticket_price)}`}
            </button>
          ) : (
            <div className="w-full py-4 text-center text-on-surface-variant text-sm font-semibold bg-surface-container-low rounded-lg">
              {soldOut ? 'Sold Out' : isPast ? 'Event Ended' : event.status === 'cancelled' ? 'Event Cancelled' : ''}
            </div>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* RSVP Step 1: Details                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {sheet === 'step1' && (
        <>
          <SheetBackdrop onClick={() => setSheet('none')} />
          <div className="fixed bottom-0 left-0 w-full z-[70]">
            <div className="bg-surface-container-lowest rounded-t-[32px] shadow-[0_-12px_32px_rgba(171,46,0,0.12)] max-w-2xl mx-auto overflow-hidden">
              <SheetGrabber />
              <div className="px-6 pb-8 pt-2">
                <header className="mb-8">
                  <h2 className="font-headline text-2xl font-bold text-on-surface">Reserve your spot</h2>
                  <p className="text-on-surface-variant text-sm">Secure your entry for {event.title}.</p>
                </header>

                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 px-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-outline transition-all text-on-surface placeholder:text-outline-variant"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 px-1">
                      WhatsApp Number
                    </label>
                    <div className="flex gap-2">
                      <div className="bg-surface-container-low rounded-xl px-4 py-4 flex items-center gap-2 text-on-surface font-semibold shrink-0">
                        <span className="text-xs">🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={phoneDigits}
                        onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-outline transition-all text-on-surface placeholder:text-outline-variant"
                      />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-xl">
                    <div>
                      <span className="block font-headline font-bold text-on-surface">How many people?</span>
                      <span className="text-xs text-on-surface-variant">Max {maxQty} ticket{maxQty !== 1 ? 's' : ''} per booking</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined">remove</span>
                      </button>
                      <span className="font-headline text-xl font-bold text-on-surface w-4 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing summary */}
                  {event.ticket_price > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container-low p-4 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ticket Price</span>
                        <span className="font-headline font-bold text-on-surface">
                          {formatPrice(event.ticket_price)} <span className="text-xs font-normal">/ person</span>
                        </span>
                      </div>
                      <div className="bg-secondary-fixed/30 p-4 rounded-xl flex flex-col justify-center border border-secondary-fixed/20">
                        <span className="text-[10px] font-bold text-on-secondary-fixed-variant uppercase tracking-wider">Total</span>
                        <span className="font-headline font-bold text-secondary">
                          {quantity} × {formatPrice(event.ticket_price)} = {formatPrice(totalPaise)}
                          {gstApplies && <span className="text-[10px] font-normal block text-on-surface-variant">+GST</span>}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {step1Error && (
                    <p className="text-error text-sm flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                      {step1Error}
                    </p>
                  )}

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={handleStep1Submit}
                    disabled={isPending}
                    className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-3 shadow-[0_12px_32px_rgba(171,46,0,0.15)] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isPending
                      ? 'Processing…'
                      : event.ticket_price === 0
                        ? 'Confirm RSVP'
                        : `Pay ${formatPrice(totalPaise)}`}
                    {!isPending && <span className="material-symbols-outlined">arrow_forward</span>}
                  </button>

                  <p className="text-center text-xs text-on-surface-variant">
                    By clicking {event.ticket_price === 0 ? 'Confirm' : 'Pay'}, you agree to our{' '}
                    <span className="underline font-semibold cursor-pointer">Terms of Service</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* RSVP Step 2: Payment                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {sheet === 'step2' && confirmed && (
        <>
          <SheetBackdrop onClick={() => setSheet('step1')} />
          <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col items-center">
            <div className="w-12 h-1.5 bg-surface-container-highest rounded-full mb-2" />
            <div className="w-full max-w-md bg-surface-container-lowest rounded-t-[32px] overflow-hidden shadow-[0_-12px_32px_rgba(171,46,0,0.08)]">

              {/* Header */}
              <div className="px-6 pt-8 pb-4 flex items-center gap-4">
                <button
                  className="p-2 -ml-2 rounded-full hover:bg-surface-container-low transition-colors"
                  onClick={() => setSheet('step1')}
                >
                  <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
                </button>
                <h3 className="text-xl font-headline font-bold text-on-surface">Complete payment</h3>
              </div>

              {/* Amount banner */}
              <div className="mx-6 p-4 rounded-xl bg-surface-container-low flex justify-between items-center mb-6">
                <div>
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Total Amount</span>
                  <p className="text-2xl font-headline font-extrabold text-primary">
                    {formatPrice(confirmed.amount)}
                  </p>
                </div>
                <div className="h-10 w-10 bg-surface-container-highest rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                </div>
              </div>

              {/* ── Polling state ── */}
              {paymentPolling && (
                <div className="px-6 flex flex-col items-center gap-6 py-4">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl animate-spin" style={{ animationDuration: '1.2s' }}>
                      progress_activity
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="font-headline font-bold text-on-surface text-lg">Waiting for payment…</p>
                    <p className="text-sm text-on-surface-variant mt-1">Complete the payment in your UPI app. This page will update automatically.</p>
                  </div>
                  <button
                    onClick={cancelPolling}
                    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4"
                  >
                    Back / Try a different method
                  </button>
                </div>
              )}

              {/* ── UPI QR state ── */}
              {!paymentPolling && showUPIQR && (() => {
                const upiUrl = buildGenericUPIUrl()
                return upiUrl ? (
                  <div className="px-6 flex flex-col items-center gap-4 py-2">
                    <p className="text-sm font-semibold text-on-surface-variant">Scan with any UPI app</p>
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-outline-variant/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}&margin=8`}
                        alt="UPI payment QR code"
                        width={200}
                        height={200}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant text-center">
                      Open Google Pay, PhonePe, Paytm, or any UPI app → Scan QR → Pay{' '}
                      <span className="font-semibold text-primary">{formatPrice(confirmed!.amount)}</span>
                    </p>
                    <button
                      onClick={() => startPolling(confirmed!.rsvpId)}
                      className="w-full bg-primary text-on-primary py-4 rounded-xl font-headline font-bold text-base active:scale-[0.98] transition-all"
                    >
                      I&apos;ve paid — confirm my ticket
                    </button>
                    <button
                      onClick={() => setShowUPIQR(false)}
                      className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                ) : null
              })()}

              {/* ── App buttons + error (default state) ── */}
              {!paymentPolling && !showUPIQR && (
                <>
                  <div className="px-6 space-y-3">
                    <p className="text-sm font-semibold text-on-surface-variant ml-1 mb-2">Pay via UPI</p>

                    {([
                      { label: 'Google Pay',  scheme: 'tez'      as const, bg: 'bg-white',       icon: '🪙' },
                      { label: 'PhonePe',     scheme: 'phonepe'  as const, bg: 'bg-[#5f259f]',   icon: '📱' },
                      { label: 'Paytm',       scheme: 'paytmmp'  as const, bg: 'bg-[#00baf2]',   icon: '💳' },
                    ]).map(({ label, scheme, bg, icon }) => (
                      <button
                        key={label}
                        onClick={() => handleUPIDeeplink(scheme)}
                        className="w-full flex items-center justify-between p-4 bg-surface-container-highest rounded-xl hover:bg-surface-container-high transition-all active:scale-[0.98] group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center text-lg shadow-sm`}>
                            {icon}
                          </div>
                          <span className="font-semibold text-on-surface">Pay with {label}</span>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                      </button>
                    ))}
                  </div>

                  {/* QR option */}
                  <div className="px-6 mt-6">
                    <button
                      onClick={() => setShowUPIQR(true)}
                      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant font-semibold hover:border-primary hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined">qr_code_2</span>
                      <span>Show QR Code</span>
                    </button>
                  </div>

                  {/* Error */}
                  {pollingError && (
                    <div className="mx-6 mt-4 p-4 rounded-xl bg-error-container/30">
                      <p className="text-sm text-error flex items-start gap-2">
                        <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                        {pollingError}
                      </p>
                    </div>
                  )}

                  {/* Support link */}
                  <div className="px-6 py-6 text-center">
                    <button
                      onClick={() => { setPollingError(null); setSheet('step1') }}
                      className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                    >
                      Payment not completed?{' '}
                      <span className="underline decoration-primary/30 underline-offset-4">Tap here</span>
                    </button>
                  </div>
                </>
              )}

              {/* Footer */}
              <footer className="bg-surface-container-low px-6 py-4 flex flex-col items-center gap-1 border-t border-outline/10">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  Powered by Razorpay · 100% secure
                </div>
              </footer>

            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Confirmation full-screen overlay                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {sheet === 'confirmed' && confirmed && (
        <div className="fixed inset-0 z-[80] bg-background overflow-y-auto">

          {/* Header */}
          <header className="w-full bg-surface/90 backdrop-blur-md">
            <div className="flex items-center px-4 h-16 max-w-7xl mx-auto">
              <button onClick={() => setSheet('none')} className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-primary">close</span>
              </button>
              <h1 className="ml-4 font-headline font-semibold text-lg text-primary">When In My City</h1>
            </div>
          </header>

          <div className="pt-6 pb-32 px-4 max-w-lg mx-auto relative overflow-hidden">

            {/* Confetti bg */}
            <div
              className="absolute inset-0 -z-10 pointer-events-none opacity-15"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, #cf4519 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl" />
            <div className="absolute top-40 -left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />

            {/* Hero */}
            <section className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-tertiary-container rounded-full mb-6 shadow-[0_12px_32px_rgba(0,106,67,0.15)]">
                <span
                  className="material-symbols-outlined text-white text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >check_circle</span>
              </div>
              <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight mb-2">
                You&apos;re in! 🎉
              </h2>
              <p className="text-on-surface-variant font-medium">Your spot is secured for the experience.</p>
            </section>

            {/* Event card */}
            <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(171,46,0,0.08)] mb-8">
              {event.cover_image_url && (
                <div className="relative h-32 w-full">
                  <Image
                    src={event.cover_image_url}
                    alt={event.title}
                    fill
                    className="object-cover"
                    />  
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest to-transparent" />
                </div>
              )}
              <div className="px-6 pb-6 -mt-8 relative z-10">
                <div className="inline-flex px-3 py-1 bg-secondary-fixed rounded-full text-on-secondary-fixed-variant text-xs font-bold uppercase tracking-wider mb-3">
                  Confirmed
                </div>
                <h3 className="font-headline font-bold text-2xl text-on-surface mb-2">{event.title}</h3>
                <div className="flex items-center gap-4 text-on-surface-variant text-sm flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    <span suppressHydrationWarning>{formatDate(event.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <span suppressHydrationWarning>{formatTime(event.starts_at)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* QR ticket */}
            <section className="bg-surface-container-lowest rounded-xl p-8 mb-10 text-center relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full" />
              <div className="mb-6">
                <p className="font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-4">
                  Scan at Entrance
                </p>
                <div className="inline-block p-4 bg-white rounded-lg border border-outline-variant/20 shadow-sm">
                  {confirmed.qrToken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrImageUrl(confirmed.qrToken)}
                      alt="Entry QR code"
                      width={160}
                      height={160}
                      className="w-40 h-40"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-outline-variant">
                      <span className="material-symbols-outlined text-5xl">qr_code_2</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-on-surface">
                  {confirmed.qrToken ? ticketNumber(confirmed.qrToken) : 'Processing…'}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Valid for {quantity} {quantity === 1 ? 'Entry' : 'Entries'} · Non-Transferable
                </p>
              </div>
            </section>

            {/* Actions */}
            <section className="space-y-4 mb-12">
              <button
                onClick={() => {
                  const start = new Date(event.starts_at)
                  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
                  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
                  const location = [event.venue_name, event.venue_address].filter(Boolean).join(', ')
                  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(event.description ?? '')}`
                  window.open(url, '_blank', 'noopener,noreferrer')
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(171,46,0,0.2)] hover:brightness-110 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">calendar_add_on</span>
                Add to Calendar
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleShare}
                  className="py-4 px-4 bg-surface-container-high text-on-surface font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors active:scale-95"
                >
                  {copied
                    ? <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    : <span className="material-symbols-outlined text-primary">share</span>
                  }
                  {copied ? 'Copied!' : 'Share'}
                </button>
                <button
                  onClick={() => {
                    if (confirmed?.qrToken) {
                      window.open(qrImageUrl(confirmed.qrToken), '_blank', 'noopener,noreferrer')
                    }
                  }}
                  className="py-4 px-4 bg-surface-container-high text-on-surface font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-primary">download</span>
                  Pass
                </button>
              </div>
            </section>

            {/* WhatsApp group */}
            {event.whatsapp_group_url && (
              <a
                href={event.whatsapp_group_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-lg font-bold mb-6 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined">chat</span>
                Join WhatsApp Group
              </a>
            )}
          </div>

          {/* Bottom nav */}
          <nav className="fixed bottom-0 left-0 w-full p-4 flex justify-center z-50">
            <div className="bg-surface/70 backdrop-blur-md w-full max-w-lg rounded-xl shadow-[0_-12px_32px_rgba(171,46,0,0.08)] flex justify-center p-2">
              <button
                onClick={() => router.push('/explore/saved')}
                className="bg-gradient-to-r from-[#AB2E00] to-[#CF4519] text-white rounded-lg px-8 py-4 w-full flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                Browse more events
              </button>
            </div>
          </nav>

        </div>
      )}

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; vertical-align: middle; }`}</style>
    </div>
  )
}
