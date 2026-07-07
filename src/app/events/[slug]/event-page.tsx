'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { initiateRSVP, checkRSVPStatus, getConfirmedRSVPToken, confirmRSVPPayment, casualRSVP } from '@/app/actions/rsvp'
import type { MyRSVP } from '@/app/actions/rsvp'
import { validateReferralCode } from '@/app/actions/referral'
import type { Event } from '@/types/database'
import { TornEdge } from '@/components/ui/TornEdge'
import { profileUrl } from '@/lib/profile-url'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  display_name: string
  avatar_url: string | null
  username: string
  city: string
  creator_type: string
  is_verified: boolean
  user_tier: string | null
  lantern_since: string | null
  beacon_since: string | null
  tier_recovery_until: string | null
}

function yearsSince(iso: string | null): number {
  if (!iso) return 0
  return (Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
}

function creatorTierBadge(creator: CreatorProfile): { label: string; color: string; bg: string; border: string; icon: string } | null {
  const inRecovery = creator.user_tier === 'beacon' &&
    !!creator.tier_recovery_until &&
    new Date(creator.tier_recovery_until) > new Date()

  if (creator.user_tier === 'beacon') {
    if (inRecovery) {
      return { label: 'Beacon · Reviewing', color: 'rgba(168,85,247,0.5)', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.2)', icon: 'schedule' }
    }
    const yrs = yearsSince(creator.beacon_since)
    return yrs >= 5
      ? { label: 'Hall of Lights', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', icon: 'auto_awesome' }
      : { label: 'Beacon Creator', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', icon: 'workspace_premium' }
  }
  if (creator.user_tier === 'lantern') {
    const yrs = yearsSince(creator.lantern_since)
    return yrs >= 3
      ? { label: 'Lantern Mentor', color: '#F5A800', bg: 'rgba(245,168,0,0.15)', border: 'rgba(245,168,0,0.3)', icon: 'local_fire_department' }
      : { label: 'Lantern Creator', color: '#F5A800', bg: 'rgba(245,168,0,0.12)', border: 'rgba(245,168,0,0.25)', icon: 'light_mode' }
  }
  if (creator.user_tier === 'local') {
    return { label: 'Local Creator', color: '#16a34a', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', icon: 'where_to_vote' }
  }
  return null
}

export interface EventReview {
  rating:        number
  review:        string | null
  rated_at:      string | null
  reviewer_name: string
}

interface EventPageProps {
  event:           Event
  rsvpCount:       number
  spotsLeft:       number | null
  creator:         CreatorProfile | null
  reviews?:        EventReview[]
  myRSVP?:         MyRSVP | null
  isAuthenticated: boolean
  /** How the visitor arrived at this booking page (?src= query param). Undefined = 'direct'. */
  discoverySource?: 'creator_link' | 'platform_discovery'
}

type Sheet = 'none' | 'step1' | 'step2' | 'confirmed'

interface ConfirmedData {
  qrToken: string | null
  isFree: boolean
  razorpayOrderId: string | null
  amount: number
  rsvpId: string
  tierName: string | null
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

export default function EventPage({ event, rsvpCount, spotsLeft, creator, reviews = [], myRSVP = null, isAuthenticated, discoverySource }: EventPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isCasual = (event as any).rsvp_style === 'casual' || event.ticket_price === 0
  const [sheet, setSheet] = useState<Sheet>(() => (myRSVP && !isCasual) ? 'confirmed' : 'none')
  const [casualIntent, setCasualIntent] = useState<'going' | 'maybe' | 'not_going' | null>(() => myRSVP ? 'going' : null)
  const [casualPending, startCasualTransition] = useTransition()
  const [descExpanded, setDescExpanded] = useState(false)

  // Fan tiers
  type RawTier = { id: string; name: string; price_paise: number; description: string; benefits: string[]; capacity: number | null }
  const fanTiers = (event.ticket_tiers as RawTier[] | null) ?? []
  const hasFanTiers = fanTiers.length > 0
  const [selectedTierId, setSelectedTierId] = useState<string>(hasFanTiers ? fanTiers[0].id : '')
  const selectedTier = hasFanTiers ? (fanTiers.find((t) => t.id === selectedTierId) ?? fanTiers[0]) : null

  // Step 1 form
  const [name, setName] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [step1Error, setStep1Error] = useState<string | null>(null)

  // Referral code
  const [refExpanded, setRefExpanded] = useState(false)
  const [refInput, setRefInput] = useState('')
  const [refApplied, setRefApplied] = useState<string | null>(null)  // validated code
  const [refError, setRefError] = useState<string | null>(null)
  const [refPending, startRefValidation] = useTransition()

  // Step 2 / confirmed data — pre-populate from server-fetched existing booking
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(
    (myRSVP && !isCasual)
      ? { qrToken: myRSVP.qrToken, isFree: !myRSVP.orderId, razorpayOrderId: myRSVP.orderId, amount: 0, rsvpId: myRSVP.rsvpId, tierName: myRSVP.tierName ?? null }
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
  const effectivePrice = refApplied ? 0 : hasFanTiers ? (selectedTier?.price_paise ?? 0) : event.ticket_price
  const totalPaise = effectivePrice * quantity
  const gstApplies = effectivePrice >= 50000 // ₹500+ per ticket

  // For the sticky CTA: show cheapest paid tier as the "from" price
  const paidTierPrices = hasFanTiers ? fanTiers.map((t) => t.price_paise).filter((p) => p > 0) : []
  const minPaidPrice = paidTierPrices.length ? Math.min(...paidTierPrices) : event.ticket_price
  const ctaLabel = hasFanTiers
    ? (paidTierPrices.length === 0 ? 'RSVP Now — Free' : `Get Tickets — from ${formatPrice(minPaidPrice)}`)
    : (event.ticket_price === 0 ? 'RSVP Now — Free' : `Get Tickets — ${formatPrice(event.ticket_price)}`)

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    // Forward the incoming discovery source when resharing (e.g. a platform-
    // discovery visitor reshares the link) rather than fabricating attribution.
    const shareUrl = `${window.location.origin}/events/${event.slug}${discoverySource ? `?src=${discoverySource}` : ''}`
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
  }, [event.slug, event.title, discoverySource])

  // ── Casual RSVP ────────────────────────────────────────────────────────────

  function handleCasualRSVP(intent: 'going' | 'maybe' | 'not_going') {
    setCasualIntent(intent)  // optimistic update
    startCasualTransition(async () => {
      await casualRSVP({ eventId: event.id, intent })
    })
  }

  // ── Referral code apply ────────────────────────────────────────────────────

  function handleApplyReferral() {
    setRefError(null)
    if (!refInput.trim()) return
    startRefValidation(async () => {
      const result = await validateReferralCode(refInput.trim(), event.id)
      if (result.valid) {
        setRefApplied(refInput.trim().toUpperCase())
        setRefError(null)
      } else {
        setRefError(result.error ?? 'Invalid code.')
      }
    })
  }

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
        ...(refApplied ? { referralCode: refApplied } : {}),
        ...(hasFanTiers && selectedTier ? { ticketTierId: selectedTier.id } : {}),
        ...(discoverySource ? { discoverySource } : {}),
      })

      if (result.error) { setStep1Error(result.error); return }

      const tierName = hasFanTiers && selectedTier ? selectedTier.name : null

      if (result.isFree) {
        setConfirmed({
          qrToken: result.qrToken,
          isFree: true,
          razorpayOrderId: null,
          amount: 0,
          rsvpId: result.orderId,
          tierName,
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
        tierName,
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
    <div className="bg-background text-on-surface font-sans min-h-screen" data-noise="true">

      {/* ── Sticky header ── */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b-2 border-dashed border-outline-variant">
        <div className="flex items-center px-6 h-14 max-w-7xl mx-auto">
          <Link
            href="/explore?tab=events"
            className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </Link>
          <span className="ml-4 font-display font-black text-lg text-on-surface uppercase tracking-tighter">WIMC</span>
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

      <main className="pt-14 pb-28 lg:pb-10">

        {/* ── Hero: primary-color block with poster title ── */}
        <section className="relative w-full bg-primary overflow-hidden min-h-[280px] md:min-h-[380px] border-b-2 border-dashed border-outline-variant flex items-end">
          {event.cover_image_url && (
            <div className="absolute inset-0 pointer-events-none">
              <Image
                src={event.cover_image_url}
                alt={event.title}
                fill
                className="object-cover opacity-15 mix-blend-multiply"
                priority
              />
            </div>
          )}
          {/* Grain overlay on hero */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.028]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
          />
          {/* Creator handle chip */}
          {creator && (
            <div className="absolute top-5 left-6 font-mono text-[11px] text-on-primary border border-on-primary/50 px-3 py-1 uppercase tracking-[0.15em]">
              @{creator.username}
            </div>
          )}
          {/* Status badge (non-published only) */}
          {event.status !== 'published' && (
            <div className="absolute top-5 right-6 bg-error text-on-error font-mono text-[10px] px-3 py-1 uppercase tracking-[0.15em]">
              {event.status}
            </div>
          )}
          {/* Poster title */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 pb-10 pt-16">
            <h1
              className="font-display font-black text-on-primary uppercase leading-none"
              style={{ fontSize: 'clamp(36px, 7vw, 96px)', letterSpacing: '-0.04em' }}
            >
              {event.title}
            </h1>
          </div>
        </section>

        {/* ── Boarding pass info bar ── */}
        <div className="w-full bg-surface-container border-b-2 border-dashed border-outline-variant">
          <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-wrap gap-6 items-center">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">From</span>
              <span className="font-mono text-[12px] text-on-surface">@{creator?.username ?? 'creator'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">To</span>
              <span className="font-mono text-[12px] text-on-surface">{event.venue_name.split(',')[0]}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Class</span>
              <span className="font-mono text-[12px] text-on-surface uppercase">
                {formatCreatorType(creator?.creator_type ?? '').split(' ')[0]}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Date</span>
              <span className="font-mono text-[12px] text-on-surface" suppressHydrationWarning>
                {new Date(event.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Time</span>
              <span className="font-mono text-[12px] text-on-surface" suppressHydrationWarning>
                {formatTime(event.starts_at)}
              </span>
            </div>
            {rsvpCount > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Going</span>
                <span className="font-mono text-[12px] text-on-surface">{rsvpCount}</span>
              </div>
            )}
            <div className="hidden md:block ml-auto h-10 w-24 barcode-strip text-on-surface opacity-30" />
          </div>
        </div>

        {/* ── Info tile strip ── */}
        <div className="w-full border-b-2 border-dashed border-outline-variant">
          <div
            className="flex gap-3 px-6 md:px-10 py-4 overflow-x-auto snap-x [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Date & Time — always shown */}
            <div className="bg-surface-container-low rounded-xl p-4 min-w-[140px] flex flex-col gap-2 snap-start shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Date &amp; Time</span>
              <span className="font-sans font-semibold text-sm text-on-surface leading-snug" suppressHydrationWarning>
                {formatDate(event.starts_at)}<br />{formatTime(event.starts_at)}
              </span>
            </div>

            {/* Venue — conditional */}
            {event.venue_name && (
              <a
                href={event.google_maps_url ?? `https://maps.google.com/?q=${encodeURIComponent([event.venue_name, event.venue_address].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low rounded-xl p-4 min-w-[140px] flex flex-col gap-2 snap-start shrink-0 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Venue</span>
                <span className="font-sans font-semibold text-sm text-on-surface leading-snug">{event.venue_name}</span>
                {event.venue_address && (
                  <span className="font-mono text-[10px] text-on-surface-variant leading-snug">
                    {event.venue_address.length > 40 ? event.venue_address.slice(0, 40) + '…' : event.venue_address}
                  </span>
                )}
              </a>
            )}

            {/* Spots Left — conditional */}
            {spotsLeft !== null && (
              <div className="bg-surface-container-low rounded-xl p-4 min-w-[140px] flex flex-col gap-2 snap-start shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, fontVariationSettings: "'FILL' 1", color: spotsLeft < 5 ? '#E8572A' : '#009985' }}
                >group</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Spots</span>
                <span
                  className="font-sans font-semibold text-sm leading-snug"
                  style={{ color: spotsLeft < 5 ? '#E8572A' : '#009985' }}
                >
                  {spotsLeft === 0 ? 'Sold out' : `${spotsLeft} left`}
                </span>
              </div>
            )}

            {/* Host — conditional */}
            {creator && (
              <Link
                href={profileUrl(creator.city, creator.username)}
                className="bg-surface-container-low rounded-xl p-4 min-w-[140px] flex flex-col gap-2 snap-start shrink-0 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>person</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Host</span>
                <span className="font-sans font-semibold text-sm text-on-surface leading-snug">{creator.display_name}</span>
                <span className="font-mono text-[10px] text-primary">@{creator.username}</span>
              </Link>
            )}

            {/* WhatsApp Group — conditional */}
            {event.whatsapp_group_url && (
              <a
                href={event.whatsapp_group_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low rounded-xl p-4 min-w-[140px] flex flex-col gap-2 snap-start shrink-0 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1", color: '#25D366' }}>chat</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Community</span>
                <span className="font-sans font-semibold text-sm text-on-surface leading-snug">Join group</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex flex-col lg:flex-row gap-10">

          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-10">

            {/* About */}
            {event.description && (
              <section className="flex flex-col gap-4">
                <h2
                  className="font-display font-black text-on-surface uppercase"
                  style={{ fontSize: 'clamp(24px, 4vw, 40px)', letterSpacing: '-0.03em' }}
                >About</h2>
                <p className={`font-sans text-on-surface-variant leading-relaxed text-base ${descExpanded ? '' : 'line-clamp-4'}`}>
                  {event.description}
                </p>
                {event.description.length > 200 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="text-primary font-mono text-[10px] uppercase tracking-[0.2em] inline-flex items-center gap-1 hover:underline self-start"
                  >
                    {descExpanded ? 'Read less' : 'Read more'}
                    <span className="material-symbols-outlined text-sm">
                      {descExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                )}
              </section>
            )}

            <hr className="border-t-2 border-dashed border-outline-variant" />

            {/* Host */}
            {creator && (
              <section className="flex flex-col gap-6">
                <h3
                  className="font-display font-black text-on-surface uppercase"
                  style={{ fontSize: 'clamp(20px, 3vw, 32px)', letterSpacing: '-0.03em' }}
                >The Host</h3>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover grayscale hover:grayscale-0 transition-all duration-300 border-2 border-primary p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-primary/10 flex items-center justify-center border-2 border-primary shrink-0">
                      <span className="font-display font-black text-3xl text-primary">{creator.display_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h4 className="font-sans font-semibold text-lg text-on-surface leading-tight">{creator.display_name}</h4>
                        <span className="font-mono text-xs text-primary">@{creator.username}</span>
                        {(() => {
                          const meta = creatorTierBadge(creator)
                          if (!meta) return null
                          return (
                            <span
                              className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider"
                              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                              {meta.label}
                            </span>
                          )
                        })()}
                      </div>
                      <button
                        onClick={() => router.push(`/${creator.username}`)}
                        className="bg-surface-container text-on-surface font-sans text-sm px-4 py-2 border border-outline hover:bg-surface-container-highest transition-colors shrink-0"
                      >
                        View profile
                      </button>
                    </div>
                    <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
                      {formatCreatorType(creator.creator_type)}{creator.is_verified ? ' · Verified Creator' : ''}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Venue */}
            <hr className="border-t-2 border-dashed border-outline-variant" />
            <section className="flex flex-col gap-4">
              <h3
                className="font-display font-black text-on-surface uppercase"
                style={{ fontSize: 'clamp(20px, 3vw, 32px)', letterSpacing: '-0.03em' }}
              >Venue</h3>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-2xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <div>
                  <p className="font-sans font-semibold text-on-surface">{event.venue_name}</p>
                  {event.venue_address && (
                    <p className="font-mono text-xs text-on-surface-variant mt-0.5">{event.venue_address}</p>
                  )}
                  {event.google_maps_url && (
                    <a
                      href={event.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary mt-2 inline-block hover:underline"
                    >
                      Open in Maps →
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Reviews */}
            {(event.rating_count > 0 || reviews.length > 0) && (
              <>
                <hr className="border-t-2 border-dashed border-outline-variant" />
                <section className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3
                      className="font-display font-black text-on-surface uppercase"
                      style={{ fontSize: 'clamp(20px, 3vw, 32px)', letterSpacing: '-0.03em' }}
                    >What Attendees Say</h3>
                    {event.rating_count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-black text-lg text-on-surface">{event.average_rating.toFixed(1)}</span>
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1", color: '#F59E0B' }}>star</span>
                        <span className="font-mono text-xs text-on-surface-variant">({event.rating_count})</span>
                      </div>
                    )}
                  </div>
                  {reviews.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {reviews.map((r, i) => (
                        <div
                          key={i}
                          className="bg-[#FAF7F0] text-[#07070A] relative flex flex-col pt-6 px-4 pb-4 border border-outline-variant border-t-0"
                          style={{
                            clipPath: 'polygon(0% 12px, 3% 0, 8% 10px, 14% 2px, 19% 12px, 25% 0, 31% 10px, 38% 2px, 44% 12px, 51% 0, 57% 10px, 63% 2px, 69% 12px, 76% 0, 82% 10px, 88% 2px, 93% 12px, 97% 0, 100% 10px, 100% 100%, 0% 100%)',
                            boxShadow: '4px 4px 0px rgb(var(--color-background))',
                          }}
                        >
                          <span className="material-symbols-outlined text-primary opacity-40 absolute top-3 left-3 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                          <p className="font-sans font-bold text-sm leading-relaxed flex-1 mt-1">
                            &ldquo;{r.review}&rdquo;
                          </p>
                          <div className="mt-3 pt-3 border-t border-dashed border-[#a58b86] flex flex-col gap-0.5">
                            <span className="font-mono text-[11px] text-[#C04A00]">{r.reviewer_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-sans text-sm text-on-surface-variant">Be among the first to review this experience after attending.</p>
                  )}
                </section>
              </>
            )}

          </div>

          {/* ── Right column: sticky ticket card (desktop only) ── */}
          <div className="hidden lg:block w-72 xl:w-80 shrink-0">
            <div className="sticky top-20">
              <div className="bg-[#FAF7F0] text-[#07070A] border-2 border-[#07070A] relative overflow-visible flex flex-col" style={{ boxShadow: '8px 8px 0px rgb(var(--color-background))' }}>

                {/* Ticket header bar */}
                <div className="bg-[#07070A] text-[#FAF7F0] px-4 py-2 flex justify-between items-center">
                  <span className="font-mono text-[11px] uppercase tracking-wider">{ticketNumber(event.id)}</span>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>qr_code_scanner</span>
                </div>

                {/* Ticket body */}
                <div className="p-5 flex flex-col gap-5">

                  {/* Price + spots */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57423e] block">Admission</span>
                      <span
                        className="font-display font-black text-[#07070A] tracking-tight leading-none mt-1 block"
                        style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
                      >
                        {formatPrice(event.ticket_price)}
                      </span>
                    </div>
                    {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 20 && !soldOut && (
                      <div className="bg-[#C8412A] text-white font-mono text-[9px] px-2 py-1 uppercase tracking-wider border border-[#07070A] rotate-2 shrink-0">
                        {spotsLeft} left
                      </div>
                    )}
                    {soldOut && (
                      <div className="bg-[#07070A] text-[#FAF7F0] font-mono text-[9px] px-2 py-1 uppercase tracking-wider shrink-0">
                        SOLD OUT
                      </div>
                    )}
                  </div>

                  {/* Date & time */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57423e]">Date & Time</span>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#07070A] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                      <span className="font-sans font-semibold text-sm text-[#07070A] leading-tight" suppressHydrationWarning>
                        {formatDate(event.starts_at)}, {formatTime(event.starts_at)}
                      </span>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57423e]">Venue</span>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#07070A] text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                      <span className="font-sans font-semibold text-sm text-[#07070A] leading-tight">{event.venue_name}</span>
                    </div>
                  </div>

                  {/* Quantity + CTA */}
                  {isCasual ? (
                    canBook ? (
                      <div className="flex flex-col gap-3">
                        {!isAuthenticated ? (
                          <Link
                            href={`/signin?next=/events/${event.slug}`}
                            className="w-full text-center font-mono text-xs uppercase tracking-wider text-[#07070A] bg-[#F0E8DC] border-2 border-[#07070A] py-3 hover:bg-[#E5DDD0] transition-colors"
                          >
                            Sign in to RSVP
                          </Link>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={casualPending}
                              onClick={() => handleCasualRSVP('going')}
                              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 border-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                                casualIntent === 'going'
                                  ? 'bg-[#006a43] text-white border-[#006a43]'
                                  : 'bg-transparent text-[#07070A] border-[#07070A] hover:bg-[#F0E8DC]'
                              }`}
                            >
                              <span className="text-base">✓</span>
                              Going
                            </button>
                            <button
                              type="button"
                              disabled={casualPending}
                              onClick={() => handleCasualRSVP('maybe')}
                              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 border-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                                casualIntent === 'maybe'
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-transparent text-[#07070A] border-[#07070A] hover:bg-[#F0E8DC]'
                              }`}
                            >
                              <span className="text-base">~</span>
                              Maybe
                            </button>
                            <button
                              type="button"
                              disabled={casualPending}
                              onClick={() => handleCasualRSVP('not_going')}
                              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 border-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                                casualIntent === 'not_going'
                                  ? 'bg-[#57423e] text-white border-[#57423e]'
                                  : 'bg-transparent text-[#07070A] border-[#07070A] hover:bg-[#F0E8DC]'
                              }`}
                            >
                              <span className="text-base">✗</span>
                              Can&apos;t go
                            </button>
                          </div>
                        )}
                        {rsvpCount > 0 && (
                          <p className="text-center font-mono text-[10px] text-[#57423e]">
                            {rsvpCount} going
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full py-3 text-center font-mono text-xs uppercase tracking-wider text-[#07070A] bg-[#F0E8DC] border-2 border-[#07070A]">
                        {soldOut ? 'Sold Out' : isPast ? 'Event Ended' : event.status === 'cancelled' ? 'Cancelled' : ''}
                      </div>
                    )
                  ) : (
                    <>
                      {canBook && !myRSVP && (
                        <>
                          <div className="flex justify-between items-center border-2 border-[#07070A] px-4 py-2.5">
                            <span className="font-mono text-xs text-[#07070A] uppercase tracking-wider">QTY</span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                className="w-7 h-7 flex items-center justify-center border border-[#07070A] hover:bg-[#07070A] hover:text-[#FAF7F0] transition-colors font-mono font-bold text-[#07070A]"
                              >-</button>
                              <span className="font-sans font-semibold text-base text-[#07070A] w-4 text-center">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                className="w-7 h-7 flex items-center justify-center border border-[#07070A] hover:bg-[#07070A] hover:text-[#FAF7F0] transition-colors font-mono font-bold text-[#07070A]"
                              >+</button>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!isAuthenticated) {
                                router.push(`/signin?next=/events/${event.slug}`)
                                return
                              }
                              setSheet('step1')
                            }}
                            className="w-full bg-[#07070A] text-[#FAF7F0] font-sans font-semibold py-3.5 uppercase flex justify-center items-center gap-2 hover:bg-primary transition-colors border-2 border-[#07070A] group text-sm tracking-wider"
                          >
                            {isAuthenticated ? 'Get Tickets' : 'Sign in to Book'}
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
                          </button>
                        </>
                      )}

                      {myRSVP && (
                        <button
                          onClick={() => setSheet('confirmed')}
                          className="w-full bg-[#006a43] text-white font-sans font-semibold py-3.5 flex justify-center items-center gap-2 border-2 border-[#07070A] text-sm tracking-wider uppercase hover:bg-[#00875a] transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                          View My Ticket
                        </button>
                      )}

                      {(!canBook && !myRSVP) && (
                        <div className="w-full py-3 text-center font-mono text-xs uppercase tracking-wider text-[#07070A] bg-[#F0E8DC] border-2 border-[#07070A]">
                          {soldOut ? 'Sold Out' : isPast ? 'Event Ended' : event.status === 'cancelled' ? 'Cancelled' : ''}
                        </div>
                      )}
                    </>
                  )}

                </div>

                {/* Perforation divider */}
                <div className="relative border-t-2 border-dashed border-[#57423e]">
                  <div
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
                    style={{ background: 'rgb(var(--color-background))', border: '2px dashed #57423e' }}
                  />
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
                    style={{ background: 'rgb(var(--color-background))', border: '2px dashed #57423e' }}
                  />
                </div>

                {/* Ticket stub */}
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="font-display font-black text-xs text-[#07070A] uppercase tracking-[0.18em]">ADMIT ONE</span>
                  <div className="h-6 w-20 barcode-strip text-[#07070A] opacity-50" />
                </div>

              </div>

              {/* Share link below the card */}
              <button
                onClick={handleShare}
                className="w-full mt-3 text-on-surface-variant font-mono text-[10px] py-2 flex justify-center items-center gap-2 hover:text-primary transition-colors uppercase tracking-[0.15em]"
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>share</span>
                {copied ? 'Link copied!' : 'Share this event'}
              </button>

            </div>
          </div>

        </div>

      </main>

      {/* ── Mobile sticky CTA (hidden on desktop where the card handles it) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full p-4 flex justify-center z-50">
        <div className="w-full max-w-2xl bg-surface/70 backdrop-blur-md">
          {isCasual ? (
            canBook ? (
              <div className="flex flex-col gap-2">
                {!isAuthenticated ? (
                  <Link
                    href={`/signin?next=/events/${event.slug}`}
                    className="bg-surface-container-high text-on-surface rounded-lg px-8 py-4 w-full flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wider hover:bg-surface-container-highest transition-all active:scale-95"
                  >
                    Sign in to RSVP
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={casualPending}
                      onClick={() => handleCasualRSVP('going')}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-3.5 rounded-lg text-sm font-headline font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        casualIntent === 'going'
                          ? 'bg-[#006a43] text-white shadow-[0_-8px_24px_rgba(0,106,67,0.2)]'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <span>✓</span>
                      Going
                    </button>
                    <button
                      type="button"
                      disabled={casualPending}
                      onClick={() => handleCasualRSVP('maybe')}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-3.5 rounded-lg text-sm font-headline font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        casualIntent === 'maybe'
                          ? 'bg-amber-500 text-white'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <span>~</span>
                      Maybe
                    </button>
                    <button
                      type="button"
                      disabled={casualPending}
                      onClick={() => handleCasualRSVP('not_going')}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-3.5 rounded-lg text-sm font-headline font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        casualIntent === 'not_going'
                          ? 'bg-on-surface-variant text-surface'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <span>✗</span>
                      Can&apos;t go
                    </button>
                  </div>
                )}
                {rsvpCount > 0 && (
                  <p className="text-center text-on-surface-variant text-xs font-mono">{rsvpCount} going</p>
                )}
              </div>
            ) : (
              <div className="w-full py-4 text-center text-on-surface-variant text-sm font-semibold bg-surface-container-low rounded-lg">
                {soldOut ? 'Sold Out' : isPast ? 'Event Ended' : event.status === 'cancelled' ? 'Event Cancelled' : ''}
              </div>
            )
          ) : myRSVP ? (
            <button
              onClick={() => setSheet('confirmed')}
              className="bg-gradient-to-r from-[#006a43] to-[#00875a] text-white rounded-lg px-8 py-4 w-full flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wider shadow-[0_-8px_24px_rgba(0,106,67,0.2)] hover:brightness-110 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
              View My Ticket
            </button>
          ) : canBook ? (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/signin?next=/events/${event.slug}`)
                  return
                }
                setSheet('step1')
              }}
              className="bg-gradient-to-r from-[#AB2E00] to-[#CF4519] text-white rounded-lg px-8 py-4 w-full flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wider shadow-[0_-8px_24px_rgba(171,46,0,0.12)] hover:brightness-110 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              {isAuthenticated ? ctaLabel : 'SIGN IN TO GET TICKETS'}
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
                  {/* Fan Tier Picker */}
                  {hasFanTiers && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 px-1">
                        Choose Your Tier
                      </label>
                      <div className="space-y-2">
                        {fanTiers.map((tier) => {
                          const isSelected = selectedTierId === tier.id
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setSelectedTierId(tier.id)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/8'
                                  : 'border-outline-variant/30 bg-surface-container-low hover:border-outline-variant'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                    isSelected ? 'border-primary' : 'border-outline-variant'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-headline font-bold text-on-surface text-sm">{tier.name}</span>
                                    {tier.description && (
                                      <p className="text-xs text-on-surface-variant mt-0.5">{tier.description}</p>
                                    )}
                                    {tier.benefits?.length > 0 && (
                                      <ul className="mt-1.5 space-y-0.5">
                                        {tier.benefits.map((b, i) => (
                                          <li key={i} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[12px] text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            {b}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                                <span className={`font-headline font-bold text-sm shrink-0 ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                  {tier.price_paise === 0 ? 'Free' : formatPrice(tier.price_paise)}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

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
                  {effectivePrice > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container-low p-4 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ticket Price</span>
                        <span className="font-headline font-bold text-on-surface">
                          {formatPrice(effectivePrice)} <span className="text-xs font-normal">/ person</span>
                        </span>
                      </div>
                      <div className="bg-secondary-fixed/30 p-4 rounded-xl flex flex-col justify-center border border-secondary-fixed/20">
                        <span className="text-[10px] font-bold text-on-secondary-fixed-variant uppercase tracking-wider">Total</span>
                        <span className="font-headline font-bold text-secondary">
                          {quantity} × {formatPrice(effectivePrice)} = {formatPrice(totalPaise)}
                          {gstApplies && <span className="text-[10px] font-normal block text-on-surface-variant">+GST</span>}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Referral code */}
                  {!refApplied ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setRefExpanded((v) => !v)}
                        className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>card_giftcard</span>
                        Have a referral code?
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {refExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      {refExpanded && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={refInput}
                            onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                            placeholder="XXXXXX"
                            maxLength={10}
                            className="flex-1 bg-surface-container-low border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-outline transition-all text-on-surface placeholder:text-outline-variant font-mono text-sm tracking-widest uppercase"
                          />
                          <button
                            type="button"
                            onClick={handleApplyReferral}
                            disabled={refPending || !refInput.trim()}
                            className="px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold disabled:opacity-40 hover:bg-surface-container-highest transition-colors"
                          >
                            {refPending ? '…' : 'Apply'}
                          </button>
                        </div>
                      )}
                      {refError && (
                        <p className="mt-2 text-error text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">error</span>
                          {refError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 bg-[rgba(77,210,177,0.08)] border border-[rgba(77,210,177,0.25)] rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[color:var(--wimc-teal)]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <div>
                          <span className="block text-xs font-bold text-[color:var(--wimc-teal)] uppercase tracking-wider">Free ticket applied</span>
                          <span className="font-mono text-sm text-on-surface tracking-widest">{refApplied}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setRefApplied(null); setRefInput(''); setRefExpanded(false) }}
                        className="text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                      </button>
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
                      : effectivePrice === 0
                        ? 'Confirm RSVP'
                        : `Pay ${formatPrice(totalPaise)}`}
                    {!isPending && <span className="material-symbols-outlined">arrow_forward</span>}
                  </button>

                  <p className="text-center text-xs text-on-surface-variant">
                    By clicking {effectivePrice === 0 ? 'Confirm' : 'Pay'}, you agree to our{' '}
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
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <div className="inline-flex px-3 py-1 bg-secondary-fixed rounded-full text-on-secondary-fixed-variant text-xs font-bold uppercase tracking-wider">
                    Confirmed
                  </div>
                  {confirmed.tierName && (
                    <div className="inline-flex px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold">
                      {confirmed.tierName}
                    </div>
                  )}
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

            {/* Torn edge separator between event card and ticket stub */}
            <div className="relative h-[14px] w-full -mt-2 mb-2 overflow-hidden">
              <TornEdge position="top" color="#0C0A08" height={14} />
            </div>

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
