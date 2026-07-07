'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent } from '@/lib/adda/mock/calendarEvents'

function formatDuration(ms: number): string {
  const totalMins = Math.round(ms / 60_000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

interface Props {
  event: CalendarEvent | null
  newEnd: Date | null
  onConfirm: () => void
  onCancel: () => void
}

export default function ResizeConfirmModal({ event, newEnd, onConfirm, onCancel }: Props) {
  const open = !!(event && newEnd)

  const oldDurationMs   = open ? event!.end.getTime()  - event!.start.getTime() : 0
  const newDurationMs   = open ? newEnd!.getTime()     - event!.start.getTime() : 0
  const addedMs         = newDurationMs - oldDurationMs
  const addedHours      = addedMs / 3_600_000
  const addedPaise      = event?.hourlyRate ? Math.round(event.hourlyRate * addedHours) : 0

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(2px)' }}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 201,
              width: 360,
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--venue-bg-elevated)',
              border: '1px solid var(--venue-border-default)',
              borderRadius: 14,
              padding: '22px 22px 18px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--venue-text-primary)', margin: '0 0 10px' }}>
              Extend booking?
            </h3>

            {/* Duration change pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--venue-amber-tint)',
              border: '1px solid var(--venue-amber-border)',
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--venue-amber)' }}>
                {formatDuration(oldDurationMs)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--venue-text-muted)' }}>→</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--venue-amber)' }}>
                {formatDuration(newDurationMs)}
              </span>
              {addedPaise > 0 && (
                <span style={{ fontSize: 12, color: 'var(--venue-amber)', fontWeight: 500 }}>
                  (+{formatInr(addedPaise)})
                </span>
              )}
            </div>

            <p style={{ fontSize: 13, color: 'var(--venue-text-secondary)', lineHeight: 1.55, margin: '0 0 18px' }}>
              Extend{' '}
              <strong style={{ color: 'var(--venue-text-primary)' }}>
                {event?.creatorName ?? 'this booking'}
              </strong>
              &apos;s booking by {formatDuration(addedMs)}
              {addedPaise > 0 && <> (+{formatInr(addedPaise)})</>}?
              {' '}This will notify the creator.
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
              <button onClick={onConfirm} style={confirmBtnStyle}>Confirm extension</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 15px',
  borderRadius: 7,
  border: '1px solid var(--venue-border-default)',
  background: 'transparent',
  color: 'var(--venue-text-secondary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 15px',
  borderRadius: 7,
  border: 'none',
  background: 'var(--venue-amber)',
  color: '#000',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
