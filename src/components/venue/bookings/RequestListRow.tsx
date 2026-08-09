'use client'

import { useState } from 'react'
import type { ProposalWithMaker } from '@/app/actions/venue-bookings'
import { getCategoryColors } from '@/lib/constants/categories'
import { VENUE_RADIUS } from '@/components/venue/ui/primitives'
import { formatTimeRange } from '@/lib/venue/timeFormat'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
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
  if (ms < 24 * 3_600_000) return 'var(--venue-accent)'
  return 'var(--venue-text-muted)'
}

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  counter_offered: { label: 'Counter Offer', bg: 'var(--venue-accent-tint)',  color: 'var(--venue-accent)' },
  accepted:        { label: 'Confirmed',     bg: 'rgba(16,185,129,0.12)', color: 'var(--venue-success)' },
  declined:        { label: 'Declined',      bg: 'rgba(239,68,68,0.10)',  color: 'var(--venue-danger)'  },
  expired:         { label: 'Expired',       bg: 'rgba(255,255,255,0.06)', color: 'var(--venue-text-muted)' },
  withdrawn:       { label: 'Withdrawn',     bg: 'rgba(255,255,255,0.06)', color: 'var(--venue-text-muted)' },
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
  const categoryColors = getCategoryColors(maker.creator_type)

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
        minHeight: 80,
        margin: '6px 10px',
        padding: '14px 14px 14px 16px',
        borderRadius: VENUE_RADIUS.lg,
        border: isSelected ? '1.5px solid var(--venue-accent-border)' : '1.5px solid transparent',
        cursor: 'pointer',
        background: isSelected
          ? 'var(--venue-bg-elevated)'
          : hovered
            ? 'var(--venue-bg-hover)'
            : 'var(--venue-bg-surface)',
        transition: 'background 120ms ease, border-color 120ms ease',
        outline: 'none',
      }}
    >
      {/* Avatar, ringed in the creator's category color */}
      <div style={{
        position: 'relative',
        width: 36,
        height: 36,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--venue-bg-overlay)',
          border: `1.5px solid ${categoryColors.primary}55`,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: 12,
          color: 'var(--venue-text-secondary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
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
        <span style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: categoryColors.primary,
          border: '1.5px solid var(--venue-bg-surface)',
        }} />
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
          color: 'var(--venue-accent)',
          opacity: 0.85,
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          marginTop: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {formatDate(proposal.proposed_date)} · {formatTimeRange(proposal.start_time, proposal.end_time)}
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
