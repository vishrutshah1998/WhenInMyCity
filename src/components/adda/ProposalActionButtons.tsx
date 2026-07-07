'use client'

/**
 * Shared Accept / Decline button pair for proposal response flows.
 *
 * Two sizes:
 *  - compact  — dashboard widget rows (small padding, no icons)
 *  - full     — booking detail cards  (larger padding, check/close icons)
 *
 * Accept button supports a three-state confirm cycle (idle → confirming → done)
 * for use in full-size contexts.
 */

interface Props {
  onAccept: () => void
  onDecline: () => void
  disabled?: boolean
  size?: 'compact' | 'full'
  confirmState?: 'idle' | 'confirming' | 'done'
  acceptLabel?: string
}

export default function ProposalActionButtons({
  onAccept,
  onDecline,
  disabled = false,
  size = 'compact',
  confirmState = 'idle',
  acceptLabel,
}: Props) {
  const isFull = size === 'full'
  const busy = disabled || confirmState !== 'idle'

  const resolvedAcceptLabel =
    acceptLabel ??
    (confirmState === 'done'
      ? 'Confirmed ✓'
      : confirmState === 'confirming'
      ? 'Confirming…'
      : isFull
      ? 'Accept Booking'
      : 'Accept')

  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isFull ? 6 : 0,
    padding: isFull ? '13px 0' : '6px 0',
    fontSize: isFull ? 14 : 12,
    fontWeight: isFull ? 700 : 600,
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    borderRadius: 8,
    transition: 'background 220ms ease',
  }

  return (
    <div style={{ display: 'flex', gap: 8, opacity: busy ? 0.5 : 1, transition: 'opacity 160ms ease' }}>
      {/* Accept */}
      <button
        onClick={onAccept}
        disabled={busy}
        style={{
          ...base,
          flex: isFull ? 2 : 1,
          background: confirmState === 'done' ? 'var(--venue-success)' : 'var(--venue-amber)',
          color: '#000',
          border: 'none',
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {isFull && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
          >
            {confirmState === 'done' ? 'check_circle' : 'check'}
          </span>
        )}
        {resolvedAcceptLabel}
      </button>

      {/* Decline */}
      <button
        onClick={onDecline}
        disabled={disabled}
        style={{
          ...base,
          flex: 1,
          background: 'transparent',
          border: '1px solid var(--venue-border-default)',
          color: 'var(--venue-text-secondary)',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {isFull && (
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            close
          </span>
        )}
        Decline
      </button>
    </div>
  )
}
