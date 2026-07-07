'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface BlockTimePayload {
  date: string
  startTime: string
  endTime: string
  reason: string
  note: string
}

interface Props {
  open: boolean
  initialDate?: string
  initialStart?: string
  onClose: () => void
  onConfirm: (payload: BlockTimePayload) => void
}

const REASONS = ['Maintenance', 'Personal', 'Setup', 'No Bookings', 'Other'] as const

export default function BlockTimeModal({ open, initialDate, initialStart, onClose, onConfirm }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [date, setDate]           = useState(initialDate ?? todayStr)
  const [startTime, setStartTime] = useState(initialStart ?? '10:00')
  const [endTime, setEndTime]     = useState('12:00')
  const [reason, setReason]       = useState<string>('Maintenance')
  const [note, setNote]           = useState('')

  function handleSubmit() {
    if (!date || !startTime || !endTime) return
    onConfirm({ date, startTime, endTime, reason, note })
    onClose()
  }

  const isValid = date && startTime && endTime && startTime < endTime

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 100,
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 101,
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--venue-bg-elevated)',
              border: '1px solid var(--venue-border-default)',
              borderRadius: 14,
              overflow: 'hidden',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--venue-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--venue-text-primary)' }}>
                Block Time
              </span>
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: '50%',
                border: 'none', background: 'var(--venue-bg-overlay)',
                color: 'var(--venue-text-muted)', cursor: 'pointer',
                display: 'grid', placeItems: 'center', fontSize: 14,
              }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Date">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Start time">
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="End time">
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <Field label="Reason">
                <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>

              <Field label="Note (optional)">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Deep clean before weekend bookings"
                  rows={2}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                />
              </Field>

              <p style={{ fontSize: 11, color: 'var(--venue-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Blocked time is never shown to creators — they can't request bookings during this window.
              </p>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--venue-border-subtle)',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}>
              <button onClick={onClose} style={cancelBtn}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                style={{
                  ...confirmBtn,
                  opacity: isValid ? 1 : 0.45,
                  cursor: isValid ? 'pointer' : 'not-allowed',
                }}
              >
                Block this time
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--venue-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid var(--venue-border-default)',
  background: 'var(--venue-bg-overlay)',
  color: 'var(--venue-text-primary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  colorScheme: 'dark',
}

const cancelBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 7,
  border: '1px solid var(--venue-border-default)',
  background: 'transparent',
  color: 'var(--venue-text-secondary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const confirmBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 7,
  border: 'none',
  background: 'var(--venue-amber)',
  color: '#000',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
