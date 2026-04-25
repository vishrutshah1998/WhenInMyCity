'use client'

import { useState, useEffect } from 'react'
import type { MakerAddaProposal } from '@/types/database'

interface ActionChip {
  id: string
  icon: string
  message: string
  href?: string
  urgency: 'high' | 'low'
}

// Builds the list of actionable chips from live data.
// Chips with a static id (e.g. "no-photos") are permanently dismissible.
// Chips derived from live counts (e.g. proposal requests) reappear when data changes.
function buildChips(pendingProposals: MakerAddaProposal[]): ActionChip[] {
  const chips: ActionChip[] = []

  if (pendingProposals.length > 0) {
    // Find the soonest expiry
    const soonest = pendingProposals.reduce((a, b) =>
      new Date(a.expires_at) < new Date(b.expires_at) ? a : b
    )
    const expiresAt = new Date(soonest.expires_at)
    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3_600_000))
    const expiryLabel = hoursLeft <= 24
      ? `expires in ${hoursLeft}h`
      : `expires ${expiresAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`

    chips.push({
      id: `proposals-${pendingProposals.length}`,
      icon: 'pending_actions',
      message: `${pendingProposals.length} booking request${pendingProposals.length === 1 ? '' : 's'} awaiting response — ${expiryLabel}`,
      href: '/adda/bookings',
      urgency: hoursLeft <= 24 ? 'high' : 'low',
    })
  }

  return chips
}

interface Props {
  pendingProposals: MakerAddaProposal[]
}

const DISMISSED_KEY = 'adda-dismissed-chips'

export default function PriorityActions({ pendingProposals }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')
      if (Array.isArray(stored)) setDismissed(new Set(stored))
    } catch { /* ignore bad storage */ }
  }, [])

  function dismiss(id: string) {
    setDismissed(prev => {
      const next = new Set([...prev, id])
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]))
      } catch { /* quota errors are non-fatal */ }
      return next
    })
  }

  const chips = buildChips(pendingProposals)
  // Live-data chips (proposals) are never permanently dismissed — only static advice chips are.
  // For proposal chips, we only dismiss until the count changes (id includes count).
  const visible = chips.filter(c => !dismissed.has(c.id))

  // Don't render anything until mounted (avoids localStorage hydration flash)
  if (!mounted || visible.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Priority actions"
      style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingBottom: 4,
        marginBottom: 24,
        // Hide scrollbar but keep scroll
        scrollbarWidth: 'none',
      }}
    >
      {visible.map(chip => (
        <div
          key={chip.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--adda-amber-tint)',
            border: chip.urgency === 'high'
              ? '1px solid var(--adda-amber-border)'
              : '1px dashed var(--adda-amber-border)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 16,
              color: 'var(--adda-amber)',
              fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20",
            }}
          >
            {chip.icon}
          </span>

          {chip.href ? (
            <a
              href={chip.href}
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: 'var(--adda-amber)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                textDecoration: 'none',
              }}
            >
              {chip.message}
            </a>
          ) : (
            <span style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--adda-amber)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {chip.message}
            </span>
          )}

          <button
            onClick={() => dismiss(chip.id)}
            aria-label="Dismiss"
            style={{
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--adda-text-muted)',
              padding: 2,
              borderRadius: 4,
              lineHeight: 1,
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
