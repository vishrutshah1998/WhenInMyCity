'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { respondToProposal } from '@/app/actions/venue'
import type { MakerAddaProposal } from '@/types/database'
import ProposalActionButtons from '@/components/venue/ProposalActionButtons'

const SLOT_LABEL: Record<string, string> = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
  full_day:  'Full Day',
}

const CREATOR_TYPE_LABEL: Record<string, string> = {
  music_performance: 'Music',
  comedy_open_mic:   'Comedy',
  art_design:        'Art',
  workshops_teaching:'Workshop',
  food_lifestyle:    'Food & Lifestyle',
  content_creation:  'Content',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Empty state SVG
// ---------------------------------------------------------------------------

function EmptyClipboard() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="8" y="12" width="24" height="22" rx="3" stroke="var(--venue-border-strong)" strokeWidth="1.5" fill="none" />
      <rect x="14" y="8" width="12" height="7" rx="2" stroke="var(--venue-border-strong)" strokeWidth="1.5" fill="none" />
      <rect x="9" y="9" width="22" height="4" rx="2" fill="var(--venue-bg-elevated)" />
      <line x1="13" y1="21" x2="27" y2="21" stroke="var(--venue-border-default)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="26" x2="22" y2="26" stroke="var(--venue-border-default)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Proposal card
// ---------------------------------------------------------------------------

function ProposalCard({
  proposal,
  onRespond,
}: {
  proposal: MakerAddaProposal
  onRespond: (id: string, response: 'accept' | 'decline') => void
}) {
  const [isPending, startTransition] = useTransition()
  const [avatarHovered, setAvatarHovered] = useState(false)

  function handle(response: 'accept' | 'decline') {
    startTransition(() => onRespond(proposal.id, response))
  }

  // TODO: replace with joined user_profiles data when API supports it
  const creatorInitials = 'CR'
  const creatorName = 'Creator'  // placeholder until maker profile is joined
  const eventTypeLabel = 'Event'

  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--venue-border-subtle)',
    }}>
      {/* Creator row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Avatar */}
        <div
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--venue-bg-overlay)',
            border: avatarHovered ? '2px solid var(--venue-amber)' : '2px solid transparent',
            transition: 'border-color 160ms ease',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--venue-text-secondary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            flexShrink: 0,
          }}
        >
          {creatorInitials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--venue-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {creatorName}
            </span>
            {/* Event type pill */}
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 9999,
              background: 'var(--venue-bg-hover)',
              color: 'var(--venue-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              flexShrink: 0,
            }}>
              {eventTypeLabel}
            </span>
          </div>
          {/* Meta row */}
          <div style={{
            fontSize: 11,
            color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            marginTop: 1,
            display: 'flex',
            gap: 8,
          }}
            className="font-adda-nums"
          >
            <span>{formatDate(proposal.proposed_date)}</span>
            <span>·</span>
            <span>{SLOT_LABEL[proposal.proposed_slot] ?? proposal.proposed_slot}</span>
            {proposal.expected_attendees && (
              <>
                <span>·</span>
                <span>{proposal.expected_attendees} pax</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Event title */}
      <div style={{
        fontSize: 12.5,
        fontWeight: 500,
        color: 'var(--venue-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: 10,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {proposal.event_title}
      </div>

      {/* Actions */}
      <ProposalActionButtons
        onAccept={() => handle('accept')}
        onDecline={() => handle('decline')}
        disabled={isPending}
        size="compact"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  proposals: MakerAddaProposal[]
}

export default function PendingRequests({ proposals: initialProposals }: Props) {
  const router = useRouter()
  const [proposals, setProposals] = useState(initialProposals)
  const [error, setError] = useState<string | null>(null)

  async function handleRespond(id: string, response: 'accept' | 'decline') {
    setError(null)
    const result = await respondToProposal(id, response)
    if (result.error) { setError(result.error); return }
    setProposals(prev => prev.filter(p => p.id !== id))
    router.refresh()
  }

  const topThree = proposals.slice(0, 3)

  return (
    <div style={{
      background: 'var(--venue-bg-surface)',
      border: '1px solid var(--venue-border-subtle)',
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--venue-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--venue-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          Booking Requests
        </span>
        {proposals.length > 0 && (
          <span
            className="font-adda-nums"
            style={{
              background: 'var(--venue-amber)',
              color: '#000',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 9999,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            {proposals.length}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--venue-conflict)',
          fontSize: 12,
          color: 'var(--venue-danger)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      {topThree.length === 0 ? (
        // Empty state
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
          gap: 12,
        }}>
          <EmptyClipboard />
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--venue-text-secondary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            All caught up!
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            Requests will appear here when creators propose to use your space.
          </div>
        </div>
      ) : (
        <>
          {topThree.map(p => (
            <ProposalCard key={p.id} proposal={p} onRespond={handleRespond} />
          ))}

          {proposals.length > 3 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--venue-border-subtle)',
            }}>
              <Link
                href="/business/venue/bookings"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--venue-amber)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View all {proposals.length} requests
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
