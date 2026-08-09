// ---------------------------------------------------------------------------
// Shared display bits for venue/proposal UI — used by both the Venues
// discovery page (src/app/dashboard/venues) and the Venue Bookings tab on
// the Events page (src/app/dashboard/events), which is where a proposal's
// full lifecycle (message thread, counter-offers, accept/decline, cancel)
// is tracked once a proposal exists. Extracted here rather than duplicated
// since both pages render the same status pill / tier badge / price
// breakdown against the same underlying data.
// ---------------------------------------------------------------------------

import type { VenueTier, CounterOfferAuthor, ProposalStatus } from '@/types/database'
import type { DisplayTerms } from '@/lib/venue/proposalPricing'

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatInr(paise: number) {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

export const WIMC_FEE_RATE = 0.15

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------

const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, { bg: string; color: string }> = {
  pending:         { bg: 'rgba(255,180,60,0.12)',  color: 'var(--wimc-amber)' },
  accepted:        { bg: 'rgba(77,210,177,0.12)',  color: 'var(--wimc-teal)' },
  declined:        { bg: 'rgba(26,39,68,0.06)', color: 'var(--wimc-text-secondary)' },
  counter_offered: { bg: 'rgba(232,112,90,0.12)',  color: 'var(--wimc-coral)' },
  withdrawn:       { bg: 'rgba(26,39,68,0.06)', color: 'var(--wimc-text-secondary)' },
  expired:         { bg: 'rgba(26,39,68,0.06)', color: 'var(--wimc-text-secondary)' },
  cancelled:       { bg: 'rgba(232,52,42,0.1)', color: '#E8342A' },
}

export function ProposalStatusPill({ status }: { status: string }) {
  const s = PROPOSAL_STATUS_COLORS[status as ProposalStatus] ?? PROPOSAL_STATUS_COLORS.pending
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Venue tier badge
// ---------------------------------------------------------------------------

const TIER_META: Record<Exclude<VenueTier, 'open'>, { label: string; icon: string; color: string; border: string; bg: string }> = {
  verified:  { label: 'Verified',  icon: 'verified',          color: 'var(--wimc-teal)',  border: 'rgba(77,210,177,0.35)',  bg: 'rgba(77,210,177,0.1)' },
  beloved:   { label: 'Beloved',   icon: 'favorite',          color: 'var(--wimc-amber)', border: 'rgba(245,168,0,0.35)',   bg: 'rgba(245,168,0,0.1)' },
  legendary: { label: 'Legendary', icon: 'workspace_premium', color: '#a855f7',           border: 'rgba(168,85,247,0.35)',  bg: 'rgba(168,85,247,0.1)' },
}

export function VenueTierBadge({ tier, size = 'sm' }: { tier: VenueTier; size?: 'sm' | 'md' }) {
  if (tier === 'open') return null
  const m = TIER_META[tier]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: size === 'sm' ? '2px 7px' : '3px 10px', borderRadius: 9999,
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
      fontSize: size === 'sm' ? 10 : 11, fontWeight: 600,
      fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'capitalize',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: size === 'sm' ? 11 : 12 }}>{m.icon}</span>
      {m.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Price breakdown
// ---------------------------------------------------------------------------

// Terms shown for a proposal: the venue's actual counter offer once one has
// been sent, otherwise its listed rate — mirrors the venue-side breakdown in
// BookingRequestCard, via the shared resolveDisplayTerms helper, so the two
// never show conflicting numbers.
export function ProposalPriceBreakdown({ terms, counterOfferBy }: { terms: DisplayTerms; counterOfferBy?: CounterOfferAuthor | null }) {
  const row = (label: string, value: string, muted?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--wimc-text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: muted ? 'var(--wimc-text-secondary)' : 'var(--wimc-text-primary)' }}>{value}</span>
    </div>
  )

  const label = terms.source !== 'counter'
    ? "Venue's listed rate"
    : counterOfferBy === 'maker' ? 'Your counter offer' : "Venue's counter offer"

  return (
    <div style={{ background: 'var(--wimc-bg-overlay)', borderRadius: 0, padding: '12px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
        {label}
      </div>

      {(terms.pricingModel === 'fixed_rental' || terms.pricingModel === 'hybrid') && (
        terms.rentalFeePaise == null ? (
          <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Not set yet.</div>
        ) : (
          <>
            {row(terms.pricingModel === 'hybrid' ? 'Booking fee' : 'Rental fee', formatInr(terms.rentalFeePaise), true)}
            {row(`WIMC service fee (${Math.round(WIMC_FEE_RATE * 100)}%)`, formatInr(Math.round(terms.rentalFeePaise * WIMC_FEE_RATE)), true)}
            {row(terms.pricingModel === 'hybrid' ? 'Booking fee total' : 'Total', formatInr(terms.rentalFeePaise + Math.round(terms.rentalFeePaise * WIMC_FEE_RATE)))}
          </>
        )
      )}

      {(terms.pricingModel === 'door_split' || terms.pricingModel === 'hybrid') && (
        terms.splitPercentage == null ? (
          <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Revenue share not set yet.</div>
        ) : (
          row('Revenue share', `${terms.splitPercentage}% of ticket revenue`)
        )
      )}

      {terms.pricingModel === 'f_and_b_minimum' && (
        terms.minimumSpendPaise == null ? (
          <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>F&amp;B minimum not set yet.</div>
        ) : (
          <>
            {row('Minimum F&B spend', formatInr(terms.minimumSpendPaise), true)}
            {row(`WIMC service fee (${Math.round(WIMC_FEE_RATE * 100)}%)`, formatInr(Math.round(terms.minimumSpendPaise * WIMC_FEE_RATE)), true)}
            {row('Total', formatInr(terms.minimumSpendPaise + Math.round(terms.minimumSpendPaise * WIMC_FEE_RATE)))}
          </>
        )
      )}
    </div>
  )
}
