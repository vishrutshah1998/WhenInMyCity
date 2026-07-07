'use client'

import { useState, useTransition, useEffect } from 'react'
import { respondToProposal } from '@/app/actions/adda-bookings'

// ---------------------------------------------------------------------------
// Decline reasons
// ---------------------------------------------------------------------------

const DECLINE_REASONS = [
  'Not available that date',
  'Doesn\'t fit our event types',
  'Can\'t accommodate the group size',
  'Pricing doesn\'t work',
  'Venue under maintenance',
  'Other',
] as const

type DeclineReason = typeof DECLINE_REASONS[number]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  proposalId: string
  creatorName: string
  onConfirm: () => void
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeclineModal({ proposalId, creatorName, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState<DeclineReason | ''>('')
  const [otherText, setOtherText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isOther = reason === 'Other'
  const canSubmit = reason !== '' && (!isOther || otherText.trim().length > 0)

  function handleConfirm() {
    if (!canSubmit) return
    setError(null)
    const note = isOther ? otherText.trim() : reason
    startTransition(async () => {
      const { error: serverError } = await respondToProposal(proposalId, 'decline', note)
      if (serverError) { setError(serverError); return }
      onConfirm()
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 200,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: 'min(460px, calc(100vw - 32px))',
          background: 'var(--venue-bg-surface)',
          border: '1px solid var(--venue-border-default)',
          borderRadius: 12,
          padding: '28px 28px 24px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h2
              id="decline-modal-title"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--venue-text-primary)',
                lineHeight: 1.3,
              }}
            >
              Decline this request?
            </h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: 'var(--venue-text-muted)',
            }}>
              From {creatorName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--venue-text-muted)',
              padding: 4,
              lineHeight: 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Reason dropdown */}
        <label style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--venue-text-muted)',
          letterSpacing: '0.7px',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Reason for declining
        </label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as DeclineReason | '')}
            style={{
              width: '100%',
              appearance: 'none',
              background: 'var(--venue-bg-elevated)',
              border: `1px solid ${reason ? 'var(--venue-border-strong)' : 'var(--venue-border-default)'}`,
              borderRadius: 8,
              padding: '11px 40px 11px 14px',
              fontSize: 14,
              color: reason ? 'var(--venue-text-primary)' : 'var(--venue-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="" disabled>Select a reason…</option>
            {DECLINE_REASONS.map(r => (
              <option key={r} value={r} style={{ background: '#18181b', color: '#fafafa' }}>
                {r}
              </option>
            ))}
          </select>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 18,
              color: 'var(--venue-text-muted)',
              pointerEvents: 'none',
            }}
          >
            expand_more
          </span>
        </div>

        {/* "Other" textarea */}
        {isOther && (
          <textarea
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Please describe the reason…"
            style={{
              width: '100%',
              background: 'var(--venue-bg-elevated)',
              border: '1px solid var(--venue-border-default)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--venue-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              resize: 'vertical',
              outline: 'none',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
        )}

        {/* Empathy note */}
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          padding: '10px 14px',
          background: 'rgba(245,158,11,0.05)',
          border: '1px solid var(--venue-amber-border)',
          borderRadius: 8,
          marginBottom: 22,
        }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, color: 'var(--venue-amber)', flexShrink: 0, marginTop: 1 }}
          >
            info
          </span>
          <p style={{
            margin: 0,
            fontSize: 12.5,
            color: 'var(--venue-text-muted)',
            lineHeight: 1.6,
          }}>
            Declining doesn&apos;t affect your response rate — only unanswered requests do.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            fontSize: 12.5,
            color: 'var(--venue-danger)',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || isPending}
            style={{
              width: '100%',
              padding: '13px 0',
              background: canSubmit ? 'var(--venue-amber)' : 'var(--venue-bg-overlay)',
              color: canSubmit ? '#000' : 'var(--venue-text-muted)',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: canSubmit && !isPending ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            {isPending ? 'Declining…' : 'Confirm Decline'}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 0',
              background: 'transparent',
              color: 'var(--venue-text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
              transition: 'text-decoration-color 160ms ease, color 160ms ease',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--venue-text-secondary)'
              ;(e.currentTarget as HTMLButtonElement).style.textDecorationColor = 'currentColor'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--venue-text-muted)'
              ;(e.currentTarget as HTMLButtonElement).style.textDecorationColor = 'transparent'
            }}
          >
            Never mind, go back
          </button>
        </div>
      </div>
    </>
  )
}
