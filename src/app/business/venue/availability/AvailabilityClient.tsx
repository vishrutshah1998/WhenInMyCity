'use client'

import { useState, useTransition } from 'react'
import type { AvailabilityRule } from '@/app/actions/adda-availability'
import {
  createAvailabilityRule,
  deleteAvailabilityRule,
  updateBookingWindow,
} from '@/app/actions/adda-availability'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const A = {
  bg:       'var(--venue-bg-base)',
  surface:  'var(--venue-bg-surface)',
  border:   'var(--venue-border)',
  text:     'var(--venue-text-primary)',
  textSub:  'var(--venue-text-secondary)',
  accent:   'var(--venue-accent)',
  error:    '#EF4444',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  addaId: string
  initialRules: AvailabilityRule[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupRules(rules: AvailabilityRule[]) {
  return {
    recurring: rules.filter(r => r.rule_type === 'recurring_closed'),
    holidays:  rules.filter(r => r.rule_type === 'holiday_block'),
    window:    rules.find(r => r.rule_type === 'booking_window') ?? null,
  }
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: A.surface, border: `1px solid ${A.border}`,
      borderRadius: 12, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${A.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: A.accent }}>
          {icon}
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: A.text }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function RuleChip({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'var(--venue-accent-muted, rgba(0,0,0,0.06))',
      border: `1px solid ${A.border}`, borderRadius: 8,
      padding: '6px 10px', margin: '4px',
    }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.text }}>{label}</span>
      <button
        onClick={onDelete}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.textSub, display: 'flex', padding: 0 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AvailabilityClient({ addaId, initialRules }: Props) {
  const [rules, setRules] = useState<AvailabilityRule[]>(initialRules)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Recurring closed form state
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd]     = useState('')

  // Holiday block form state
  const [holidayLabel, setHolidayLabel] = useState('')
  const [holidayStart, setHolidayStart] = useState('')
  const [holidayEnd,   setHolidayEnd]   = useState('')

  // Booking window state
  const { window: bookingWindow } = groupRules(rules)
  const [minDays, setMinDays] = useState(bookingWindow?.min_advance_days ?? 1)
  const [maxDays, setMaxDays] = useState(bookingWindow?.max_advance_days ?? 90)
  const [windowSaved, setWindowSaved] = useState(false)

  const { recurring, holidays } = groupRules(rules)

  function toggleDay(d: number) {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  async function addRecurringRule() {
    if (selectedDays.length === 0) return
    setError(null)
    startTransition(async () => {
      const { rule, error: err } = await createAvailabilityRule(addaId, {
        rule_type: 'recurring_closed',
        day_of_week: selectedDays,
        time_start: timeStart || null,
        time_end: timeEnd || null,
        date_start: null, date_end: null, label: null,
        min_advance_days: null, max_advance_days: null,
      })
      if (err || !rule) { setError(err ?? 'Failed to add rule'); return }
      setRules(prev => [...prev, rule])
      setSelectedDays([])
      setTimeStart('')
      setTimeEnd('')
    })
  }

  async function addHolidayBlock() {
    if (!holidayStart || !holidayEnd || !holidayLabel.trim()) return
    setError(null)
    startTransition(async () => {
      const { rule, error: err } = await createAvailabilityRule(addaId, {
        rule_type: 'holiday_block',
        day_of_week: null,
        time_start: null, time_end: null,
        date_start: holidayStart, date_end: holidayEnd,
        label: holidayLabel.trim(),
        min_advance_days: null, max_advance_days: null,
      })
      if (err || !rule) { setError(err ?? 'Failed to add holiday block'); return }
      setRules(prev => [...prev, rule])
      setHolidayLabel('')
      setHolidayStart('')
      setHolidayEnd('')
    })
  }

  async function removeRule(id: string) {
    setError(null)
    startTransition(async () => {
      const { error: err } = await deleteAvailabilityRule(id)
      if (err) { setError(err); return }
      setRules(prev => prev.filter(r => r.id !== id))
    })
  }

  async function saveBookingWindow() {
    setError(null)
    startTransition(async () => {
      const { error: err } = await updateBookingWindow(addaId, minDays, maxDays)
      if (err) { setError(err); return }
      setWindowSaved(true)
      setTimeout(() => setWindowSaved(false), 2500)
      // Refresh local rules to include the new window rule
      const { rule } = await createAvailabilityRule(addaId, {
        rule_type: 'booking_window',
        min_advance_days: minDays, max_advance_days: maxDays,
        day_of_week: null, time_start: null, time_end: null,
        date_start: null, date_end: null, label: null,
      }).then(() => ({ rule: null }))
      void rule
    })
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    background: A.bg, color: A.text,
    border: `1px solid ${A.border}`, borderRadius: 8,
    padding: '8px 12px', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    background: A.accent, color: '#fff',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13,
    padding: '8px 16px', border: 'none', borderRadius: 8,
    cursor: 'pointer', flexShrink: 0,
  }

  return (
    <div style={{ padding: '32px 32px', maxWidth: 740 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 24, color: A.text, margin: '0 0 6px' }}>
          Availability Rules
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: A.textSub, margin: 0 }}>
          Control when your venue is open for bookings. These rules apply on top of your daily schedule.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: `1px solid ${A.error}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.error,
        }}>
          {error}
        </div>
      )}

      {/* ── Recurring Closed Days ─────────────────────────────────────────── */}
      <SectionCard title="Recurring Closed Days" icon="event_busy">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub, margin: '0 0 14px' }}>
          Select days of the week when your venue is always unavailable.
        </p>

        {/* Day selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => toggleDay(i)}
              style={{
                background: selectedDays.includes(i) ? A.accent : 'transparent',
                color: selectedDays.includes(i) ? '#fff' : A.textSub,
                border: `1px solid ${selectedDays.includes(i) ? A.accent : A.border}`,
                borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Optional time window */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 4 }}>
              From (optional)
            </label>
            <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 4 }}>
              To (optional)
            </label>
            <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={addRecurringRule}
              disabled={selectedDays.length === 0 || isPending}
              style={{ ...btnStyle, opacity: selectedDays.length === 0 ? 0.4 : 1 }}
            >
              Add rule
            </button>
          </div>
        </div>

        {/* Existing rules */}
        {recurring.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {recurring.map(r => (
              <RuleChip
                key={r.id}
                label={`${(r.day_of_week ?? []).map(d => DAYS[d]).join(', ')}${r.time_start ? ` (${r.time_start}–${r.time_end ?? '?'})` : ''}`}
                onDelete={() => removeRule(r.id)}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, margin: 0 }}>
            No recurring closures added yet.
          </p>
        )}
      </SectionCard>

      {/* ── Holiday Blocks ────────────────────────────────────────────────── */}
      <SectionCard title="Holiday Blocks" icon="celebration">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub, margin: '0 0 14px' }}>
          Block out specific date ranges — holidays, renovations, private events.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 140 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 4 }}>Label</label>
            <input
              type="text" placeholder="e.g. Diwali break"
              value={holidayLabel} onChange={e => setHolidayLabel(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 4 }}>Start</label>
            <input type="date" value={holidayStart} onChange={e => setHolidayStart(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 4 }}>End</label>
            <input type="date" value={holidayEnd} onChange={e => setHolidayEnd(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={addHolidayBlock}
              disabled={!holidayStart || !holidayEnd || !holidayLabel.trim() || isPending}
              style={{ ...btnStyle, opacity: (!holidayStart || !holidayEnd || !holidayLabel.trim()) ? 0.4 : 1 }}
            >
              Block dates
            </button>
          </div>
        </div>

        {holidays.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {holidays.map(r => (
              <RuleChip
                key={r.id}
                label={`${r.label ?? 'Block'}: ${formatDate(r.date_start!)} – ${formatDate(r.date_end!)}`}
                onDelete={() => removeRule(r.id)}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, margin: 0 }}>
            No holiday blocks added yet.
          </p>
        )}
      </SectionCard>

      {/* ── Booking Window ────────────────────────────────────────────────── */}
      <SectionCard title="Booking Window" icon="schedule">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub, margin: '0 0 16px' }}>
          Control how far in advance creators can book your space.
        </p>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 6 }}>
              Minimum advance notice
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={0} max={14} value={minDays}
                onChange={e => setMinDays(Number(e.target.value))}
                style={{ width: 160 }}
              />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: A.text, minWidth: 60 }}>
                {minDays === 0 ? 'Same day' : `${minDays}d`}
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, display: 'block', marginBottom: 6 }}>
              Maximum booking horizon
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={30} max={365} step={30} value={maxDays}
                onChange={e => setMaxDays(Number(e.target.value))}
                style={{ width: 160 }}
              />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: A.text, minWidth: 60 }}>
                {maxDays}d
              </span>
            </div>
          </div>

          <button
            onClick={saveBookingWindow}
            disabled={isPending}
            style={{ ...btnStyle, background: windowSaved ? '#22C55E' : A.accent }}
          >
            {windowSaved ? '✓ Saved' : 'Save window'}
          </button>
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, margin: '12px 0 0' }}>
          Creators can book between {minDays === 0 ? 'same day' : `${minDays} day${minDays !== 1 ? 's' : ''}`} and {maxDays} days in advance.
        </p>
      </SectionCard>

    </div>
  )
}
