'use client'

// ---------------------------------------------------------------------------
// Dual scroll-wheel start/end time picker for the booking proposal flow —
// replaces two disconnected native <input type="time"> fields with one
// control that reads the duration live as you scroll (inspired by
// dribbble.com/shots/1780596-Time-Picker's parallel-wheel "5:45 TO 10:15"
// pattern, restyled to WIMC's editorial light theme). CSS scroll-snap only —
// no drag library needed (dnd-kit elsewhere in this app is for sortable
// lists, not a fit for a continuous-value wheel).
//
// Contract: plain 'HH:MM' 24h strings in/out, matching every other consumer
// of start_time/end_time in this app (ProposalModal's pricing/validation,
// venue_availability, maker_venue_proposals) — a drop-in replacement with no
// change needed anywhere else.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef } from 'react'
import { to12Hour, formatDuration } from '@/lib/venue/timeFormat'
import { TIME_PRESETS, type TimePreset } from '@/lib/venue/timePresets'

const ROW_HEIGHT = 40
const VISIBLE_ROWS = 5
const PAD_ROWS = Math.floor(VISIBLE_ROWS / 2)

// 06:00–23:30 in 30-min steps — same-day only (no midnight wraparound), fine
// grain enough for real event planning without a 72-row scroll (15-min would
// double the list for little practical benefit here).
const SLOTS: string[] = (() => {
  const slots: string[] = []
  for (let h = 6; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
})()

function WheelColumn({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isProgrammatic = useRef(false)
  const isFirstRender = useRef(true)

  const index = Math.max(0, SLOTS.indexOf(value))

  // Keep the wheel's scroll position in sync when `value` changes from
  // outside (a preset tap, or the smart default on open) — guarded so this
  // doesn't fight the user's own in-progress scroll gesture.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    isProgrammatic.current = true
    el.scrollTo({ top: index * ROW_HEIGHT, behavior: isFirstRender.current ? 'auto' : 'smooth' })
    isFirstRender.current = false
    const t = setTimeout(() => { isProgrammatic.current = false }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleScroll = useCallback(() => {
    if (isProgrammatic.current) return
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const idx = Math.min(SLOTS.length - 1, Math.max(0, Math.round(el.scrollTop / ROW_HEIGHT)))
      const next = SLOTS[idx]
      if (next !== value) onChange(next)
    }, 120)
  }, [value, onChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(SLOTS[Math.min(SLOTS.length - 1, index + 1)]) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); onChange(SLOTS[Math.max(0, index - 1)]) }
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      style={{
        height: ROW_HEIGHT * VISIBLE_ROWS,
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        outline: 'none',
      }}
    >
      <div style={{ height: ROW_HEIGHT * PAD_ROWS }} />
      {SLOTS.map((slot) => (
        <div
          key={slot}
          role="option"
          aria-selected={slot === value}
          onClick={() => onChange(slot)}
          style={{
            height: ROW_HEIGHT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            scrollSnapAlign: 'center',
            fontSize: 13.5,
            fontFamily: 'var(--font-dm-sans)',
            color: slot === value ? 'var(--wimc-text-primary)' : 'var(--wimc-text-secondary)',
            fontWeight: slot === value ? 700 : 400,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {to12Hour(slot)}
        </div>
      ))}
      <div style={{ height: ROW_HEIGHT * PAD_ROWS }} />
    </div>
  )
}

export interface TimeRangePickerProps {
  startTime: string
  endTime: string
  onStartTimeChange: (v: string) => void
  onEndTimeChange: (v: string) => void
  presets?: TimePreset[]
}

export function TimeRangePicker({
  startTime, endTime, onStartTimeChange, onEndTimeChange,
  presets = TIME_PRESETS,
}: TimeRangePickerProps) {
  const activePresetKey = presets.find((p) => p.range.start === startTime && p.range.end === endTime)?.key
  const duration = formatDuration(startTime, endTime)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {presets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {presets.map((p) => {
            const active = p.key === activePresetKey
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => { onStartTimeChange(p.range.start); onEndTimeChange(p.range.end) }}
                style={{
                  padding: '3px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                  fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: '1px solid',
                  transition: 'all 150ms',
                  borderColor: active ? 'var(--wimc-coral)' : 'var(--wimc-border-default)',
                  background: active ? 'rgba(232,112,90,0.10)' : 'transparent',
                  color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      )}

      <div style={{
        position: 'relative', display: 'flex',
        border: '1px solid var(--wimc-border-default)', borderRadius: 8,
        overflow: 'hidden', background: 'var(--wimc-bg-overlay)',
      }}>
        {/* Center highlight band, spanning both wheels — purely visual. */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: ROW_HEIGHT * PAD_ROWS, height: ROW_HEIGHT,
          background: 'rgba(232,112,90,0.08)',
          borderTop: '1px solid var(--wimc-coral)', borderBottom: '1px solid var(--wimc-coral)',
          pointerEvents: 'none',
        }} />

        <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--wimc-border-subtle)' }}>
          <WheelColumn value={startTime} onChange={onStartTimeChange} ariaLabel="Start time" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <WheelColumn value={endTime} onChange={onEndTimeChange} ariaLabel="End time" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-syne)', fontSize: 19, fontWeight: 800, color: 'var(--wimc-text-primary)' }}>{to12Hour(startTime)}</span>
        <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>→</span>
        <span style={{ fontFamily: 'var(--font-syne)', fontSize: 19, fontWeight: 800, color: 'var(--wimc-text-primary)' }}>{to12Hour(endTime)}</span>
        {duration && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)', marginLeft: 4 }}>
            ({duration})
          </span>
        )}
      </div>
    </div>
  )
}
