'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'
import type { OnboardingAnswers } from '@/lib/adda/onboarding/machine'

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

type DayHours = { open: string; close: string; closed: boolean }
type WeeklyHours = Record<DayKey, DayHours>

function defaultWeek(): WeeklyHours {
  return Object.fromEntries(
    DAYS.map(d => [d.key, { open: '09:00', close: '22:00', closed: false }])
  ) as WeeklyHours
}

function formatGoogleHours(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const hours = raw as { weekday_text?: string[] }
  if (!Array.isArray(hours.weekday_text) || hours.weekday_text.length === 0) return null
  // Show first and last lines as a summary
  const lines = hours.weekday_text as string[]
  const first = lines[0]
  const last = lines[lines.length - 1]
  return first === last ? first : `${first} – ${last.split(': ')[1] ?? last}`
}

function parseGoogleHours(raw: unknown): WeeklyHours | null {
  if (!raw || typeof raw !== 'object') return null
  const hours = raw as { weekday_text?: string[] }
  if (!Array.isArray(hours.weekday_text)) return null
  // weekday_text is [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  const week = defaultWeek()
  const keys: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  hours.weekday_text.forEach((line, idx) => {
    const key = keys[idx]
    if (!key) return
    if (line.toLowerCase().includes('closed')) {
      week[key].closed = true
      return
    }
    // e.g. "Monday: 9:00 AM – 10:00 PM"
    const match = line.match(/(\d{1,2}:\d{2}\s?[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s?[AP]M)/i)
    if (match) {
      week[key].open = to24(match[1].trim())
      week[key].close = to24(match[2].trim())
    }
  })
  return week
}

function to24(time12: string): string {
  const [time, period] = time12.split(/\s+/)
  let [h, m] = (time ?? '').split(':').map(Number)
  if (!m) m = 0
  if (period?.toUpperCase() === 'PM' && h !== 12) h += 12
  if (period?.toUpperCase() === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function OpeningHoursStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const answers = snapshot.context.answers
  const venueName = answers.venueName ?? 'your venue'
  const googleHoursRaw = (answers as Record<string, unknown>).openingHours

  const googleSummary = formatGoogleHours(googleHoursRaw)
  const parsedGoogleHours = parseGoogleHours(googleHoursRaw)

  const [mode, setMode] = useState<'prompt' | 'custom'>(
    googleSummary && parsedGoogleHours ? 'prompt' : 'custom'
  )
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(
    (answers.openingHours as WeeklyHours | undefined) ?? defaultWeek()
  )
  const [bufferOpen, setBufferOpen] = useState(false)
  const [bufferBefore, setBufferBefore] = useState(30)
  const [bufferAfter, setBufferAfter] = useState(30)
  const [copyChipDay, setCopyChipDay] = useState<DayKey | null>(null)

  function acceptGoogle() {
    if (!parsedGoogleHours) return
    setWeeklyHours(parsedGoogleHours)
    handleConfirm(parsedGoogleHours)
  }

  function setCustom() {
    if (parsedGoogleHours) setWeeklyHours(parsedGoogleHours)
    setMode('custom')
  }

  function toggleDay(key: DayKey) {
    setWeeklyHours(prev => ({
      ...prev,
      [key]: { ...prev[key], closed: !prev[key].closed },
    }))
    setCopyChipDay(null)
  }

  function updateTime(key: DayKey, field: 'open' | 'close', value: string) {
    setWeeklyHours(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
    setCopyChipDay(key)
  }

  function copyToAll(sourceKey: DayKey) {
    const source = weeklyHours[sourceKey]
    setWeeklyHours(
      Object.fromEntries(DAYS.map(d => [d.key, { ...source }])) as WeeklyHours
    )
    setCopyChipDay(null)
  }

  function stepBuffer(field: 'before' | 'after', delta: number) {
    if (field === 'before') setBufferBefore(v => Math.max(0, Math.min(120, v + delta)))
    else setBufferAfter(v => Math.max(0, Math.min(120, v + delta)))
  }

  function handleConfirm(hours?: WeeklyHours) {
    const finalHours = hours ?? weeklyHours
    const payload: Partial<OnboardingAnswers> = {
      openingHours: finalHours as OnboardingAnswers['openingHours'],
    }
    handleAnswer(
      'openingHours',
      finalHours as OnboardingAnswers['openingHours'],
      'Opening hours set',
      payload,
    )
  }

  const canGoBack = snapshot.can({ type: 'BACK' })
  const hasAnyOpen = DAYS.some(d => !weeklyHours[d.key].closed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Google hours prompt */}
      {mode === 'prompt' && googleSummary && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '12px 14px',
            borderRadius: '4px 14px 14px 14px',
            background: 'var(--adda-bg-elevated)',
            border: '1px solid var(--adda-border-subtle)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--adda-text-secondary)', lineHeight: 1.55, marginBottom: 10 }}>
            Based on your Google listing, I see{' '}
            <strong style={{ color: 'var(--adda-text-primary)' }}>{venueName}</strong>
            {' '}is usually open{' '}
            <em style={{ color: 'var(--adda-amber)' }}>{googleSummary}</em>.
            {' '}Should I use these as your base availability?
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={acceptGoogle} style={chipAmber}>Yes, use these</button>
            <button onClick={setCustom} style={chipGhost}>Set custom hours</button>
          </div>
        </motion.div>
      )}

      {/* Custom hours table */}
      {mode === 'custom' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
        >
          {DAYS.map((day, idx) => {
            const dh = weeklyHours[day.key]
            const isOn = !dh.closed
            return (
              <div
                key={day.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 44,
                  padding: '0 4px',
                  borderBottom: idx < DAYS.length - 1 ? '1px solid var(--adda-border-subtle)' : 'none',
                  gap: 10,
                }}
              >
                <span style={{
                  width: 32,
                  fontSize: 13,
                  color: isOn ? 'var(--adda-text-primary)' : 'var(--adda-text-muted)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontWeight: isOn ? 500 : 400,
                  flexShrink: 0,
                }}>
                  {day.label}
                </span>

                <AnimatePresence>
                  {isOn && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}
                    >
                      <input
                        type="time"
                        value={dh.open}
                        onChange={e => updateTime(day.key, 'open', e.target.value)}
                        style={timeInput}
                      />
                      <span style={{ fontSize: 12, color: 'var(--adda-text-muted)', flexShrink: 0 }}>–</span>
                      <input
                        type="time"
                        value={dh.close}
                        onChange={e => updateTime(day.key, 'close', e.target.value)}
                        style={timeInput}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isOn && <span style={{ flex: 1, fontSize: 12, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>Closed</span>}

                {/* Toggle */}
                <button
                  onClick={() => toggleDay(day.key)}
                  aria-label={isOn ? `Close ${day.label}` : `Open ${day.label}`}
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: isOn ? 'var(--adda-amber)' : 'var(--adda-bg-overlay)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 150ms ease',
                  }}
                >
                  <span style={{
                    display: 'block',
                    position: 'absolute',
                    top: 2,
                    left: isOn ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 150ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>
            )
          })}

          {/* Copy to all chip */}
          <AnimatePresence>
            {copyChipDay && (
              <motion.button
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                onClick={() => copyToAll(copyChipDay)}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 8,
                  padding: '4px 10px',
                  borderRadius: 100,
                  border: '1px solid var(--adda-border-default)',
                  background: 'transparent',
                  color: 'var(--adda-text-muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  cursor: 'pointer',
                }}
              >
                Copy {DAYS.find(d => d.key === copyChipDay)?.label} to all days
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Buffer time (collapsed by default) */}
      {mode === 'custom' && (
        <div>
          <button
            onClick={() => setBufferOpen(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <ChevronIcon open={bufferOpen} />
            Buffer time
          </button>

          <AnimatePresence>
            {bufferOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--adda-bg-elevated)',
                  border: '1px solid var(--adda-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <p style={{
                    fontSize: 11,
                    color: 'var(--adda-text-muted)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    Buffer time blocks preparation and cleanup — creators won&apos;t be able to book back-to-back without this gap.
                  </p>
                  {[
                    { label: 'Before each booking', value: bufferBefore, field: 'before' as const },
                    { label: 'After each booking',  value: bufferAfter,  field: 'after' as const  },
                  ].map(row => (
                    <div key={row.field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--adda-text-secondary)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
                        {row.label}
                      </span>
                      <button onClick={() => stepBuffer(row.field, -15)} style={stepperBtn}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--adda-amber)', fontFamily: 'var(--font-inter), system-ui, sans-serif', minWidth: 42, textAlign: 'center' }}>
                        {row.value} min
                      </span>
                      <button onClick={() => stepBuffer(row.field, 15)} style={stepperBtn}>+</button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Confirm */}
      {mode === 'custom' && (
        <AnimatePresence>
          {hasAnyOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => handleConfirm()}
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
                Set hours →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

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

const timeInput: React.CSSProperties = {
  padding: '2px 4px',
  background: 'transparent',
  border: 'none',
  borderBottom: '1.5px solid var(--adda-amber)',
  color: 'var(--adda-text-primary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 13,
  outline: 'none',
  width: 76,
  colorScheme: 'dark',
}

const chipAmber: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 100,
  background: 'var(--adda-amber)',
  color: '#000',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  border: 'none',
  cursor: 'pointer',
}

const chipGhost: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 100,
  background: 'transparent',
  color: 'var(--adda-text-muted)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  border: '1px solid var(--adda-border-default)',
  cursor: 'pointer',
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
