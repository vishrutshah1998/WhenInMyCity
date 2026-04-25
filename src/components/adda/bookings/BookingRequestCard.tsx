'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { respondToProposal } from '@/app/actions/adda-bookings'
import type { ProposalWithMaker } from '@/app/actions/adda-bookings'
import CounterOfferModal from './CounterOfferModal'
import type { CounterOfferSubmitPayload } from './CounterOfferModal'
import DeclineModal from './DeclineModal'
import MessageThread from './MessageThread'

// ---------------------------------------------------------------------------
// Price breakdown helpers
// ---------------------------------------------------------------------------

const WIMC_FEE_RATE = 0.15

// TODO: replace with real pricing from proposed_split_config when schema is standardised.
// Currently the split_config field is free-form JSONB and doesn't carry hourly rate /
// duration at a stable path — so we derive a mock breakdown from expected_revenue_paise.
function getMockBreakdown(proposal: ProposalWithMaker): {
  hourlyRatePaise: number
  durationHours: number
  subtotalPaise: number
  serviceFeePaise: number
  guestPaysPaise: number
  yourPayoutPaise: number
} {
  const payoutPaise = proposal.expected_revenue_paise ?? 450_000 // ₹4,500 fallback
  const durationHours = 3 // TODO: read from proposed_split_config.duration_hours when available
  const hourlyRatePaise = Math.round(payoutPaise / durationHours)
  const serviceFeePaise = Math.round(payoutPaise * WIMC_FEE_RATE)
  return {
    hourlyRatePaise,
    durationHours,
    subtotalPaise:  payoutPaise,
    serviceFeePaise,
    guestPaysPaise:  payoutPaise + serviceFeePaise,
    yourPayoutPaise: payoutPaise,
  }
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

function formatSlot(slot: string): string {
  return slot.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })
}

function msUntilExpiry(expiresAt: string): number {
  return new Date(expiresAt).getTime() - Date.now()
}

function formatCountdownChip(ms: number): string {
  if (ms <= 0) return 'Expired'
  const totalMins = Math.floor(ms / 60_000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `Respond within ${h}h ${m}m ⏱` : `Respond within ${m}m ⏱`
}

function countdownChipStyle(ms: number): { bg: string; color: string } {
  if (ms <= 0) return { bg: 'rgba(82,82,91,0.2)', color: 'var(--adda-text-muted)' }
  if (ms < 6 * 3_600_000) return { bg: 'rgba(239,68,68,0.12)', color: 'var(--adda-danger)' }
  return { bg: 'var(--adda-amber-tint)', color: 'var(--adda-amber)' }
}

function creatorTypeLabel(type: string): string {
  return ({
    music_performance:  'Music',
    comedy_open_mic:    'Comedy',
    art_design:         'Art & Design',
    workshops_teaching: 'Workshop',
    food_lifestyle:     'Food & Lifestyle',
    content_creation:   'Content Creator',
  } as Record<string, string>)[type] ?? type
}

function tierLabel(tier: string): string {
  return ({ mohalla: 'Mohalla', nukkad: 'Nukkad', chowk: 'Chowk', maidan: 'Maidan' } as Record<string, string>)[tier] ?? tier
}

// ---------------------------------------------------------------------------
// Status pill map
// ---------------------------------------------------------------------------

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  pending:         { label: 'Pending Approval', bg: 'var(--adda-amber-tint)',    color: 'var(--adda-amber)'   },
  counter_offered: { label: 'Counter Offered',  bg: 'var(--adda-amber-tint)',    color: 'var(--adda-amber)'   },
  accepted:        { label: 'Confirmed',         bg: 'rgba(16,185,129,0.12)',     color: 'var(--adda-success)' },
  declined:        { label: 'Declined',          bg: 'rgba(239,68,68,0.10)',      color: 'var(--adda-danger)'  },
  expired:         { label: 'Expired',           bg: 'rgba(82,82,91,0.2)',        color: 'var(--adda-text-muted)' },
  withdrawn:       { label: 'Withdrawn',         bg: 'rgba(82,82,91,0.2)',        color: 'var(--adda-text-muted)' },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: 52,
      padding: '0 4px',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.8px',
        textTransform: 'uppercase' as const,
        color: 'var(--adda-text-muted)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14,
        color: 'var(--adda-text-primary)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  muted,
  amber,
  indent,
  tooltip,
}: {
  label: string
  value: string
  muted?: boolean
  amber?: boolean
  indent?: boolean
  tooltip?: string
}) {
  const [tipVisible, setTipVisible] = useState(false)
  const tipRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      paddingLeft: indent ? 14 : 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          fontSize: 13.5,
          color: muted ? 'var(--adda-text-muted)' : 'var(--adda-text-secondary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {label}
        </span>
        {tooltip && (
          <div style={{ position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              onMouseEnter={() => setTipVisible(true)}
              onMouseLeave={() => setTipVisible(false)}
              style={{
                fontSize: 14,
                color: 'var(--adda-text-muted)',
                cursor: 'help',
                lineHeight: 1,
                display: 'block',
              }}
            >
              info
            </span>
            {tipVisible && (
              <div
                ref={tipRef}
                style={{
                  position: 'absolute',
                  bottom: '120%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 220,
                  padding: '8px 10px',
                  background: 'var(--adda-bg-overlay)',
                  border: '1px solid var(--adda-border-default)',
                  borderRadius: 7,
                  fontSize: 12,
                  color: 'var(--adda-text-secondary)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  lineHeight: 1.5,
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'normal',
                }}
              >
                {tooltip}
                {/* Arrow */}
                <span style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid var(--adda-border-default)',
                }} />
              </div>
            )}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 13.5,
        fontWeight: 500,
        color: amber ? 'var(--adda-amber)' : muted ? 'var(--adda-text-muted)' : 'var(--adda-text-primary)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
      }}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  proposal: ProposalWithMaker
  addaId: string
  onRespond: (proposalId: string, action: 'accept' | 'decline') => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingRequestCard({ proposal, addaId: _addaId, onRespond }: Props) {
  const { maker } = proposal
  const [messageExpanded, setMessageExpanded] = useState(false)
  const [breakdownExpanded, setBreakdownExpanded] = useState(true)
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [confirmState, setConfirmState] = useState<'idle' | 'confirming' | 'done'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canRespond = proposal.status === 'pending' || proposal.status === 'counter_offered'
  const expiryMs = canRespond ? msUntilExpiry(proposal.expires_at) : null
  const isExpired = expiryMs !== null && expiryMs <= 0
  const chipStyle = expiryMs !== null ? countdownChipStyle(expiryMs) : null
  const pill = STATUS_PILL[proposal.status]

  // TODO: replace with real pricing from proposed_split_config
  const breakdown = getMockBreakdown(proposal)

  // ── Accept ────────────────────────────────────────────────────────────────

  function handleAccept() {
    if (confirmState !== 'idle') return
    setActionError(null)
    setConfirmState('confirming')
    startTransition(async () => {
      const { error } = await respondToProposal(proposal.id, 'accept')
      if (error) {
        setActionError(error)
        setConfirmState('idle')
        return
      }
      setConfirmState('done')
      setTimeout(() => onRespond(proposal.id, 'accept'), 2000)
    })
  }

  // ── Counter offer ─────────────────────────────────────────────────────────

  function handleCounterSubmit(payload: CounterOfferSubmitPayload) {
    // TODO: send counter offer to Supabase via a server action (adda-bookings.ts)
    // For now we log the payload and close the modal
    console.info('[mock] Counter offer payload:', payload)
    setShowCounterModal(false)
  }

  // Prevent body scroll while a modal is open
  useEffect(() => {
    if (showCounterModal || showDeclineModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showCounterModal, showDeclineModal])

  return (
    <>
      <div style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '32px 28px 64px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          {/* 48px avatar */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--adda-bg-overlay)',
            border: '2px solid var(--adda-border-default)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--adda-text-secondary)',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {maker.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={maker.avatar_url} alt={maker.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(maker.display_name)
            )}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--adda-text-primary)', lineHeight: 1.3 }}>
              {maker.display_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--adda-text-muted)', marginTop: 3 }}>
              {maker.cumulative_events_hosted > 0
                ? `${maker.cumulative_events_hosted} booking${maker.cumulative_events_hosted !== 1 ? 's' : ''} on WIMC`
                : 'New to WIMC'}
            </div>
            {/* Verification chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 8 }}>
              {maker.is_verified && (
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(16,185,129,0.12)', color: 'var(--adda-success)' }}>
                  ID Verified
                </span>
              )}
              {maker.is_founding_maker && (
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--adda-amber-tint)', color: 'var(--adda-amber)' }}>
                  Superguest
                </span>
              )}
              {!maker.is_verified && maker.cumulative_events_hosted === 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, border: '1px solid var(--adda-border-default)', color: 'var(--adda-text-muted)' }}>
                  New to WIMC
                </span>
              )}
              <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, border: '1px solid var(--adda-border-default)', color: 'var(--adda-text-muted)' }}>
                {tierLabel(maker.maker_tier)} tier
              </span>
            </div>
          </div>

          {/* Expiry chip */}
          {expiryMs !== null && chipStyle && (
            <div style={{
              flexShrink: 0,
              padding: '5px 12px',
              borderRadius: 9999,
              background: chipStyle.bg,
              color: chipStyle.color,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              whiteSpace: 'nowrap',
            }}>
              {formatCountdownChip(expiryMs)}
            </div>
          )}
        </div>

        {/* ── Status strip ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: '1px solid var(--adda-border-subtle)',
        }}>
          {pill && (
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, background: pill.bg, color: pill.color }}>
              {pill.label}
            </span>
          )}
          <span style={{ fontSize: 11.5, fontWeight: 500, padding: '4px 12px', borderRadius: 9999, border: '1px solid var(--adda-border-default)', color: 'var(--adda-text-secondary)' }}>
            {creatorTypeLabel(maker.creator_type)}
          </span>
          <a
            href={`/${maker.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--adda-amber)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
          >
            View creator&apos;s WIMC page
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
          </a>
        </div>

        {/* ── Details grid ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 24px',
          marginBottom: 24,
          background: 'var(--adda-bg-surface)',
          border: '1px solid var(--adda-border-subtle)',
          borderRadius: 8,
          padding: '4px 16px',
        }}>
          <DetailCell label="Date" value={formatDateLong(proposal.proposed_date)} />
          <DetailCell label="Slot" value={formatSlot(proposal.proposed_slot)} />
          <DetailCell label="Expected Attendees" value={proposal.expected_attendees != null ? String(proposal.expected_attendees) : '—'} />
          <DetailCell label="Event" value={proposal.event_title} />
          <DetailCell label="Submitted" value={`${formatTime(proposal.created_at)} · ${formatDateLong(proposal.created_at)}`} />
          {canRespond && (
            <DetailCell label="Expires" value={`${formatTime(proposal.expires_at)} · ${formatDateLong(proposal.expires_at)}`} />
          )}
        </div>

        {/* ── Creator's message ─────────────────────────────────────────────── */}
        {proposal.message && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: 'var(--adda-text-muted)', marginBottom: 10 }}>
              Message from creator
            </div>
            <div style={{
              background: 'var(--adda-bg-elevated)',
              borderLeft: '2px solid var(--adda-amber)',
              borderRadius: '0 6px 6px 0',
              padding: 16,
            }}>
              <div style={{
                fontSize: 14,
                color: 'var(--adda-text-secondary)',
                lineHeight: 1.7,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: messageExpanded ? 'none' : 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {proposal.message}
              </div>
              {proposal.message.length > 200 && (
                <button
                  onClick={() => setMessageExpanded(p => !p)}
                  style={{ marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--adda-amber)', padding: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                >
                  {messageExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Price breakdown ───────────────────────────────────────────────── */}
        <div style={{
          marginBottom: 28,
          background: 'var(--adda-bg-surface)',
          border: '1px solid var(--adda-border-subtle)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Collapsible header */}
          <button
            onClick={() => setBreakdownExpanded(p => !p)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: breakdownExpanded ? '1px solid var(--adda-border-subtle)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Price Breakdown
              {/* TODO: replace "mock data" annotation when real split_config is standardised */}
              <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, fontStyle: 'italic', letterSpacing: 0, textTransform: 'none' as const }}>
                (mock data)
              </span>
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--adda-text-muted)', transform: breakdownExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}>
              expand_more
            </span>
          </button>

          {breakdownExpanded && (
            <div style={{ padding: '8px 16px 16px' }}>
              <BreakdownRow
                label={`₹${Math.round(breakdown.hourlyRatePaise / 100).toLocaleString('en-IN')}/hr × ${breakdown.durationHours}h`}
                value={formatInr(breakdown.subtotalPaise)}
                muted
              />

              {/* Separator */}
              <div style={{ height: 1, background: 'var(--adda-border-subtle)', margin: '6px 0' }} />

              <BreakdownRow label="Subtotal" value={formatInr(breakdown.subtotalPaise)} />
              <BreakdownRow
                label={`WIMC service fee (${Math.round(WIMC_FEE_RATE * 100)}%)`}
                value={formatInr(breakdown.serviceFeePaise)}
                muted
                tooltip="WIMC adds a 15% service fee on top of your rate. You receive your full quoted amount — the guest pays the fee on top."
              />

              {/* Separator */}
              <div style={{ height: 1, background: 'var(--adda-border-subtle)', margin: '6px 0' }} />

              <BreakdownRow label="Guest pays" value={formatInr(breakdown.guestPaysPaise)} muted />

              {/* Your payout — prominent */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0 4px',
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--adda-text-primary)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}>
                  Your payout
                </span>
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--adda-amber)',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}>
                  {formatInr(breakdown.yourPayoutPaise)}
                </span>
              </div>

              <div style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginTop: 4 }}>
                Settled within 7 days post-event · GST applicable for events ≥ ₹500
              </div>
            </div>
          )}
        </div>

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        {canRespond && !isExpired && (
          <div style={{ marginBottom: 32 }}>
            {actionError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 12.5, color: 'var(--adda-danger)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginBottom: 14 }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {/* Accept — primary amber, flex-grow */}
              <button
                onClick={handleAccept}
                disabled={isPending || confirmState !== 'idle'}
                style={{
                  flex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '14px 0',
                  background: confirmState === 'done' ? 'var(--adda-success)' : 'var(--adda-amber)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: confirmState !== 'idle' ? 'default' : 'pointer',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  transition: 'background 300ms ease',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                >
                  {confirmState === 'done' ? 'check_circle' : 'check'}
                </span>
                {confirmState === 'done' ? 'Booking confirmed ✓' : confirmState === 'confirming' ? 'Confirming…' : 'Accept Booking'}
              </button>

              {/* Counter offer — outlined amber */}
              <button
                onClick={() => setShowCounterModal(true)}
                disabled={isPending || confirmState !== 'idle'}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 0',
                  background: 'transparent',
                  color: 'var(--adda-amber)',
                  border: '1px solid var(--adda-amber-border)',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                Counter Offer
              </button>

              {/* Decline — ghost muted */}
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={isPending || confirmState !== 'idle'}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 0',
                  background: 'transparent',
                  color: 'var(--adda-text-muted)',
                  border: '1px solid var(--adda-border-default)',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Expired notice */}
        {canRespond && isExpired && (
          <div style={{ padding: '12px 16px', background: 'rgba(82,82,91,0.12)', border: '1px solid var(--adda-border-default)', borderRadius: 8, fontSize: 13, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginBottom: 28 }}>
            This request expired without a response. Your response rate is not affected.
          </div>
        )}

        {/* ── Message thread ────────────────────────────────────────────────── */}
        <MessageThread bookingId={proposal.id} />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showCounterModal && (
        <CounterOfferModal
          creatorName={maker.display_name}
          proposalId={proposal.id}
          initialDate={proposal.proposed_date}
          initialHourlyRatePaise={breakdown.hourlyRatePaise}
          onSubmit={handleCounterSubmit}
          onClose={() => setShowCounterModal(false)}
        />
      )}

      {showDeclineModal && (
        <DeclineModal
          proposalId={proposal.id}
          creatorName={maker.display_name}
          onConfirm={() => {
            setShowDeclineModal(false)
            onRespond(proposal.id, 'decline')
          }}
          onClose={() => setShowDeclineModal(false)}
        />
      )}
    </>
  )
}
