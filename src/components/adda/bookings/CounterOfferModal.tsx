'use client'

import { useState, useEffect, useCallback, useId } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddOn {
  id: string
  name: string
  amountPaise: number
  type: 'flat' | 'per_hour'
}

interface CounterOfferData {
  date: string
  startTime: string
  endTime: string
  hourlyRatePaise: number
  addOns: AddOn[]
  message: string
}

export interface CounterOfferSubmitPayload extends CounterOfferData {
  durationHours: number
  subtotalPaise: number
  serviceFeePaise: number
  guestPaysPaise: number
  yourPayoutPaise: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIMC_SERVICE_FEE_RATE = 0.15
const MIN_MESSAGE_LENGTH = 160

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

function calcDurationHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  return Math.max(0, mins / 60)
}

function calcBreakdown(
  hourlyRatePaise: number,
  durationHours: number,
  addOns: AddOn[],
): { subtotalPaise: number; serviceFeePaise: number; guestPaysPaise: number } {
  const baseAmount = Math.round(hourlyRatePaise * durationHours)
  const addOnsTotal = addOns.reduce((sum, a) => {
    const amount = a.type === 'per_hour'
      ? Math.round(a.amountPaise * durationHours)
      : a.amountPaise
    return sum + amount
  }, 0)
  const subtotalPaise = baseAmount + addOnsTotal
  const serviceFeePaise = Math.round(subtotalPaise * WIMC_SERVICE_FEE_RATE)
  return { subtotalPaise, serviceFeePaise, guestPaysPaise: subtotalPaise + serviceFeePaise }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--adda-text-muted)',
        letterSpacing: '0.7px',
        textTransform: 'uppercase',
        marginBottom: 6,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--adda-bg-base)',
  border: '1px solid var(--adda-border-default)',
  borderRadius: 7,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--adda-text-primary)',
  fontFamily: 'var(--font-jetbrains-mono), monospace',
  outline: 'none',
  boxSizing: 'border-box',
  colorScheme: 'dark',
}

function BreakdownLine({
  label,
  value,
  muted,
  amber,
  large,
  indent,
}: {
  label: string
  value: string
  muted?: boolean
  amber?: boolean
  large?: boolean
  indent?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: large ? '8px 0' : '5px 0',
      paddingLeft: indent ? 12 : 0,
    }}>
      <span style={{
        fontSize: large ? 14 : 13,
        color: muted ? 'var(--adda-text-muted)' : 'var(--adda-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: large ? 16 : 13,
        fontWeight: large ? 700 : 500,
        color: amber ? 'var(--adda-amber)' : muted ? 'var(--adda-text-muted)' : 'var(--adda-text-primary)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
      }}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  creatorName: string
  proposalId: string
  initialDate: string
  initialHourlyRatePaise: number
  onSubmit: (payload: CounterOfferSubmitPayload) => void
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CounterOfferModal({
  creatorName,
  proposalId: _proposalId,
  initialDate,
  initialHourlyRatePaise,
  onSubmit,
  onClose,
}: Props) {
  const uid = useId()
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('21:00')
  const [hourlyRatePaise, setHourlyRatePaise] = useState(initialHourlyRatePaise)
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const durationHours = calcDurationHours(startTime, endTime)
  const { subtotalPaise, serviceFeePaise, guestPaysPaise } = calcBreakdown(
    hourlyRatePaise, durationHours, addOns,
  )
  const baseLinePaise = Math.round(hourlyRatePaise * durationHours)
  const msgRemaining = message.length < MIN_MESSAGE_LENGTH
    ? MIN_MESSAGE_LENGTH - message.length
    : 0

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addAddon = useCallback(() => {
    setAddOns(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      amountPaise: 0,
      type: 'flat',
    }])
  }, [])

  function updateAddon(id: string, patch: Partial<AddOn>) {
    setAddOns(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  function removeAddon(id: string) {
    setAddOns(prev => prev.filter(a => a.id !== id))
  }

  function handleSubmit() {
    if (!date) { setSubmitError('Please select a date.'); return }
    if (durationHours <= 0) { setSubmitError('End time must be after start time.'); return }
    if (hourlyRatePaise <= 0) { setSubmitError('Rate must be greater than ₹0.'); return }
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      setSubmitError(`Message must be at least ${MIN_MESSAGE_LENGTH} characters.`)
      return
    }
    setSubmitError(null)
    onSubmit({
      date,
      startTime,
      endTime,
      hourlyRatePaise,
      addOns,
      message: message.trim(),
      durationHours,
      subtotalPaise,
      serviceFeePaise,
      guestPaysPaise,
      yourPayoutPaise: subtotalPaise,
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
          background: 'rgba(0,0,0,0.75)',
          zIndex: 200,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="counter-offer-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: 'min(640px, calc(100vw - 24px))',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--adda-bg-surface)',
          border: '1px solid var(--adda-border-default)',
          borderRadius: 14,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--adda-bg-surface)',
          borderBottom: '1px solid var(--adda-border-subtle)',
          padding: '20px 24px 16px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2
              id="counter-offer-title"
              style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--adda-text-primary)', lineHeight: 1.3 }}
            >
              Send a counter offer
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--adda-text-muted)' }}>
              to {creatorName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--adda-text-muted)', padding: 4, lineHeight: 1, flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ padding: '24px 24px 32px' }}>

          {/* ── Date ──────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel htmlFor={`${uid}-date`}>Date</FieldLabel>
            <input
              id={`${uid}-date`}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* ── Time row ──────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <FieldLabel htmlFor={`${uid}-start`}>Start time</FieldLabel>
              <input
                id={`${uid}-start`}
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`${uid}-end`}>End time</FieldLabel>
              <input
                id={`${uid}-end`}
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Duration</FieldLabel>
              <div style={{
                ...inputStyle,
                color: durationHours > 0 ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
              }}>
                {durationHours > 0 ? `${durationHours}h` : '—'}
              </div>
            </div>
          </div>

          {/* ── Hourly rate ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel htmlFor={`${uid}-rate`}>Hourly rate (₹)</FieldLabel>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                color: 'var(--adda-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                pointerEvents: 'none',
              }}>
                ₹
              </span>
              <input
                id={`${uid}-rate`}
                type="number"
                min={0}
                step={100}
                value={Math.round(hourlyRatePaise / 100)}
                onChange={e => setHourlyRatePaise(Math.max(0, Math.round(Number(e.target.value) * 100)))}
                style={{ ...inputStyle, paddingLeft: 28 }}
              />
            </div>
          </div>

          {/* ── Add-ons ───────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <FieldLabel>Add-ons</FieldLabel>
              <button
                onClick={addAddon}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'transparent',
                  border: '1px solid var(--adda-amber-border)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--adda-amber)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                Add item
              </button>
            </div>

            {addOns.length === 0 && (
              <div style={{
                padding: '12px 14px',
                background: 'var(--adda-bg-elevated)',
                borderRadius: 7,
                fontSize: 13,
                color: 'var(--adda-text-muted)',
              }}>
                No add-ons yet — e.g. projector rental, cleaning fee, setup time.
              </div>
            )}

            {addOns.map(addon => (
              <div
                key={addon.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 100px 32px',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <input
                  type="text"
                  value={addon.name}
                  onChange={e => updateAddon(addon.id, { name: e.target.value })}
                  placeholder="Item name"
                  style={{ ...inputStyle, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
                />
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%',
                    transform: 'translateY(-50%)', fontSize: 13,
                    color: 'var(--adda-text-muted)',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    pointerEvents: 'none',
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={Math.round(addon.amountPaise / 100)}
                    onChange={e => updateAddon(addon.id, { amountPaise: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                    style={{ ...inputStyle, paddingLeft: 24, paddingRight: 6 }}
                  />
                </div>
                <select
                  value={addon.type}
                  onChange={e => updateAddon(addon.id, { type: e.target.value as 'flat' | 'per_hour' })}
                  style={{
                    ...inputStyle,
                    padding: '10px 6px',
                    appearance: 'none',
                    textAlign: 'center',
                    cursor: 'pointer',
                    colorScheme: 'dark',
                  }}
                >
                  <option value="flat" style={{ background: '#18181b' }}>Flat</option>
                  <option value="per_hour" style={{ background: '#18181b' }}>/hr</option>
                </select>
                <button
                  onClick={() => removeAddon(addon.id)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--adda-text-muted)', display: 'grid', placeItems: 'center',
                    padding: 0, height: 38,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>close</span>
                </button>
              </div>
            ))}
          </div>

          {/* ── Message to creator ────────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <FieldLabel htmlFor={`${uid}-msg`}>Message to creator</FieldLabel>
              <span style={{
                fontSize: 11,
                color: msgRemaining > 0 ? 'var(--adda-warning)' : 'var(--adda-success)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}>
                {msgRemaining > 0 ? `${msgRemaining} more chars required` : `${message.length} chars ✓`}
              </span>
            </div>
            <textarea
              id={`${uid}-msg`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder={`Explain the changes you're proposing and why they work for your venue. Be specific — creators respond better to context. (min. ${MIN_MESSAGE_LENGTH} chars)`}
              style={{
                ...inputStyle,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: 13,
                resize: 'vertical',
                lineHeight: 1.6,
                padding: '12px 14px',
                border: `1px solid ${msgRemaining > 0 && message.length > 0 ? 'rgba(251,146,60,0.4)' : 'var(--adda-border-default)'}`,
              }}
            />
          </div>

          {/* ── Live breakdown ────────────────────────────────────────────── */}
          <div style={{
            background: 'var(--adda-bg-elevated)',
            border: '1px solid var(--adda-border-subtle)',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--adda-text-muted)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: 12,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Offer breakdown
            </div>

            <BreakdownLine
              label={
                durationHours > 0
                  ? `${formatInr(hourlyRatePaise)}/hr × ${durationHours}h`
                  : `${formatInr(hourlyRatePaise)}/hr`
              }
              value={formatInr(baseLinePaise)}
              muted
            />

            {addOns.map(a => (
              <BreakdownLine
                key={a.id}
                label={`${a.name || 'Add-on'}${a.type === 'per_hour' ? ' (per hr)' : ''}`}
                value={formatInr(a.type === 'per_hour' ? Math.round(a.amountPaise * durationHours) : a.amountPaise)}
                muted
                indent
              />
            ))}

            <div style={{ height: 1, background: 'var(--adda-border-subtle)', margin: '8px 0' }} />
            <BreakdownLine label="Subtotal" value={formatInr(subtotalPaise)} />

            <BreakdownLine
              label={`WIMC service fee (${Math.round(WIMC_SERVICE_FEE_RATE * 100)}%)`}
              value={formatInr(serviceFeePaise)}
              muted
            />

            <div style={{ height: 1, background: 'var(--adda-border-subtle)', margin: '8px 0' }} />
            <BreakdownLine label="Guest pays" value={formatInr(guestPaysPaise)} />
            <BreakdownLine label="Your payout" value={formatInr(subtotalPaise)} amber large />
          </div>

          {/* Error */}
          {submitError && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--adda-danger)',
              marginBottom: 16,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '14px 0',
              background: 'var(--adda-amber)',
              color: '#000',
              border: 'none',
              borderRadius: 9,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginBottom: 12,
            }}
          >
            Send Counter Offer
          </button>

          <p style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Creator has 7 days to accept before it expires.
          </p>
        </div>
      </div>
    </>
  )
}
