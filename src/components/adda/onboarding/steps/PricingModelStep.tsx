'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'

type PricingModel = 'hourly' | 'daily' | 'hourly_minimum'

interface PricingState {
  model: PricingModel | null
  hourlyRate: string
  fullDayRate: string
  halfDayRate: string
  hourlyRateMin: string
  minimumHours: number
}

// Clock icon
function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// Sun icon
function IconSun() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

// Timer icon
function IconTimer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 14.5 15" />
      <path d="M5 3L2 6" />
      <path d="M22 6L19 3" />
      <path d="M9 3h6" />
    </svg>
  )
}

function RateInput({
  prefix,
  value,
  onChange,
  placeholder,
}: {
  prefix: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        fontSize: 14,
        color: 'var(--adda-amber)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontWeight: 500,
        flexShrink: 0,
      }}>
        {prefix}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: 110,
          padding: '6px 8px',
          borderRadius: 6,
          background: 'transparent',
          border: 'none',
          borderBottom: '1.5px solid var(--adda-amber)',
          color: 'var(--adda-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: 16,
          outline: 'none',
          caretColor: 'var(--adda-amber)',
        }}
      />
    </div>
  )
}

export default function PricingModelStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const [state, setState] = useState<PricingState>({
    model: null,
    hourlyRate: '',
    fullDayRate: '',
    halfDayRate: '',
    hourlyRateMin: '',
    minimumHours: 2,
  })

  function setField<K extends keyof PricingState>(key: K, value: PricingState[K]) {
    setState(s => ({ ...s, [key]: value }))
  }

  function isConfirmable(): boolean {
    if (!state.model) return false
    if (state.model === 'hourly') return state.hourlyRate.trim() !== '' && Number(state.hourlyRate) > 0
    if (state.model === 'daily') return state.fullDayRate.trim() !== '' && Number(state.fullDayRate) > 0
    if (state.model === 'hourly_minimum') return state.hourlyRateMin.trim() !== '' && Number(state.hourlyRateMin) > 0
    return false
  }

  function handleConfirm() {
    if (!state.model) return
    const config: Record<string, number> = {}
    if (state.model === 'hourly') {
      config.hourlyRate = Number(state.hourlyRate)
    } else if (state.model === 'daily') {
      config.fullDayRate = Number(state.fullDayRate)
      if (state.halfDayRate) config.halfDayRate = Number(state.halfDayRate)
    } else {
      config.hourlyRate = Number(state.hourlyRateMin)
      config.minimumHours = state.minimumHours
    }

    const labelMap: Record<PricingModel, string> = {
      hourly: 'Per Hour',
      daily: 'Full Day / Half Day',
      hourly_minimum: 'Hourly with Minimum',
    }

    handleAnswer('pricingModel', state.model, labelMap[state.model], {
      pricingConfig: config,
    })
  }

  const canGoBack = snapshot.can({ type: 'BACK' })

  const cards: Array<{
    model: PricingModel
    icon: React.ReactNode
    label: string
    description: string
    bestFor: string
    inputs: React.ReactNode
  }> = [
    {
      model: 'hourly',
      icon: <IconClock />,
      label: 'Per Hour',
      description: 'Creators pay for the hours they use.',
      bestFor: 'Short bookings, photo shoots, meetups',
      inputs: (
        <RateInput
          prefix="₹"
          value={state.hourlyRate}
          onChange={v => setField('hourlyRate', v)}
          placeholder="e.g. 1500"
        />
      ),
    },
    {
      model: 'daily',
      icon: <IconSun />,
      label: 'Full Day / Half Day',
      description: 'Set a day rate for longer bookings.',
      bestFor: 'Corporate events, full-day workshops',
      inputs: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RateInput
            prefix="Full day ₹"
            value={state.fullDayRate}
            onChange={v => setField('fullDayRate', v)}
            placeholder="e.g. 8000"
          />
          <RateInput
            prefix="Half day ₹"
            value={state.halfDayRate}
            onChange={v => setField('halfDayRate', v)}
            placeholder="e.g. 4500"
          />
        </div>
      ),
    },
    {
      model: 'hourly_minimum',
      icon: <IconTimer />,
      label: 'Hourly with Minimum',
      description: 'Set an hourly rate but require a minimum booking length.',
      bestFor: 'Studios, spaces with setup time',
      inputs: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RateInput
            prefix="₹"
            value={state.hourlyRateMin}
            onChange={v => setField('hourlyRateMin', v)}
            placeholder="per hour"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--adda-text-secondary)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              Minimum
            </span>
            <button
              onClick={() => setField('minimumHours', Math.max(1, state.minimumHours - 1))}
              style={stepperBtn}
            >
              −
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--adda-amber)', fontFamily: 'var(--font-inter), system-ui, sans-serif', minWidth: 16, textAlign: 'center' }}>
              {state.minimumHours}
            </span>
            <button
              onClick={() => setField('minimumHours', Math.min(12, state.minimumHours + 1))}
              style={stepperBtn}
            >
              +
            </button>
            <span style={{ fontSize: 13, color: 'var(--adda-text-secondary)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
              hours
            </span>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cards.map(card => {
          const isSelected = state.model === card.model
          return (
            <motion.div
              key={card.model}
              onClick={() => setField('model', card.model)}
              animate={isSelected ? { borderColor: 'var(--adda-amber)' } : {}}
              style={{
                borderRadius: 12,
                border: isSelected
                  ? '1.5px solid var(--adda-amber)'
                  : '1px solid var(--adda-border-default)',
                background: isSelected ? 'var(--adda-amber-tint)' : 'var(--adda-bg-elevated)',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'border 150ms ease, background 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ color: isSelected ? 'var(--adda-amber)' : 'var(--adda-text-muted)', marginTop: 1, flexShrink: 0 }}>
                  {card.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--adda-text-primary)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    marginBottom: 2,
                  }}>
                    {card.label}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: 'var(--adda-text-secondary)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: 1.45,
                  }}>
                    {card.description}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--adda-text-muted)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    marginTop: 3,
                  }}>
                    Best for: {card.bestFor}
                  </div>

                  {/* Inline inputs — only visible when selected */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ marginTop: 12, overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {card.inputs}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Note */}
      <p style={{
        fontSize: 11,
        color: 'var(--adda-text-muted)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        lineHeight: 1.5,
        margin: '2px 0',
      }}>
        You can add more pricing rules (peak hours, discounts) after your listing goes live.
      </p>

      {/* Confirm */}
      <AnimatePresence>
        {isConfirmable() && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', justifyContent: 'flex-end' }}
          >
            <button
              onClick={handleConfirm}
              style={{
                padding: '9px 20px',
                borderRadius: 100,
                background: 'var(--adda-amber)',
                color: '#000',
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Looks good →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {canGoBack && (
        <button
          onClick={() => send({ type: 'BACK' })}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ← Go back
        </button>
      )}
    </div>
  )
}

const stepperBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '1px solid var(--adda-border-default)',
  background: 'transparent',
  color: 'var(--adda-text-secondary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 15,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  lineHeight: 1,
  padding: 0,
}
