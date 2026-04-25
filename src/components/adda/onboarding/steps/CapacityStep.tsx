'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'

const MIN_BOUND = 2
const MAX_BOUND = 200

const PRESETS = [
  { label: 'Intimate 5–15',   min: 5,  max: 15  },
  { label: 'Workshop 10–30',  min: 10, max: 30  },
  { label: 'Large 25–100+',   min: 25, max: 100 },
] as const

function toPercent(value: number) {
  return ((value - MIN_BOUND) / (MAX_BOUND - MIN_BOUND)) * 100
}

function fromPercent(pct: number) {
  return Math.round(MIN_BOUND + (pct / 100) * (MAX_BOUND - MIN_BOUND))
}

export default function CapacityStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const [minVal, setMinVal] = useState(snapshot.context.answers.capacityMin ?? 5)
  const [maxVal, setMaxVal] = useState(snapshot.context.answers.capacityMax ?? 40)
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const minPct = toPercent(minVal)
  const maxPct = toPercent(maxVal)

  function clamp(val: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, val))
  }

  const getValueFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return null
    const rect = track.getBoundingClientRect()
    const pct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)
    return fromPercent(pct)
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const val = getValueFromPointer(e.clientX)
    if (val === null) return
    if (activeThumb === 'min') {
      setMinVal(clamp(val, MIN_BOUND, maxVal - 1))
    } else if (activeThumb === 'max') {
      setMaxVal(clamp(val, minVal + 1, MAX_BOUND))
    }
  }, [activeThumb, minVal, maxVal, getValueFromPointer])

  const handlePointerUp = useCallback(() => {
    setActiveThumb(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  function startDrag(thumb: 'min' | 'max') {
    setActiveThumb(thumb)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  function applyPreset(preset: typeof PRESETS[number]) {
    setMinVal(preset.min)
    setMaxVal(preset.max)
  }

  function handleConfirm() {
    handleAnswer('capacityMin', minVal, `${minVal}–${maxVal} people`, {
      capacityMin: minVal,
      capacityMax: maxVal,
    })
  }

  const canGoBack = snapshot.can({ type: 'BACK' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Live readout */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'baseline',
        gap: 6,
      }}>
        <span
          className="font-adda-nums"
          style={{ fontSize: 28, fontWeight: 700, color: 'var(--adda-amber)', lineHeight: 1 }}
        >
          {minVal}
        </span>
        <span style={{ fontSize: 16, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          —
        </span>
        <span
          className="font-adda-nums"
          style={{ fontSize: 28, fontWeight: 700, color: 'var(--adda-amber)', lineHeight: 1 }}
        >
          {maxVal}
        </span>
        <span style={{ fontSize: 16, color: 'var(--adda-text-secondary)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          people
        </span>
      </div>

      {/* Dual-handle range slider */}
      <div style={{ padding: '8px 11px' }}>
        <div
          ref={trackRef}
          style={{
            position: 'relative',
            height: 6,
            borderRadius: 3,
            background: 'var(--adda-bg-overlay)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {/* Filled range */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: `${minPct}%`,
            width: `${maxPct - minPct}%`,
            height: '100%',
            borderRadius: 3,
            background: 'var(--adda-amber)',
          }} />

          {/* Min thumb */}
          <Thumb
            pct={minPct}
            active={activeThumb === 'min'}
            onPointerDown={() => startDrag('min')}
            label={`Minimum: ${minVal}`}
          />

          {/* Max thumb */}
          <Thumb
            pct={maxPct}
            active={activeThumb === 'max'}
            onPointerDown={() => startDrag('max')}
            label={`Maximum: ${maxVal}`}
          />
        </div>
      </div>

      {/* Preset chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRESETS.map(p => {
          const active = minVal === p.min && maxVal === p.max
          return (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              style={{
                padding: '5px 12px',
                borderRadius: 100,
                border: active ? '1.5px solid var(--adda-amber)' : '1px solid var(--adda-border-default)',
                background: active ? 'var(--adda-amber-tint)' : 'transparent',
                color: active ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Confirm button */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
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
            That&apos;s right →
          </button>
        </motion.div>
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

function Thumb({
  pct,
  active,
  onPointerDown,
  label,
}: {
  pct: number
  active: boolean
  onPointerDown: () => void
  label: string
}) {
  return (
    <div
      role="slider"
      aria-label={label}
      onPointerDown={e => { e.preventDefault(); onPointerDown() }}
      style={{
        position: 'absolute',
        top: '50%',
        left: `${pct}%`,
        transform: 'translate(-50%, -50%)',
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'var(--adda-amber)',
        border: '2.5px solid #fff',
        boxShadow: active
          ? '0 0 0 4px rgba(251,191,36,0.28), 0 2px 8px rgba(0,0,0,0.4)'
          : '0 1px 4px rgba(0,0,0,0.35)',
        cursor: 'grab',
        touchAction: 'none',
        transition: 'box-shadow 120ms ease',
        zIndex: active ? 2 : 1,
      }}
    />
  )
}
