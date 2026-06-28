'use client'

import { useState, useTransition } from 'react'
import { respondToProposal } from '@/app/actions/adda'
import type { MakerAddaProposal } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MakerInfo {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  creator_type: string
  user_tier: string
  cumulative_events_hosted: number
}

export interface ProposalWithMaker extends MakerAddaProposal {
  maker: MakerInfo | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatInr(paise: number) {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 0) return 'Expired'
  if (hours < 24) return `${hours}h left`
  return `${Math.floor(hours / 24)}d left`
}

const TIER_COLORS: Record<string, string> = {
  wanderer: 'rgba(255,255,255,0.25)',
  local:    '#5DD9D0',
  lantern:  '#F5A800',
  beacon:   '#a855f7',
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: 'Awaiting Response', color: '#F5A800', bg: 'rgba(245,168,0,0.1)' },
  counter_offered: { label: 'Counter Offered',   color: '#E8705A', bg: 'rgba(232,112,90,0.1)' },
  accepted:        { label: 'Accepted',          color: '#4dd2b1', bg: 'rgba(77,210,177,0.1)' },
  declined:        { label: 'Declined',          color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)' },
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({ maker, size = 48 }: { maker: MakerInfo | null; size?: number }) {
  const initials = maker?.display_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)',
      display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: Math.round(size * 0.3),
      color: 'rgba(255,255,255,0.6)',
      fontFamily: 'var(--font-jetbrains-mono, monospace)',
      flexShrink: 0, overflow: 'hidden',
      border: '2px solid rgba(255,255,255,0.08)',
    }}>
      {maker?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={maker.avatar_url} alt={maker.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProposalCard
// ---------------------------------------------------------------------------

function ProposalCard({
  proposal,
  onAccept,
  onDecline,
  isPending,
}: {
  proposal: ProposalWithMaker
  onAccept: () => void
  onDecline: () => void
  isPending: boolean
}) {
  const statusMeta = STATUS_META[proposal.status] ?? { label: proposal.status, color: 'rgba(255,255,255,0.4)', bg: 'transparent' }
  const isActionable = proposal.status === 'pending' || proposal.status === 'counter_offered'
  const tier = proposal.maker?.user_tier ?? 'wanderer'
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.wanderer

  return (
    <div style={{
      background: 'var(--adda-bg-elevated)',
      border: `1px solid ${isActionable ? 'rgba(245,168,0,0.25)' : 'var(--adda-border-subtle)'}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Avatar maker={proposal.maker} size={48} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--adda-text-primary)', fontFamily: 'var(--font-syne)' }}>
              {proposal.maker?.display_name ?? 'Creator'}
            </span>
            {proposal.maker?.username && (
              <span style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                @{proposal.maker.username}
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 9999,
              color: tierColor, border: `1px solid ${tierColor}`,
              fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'capitalize',
            }}>
              {tier}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', flexWrap: 'wrap' }}>
            {proposal.maker?.creator_type && (
              <span style={{ textTransform: 'capitalize' }}>{proposal.maker.creator_type.replace(/_/g, ' ')}</span>
            )}
            {proposal.maker?.cumulative_events_hosted != null && (
              <span>{proposal.maker.cumulative_events_hosted} events hosted</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
            background: statusMeta.bg, color: statusMeta.color,
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {statusMeta.label}
          </span>
          {isActionable && (
            <span style={{ fontSize: 10, color: '#F5A800', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {timeUntil(proposal.expires_at)}
            </span>
          )}
        </div>
      </div>

      {/* Event details */}
      <div style={{ padding: '0 24px 14px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Event',    value: proposal.event_title },
          { label: 'Date',     value: formatDate(proposal.proposed_date) },
          { label: 'Slot',     value: proposal.proposed_slot.replace(/_/g, ' ') },
          ...(proposal.expected_attendees ? [{ label: 'Expected', value: `${proposal.expected_attendees} pax` }] : []),
          ...(proposal.expected_revenue_paise ? [{ label: 'Est. Revenue', value: formatInr(proposal.expected_revenue_paise), highlight: true }] : []),
        ].map(({ label, value, highlight }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, color: highlight ? '#4dd2b1' : 'var(--adda-text-secondary)', fontWeight: highlight ? 700 : 500, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'capitalize' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Creator message */}
      {proposal.message && (
        <div style={{ margin: '0 24px 14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '2px solid rgba(245,168,0,0.4)' }}>
          <p style={{ fontSize: 13, color: 'var(--adda-text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.55 }}>
            &ldquo;{proposal.message}&rdquo;
          </p>
        </div>
      )}

      {/* Actions */}
      {isActionable && (
        <div style={{ padding: '12px 24px 16px', display: 'flex', gap: 10, borderTop: '1px solid var(--adda-border-subtle)' }}>
          <button
            onClick={onAccept}
            disabled={isPending}
            style={{
              padding: '9px 28px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: 'none',
              background: '#4dd2b1', color: '#000',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            disabled={isPending}
            style={{
              padding: '9px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--adda-border-default)',
              color: 'var(--adda-text-muted)',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Decline
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

const TABS = ['pending', 'accepted', 'declined'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  pending:  'Awaiting Response',
  accepted: 'Confirmed',
  declined: 'Past / Declined',
}

export default function CreatorsClient({ initialProposals }: { initialProposals: ProposalWithMaker[] }) {
  const [proposals, setProposals] = useState(initialProposals)
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRespond(id: string, response: 'accept' | 'decline') {
    setError(null)
    startTransition(async () => {
      const result = await respondToProposal(id, response)
      if (result.error) { setError(result.error); return }
      setProposals(prev => prev.map(p =>
        p.id === id ? { ...p, status: response === 'accept' ? 'accepted' : 'declined' } : p
      ))
    })
  }

  const pendingCount = proposals.filter(p => p.status === 'pending' || p.status === 'counter_offered').length

  const tabProposals = proposals.filter(p => {
    if (activeTab === 'pending') return p.status === 'pending' || p.status === 'counter_offered'
    if (activeTab === 'accepted') return p.status === 'accepted'
    return p.status === 'declined'
  })

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 900 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 26, fontWeight: 800, color: 'var(--adda-text-primary)', margin: '0 0 6px' }}>
          Creators
        </h1>
        <p style={{ fontSize: 13, color: 'var(--adda-text-muted)', margin: 0, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
          Creators who want to perform at your space, and your full booking pipeline.
        </p>
      </div>

      {/* Urgent banner */}
      {pendingCount > 0 && (
        <div style={{
          background: 'rgba(245,168,0,0.07)', border: '1px solid rgba(245,168,0,0.28)',
          borderRadius: 14, padding: '14px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,168,0,0.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#F5A800', fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#F5A800', marginBottom: 2 }}>
              {pendingCount} creator{pendingCount !== 1 ? 's' : ''} waiting for your response
            </div>
            <div style={{ fontSize: 12, color: 'var(--adda-text-muted)' }}>
              Unanswered requests expire in 48h — respond to lock in the booking.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(232,112,90,0.1)', border: '1px solid rgba(232,112,90,0.3)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#E8705A' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--adda-border-subtle)' }}>
        {TABS.map(tab => {
          const count = proposals.filter(p => {
            if (tab === 'pending') return p.status === 'pending' || p.status === 'counter_offered'
            if (tab === 'accepted') return p.status === 'accepted'
            return p.status === 'declined'
          }).length
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 18px 12px', background: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid var(--adda-amber)' : '2px solid transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: -1,
              }}
            >
              {TAB_LABELS[tab]}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 9999,
                  background: isActive ? 'var(--adda-amber)' : 'rgba(255,255,255,0.08)',
                  color: isActive ? '#000' : 'var(--adda-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {tabProposals.length === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', border: '1px dashed var(--adda-border-subtle)', borderRadius: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--adda-text-muted)', display: 'block', marginBottom: 12, opacity: 0.4 }}>person_search</span>
          <p style={{ fontSize: 13, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', margin: 0 }}>
            {activeTab === 'pending'
              ? 'No pending requests — share your adda listing to attract creators'
              : `No ${TAB_LABELS[activeTab].toLowerCase()} bookings yet`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tabProposals.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onAccept={() => handleRespond(p.id, 'accept')}
              onDecline={() => handleRespond(p.id, 'decline')}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
