'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  withdrawProposal,
  acceptCounterOffer,
  declineCounterOffer,
  sendMakerCounterOffer,
  cancelConfirmedBooking,
} from '@/app/actions/venue'
import { getBookingMessages, sendBookingMessage, type BookingMessageDTO } from '@/app/actions/venue-bookings'
import { createClient } from '@/lib/supabase/client'
import { resolveDisplayTerms, type DisplayTerms } from '@/lib/venue/proposalPricing'
import { fromPgTime, formatTimeRange } from '@/lib/venue/timeFormat'
import { ProposalStatusPill, ProposalPriceBreakdown, formatDate } from '@/components/venue/ProposalShared'
import BookingConfirmedCelebration from '@/components/shared/BookingConfirmedCelebration'
import type { VenueProfile, MakerVenueProposal, CounterOfferAuthor, Json } from '@/types/database'
import type { PricingConfig, PricingModel, ProposedSplitConfig } from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProposalWithVenue = MakerVenueProposal & {
  venue: Pick<VenueProfile, 'id' | 'name' | 'slug' | 'city' | 'cover_image_url' | 'pricing_model' | 'pricing_config'> | null
}

interface Props {
  proposals:     ProposalWithVenue[]
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Message thread (venue owner <-> maker, on a sent proposal)
// ---------------------------------------------------------------------------

function formatMessageTimestamp(iso: string): string {
  const d = new Date(iso)
  const diffHours = (Date.now() - d.getTime()) / 3_600_000
  if (diffHours < 1) {
    const mins = Math.floor((Date.now() - d.getTime()) / 60_000)
    return mins <= 1 ? 'just now' : `${mins}m ago`
  }
  if (diffHours < 24) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function ProposalMessageThread({ proposalId, currentUserId }: { proposalId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<BookingMessageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBookingMessages(proposalId).then(({ messages: msgs }) => {
      if (!cancelled) { setMessages(msgs); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [proposalId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`booking-messages-${proposalId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages', filter: `proposal_id=eq.${proposalId}` },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; body: string; sent_at: string; read_at: string | null }
          if (row.sender_id === currentUserId) return
          setMessages((prev) => (
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, { id: row.id, senderId: row.sender_id, body: row.body, sentAt: row.sent_at, readAt: row.read_at }]
          ))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [proposalId, currentUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [])

  async function handleSend() {
    const text = draft.trim()
    if (!text || isSending) return
    setIsSending(true)
    setError(null)
    const { error: sendError } = await sendBookingMessage(proposalId, text)
    if (sendError) { setError(sendError); setIsSending(false); return }
    setMessages((prev) => [...prev, {
      id: `local-${Date.now()}`,
      senderId: currentUserId,
      body: text,
      sentAt: new Date().toISOString(),
      readAt: null,
    }])
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = draft.trim().length > 0 && !isSending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--wimc-border-subtle)', marginTop: 8, paddingTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 10 }}>
        Messages
      </div>

      <div style={{ marginBottom: 4 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--wimc-text-secondary)' }}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--wimc-text-secondary)' }}>No messages yet. Say hello!</div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  borderRadius: isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  background: isMine ? 'var(--wimc-coral)' : 'var(--wimc-bg-overlay)',
                  color: isMine ? '#fff' : 'var(--wimc-text-primary)',
                  border: isMine ? 'none' : '1px solid var(--wimc-border-subtle)',
                  fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.body}
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 4 }}>
                  {formatMessageTimestamp(m.sentAt)}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--wimc-coral)', padding: '8px 12px', background: 'rgba(232,112,90,0.08)', borderRadius: 6, marginBottom: 8 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: '10px 12px', background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', borderRadius: 10 }}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send)"
          rows={1}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 13.5, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)', lineHeight: 1.6, padding: 0 }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: canSend ? 'var(--wimc-coral)' : 'var(--wimc-bg-elevated)',
            color: canSend ? '#fff' : 'var(--wimc-text-secondary)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)', flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic destructive-confirm modal — backs both "withdraw" and "cancel"
// ---------------------------------------------------------------------------

function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  confirmingLabel,
  onCancel,
  onConfirm,
  isSubmitting,
  error,
  children,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmingLabel: string
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
  error: string | null
  children?: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <>
      <div onClick={onCancel} className="fixed inset-0 md:left-[var(--wimc-sidebar-w)]" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 201, width: 'min(420px, calc(100vw - 32px))',
          background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
          borderRadius: 0, padding: 24,
        }}
      >
        <div id="confirm-action-title" style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, marginBottom: children ? 14 : 20 }}>
          {description}
        </div>
        {children}
        {error && (
          <div style={{ fontSize: 13, color: 'var(--wimc-coral)', marginTop: 12, marginBottom: 4 }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--wimc-border-default)',
              background: 'none', color: 'var(--wimc-text-primary)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
            }}
          >
            Never mind
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--wimc-coral)', color: '#fff',
              cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
            }}
          >
            {isSubmitting ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Maker counter-offer modal — lets the maker propose different price terms
// back to the venue instead of only accept/decline/withdraw on the venue's
// counter. Date/slot are intentionally fixed here (see sendMakerCounterOffer
// in venue.ts for why) — only the price terms and a message are editable.
// ---------------------------------------------------------------------------

function MakerCounterOfferModal({
  proposal,
  pricingModel,
  onClose,
  onSubmit,
  serverError,
}: {
  proposal: ProposalWithVenue
  pricingModel: PricingModel
  onClose: () => void
  onSubmit: (counterOffer: ProposedSplitConfig, note: string) => void
  serverError: string | null
}) {
  const currentTerms = resolveDisplayTerms(
    proposal.counter_offer,
    pricingModel,
    (proposal.venue?.pricing_config as PricingConfig | null) ?? null,
    proposal.proposed_date,
    fromPgTime(proposal.start_time),
    fromPgTime(proposal.end_time),
  )

  const [rentalFee, setRentalFee] = useState(currentTerms?.rentalFeePaise ? String(Math.round(currentTerms.rentalFeePaise / 100)) : '')
  const [splitPercentage, setSplitPercentage] = useState(currentTerms?.splitPercentage != null ? String(currentTerms.splitPercentage) : '')
  const [minimumSpend, setMinimumSpend] = useState(currentTerms?.minimumSpendPaise != null ? String(Math.round(currentTerms.minimumSpendPaise / 100)) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const previewTerms: DisplayTerms | null = (() => {
    if (pricingModel === 'fixed_rental') {
      const paise = Math.round(parseFloat(rentalFee || '0') * 100)
      return paise > 0 ? { source: 'counter', pricingModel, rentalFeePaise: paise, splitPercentage: null, minimumSpendPaise: null } : null
    }
    if (pricingModel === 'door_split') {
      const pct = parseFloat(splitPercentage || '0')
      return pct > 0 ? { source: 'counter', pricingModel, rentalFeePaise: null, splitPercentage: pct, minimumSpendPaise: null } : null
    }
    if (pricingModel === 'f_and_b_minimum') {
      const paise = Math.round(parseFloat(minimumSpend || '0') * 100)
      return paise > 0 ? { source: 'counter', pricingModel, rentalFeePaise: null, splitPercentage: null, minimumSpendPaise: paise } : null
    }
    const rentalPaise = Math.round(parseFloat(rentalFee || '0') * 100)
    const pct = parseFloat(splitPercentage || '0')
    return (rentalPaise > 0 || pct > 0)
      ? { source: 'counter', pricingModel, rentalFeePaise: rentalPaise || null, splitPercentage: pct || null, minimumSpendPaise: null }
      : null
  })()

  function handleSubmit() {
    setError(null)
    if (!note.trim()) { setError('Please add a message explaining your counter-offer.'); return }

    const base = {
      date: proposal.proposed_date,
      startTime: fromPgTime(proposal.start_time),
      endTime: fromPgTime(proposal.end_time),
    }
    let counterOffer: ProposedSplitConfig

    if (pricingModel === 'fixed_rental') {
      const paise = Math.round(parseFloat(rentalFee || '0') * 100)
      if (paise <= 0) { setError('Please enter a rental fee.'); return }
      counterOffer = { ...base, pricingModel: 'fixed_rental', rentalFeePaise: paise }
    } else if (pricingModel === 'door_split') {
      const pct = parseFloat(splitPercentage || '0')
      if (pct <= 0) { setError('Please enter a revenue share percentage.'); return }
      counterOffer = { ...base, pricingModel: 'door_split', splitPercentage: pct }
    } else if (pricingModel === 'f_and_b_minimum') {
      const paise = Math.round(parseFloat(minimumSpend || '0') * 100)
      if (paise <= 0) { setError('Please enter a minimum F&B spend.'); return }
      counterOffer = { ...base, pricingModel: 'f_and_b_minimum', minimumSpendPaise: paise }
    } else {
      const rentalPaise = Math.round(parseFloat(rentalFee || '0') * 100)
      const pct = parseFloat(splitPercentage || '0')
      if (rentalPaise <= 0 || pct <= 0) { setError('Please enter both a booking fee and a revenue share.'); return }
      counterOffer = { ...base, pricingModel: 'hybrid', rentalFeePaise: rentalPaise, splitPercentage: pct }
    }

    onSubmit(counterOffer, note.trim())
  }

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 md:left-[var(--wimc-sidebar-w)]" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 440, maxHeight: '90vh', overflow: 'auto',
        background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
        borderRadius: 0, zIndex: 201, padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18 }}>Send a Counter-offer</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-secondary)', display: 'grid', placeItems: 'center' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(pricingModel === 'fixed_rental' || pricingModel === 'hybrid') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {pricingModel === 'hybrid' ? 'Booking fee (₹)' : 'Rental fee (₹)'}
              </label>
              <input type="number" value={rentalFee} onChange={(e) => setRentalFee(e.target.value)} placeholder="e.g. 7500" min={0}
                style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }} />
            </div>
          )}

          {(pricingModel === 'door_split' || pricingModel === 'hybrid') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Revenue share (%)</label>
              <input type="number" value={splitPercentage} onChange={(e) => setSplitPercentage(e.target.value)} placeholder="e.g. 15" min={0} max={100}
                style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }} />
            </div>
          )}

          {pricingModel === 'f_and_b_minimum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Minimum F&amp;B spend (₹)</label>
              <input type="number" value={minimumSpend} onChange={(e) => setMinimumSpend(e.target.value)} placeholder="e.g. 5000" min={0}
                style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }} />
            </div>
          )}

          {previewTerms && <ProposalPriceBreakdown terms={previewTerms} counterOfferBy="maker" />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Message to venue</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain why you're proposing these terms…" maxLength={1000} rows={4}
              style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-dm-sans)' }} />
          </div>

          {(error || serverError) && (
            <div style={{ fontSize: 12, color: 'var(--wimc-coral)', padding: '8px 12px', background: 'rgba(232,112,90,0.08)', borderRadius: 6 }}>{error || serverError}</div>
          )}

          <button
            onClick={handleSubmit}
            style={{ width: '100%', padding: '14px', background: 'var(--wimc-coral)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Send Counter-offer
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Proposal detail drawer (maker's own booking, incl. message thread)
// ---------------------------------------------------------------------------

function ProposalDetailDrawer({
  proposal,
  currentUserId,
  onClose,
  onWithdrawn,
  onCancelled,
  onUpdated,
}: {
  proposal: ProposalWithVenue
  currentUserId: string
  onClose: () => void
  onWithdrawn: (proposalId: string) => void
  onCancelled: (proposalId: string, reason: string | null) => void
  onUpdated: (proposalId: string, patch: Partial<ProposalWithVenue>) => void
}) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const canWithdraw = proposal.status === 'pending' || proposal.status === 'counter_offered'
  const canCancel = proposal.status === 'accepted'

  // A 'counter_offered' status can hold either side's counter — whoever
  // didn't author the current one is the one who needs to respond.
  const isMakerTurn = proposal.status === 'counter_offered' && proposal.counter_offer_by === 'venue'
  const isVenueTurn = proposal.status === 'counter_offered' && proposal.counter_offer_by === 'maker'

  const listedTerms = proposal.venue
    ? resolveDisplayTerms(
        null,
        proposal.venue.pricing_model,
        (proposal.venue.pricing_config as PricingConfig | null) ?? null,
        proposal.proposed_date,
        fromPgTime(proposal.start_time),
        fromPgTime(proposal.end_time),
      )
    : null
  const currentTerms = proposal.venue
    ? resolveDisplayTerms(
        proposal.counter_offer,
        proposal.venue.pricing_model,
        (proposal.venue.pricing_config as PricingConfig | null) ?? null,
        proposal.proposed_date,
        fromPgTime(proposal.start_time),
        fromPgTime(proposal.end_time),
      )
    : null
  const hasCounter = currentTerms?.source === 'counter'

  async function handleWithdraw() {
    setIsWithdrawing(true)
    setWithdrawError(null)
    const { error } = await withdrawProposal(proposal.id)
    if (error) {
      setWithdrawError(error)
      setIsWithdrawing(false)
      return
    }
    onWithdrawn(proposal.id)
    onClose()
  }

  async function handleCancel() {
    setIsCancelling(true)
    setCancelError(null)
    const { error } = await cancelConfirmedBooking(proposal.id, cancelReason.trim() || undefined)
    if (error) {
      setCancelError(error)
      setIsCancelling(false)
      return
    }
    onCancelled(proposal.id, cancelReason.trim() || null)
    onClose()
  }

  async function handleAccept() {
    setIsResponding(true)
    setResponseError(null)
    const { error } = await acceptCounterOffer(proposal.id)
    if (error) {
      setResponseError(error)
      setIsResponding(false)
      return
    }
    setShowCelebration(true)
  }

  async function handleDecline() {
    setIsResponding(true)
    setResponseError(null)
    const { error } = await declineCounterOffer(proposal.id)
    if (error) {
      setResponseError(error)
      setIsResponding(false)
      return
    }
    onUpdated(proposal.id, { status: 'declined' })
    onClose()
  }

  async function handleCounterSubmit(counterOffer: ProposedSplitConfig, note: string) {
    setResponseError(null)
    setIsResponding(true)
    const { error } = await sendMakerCounterOffer(proposal.id, counterOffer, note)
    if (error) {
      setResponseError(error)
      setIsResponding(false)
      return
    }
    onUpdated(proposal.id, {
      counter_offer:         counterOffer as unknown as Json,
      counter_offer_by:      'maker',
      maker_counter_message: note,
    })
    setIsResponding(false)
    setShowCounterModal(false)
  }

  // Portaled to document.body — an ancestor's entrance-animation transform
  // (.dash-content, globals.css) establishes a new containing block for
  // position:fixed descendants otherwise, turning this into scroll-along-
  // with-the-page behavior instead of a real fixed overlay.
  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 md:left-[var(--wimc-sidebar-w)]" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 480,
        background: 'var(--wimc-bg-elevated)', borderLeft: '1px solid var(--wimc-border-default)',
        zIndex: 101, overflow: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {showCelebration && (
          <BookingConfirmedCelebration
            theme="light"
            eventTitle={proposal.event_title}
            subtitle={`${proposal.venue?.name ?? 'The venue'} · ${formatDate(proposal.proposed_date)}`}
            onDone={() => { onUpdated(proposal.id, { status: 'accepted' }); onClose() }}
          />
        )}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18 }}>{proposal.event_title}</div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>
                {proposal.venue?.name ?? 'Venue'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-secondary)', display: 'grid', placeItems: 'center' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div><ProposalStatusPill status={proposal.status} /></div>

          {isMakerTurn && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(232,112,90,0.08)', border: '1px solid rgba(232,112,90,0.25)',
              borderRadius: 8, padding: '12px 14px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--wimc-coral)', flexShrink: 0 }}>mark_email_unread</span>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong>{proposal.venue?.name ?? 'The venue'} sent you a counter-offer.</strong>
                <div style={{ color: 'var(--wimc-text-secondary)', marginTop: 2 }}>
                  Review the terms below, then accept, counter back, or decline.
                </div>
              </div>
            </div>
          )}

          {proposal.status === 'cancelled' && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(232,52,42,0.08)', border: '1px solid rgba(232,52,42,0.25)',
              borderRadius: 8, padding: '12px 14px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#E8342A', flexShrink: 0 }}>event_busy</span>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong>You cancelled this booking{proposal.cancelled_at ? ` on ${formatDate(proposal.cancelled_at)}` : ''}.</strong>
                {proposal.cancellation_reason && (
                  <div style={{ color: 'var(--wimc-text-secondary)', marginTop: 2 }}>Reason: {proposal.cancellation_reason}</div>
                )}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--wimc-bg-overlay)', borderRadius: 0, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Date</div>
              <div style={{ fontSize: 13 }}>{formatDate(proposal.proposed_date)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Time</div>
              <div style={{ fontSize: 13 }}>{formatTimeRange(proposal.start_time, proposal.end_time)}</div>
            </div>
            {proposal.expected_attendees != null && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Expected</div>
                <div style={{ fontSize: 13 }}>{proposal.expected_attendees} pax</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Sent</div>
              <div style={{ fontSize: 13 }}>{formatDate(proposal.created_at)}</div>
            </div>
          </div>

          {/* Originally listed rate — always shown as the baseline to compare a counter against */}
          {listedTerms && <ProposalPriceBreakdown terms={listedTerms} />}

          {/* Current counter, if one is on the table, on top of the baseline above */}
          {hasCounter && currentTerms && <ProposalPriceBreakdown terms={currentTerms} counterOfferBy={proposal.counter_offer_by} />}

          {proposal.message && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Your message</div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, borderLeft: '2px solid var(--wimc-coral)', paddingLeft: 12 }}>{proposal.message}</div>
            </div>
          )}

          {proposal.venue_response_note && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Venue's note</div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, borderLeft: '2px solid var(--wimc-teal)', paddingLeft: 12 }}>{proposal.venue_response_note}</div>
            </div>
          )}

          {proposal.counter_offer_by === 'maker' && proposal.maker_counter_message && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Your counter-offer message</div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, borderLeft: '2px solid var(--wimc-coral)', paddingLeft: 12 }}>{proposal.maker_counter_message}</div>
            </div>
          )}

          <ProposalMessageThread proposalId={proposal.id} currentUserId={currentUserId} />

          {responseError && (
            <div style={{ fontSize: 12, color: 'var(--wimc-coral)', padding: '8px 12px', background: 'rgba(232,112,90,0.08)', borderRadius: 6 }}>{responseError}</div>
          )}

          {/* Venue's counter is pending — the maker can accept, counter back, or decline */}
          {isMakerTurn && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--wimc-border-subtle)', paddingTop: 16 }}>
              <button
                onClick={handleAccept}
                disabled={isResponding}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
                  background: 'var(--wimc-teal)', color: '#062017',
                  cursor: isResponding ? 'default' : 'pointer', fontWeight: 700, fontSize: 14,
                  fontFamily: 'var(--font-syne)', opacity: isResponding ? 0.6 : 1,
                }}
              >
                Accept Counter Offer
              </button>
              <button
                onClick={() => setShowCounterModal(true)}
                disabled={isResponding}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 8,
                  border: '1px solid var(--wimc-border-default)', background: 'none', color: 'var(--wimc-text-primary)',
                  cursor: isResponding ? 'default' : 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
                  opacity: isResponding ? 0.6 : 1,
                }}
              >
                Send Counter-offer
              </button>
              <button
                onClick={handleDecline}
                disabled={isResponding}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  border: '1px solid var(--wimc-coral)', background: 'none', color: 'var(--wimc-coral)',
                  cursor: isResponding ? 'default' : 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
                  opacity: isResponding ? 0.6 : 1,
                }}
              >
                Decline Counter Offer
              </button>
            </div>
          )}

          {/* The maker's own counter is pending — waiting on the venue */}
          {isVenueTurn && (
            <div style={{ padding: '12px 14px', background: 'var(--wimc-bg-overlay)', borderRadius: 8, fontSize: 12.5, color: 'var(--wimc-text-secondary)' }}>
              Waiting for the venue to respond to your counter-offer.
            </div>
          )}

          {canWithdraw && (
            <div style={{ borderTop: isMakerTurn ? 'none' : '1px solid var(--wimc-border-subtle)', paddingTop: isMakerTurn ? 0 : 16 }}>
              <button
                onClick={() => setShowWithdrawModal(true)}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  border: isMakerTurn ? 'none' : '1px solid var(--wimc-coral)', background: 'none',
                  color: isMakerTurn ? 'var(--wimc-text-secondary)' : 'var(--wimc-coral)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
                  textDecoration: isMakerTurn ? 'underline' : 'none',
                }}
              >
                Withdraw request
              </button>
            </div>
          )}

          {/* Confirmed booking — the maker can still back out for unforeseen
              circumstances. Kept visually distinct (destructive) from
              withdrawing a not-yet-accepted proposal. */}
          {canCancel && (
            <div style={{ borderTop: '1px solid var(--wimc-border-subtle)', paddingTop: 16 }}>
              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  border: '1px solid #E8342A', background: 'none', color: '#E8342A',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
                }}
              >
                Cancel this booking
              </button>
              <div style={{ fontSize: 11.5, color: 'var(--wimc-text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                For unforeseen circumstances only — this frees the date for the venue and notifies them. It won&apos;t cancel a public event listing tied to this booking; do that separately from its event page.
              </div>
            </div>
          )}
        </div>
      </div>

      {showWithdrawModal && (
        <ConfirmActionModal
          title="Withdraw this request?"
          description="The venue won't be able to respond after this. You can send a new proposal later if you change your mind."
          confirmLabel="Withdraw request"
          confirmingLabel="Withdrawing…"
          onCancel={() => { setShowWithdrawModal(false); setWithdrawError(null) }}
          onConfirm={handleWithdraw}
          isSubmitting={isWithdrawing}
          error={withdrawError}
        />
      )}

      {showCancelModal && (
        <ConfirmActionModal
          title="Cancel this confirmed booking?"
          description="The venue will be notified immediately and the date freed up for other bookings. If this booking has a linked event with ticket sales, cancel that separately from its event page."
          confirmLabel="Cancel booking"
          confirmingLabel="Cancelling…"
          onCancel={() => { setShowCancelModal(false); setCancelError(null) }}
          onConfirm={handleCancel}
          isSubmitting={isCancelling}
          error={cancelError}
        >
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
            Reason (shown to the venue, optional)
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Had to postpone due to a scheduling conflict…"
            maxLength={500}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-dm-sans)', boxSizing: 'border-box' }}
          />
        </ConfirmActionModal>
      )}

      {showCounterModal && proposal.venue && (
        <MakerCounterOfferModal
          proposal={proposal}
          pricingModel={proposal.venue.pricing_model}
          onClose={() => { setShowCounterModal(false); setResponseError(null) }}
          onSubmit={handleCounterSubmit}
          serverError={responseError}
        />
      )}
    </>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

type BookingsFilter = 'all' | 'in_progress' | 'confirmed' | 'closed'

const CLOSED_STATUSES = new Set(['declined', 'withdrawn', 'expired', 'cancelled'])

export default function VenueBookingsPanel({ proposals: initialProposals, currentUserId }: Props) {
  const [proposals, setProposals] = useState(initialProposals)
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const [filter, setFilter] = useState<BookingsFilter>('all')
  // Derived (not stored) so the drawer reflects live updates to `proposals`
  // — e.g. after the maker sends a counter-offer, the drawer stays open and
  // shows it immediately instead of holding a stale snapshot.
  const selectedProposal = proposals.find((p) => p.id === selectedProposalId) ?? null

  const needsResponseCount = proposals.filter((p) => p.status === 'counter_offered' && p.counter_offer_by === 'venue').length

  const filterMatch = (p: ProposalWithVenue): boolean => {
    if (filter === 'all') return true
    if (filter === 'in_progress') return p.status === 'pending' || p.status === 'counter_offered'
    if (filter === 'confirmed') return p.status === 'accepted'
    return CLOSED_STATUSES.has(p.status)
  }
  const filtered = proposals.filter(filterMatch)

  function handleProposalWithdrawn(proposalId: string) {
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: 'withdrawn' } : p)))
  }

  function handleProposalCancelled(proposalId: string, reason: string | null) {
    setProposals((prev) => prev.map((p) => (
      p.id === proposalId
        ? { ...p, status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: reason, cancelled_by: 'maker' }
        : p
    )))
  }

  function handleProposalUpdated(proposalId: string, patch: Partial<ProposalWithVenue>) {
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, ...patch } : p)))
  }

  const FILTERS: { key: BookingsFilter; label: string; count?: number }[] = [
    { key: 'all',         label: 'All',         count: proposals.length },
    { key: 'in_progress', label: 'In Progress', count: needsResponseCount > 0 ? needsResponseCount : undefined },
    { key: 'confirmed',   label: 'Confirmed' },
    { key: 'closed',      label: 'Closed' },
  ]

  if (proposals.length === 0) {
    return (
      <div
        style={{
          border: '2px dashed var(--wimc-border-default)', borderRadius: 0,
          padding: 40, textAlign: 'center',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 0, background: 'var(--wimc-bg-elevated)',
          display: 'grid', placeItems: 'center', margin: '0 auto 14px',
          border: '1px solid var(--wimc-border-default)',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--wimc-coral)' }}>apartment</span>
        </div>
        <div style={{ fontFamily: 'var(--font-abril)', fontSize: 20, marginBottom: 6 }}>
          No venue bookings yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 18 }}>
          Find a venue and send a booking proposal — it&apos;ll show up here to track.
        </div>
        <Link
          href="/dashboard/venues"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--wimc-coral)', color: '#fff', borderRadius: 6, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
          Find a Venue
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--wimc-border-subtle)' }}>
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '10px 18px', fontSize: 13.5, fontWeight: 600,
              color: filter === key ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
              borderBottom: filter === key ? '2px solid var(--wimc-coral)' : '2px solid transparent',
              marginBottom: -1, background: 'transparent', border: 'none', borderBottomStyle: 'solid',
              cursor: 'pointer', transition: 'color 220ms ease', fontFamily: 'var(--font-dm-sans)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {label}
            {count != null && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                background: key === 'in_progress' ? 'var(--wimc-coral)' : 'var(--wimc-bg-elevated)',
                color: key === 'in_progress' ? '#fff' : 'inherit',
                padding: '1px 7px', borderRadius: 9999,
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13, padding: '32px 0' }}>
          Nothing in this filter yet.
        </div>
      ) : (
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                  {['Venue', 'Event', 'Date', 'Slot', 'Status', 'Sent'].map((h) => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600, color: 'var(--wimc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProposalId(p.id)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '12px 20px', fontWeight: 600 }}>{p.venue?.name ?? '—'}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--wimc-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.event_title}</td>
                    <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(p.proposed_date)}</td>
                    <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}>{formatTimeRange(p.start_time, p.end_time)}</td>
                    <td style={{ padding: '12px 20px' }}><ProposalStatusPill status={p.status} /></td>
                    <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-secondary)' }}>{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedProposal && (
        <ProposalDetailDrawer
          proposal={selectedProposal}
          currentUserId={currentUserId}
          onClose={() => setSelectedProposalId(null)}
          onWithdrawn={handleProposalWithdrawn}
          onCancelled={handleProposalCancelled}
          onUpdated={handleProposalUpdated}
        />
      )}
    </div>
  )
}
