'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'

export default function VenueNameStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const [value, setValue] = useState(snapshot.context.answers.venueName ?? '')
  const [hasTyped, setHasTyped] = useState(false)

  const canSubmit = value.trim().length >= 3

  function handleSubmit() {
    const trimmed = value.trim()
    if (trimmed.length < 3) return
    handleAnswer('venueName', trimmed, trimmed)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value.slice(0, 60))
    if (!hasTyped) setHasTyped(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canGoBack = snapshot.can({ type: 'BACK' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Input as right-aligned user chat bubble */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative', maxWidth: '82%', width: '100%' }}>
          <input
            autoFocus
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g. The Courtyard, Studio 12..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px 4px 14px 14px',
              background: 'var(--adda-amber-tint)',
              border: '1px solid var(--adda-amber-border)',
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 18,
              outline: 'none',
              caretColor: 'var(--adda-amber)',
              boxSizing: 'border-box',
            }}
          />
          {hasTyped && (
            <span style={{
              position: 'absolute',
              bottom: -20,
              right: 2,
              fontSize: 11,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              pointerEvents: 'none',
            }}>
              {value.length}/60
            </span>
          )}
        </div>
      </div>

      {/* Helper note */}
      <p style={{
        fontSize: 12,
        color: 'var(--adda-text-muted)',
        textAlign: 'right',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginTop: hasTyped ? 14 : 2,
        lineHeight: 1.5,
        transition: 'margin-top 150ms ease',
      }}>
        This is what creators will see on WIMC — you can change it later.
      </p>

      {/* Submit pill — appears after ≥3 chars */}
      <AnimatePresence>
        {canSubmit && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', justifyContent: 'flex-end' }}
          >
            <button
              onClick={handleSubmit}
              style={{
                padding: '8px 18px',
                borderRadius: 100,
                background: 'var(--adda-amber)',
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
            >
              →
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
