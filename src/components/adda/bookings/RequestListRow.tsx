'use client'

import { useState } from 'react'
import type { ProposalWithMaker } from '@/app/actions/adda-bookings'

// ---------------------------------------------------------------------------
// Helpers
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', weekday: 'short',
  })
}

/** Returns ms until expiry; negative if already expired. */
function msUntilExpiry(expiresAt: string): number {
  return new Date(expiresAt).getTime() - Date.now()
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired'
  const totalMins = Math.floor(ms / 60_000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function countdownColor(ms: number): string {
  if (ms <= 0) return 'var(--venue-text-muted)'
  if (ms < 6 * 3_600_000) return 'var(--venue-danger)'
  if (ms < 24 * 3_600_000) return 'var(--venue-amber)'
  return 'var(--venue-text-muted)'
}

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  counter_offered: { label: 'Counter Offer', bg: 'rgba(245,158,11,0.15)', color: 'var(--venue-amber)' },
  accepted:        { label: 'Confirmed',     bg: 'rgba(16,185,129,0.12)', color: 'var(--venue-success)' },
  declined:        { label: 'Declined',      bg: 'rgba(239,68,68,0.10)',  color: 'var(--venue-danger)'  },
  expired:         { label: 'Expired',       bg: 'rgba(82,82,91,0.2)',    color: 'var(--venue-text-muted)' },
  withdrawn:       { label: 'Withdrawn',     bg: 'rgba(82,82,91,0.2)',    color: 'var(--venue-text-muted)' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  proposal: ProposalWithMaker
  isSelected: boolean
  tab: 'pending' | 'confirmed' | 'completed' | 'declined'
  onClick: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RequestListRow({ proposal, isSelected, tab, onClick }: Props) {
  const [hovered, setHovered] = useState(false)

  const { maker } = proposal
  const isPending = proposal.status === 'pending' || proposal.status === 'counter_offered'
  const expiryMs = isPending ? msUntilExpiry(proposal.expires_at) : null

  const payoutDisplay = proposal.expected_revenue_paise != null
    ? formatInr(proposal.expected_revenue_paise)
    : '—'

  const chip = STATUS_CHIP[proposal.status]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 80,
        padding: '0 16px 0 20px',
        borderBottom: '1px solid var(--venue-border-subtle)',
        cursor: 'pointer',
        background: isSelected
          ? 'var(--venue-bg-elevated)'
          : hovered
            ? 'var(--venue-bg-hover)'
            : 'transparent',
        transition: 'background 120ms ease',
        outline: 'none',
      }}
    >
      {/* Amber selected-indicator stripe */}
      {isSelected && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: 'var(--venue-amber)',
          borderRadius: '0 3px 3px 0',
        }} />
      )}

      {/* Avatar */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--venue-bg-overlay)',
        border: '1.5px solid var(--venue-border-default)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: 12,
        color: 'var(--venue-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {maker.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={maker.avatar_url}
            alt={maker.display_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          getInitials(maker.display_name)
        )}
      </div>

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--venue-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {maker.display_name}
        </div>

        <div style={{
          fontSize: 12,
          color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginTop: 2,
        }}>
          {proposal.event_title}
        </div>

        <div style={{
          fontSize: 12,
          color: 'rgba(245,158,11,0.75)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          marginTop: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {formatDate(proposal.proposed_date)} · {formatSlot(proposal.proposed_slot)}
        </div>
      </div>

      {/* Right column: payout + countdown/chip */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        flexShrink: 0,
        gap: 4,
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--venue-amber)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          lineHeight: 1,
        }}>
          {payoutDisplay}
        </div>

        {/* Pending: show expiry countdown */}
        {tab === 'pending' && expiryMs !== null ? (
          <div style={{
            fontSize: 11,
            color: countdownColor(expiryMs),
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontWeight: expiryMs < 6 * 3_600_000 ? 600 : 400,
          }}>
            {formatCountdown(expiryMs)}
          </div>
        ) : chip ? (
          <div style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 9999,
            background: chip.bg,
            color: chip.color,
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}>
            {chip.label}
          </div>
        ) : null}
      </div>
    </div>
  )
}
