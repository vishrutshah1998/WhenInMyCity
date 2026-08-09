'use client'

import { useState, useEffect, useId } from 'react'
import type { PricingConfig, PricingModel, ProposedSplitConfig } from '@/types/marketplace'
import type { PricingRule } from '@/components/venue/editor/types'
import { resolveFixedRentalRate } from '@/lib/venue/proposalPricing'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CounterOfferSubmitPayload = ProposedSplitConfig & { message: string }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIMC_SERVICE_FEE_RATE = 0.15
const MIN_MESSAGE_LENGTH = 160

const PRICING_MODEL_LABEL: Record<PricingModel, string> = {
  fixed_rental:   'Fixed Rental',
  door_split:     'Door Split',
  hybrid:         'Hybrid',
  f_and_b_minimum: 'F&B Minimum',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
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
        color: 'var(--venue-text-muted)',
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
  background: 'var(--venue-bg-base)',
  border: '1px solid var(--venue-border-default)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--venue-text-primary)',
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
        color: muted ? 'var(--venue-text-muted)' : 'var(--venue-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: large ? 16 : 13,
        fontWeight: large ? 700 : 500,
        color: amber ? 'var(--venue-amber)' : muted ? 'var(--venue-text-muted)' : 'var(--venue-text-primary)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
      }}>
        {value}
      </span>
    </div>
  )
}

function AmountField({
  id,
  label,
  valuePaise,
  onChange,
}: {
  id: string
  label: string
  valuePaise: number
  onChange: (paise: number) => void
}) {
  const [raw, setRaw] = useState(() => String(Math.round(valuePaise / 100)))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setRaw(next)
    const num = next === '' ? 0 : Number(next)
    if (!Number.isNaN(num)) onChange(Math.max(0, Math.round(num * 100)))
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono), monospace', pointerEvents: 'none',
        }}>
          ₹
        </span>
        <input
          id={id}
          type="number"
          min={0}
          step={100}
          value={raw}
          onChange={handleChange}
          style={{ ...inputStyle, paddingLeft: 28 }}
        />
      </div>
    </div>
  )
}

function PercentField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (pct: number) => void
}) {
  const [raw, setRaw] = useState(() => String(value))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setRaw(next)
    const num = next === '' ? 0 : Number(next)
    if (!Number.isNaN(num)) onChange(Math.max(0, Math.min(100, Math.round(num))))
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="number"
          min={0}
          max={100}
          step={1}
          value={raw}
          onChange={handleChange}
          style={{ ...inputStyle, paddingRight: 28 }}
        />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono), monospace', pointerEvents: 'none',
        }}>
          %
        </span>
      </div>
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
  initialStartTime: string
  initialEndTime: string
  pricingModel: PricingModel
  pricingConfig?: PricingConfig | null
  serverError?: string | null
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
  initialStartTime,
  initialEndTime,
  pricingModel,
  pricingConfig,
  serverError,
  onSubmit,
  onClose,
}: Props) {
  const uid = useId()
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [endTime, setEndTime] = useState(initialEndTime)
  const [rentalFeePaise, setRentalFeePaise] = useState(() => {
    const rules = (pricingConfig as (PricingConfig & { pricing_rules?: PricingRule[] }) | null)?.pricing_rules
    const computed = resolveFixedRentalRate(rules, initialDate, initialStartTime, initialEndTime)?.rentalFeePaise
    return computed ?? pricingConfig?.fixed_rental_paise ?? pricingConfig?.hybrid_rental_paise ?? 0
  })
  const [splitPercentage, setSplitPercentage] = useState(
    pricingConfig?.door_split_percent ?? pricingConfig?.hybrid_split_percent ?? 0,
  )
  const [minimumSpendPaise, setMinimumSpendPaise] = useState(
    pricingConfig?.f_and_b_minimum_paise ?? 0,
  )
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const msgRemaining = message.length < MIN_MESSAGE_LENGTH
    ? MIN_MESSAGE_LENGTH - message.length
    : 0

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function buildSplitConfig(): ProposedSplitConfig {
    const base = { date, startTime, endTime }
    switch (pricingModel) {
      case 'fixed_rental':
        return { ...base, pricingModel, rentalFeePaise }
      case 'door_split':
        return { ...base, pricingModel, splitPercentage }
      case 'f_and_b_minimum':
        return { ...base, pricingModel, minimumSpendPaise }
      case 'hybrid':
        return { ...base, pricingModel, rentalFeePaise, splitPercentage }
    }
  }

  function handleSubmit() {
    if (!date) { setSubmitError('Please select a date.'); return }
    if (!startTime || !endTime || startTime >= endTime) {
      setSubmitError('Please select a valid start and end time.'); return
    }
    if ((pricingModel === 'fixed_rental' || pricingModel === 'hybrid') && rentalFeePaise <= 0) {
      setSubmitError('Rental fee must be greater than ₹0.'); return
    }
    if ((pricingModel === 'door_split' || pricingModel === 'hybrid') && (splitPercentage <= 0 || splitPercentage > 100)) {
      setSubmitError('Split percentage must be between 1 and 100.'); return
    }
    if (pricingModel === 'f_and_b_minimum' && minimumSpendPaise <= 0) {
      setSubmitError('Minimum spend must be greater than ₹0.'); return
    }
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      setSubmitError(`Message must be at least ${MIN_MESSAGE_LENGTH} characters.`)
      return
    }
    setSubmitError(null)
    onSubmit({
      ...buildSplitConfig(),
      message: message.trim(),
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
          background: 'var(--venue-bg-surface)',
          border: '1px solid var(--venue-border-default)',
          borderRadius: 20,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--venue-bg-surface)',
          borderBottom: '1px solid var(--venue-border-subtle)',
          padding: '20px 24px 16px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2
              id="counter-offer-title"
              style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--venue-text-primary)', lineHeight: 1.3 }}
            >
              Send a counter offer
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--venue-text-muted)' }}>
              to {creatorName} · {PRICING_MODEL_LABEL[pricingModel]} pricing
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--venue-text-muted)', padding: 4, lineHeight: 1, flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ padding: '24px 24px 32px' }}>

          {/* ── Date + time row ───────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <FieldLabel htmlFor={`${uid}-date`}>Date</FieldLabel>
              <input
                id={`${uid}-date`}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
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
          </div>

          {/* ── Pricing fields — branched by the venue's pricing model ──────── */}
          {(pricingModel === 'fixed_rental' || pricingModel === 'hybrid') && (
            <AmountField
              id={`${uid}-rental`}
              label={pricingModel === 'hybrid' ? 'Booking fee (₹)' : 'Rental fee (₹)'}
              valuePaise={rentalFeePaise}
              onChange={setRentalFeePaise}
            />
          )}

          {(pricingModel === 'door_split' || pricingModel === 'hybrid') && (
            <PercentField
              id={`${uid}-split`}
              label="Your share of ticket revenue (%)"
              value={splitPercentage}
              onChange={setSplitPercentage}
            />
          )}

          {pricingModel === 'f_and_b_minimum' && (
            <AmountField
              id={`${uid}-minspend`}
              label="Minimum F&B spend (₹)"
              valuePaise={minimumSpendPaise}
              onChange={setMinimumSpendPaise}
            />
          )}

          {/* ── Message to creator ────────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <FieldLabel htmlFor={`${uid}-msg`}>Message to creator</FieldLabel>
              <span style={{
                fontSize: 11,
                color: msgRemaining > 0 ? 'var(--venue-warning)' : 'var(--venue-success)',
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
              placeholder={`Explain the changes you're proposing and why they work for your Venue. Be specific — creators respond better to context. (min. ${MIN_MESSAGE_LENGTH} chars)`}
              style={{
                ...inputStyle,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: 13,
                resize: 'vertical',
                lineHeight: 1.6,
                padding: '12px 14px',
                border: `1px solid ${msgRemaining > 0 && message.length > 0 ? 'rgba(251,146,60,0.4)' : 'var(--venue-border-default)'}`,
              }}
            />
          </div>

          {/* ── Live breakdown ────────────────────────────────────────────── */}
          <div style={{
            background: 'var(--venue-bg-elevated)',
            border: '1px solid var(--venue-border-subtle)',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--venue-text-muted)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: 12,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Offer breakdown
            </div>

            {(pricingModel === 'fixed_rental' || pricingModel === 'hybrid') && (
              <>
                <BreakdownLine
                  label={pricingModel === 'hybrid' ? 'Booking fee' : 'Rental fee'}
                  value={formatInr(rentalFeePaise)}
                  muted
                />
                <BreakdownLine
                  label={`WIMC service fee (${Math.round(WIMC_SERVICE_FEE_RATE * 100)}%)`}
                  value={formatInr(Math.round(rentalFeePaise * WIMC_SERVICE_FEE_RATE))}
                  muted
                  indent
                />
                <div style={{ height: 1, background: 'var(--venue-border-subtle)', margin: '8px 0' }} />
                <BreakdownLine
                  label={pricingModel === 'hybrid' ? 'Booking fee total' : 'Total'}
                  value={formatInr(rentalFeePaise + Math.round(rentalFeePaise * WIMC_SERVICE_FEE_RATE))}
                  amber={pricingModel === 'fixed_rental'}
                  large={pricingModel === 'fixed_rental'}
                />
              </>
            )}

            {(pricingModel === 'door_split' || pricingModel === 'hybrid') && (
              <>
                {pricingModel === 'hybrid' && <div style={{ height: 1, background: 'var(--venue-border-subtle)', margin: '8px 0' }} />}
                <BreakdownLine
                  label="Revenue share"
                  value={`${splitPercentage}% of ticket revenue`}
                  amber
                  large={pricingModel === 'door_split'}
                />
              </>
            )}

            {pricingModel === 'f_and_b_minimum' && (
              <>
                <BreakdownLine label="Minimum F&B spend" value={formatInr(minimumSpendPaise)} muted />
                <BreakdownLine
                  label={`WIMC service fee (${Math.round(WIMC_SERVICE_FEE_RATE * 100)}%)`}
                  value={formatInr(Math.round(minimumSpendPaise * WIMC_SERVICE_FEE_RATE))}
                  muted
                  indent
                />
                <div style={{ height: 1, background: 'var(--venue-border-subtle)', margin: '8px 0' }} />
                <BreakdownLine
                  label="Total"
                  value={formatInr(minimumSpendPaise + Math.round(minimumSpendPaise * WIMC_SERVICE_FEE_RATE))}
                  amber
                  large
                />
              </>
            )}
          </div>

          {/* Error — local validation takes priority over a stale server error */}
          {(submitError || serverError) && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--venue-danger)',
              marginBottom: 16,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {submitError || serverError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '14px 0',
              background: 'var(--venue-amber)',
              color: '#000',
              border: 'none',
              borderRadius: 12,
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
            color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Creator has 7 days to accept before it expires.
          </p>
        </div>
      </div>
    </>
  )
}
