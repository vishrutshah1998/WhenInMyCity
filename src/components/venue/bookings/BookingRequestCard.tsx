'use client'

import { useState, useTransition, useEffect, type ReactNode } from 'react'
import { respondToProposal } from '@/app/actions/venue-bookings'
import type { ProposalWithMaker } from '@/app/actions/venue-bookings'
import CounterOfferModal from './CounterOfferModal'
import type { CounterOfferSubmitPayload } from './CounterOfferModal'
import DeclineModal from './DeclineModal'
import MessageThread from './MessageThread'
import type { PricingConfig, PricingModel, ProposedSplitConfig, UserTier } from '@/types/marketplace'
import { resolveDisplayTerms } from '@/lib/venue/proposalPricing'
import { fromPgTime, formatTimeRange } from '@/lib/venue/timeFormat'
import { getCategoryColors, getCategoryLabel } from '@/lib/constants/categories'
import { Button, VENUE_RADIUS } from '@/components/venue/ui/primitives'
import BookingConfirmedCelebration from '@/components/shared/BookingConfirmedCelebration'

// ---------------------------------------------------------------------------
// Price breakdown helpers
// ---------------------------------------------------------------------------

const WIMC_FEE_RATE = 0.15

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
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
  return h > 0 ? `Respond within ${h}h ${m}m` : `Respond within ${m}m`
}

function countdownChipStyle(ms: number): { bg: string; color: string } {
  if (ms <= 0) return { bg: 'rgba(255,255,255,0.06)', color: 'var(--venue-text-muted)' }
  if (ms < 6 * 3_600_000) return { bg: 'rgba(239,68,68,0.12)', color: 'var(--venue-danger)' }
  return { bg: 'var(--venue-accent-tint)', color: 'var(--venue-accent)' }
}

const TIER_LABEL: Record<UserTier, string> = {
  wanderer: 'Wanderer',
  local:    'Local',
  lantern:  'Lantern',
  beacon:   'Beacon',
}

function tierLabel(tier: string): string {
  return TIER_LABEL[tier as UserTier] ?? tier
}

// ---------------------------------------------------------------------------
// Status pill map
// ---------------------------------------------------------------------------

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  pending:         { label: 'Pending Approval', bg: 'var(--venue-accent-tint)',      color: 'var(--venue-accent)'  },
  counter_offered: { label: 'Counter Offered',  bg: 'var(--venue-accent-tint)',      color: 'var(--venue-accent)'  },
  accepted:        { label: 'Confirmed',        bg: 'rgba(16,185,129,0.12)',         color: 'var(--venue-success)' },
  declined:        { label: 'Declined',         bg: 'rgba(239,68,68,0.10)',          color: 'var(--venue-danger)'  },
  expired:         { label: 'Expired',          bg: 'rgba(255,255,255,0.06)',        color: 'var(--venue-text-muted)' },
  withdrawn:       { label: 'Withdrawn',        bg: 'rgba(255,255,255,0.06)',        color: 'var(--venue-text-muted)' },
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
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.8px',
        textTransform: 'uppercase' as const,
        color: 'var(--venue-text-muted)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14,
        color: 'var(--venue-text-primary)',
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

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      paddingLeft: indent ? 14 : 0,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span style={{
          fontSize: 13.5,
          color: muted ? 'var(--venue-text-muted)' : 'var(--venue-text-secondary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        {tooltip && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span
              className="material-symbols-outlined"
              onMouseEnter={() => setTipVisible(true)}
              onMouseLeave={() => setTipVisible(false)}
              style={{
                fontSize: 14,
                color: 'var(--venue-text-muted)',
                cursor: 'help',
                lineHeight: 1,
                display: 'block',
              }}
            >
              info
            </span>
            {tipVisible && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '120%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 220,
                  maxWidth: '70vw',
                  padding: '8px 10px',
                  background: 'var(--venue-bg-overlay)',
                  border: '1px solid var(--venue-border-default)',
                  borderRadius: VENUE_RADIUS.sm,
                  fontSize: 12,
                  color: 'var(--venue-text-secondary)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  lineHeight: 1.5,
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'normal',
                }}
              >
                {tooltip}
                <span style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid var(--venue-border-default)',
                }} />
              </div>
            )}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 13.5,
        fontWeight: 500,
        color: amber ? 'var(--venue-amber)' : muted ? 'var(--venue-text-muted)' : 'var(--venue-text-primary)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        flexShrink: 0,
      }}>
        {value}
      </span>
    </div>
  )
}

function UnsetTermsNotice({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 12.5,
      color: 'var(--venue-text-muted)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      fontStyle: 'italic',
      padding: '6px 0',
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  proposal: ProposalWithMaker
  venueId: string
  currentUserId: string
  pricingModel: PricingModel
  pricingConfig: PricingConfig | null
  onRespond: (
    proposalId: string,
    action: 'accept' | 'decline' | 'counter_offer',
    counterOffer?: ProposedSplitConfig,
    note?: string,
  ) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingRequestCard({ proposal, venueId: _venueId, currentUserId, pricingModel, pricingConfig, onRespond }: Props) {
  const { maker } = proposal
  const [messageExpanded, setMessageExpanded] = useState(false)
  const [breakdownExpanded, setBreakdownExpanded] = useState(true)
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [confirmState, setConfirmState] = useState<'idle' | 'confirming' | 'done'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  const [counterOfferError, setCounterOfferError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // A 'counter_offered' status can mean either side's counter is on the
  // table — the venue can only act when the maker's original ask is still
  // pending, or the maker just countered back (not while its own counter
  // is what's awaiting a response).
  const isMakerTurn = proposal.status === 'counter_offered' && proposal.counter_offer_by === 'maker'
  const canRespond = proposal.status === 'pending' || isMakerTurn
  const awaitingMaker = proposal.status === 'counter_offered' && proposal.counter_offer_by === 'venue'
  const expiryMs = canRespond ? msUntilExpiry(proposal.expires_at) : null
  const isExpired = expiryMs !== null && expiryMs <= 0
  const chipStyle = expiryMs !== null ? countdownChipStyle(expiryMs) : null
  const pill = STATUS_PILL[proposal.status]
  const categoryColors = getCategoryColors(maker.creator_type)

  const displayTerms = resolveDisplayTerms(
    proposal.counter_offer,
    pricingModel,
    pricingConfig,
    proposal.proposed_date,
    fromPgTime(proposal.start_time),
    fromPgTime(proposal.end_time),
  )

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
    })
  }

  // ── Counter offer ─────────────────────────────────────────────────────────

  function handleCounterSubmit(payload: CounterOfferSubmitPayload) {
    setCounterOfferError(null)
    const { message, ...splitConfig } = payload
    startTransition(async () => {
      const { error } = await respondToProposal(proposal.id, 'counter_offer', message, splitConfig)
      if (error) {
        setCounterOfferError(error)
        return
      }
      setShowCounterModal(false)
      onRespond(proposal.id, 'counter_offer', splitConfig, message)
    })
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
        position: 'relative',
        maxWidth: 640,
        margin: '0 auto',
        padding: '32px 28px 64px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        {confirmState === 'done' && (
          <BookingConfirmedCelebration
            theme="dark"
            eventTitle={proposal.event_title}
            subtitle={`${formatDateLong(proposal.proposed_date)} · ${formatTimeRange(proposal.start_time, proposal.end_time)}`}
            onDone={() => onRespond(proposal.id, 'accept')}
          />
        )}

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          {/* 48px avatar, ringed in the creator's category color */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--venue-bg-overlay)',
            border: `2px solid ${categoryColors.primary}55`,
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--venue-text-secondary)',
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
            <div style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--venue-text-primary)',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {maker.display_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--venue-text-muted)', marginTop: 3 }}>
              {maker.cumulative_events_hosted > 0
                ? `${maker.cumulative_events_hosted} booking${maker.cumulative_events_hosted !== 1 ? 's' : ''} on WIMC`
                : 'New to WIMC'}
            </div>
            {/* Verification chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 8 }}>
              {maker.is_verified && (
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: VENUE_RADIUS.full, background: 'rgba(16,185,129,0.12)', color: 'var(--venue-success)' }}>
                  ID Verified
                </span>
              )}
              {maker.is_founding_maker && (
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: VENUE_RADIUS.full, background: 'var(--venue-accent-tint)', color: 'var(--venue-accent)' }}>
                  Superguest
                </span>
              )}
              {!maker.is_verified && maker.cumulative_events_hosted === 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: VENUE_RADIUS.full, border: '1px solid var(--venue-border-default)', color: 'var(--venue-text-muted)' }}>
                  New to WIMC
                </span>
              )}
              <span style={{ fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: VENUE_RADIUS.full, border: '1px solid var(--venue-border-default)', color: 'var(--venue-text-muted)' }}>
                {tierLabel(maker.user_tier)} tier
              </span>
            </div>
          </div>

          {/* Expiry chip */}
          {expiryMs !== null && chipStyle && (
            <div style={{
              flexShrink: 0,
              padding: '5px 12px',
              borderRadius: VENUE_RADIUS.full,
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
          borderBottom: '1px solid var(--venue-border-subtle)',
        }}>
          {pill && (
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: VENUE_RADIUS.full, background: pill.bg, color: pill.color }}>
              {pill.label}
            </span>
          )}
          {/* Creator category — colored per the same palette used for creator onboarding */}
          <span style={{
            fontSize: 11.5,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: VENUE_RADIUS.full,
            background: `${categoryColors.primary}22`,
            color: categoryColors.primary,
          }}>
            {getCategoryLabel(maker.creator_type)}
          </span>
          <a
            href={`/${maker.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--venue-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexShrink: 0 }}
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
          background: 'var(--venue-bg-surface)',
          border: '1px solid var(--venue-border-subtle)',
          borderRadius: VENUE_RADIUS.lg,
          padding: '4px 16px',
        }}>
          <DetailCell label="Date" value={formatDateLong(proposal.proposed_date)} />
          <DetailCell label="Time" value={formatTimeRange(proposal.start_time, proposal.end_time)} />
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
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: 'var(--venue-text-muted)', marginBottom: 10 }}>
              Message from creator
            </div>
            <div style={{
              background: 'var(--venue-bg-elevated)',
              borderLeft: '2px solid var(--venue-accent)',
              borderRadius: `0 ${VENUE_RADIUS.lg}px ${VENUE_RADIUS.lg}px 0`,
              padding: 16,
            }}>
              <div style={{
                fontSize: 14,
                color: 'var(--venue-text-secondary)',
                lineHeight: 1.7,
                overflow: 'hidden',
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: messageExpanded ? 'none' : 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {proposal.message}
              </div>
              {proposal.message.length > 200 && (
                <button
                  onClick={() => setMessageExpanded(p => !p)}
                  style={{ marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--venue-accent)', padding: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                >
                  {messageExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Maker's counter-offer message ─────────────────────────────────── */}
        {proposal.counter_offer_by === 'maker' && proposal.maker_counter_message && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: 'var(--venue-text-muted)', marginBottom: 10 }}>
              Maker&apos;s counter-offer message
            </div>
            <div style={{
              background: 'var(--venue-bg-elevated)',
              borderLeft: '2px solid var(--venue-accent)',
              borderRadius: `0 ${VENUE_RADIUS.lg}px ${VENUE_RADIUS.lg}px 0`,
              padding: 16,
            }}>
              <div style={{ fontSize: 14, color: 'var(--venue-text-secondary)', lineHeight: 1.7, overflowWrap: 'anywhere' }}>
                {proposal.maker_counter_message}
              </div>
            </div>
          </div>
        )}

        {/* ── Price breakdown ───────────────────────────────────────────────── */}
        <div style={{
          marginBottom: 28,
          background: 'var(--venue-bg-surface)',
          border: '1px solid var(--venue-border-subtle)',
          borderRadius: VENUE_RADIUS.lg,
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
              gap: 12,
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: breakdownExpanded ? '1px solid var(--venue-border-subtle)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Price Breakdown
              {displayTerms && (
                <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, fontStyle: 'italic', letterSpacing: 0, textTransform: 'none' as const }}>
                  ({displayTerms.source !== 'counter'
                    ? 'your listed rate'
                    : proposal.counter_offer_by === 'maker' ? "maker's counter offer" : 'your counter offer'})
                </span>
              )}
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--venue-text-muted)', flexShrink: 0, transform: breakdownExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}>
              expand_more
            </span>
          </button>

          {breakdownExpanded && (
            <div style={{ padding: '8px 16px 16px' }}>
              {!displayTerms ? (
                <div style={{ fontSize: 12.5, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif', padding: '4px 0' }}>
                  Pricing details unavailable for this venue.
                </div>
              ) : (
                <>
                  {(displayTerms.pricingModel === 'fixed_rental' || displayTerms.pricingModel === 'hybrid') && (
                    displayTerms.rentalFeePaise == null ? (
                      <UnsetTermsNotice>
                        {displayTerms.pricingModel === 'hybrid' ? 'Booking fee' : 'Rental fee'} not set yet — you&apos;ll propose it when you respond.
                      </UnsetTermsNotice>
                    ) : (
                      <>
                        <BreakdownRow
                          label={displayTerms.pricingModel === 'hybrid' ? 'Booking fee' : 'Rental fee'}
                          value={formatInr(displayTerms.rentalFeePaise)}
                          muted
                          tooltip={displayTerms.rentalRuleName ? `Based on your "${displayTerms.rentalRuleName}" hourly rate for this date and slot.` : undefined}
                        />
                        <BreakdownRow
                          label={`WIMC service fee (${Math.round(WIMC_FEE_RATE * 100)}%)`}
                          value={formatInr(Math.round(displayTerms.rentalFeePaise * WIMC_FEE_RATE))}
                          muted
                          indent
                          tooltip="WIMC adds a 15% service fee on top of your rate. You receive your full quoted amount — the guest pays the fee on top."
                        />
                        <div style={{ height: 1, background: 'var(--venue-border-subtle)', margin: '6px 0' }} />
                        <BreakdownRow
                          label={displayTerms.pricingModel === 'hybrid' ? 'Booking fee total' : 'Total'}
                          value={formatInr(displayTerms.rentalFeePaise + Math.round(displayTerms.rentalFeePaise * WIMC_FEE_RATE))}
                        />
                      </>
                    )
                  )}

                  {(displayTerms.pricingModel === 'door_split' || displayTerms.pricingModel === 'hybrid') && (
                    <>
                      {displayTerms.pricingModel === 'hybrid' && (
                        <div style={{ height: 1, background: 'var(--venue-border-subtle)', margin: '6px 0' }} />
                      )}
                      {displayTerms.splitPercentage == null ? (
                        <UnsetTermsNotice>Revenue share not set yet — you&apos;ll propose it when you respond.</UnsetTermsNotice>
                      ) : (
                        <BreakdownRow
                          label="Revenue share"
                          value={`${displayTerms.splitPercentage}% of ticket revenue`}
                          amber
                        />
                      )}
                    </>
                  )}

                  {displayTerms.pricingModel === 'f_and_b_minimum' && (
                    displayTerms.minimumSpendPaise == null ? (
                      <UnsetTermsNotice>F&amp;B minimum not set yet — you&apos;ll propose it when you respond.</UnsetTermsNotice>
                    ) : (
                      <>
                        <BreakdownRow label="Minimum F&B spend" value={formatInr(displayTerms.minimumSpendPaise)} muted />
                        <BreakdownRow
                          label={`WIMC service fee (${Math.round(WIMC_FEE_RATE * 100)}%)`}
                          value={formatInr(Math.round(displayTerms.minimumSpendPaise * WIMC_FEE_RATE))}
                          muted
                          indent
                          tooltip="WIMC adds a 15% service fee on top of your rate. You receive your full quoted amount — the guest pays the fee on top."
                        />
                        <div style={{ height: 1, background: 'var(--venue-border-subtle)', margin: '6px 0' }} />
                        <BreakdownRow
                          label="Total"
                          value={formatInr(displayTerms.minimumSpendPaise + Math.round(displayTerms.minimumSpendPaise * WIMC_FEE_RATE))}
                        />
                      </>
                    )
                  )}

                  <div style={{ fontSize: 11, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginTop: 8, lineHeight: 1.5 }}>
                    Settled within 7 days post-event · GST applicable for events ≥ ₹500
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        {canRespond && !isExpired && (
          <div style={{ marginBottom: 32 }}>
            {actionError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: VENUE_RADIUS.sm, fontSize: 12.5, color: 'var(--venue-danger)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginBottom: 14 }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
              {/* Accept — the one revenue-committing action, stays amber */}
              <Button
                variant="money"
                onClick={handleAccept}
                disabled={isPending || confirmState !== 'idle'}
                flex={2}
                style={{ background: confirmState === 'done' ? 'var(--venue-success)' : undefined }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                  {confirmState === 'done' ? 'check_circle' : 'check'}
                </span>
                {confirmState === 'done' ? 'Booking confirmed ✓' : confirmState === 'confirming' ? 'Confirming…' : 'Accept Booking'}
              </Button>

              {/* Counter offer — teal outline, not a money commitment */}
              <Button
                variant="outline"
                onClick={() => { setCounterOfferError(null); setShowCounterModal(true) }}
                disabled={isPending || confirmState !== 'idle'}
                flex={1}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                Counter Offer
              </Button>

              {/* Decline — ghost muted */}
              <Button
                variant="ghost"
                onClick={() => setShowDeclineModal(true)}
                disabled={isPending || confirmState !== 'idle'}
                flex={1}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Expired notice */}
        {canRespond && isExpired && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--venue-border-default)', borderRadius: VENUE_RADIUS.lg, fontSize: 13, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginBottom: 28 }}>
            This request expired without a response. Your response rate is not affected.
          </div>
        )}

        {/* Awaiting maker notice — your own counter-offer is on the table */}
        {awaitingMaker && (
          <div style={{ padding: '12px 16px', background: 'var(--venue-accent-tint)', border: '1px solid var(--venue-border-default)', borderRadius: VENUE_RADIUS.lg, fontSize: 13, color: 'var(--venue-text-secondary)', fontFamily: 'var(--font-inter), system-ui, sans-serif', marginBottom: 28 }}>
            Waiting for the maker to respond to your counter-offer.
          </div>
        )}

        {/* ── Message thread ────────────────────────────────────────────────── */}
        <MessageThread proposalId={proposal.id} currentUserId={currentUserId} />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showCounterModal && (
        <CounterOfferModal
          creatorName={maker.display_name}
          proposalId={proposal.id}
          initialDate={proposal.proposed_date}
          initialStartTime={fromPgTime(proposal.start_time)}
          initialEndTime={fromPgTime(proposal.end_time)}
          pricingModel={pricingModel}
          pricingConfig={pricingConfig}
          serverError={counterOfferError}
          onSubmit={handleCounterSubmit}
          onClose={() => { setShowCounterModal(false); setCounterOfferError(null) }}
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
