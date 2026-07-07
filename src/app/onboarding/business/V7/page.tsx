'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { VenueNoticePoster } from '@/components/onboarding/BoardingPassArtifact'
import { saveVenueOnboardingStep } from '@/app/actions/venue-onboarding'

const ACCENT = '#5DD9D0'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const OUTFIT = "'Outfit', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"

const PRICING_MODELS = [
  { id: 'hourly', icon: 'schedule',   label: 'HOURLY',      desc: 'Creators pay a flat hourly rate for the space.' },
  { id: 'split',  icon: 'analytics',  label: 'DOOR SPLIT',  desc: 'Revenue sharing based on ticket sales.' },
  { id: 'hybrid', icon: 'layers',     label: 'HYBRID',      desc: 'Small booking fee + minor split on ticket sales.' },
  { id: 'fnb',    icon: 'restaurant', label: 'F&B MINIMUM', desc: 'No rent — just a guaranteed min food/drink spend.' },
] as const

type PricingId = typeof PRICING_MODELS[number]['id']

// Map display IDs → valid Supabase enum values
const PRICING_TO_VALID: Record<PricingId, 'fixed_rental'|'door_split'|'hybrid'|'f_and_b_minimum'> = {
  hourly: 'fixed_rental',
  split:  'door_split',
  hybrid: 'hybrid',
  fnb:    'f_and_b_minimum',
}

const EVENT_TYPES = [
  'Gigs', 'Workshops', 'Screenings', 'Concerts', 'Art Shows',
  'Open Mic', 'Networking', 'Pop-ups', 'Stand-up', 'Dance',
  'Yoga', 'Gaming', 'Parties', 'Meetups', 'Talks',
  'Rehearsals', 'Podcasts', 'Book Launch', 'DJ Night', 'Poetry Slam',
  'Photography Shoot', 'Film Shoot', 'Theatre',
] as const

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
type DayKey = typeof DAYS[number]
type TimeSlot = { open: string; close: string }
type DayScheduleMap = Partial<Record<DayKey, { enabled: boolean; slots: TimeSlot[] }>>

const LEAD_OPTIONS = ['1 week', '2 weeks', '1 month+'] as const

// Google Places day index (0=Sun … 6=Sat) → our day key
const DAY_TO_GOOGLE_NUM: Record<DayKey, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
}

// Derive morning/afternoon/evening/late_night buckets from per-day schedules
function slotsToTimeBuckets(schedules: DayScheduleMap): string[] {
  const b = new Set<string>()
  for (const day of DAYS) {
    const s = schedules[day]
    if (!s?.enabled) continue
    for (const slot of s.slots) {
      const oh = parseInt(slot.open.split(':')[0])
      let   ch = parseInt(slot.close.split(':')[0])
      if (ch <= oh) ch += 24           // overnight (e.g., 23:00 → 01:00)
      if (oh < 12 && ch > 9)  b.add('morning')
      if (oh < 17 && ch > 12) b.add('afternoon')
      if (oh < 22 && ch > 17) b.add('evening')
      if (ch > 22)             b.add('late_night')
    }
  }
  return Array.from(b)
}

const TYPE_SUGGESTIONS: Record<string, string[]> = {
  cafe:           ['Workshops', 'Meetups', 'Networking', 'Open Mic', 'Art Shows'],
  studio:         ['Gigs', 'Concerts', 'Open Mic', 'DJ Night', 'Dance'],
  gallery:        ['Art Shows', 'Workshops', 'Pop-ups', 'Networking', 'Screenings'],
  rooftop:        ['Gigs', 'DJ Night', 'Networking', 'Concerts', 'Stand-up'],
  restaurant:     ['Networking', 'Pop-ups', 'Meetups', 'Concerts', 'Stand-up'],
  coworking:      ['Workshops', 'Networking', 'Meetups', 'Talks', 'Screenings'],
  community_hall: ['Concerts', 'Workshops', 'Screenings', 'Theatre', 'Networking'],
  garden:         ['Gigs', 'Yoga', 'Pop-ups', 'Art Shows', 'Networking'],
  library:        ['Talks', 'Workshops', 'Meetups', 'Screenings', 'Networking'],
}

const DAY_FULL: Record<string, 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday'> = {
  MON: 'monday', TUE: 'tuesday', WED: 'wednesday', THU: 'thursday',
  FRI: 'friday', SAT: 'saturday', SUN: 'sunday',
}

// 24h "HH:MM" ↔ 12h parts
function to12h(t: string): { h: string; m: string; period: 'AM' | 'PM' } {
  const [hh, mm] = (t || '00:00').split(':').map(Number)
  const period: 'AM' | 'PM' = hh < 12 ? 'AM' : 'PM'
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh
  return { h: String(h12).padStart(2, '0'), m: String(mm).padStart(2, '0'), period }
}
function from12h(h: string, m: string, period: 'AM' | 'PM'): string {
  let hh = parseInt(h, 10)
  if (period === 'AM' && hh === 12) hh = 0
  if (period === 'PM' && hh !== 12) hh += 12
  return `${String(hh).padStart(2, '0')}:${m}`
}
function fmt12h(t: string): string {
  const { h, m, period } = to12h(t)
  return `${h}:${m} ${period}`
}

const HOUR_OPTS = ['01','02','03','04','05','06','07','08','09','10','11','12']
const MIN_OPTS  = ['00','15','30','45']

function TimeInput({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const { h, m, period } = to12h(value)
  // include current minute in options if not already there
  const mins = MIN_OPTS.includes(m) ? MIN_OPTS : [...MIN_OPTS, m].sort()
  const selStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', outline: 'none',
    fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
    fontSize: 13, color: '#F0EFF8', cursor: 'pointer',
    padding: '3px 2px', colorScheme: 'dark' as React.CSSProperties['colorScheme'],
    appearance: 'none' as React.CSSProperties['appearance'],
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.18)', paddingBottom: 1 }}>
      <select value={h} onChange={e => onChange(from12h(e.target.value, m, period))} style={{ ...selStyle, width: 28 }}>
        {HOUR_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.30)', lineHeight: 1 }}>:</span>
      <select value={m} onChange={e => onChange(from12h(h, e.target.value, period))} style={{ ...selStyle, width: 28 }}>
        {mins.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <button
        type="button"
        onClick={() => onChange(from12h(h, m, period === 'AM' ? 'PM' : 'AM'))}
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: '0.08em', color: accent,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 3px', lineHeight: 1, marginLeft: 2,
        }}
      >{period}</button>
    </div>
  )
}


export default function V7Page() {
  const router = useRouter()

  const [pricingModel,  setPricingModel]  = useState<string>('')
  const [pricingAmount, setPricingAmount] = useState<string>('')
  const [pricingSplit,  setPricingSplit]  = useState<string>('')
  const [eventTypes,    setEventTypes]    = useState<string[]>([])
  const [daySchedules,    setDaySchedules]    = useState<DayScheduleMap>({})
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [leadTime,        setLeadTime]        = useState<string>('1 week')
  const [isSaving,        setIsSaving]        = useState(false)
  const [bName,           setBName]           = useState('')
  const [bCity,           setBCity]           = useState('')
  const [vType,           setVType]           = useState('')
  const [suggestions,     setSuggestions]     = useState<string[]>([])
  const [googleHint,      setGoogleHint]      = useState(false)
  const [priceLevel,      setPriceLevel]      = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')

    let firstType = ''
    try {
      const types = sessionStorage.getItem(SK.v_types)
      if (types) {
        const parsed = JSON.parse(types) as string[]
        if (parsed[0]) { setVType(parsed[0]); firstType = parsed[0] }
      }
    } catch {}

    const suggested = firstType ? (TYPE_SUGGESTIONS[firstType] ?? []) : []
    setSuggestions(suggested)

    const pl = parseFloat(sessionStorage.getItem('wimc_ob_v_price_level') ?? '')
    if (!isNaN(pl)) setPriceLevel(pl)

    // Pricing — stored as display ID ('hourly', 'split', etc.)
    const savedPricing = sessionStorage.getItem(SK.v_pricing)
    if (savedPricing) {
      const displayId = PRICING_MODELS.find(p => p.id === savedPricing || PRICING_TO_VALID[p.id as PricingId] === savedPricing)?.id
      if (displayId) setPricingModel(displayId)
    }
    const savedAmount = sessionStorage.getItem(SK.v_pricing_amount)
    if (savedAmount) setPricingAmount(savedAmount)
    const savedSplit = sessionStorage.getItem(SK.v_pricing_split)
    if (savedSplit) setPricingSplit(savedSplit)

    // Event types — prefer saved, then smart defaults
    try {
      const savedEvents = sessionStorage.getItem(SK.v_events)
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents) as string[]
        if (parsed.length > 0) {
          setEventTypes(parsed)
        } else if (suggested.length > 0) {
          const preset = suggested.slice(0, 3)
          setEventTypes(preset)
          sessionStorage.setItem(SK.v_events, JSON.stringify(preset))
        }
      } else if (suggested.length > 0) {
        const preset = suggested.slice(0, 3)
        setEventTypes(preset)
        sessionStorage.setItem(SK.v_events, JSON.stringify(preset))
      }
    } catch {}

    // Per-day schedules — prefer saved, fall back to Google, then all-day default
    const DEFAULT_SLOT: TimeSlot = { open: '11:00', close: '22:00' }
    const savedScheds = sessionStorage.getItem(SK.v_day_schedules)
    // Try restoring a previously saved schedule
    let restored = false
    if (savedScheds) {
      try {
        const parsed = JSON.parse(savedScheds) as DayScheduleMap
        if (Object.keys(parsed).length > 0) {
          setDaySchedules(parsed)
          setIsEditingSchedule(true)
          restored = true
        }
      } catch {}
    }

    if (!restored) {
      // Build initial schedule: prefer Google opening hours, else all-open default
      const initial: DayScheduleMap = {}
      const ohRaw = sessionStorage.getItem(SK.v_opening_hours)
      if (ohRaw) {
        try {
          const oh = JSON.parse(ohRaw) as Record<string, { open: string; close: string } | null>
          let hasAnyHours = false
          for (const day of DAYS) {
            const hours = oh[DAY_TO_GOOGLE_NUM[day]]
            if (hours) hasAnyHours = true
            initial[day] = {
              enabled: !!hours,
              slots:   hours ? [{ open: hours.open, close: hours.close }] : [DEFAULT_SLOT],
            }
          }
          if (hasAnyHours) {
            setGoogleHint(true)
            // Show compact summary first — user clicks EDIT to adjust
          } else {
            for (const day of DAYS) initial[day] = { enabled: true, slots: [DEFAULT_SLOT] }
            setIsEditingSchedule(true)
          }
        } catch {
          for (const day of DAYS) initial[day] = { enabled: true, slots: [DEFAULT_SLOT] }
          setIsEditingSchedule(true)
        }
      } else {
        for (const day of DAYS) initial[day] = { enabled: true, slots: [DEFAULT_SLOT] }
        setIsEditingSchedule(true)
      }
      setDaySchedules(initial)
    }

    // Lead time
    const savedLead = sessionStorage.getItem(SK.v_lead)
    if (savedLead) setLeadTime(savedLead)
    else sessionStorage.setItem(SK.v_lead, '1 week')
  }, [router])

  function toggleEventType(type: string) {
    setEventTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      try { sessionStorage.setItem(SK.v_events, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function saveDaySchedules(next: DayScheduleMap) {
    setDaySchedules(next)
    try { sessionStorage.setItem(SK.v_day_schedules, JSON.stringify(next)) } catch {}
    // keep v_days in sync for right-panel snapshot
    const enabled = DAYS.filter(d => next[d]?.enabled)
    try { sessionStorage.setItem(SK.v_days, JSON.stringify(enabled)) } catch {}
  }

  function toggleDayEnabled(day: DayKey) {
    setGoogleHint(false)
    saveDaySchedules({
      ...daySchedules,
      [day]: { ...daySchedules[day], enabled: !daySchedules[day]?.enabled },
    })
  }

  function updateSlot(day: DayKey, idx: number, field: 'open' | 'close', val: string) {
    const sched = daySchedules[day] ?? { enabled: true, slots: [{ open: '11:00', close: '22:00' }] }
    const slots = sched.slots.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    saveDaySchedules({ ...daySchedules, [day]: { ...sched, slots } })
  }

  function addSlot(day: DayKey) {
    const sched = daySchedules[day]
    if (!sched || sched.slots.length >= 3) return
    const last  = sched.slots[sched.slots.length - 1]
    const newOpen = last?.close ?? '18:00'
    saveDaySchedules({ ...daySchedules, [day]: { ...sched, slots: [...sched.slots, { open: newOpen, close: '23:00' }] } })
  }

  function removeSlot(day: DayKey, idx: number) {
    const sched = daySchedules[day]
    if (!sched || sched.slots.length <= 1) return
    saveDaySchedules({ ...daySchedules, [day]: { ...sched, slots: sched.slots.filter((_, i) => i !== idx) } })
  }

  function applyFirstHoursToAll() {
    const firstEnabled = DAYS.find(d => daySchedules[d]?.enabled)
    if (!firstEnabled) return
    const refSlots = daySchedules[firstEnabled]!.slots
    const next = { ...daySchedules }
    for (const day of DAYS) {
      if (next[day]?.enabled) next[day] = { enabled: true, slots: refSlots.map(s => ({ ...s })) }
    }
    saveDaySchedules(next)
  }

  async function handleNext() {
    if (isSaving) return
    setIsSaving(true)
    try {
      const enabledKeys = DAYS.filter(d => daySchedules[d]?.enabled)
      const fullDays    = enabledKeys
        .map(d => DAY_FULL[d])
        .filter((d): d is 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday' => !!d)
      const timeBuckets = slotsToTimeBuckets(daySchedules)

      sessionStorage.setItem(SK.v_pricing,        pricingModel)
      sessionStorage.setItem(SK.v_pricing_amount, pricingAmount)
      sessionStorage.setItem(SK.v_pricing_split,  pricingSplit)
      sessionStorage.setItem(SK.v_events,         JSON.stringify(eventTypes))
      sessionStorage.setItem(SK.v_days,           JSON.stringify(enabledKeys))
      sessionStorage.setItem(SK.v_times,          JSON.stringify(timeBuckets))
      sessionStorage.setItem(SK.v_day_schedules,  JSON.stringify(daySchedules))
      sessionStorage.setItem(SK.v_lead,           leadTime)

      if (pricingModel) {
        const validModel = PRICING_TO_VALID[pricingModel as PricingId] ?? 'fixed_rental'
        const amountPaise = pricingAmount ? Math.round(parseFloat(pricingAmount) * 100) : undefined
        const splitPct    = pricingSplit  ? parseFloat(pricingSplit)  : undefined

        const pricing_config: Record<string, number> = {}
        if (validModel === 'fixed_rental'   && amountPaise) pricing_config.fixed_rental_paise   = amountPaise
        if (validModel === 'door_split'     && splitPct    !== undefined) pricing_config.door_split_percent    = splitPct
        if (validModel === 'hybrid') {
          if (amountPaise)            pricing_config.hybrid_rental_paise  = amountPaise
          if (splitPct !== undefined) pricing_config.hybrid_split_percent = splitPct
        }
        if (validModel === 'f_and_b_minimum' && amountPaise) pricing_config.f_and_b_minimum_paise = amountPaise

        await saveVenueOnboardingStep(3, {
          step:           3,
          amenities:      [],
          pricing_model:  validModel,
          pricing_config,
          available_days: fullDays,
        })
      }
    } catch {}
    router.push('/onboarding/business/V8')
  }

  const canProceed = pricingModel !== '' && eventTypes.length >= 1

  const sortedEventTypes = [
    ...EVENT_TYPES.filter(e => suggestions.includes(e)),
    ...EVENT_TYPES.filter(e => !suggestions.includes(e)),
  ]

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <VenueNoticePoster
          name={bName || undefined}
          city={bCity || undefined}
          type={vType || undefined}
          accent={ACCENT}
        />

        <p style={{
          fontFamily:    BARLOW, fontWeight: 600, fontSize: 10,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color:         `${ACCENT}99`, margin: '0 0 10px',
        }}>
          — HOW YOU WORK WITH CREATORS
        </p>
        <h1 style={{
          fontFamily: ABRIL, fontSize: 'clamp(28px, 7vw, 44px)',
          color: '#F0EFF8', lineHeight: 1.05,
          margin: '0 0 8px',
        }}>
          Pricing + what you want to host.
        </h1>
        <p style={{ fontFamily: DM, fontSize: 13, color: '#9896B0', margin: '0 0 32px' }}>
          Tell creators how bookings work and what events you want.
        </p>

        {/* ── SECTION 1: Pricing Model ─────────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: priceLevel !== null ? 6 : 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              PRICING MODEL
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#5C5A72' }}>SELECT ONE</span>
          </div>
          {priceLevel !== null && (
            <p style={{ fontFamily: DM, fontSize: 12, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic', margin: '0 0 12px' }}>
              {priceLevel <= 2
                ? 'Budget-friendly venues often use Fixed Rental for predictable income.'
                : 'Premium spaces often do well with Door Split or F&B Minimum.'}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {PRICING_MODELS.map(pm => {
              const isSel = pricingModel === pm.id
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    const next = isSel ? '' : pm.id
                    if (next !== pricingModel) {
                      setPricingAmount('')
                      setPricingSplit('')
                      try { sessionStorage.removeItem(SK.v_pricing_amount); sessionStorage.removeItem(SK.v_pricing_split) } catch {}
                    }
                    setPricingModel(next)
                    try { sessionStorage.setItem(SK.v_pricing, next) } catch {}
                  }}
                  style={{
                    display:       'flex', flexDirection: 'column', gap: 6,
                    padding:       '16px 14px',
                    background:    isSel ? ACCENT : '#09090E',
                    border:        isSel ? 'none' : '2px solid rgba(255,255,255,0.10)',
                    cursor:        'pointer', textAlign: 'left',
                    transition:    'all 150ms',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize:             24, lineHeight: 1,
                      color:                isSel ? '#1A2744' : 'rgba(255,255,255,0.45)',
                      fontVariationSettings: isSel ? "'FILL' 1" : "'FILL' 0",
                      transition:           'all 150ms',
                    }}
                  >
                    {pm.icon}
                  </span>
                  <span style={{
                    fontFamily:    BARLOW, fontWeight: 700, fontSize: 18,
                    letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
                    color:         isSel ? '#1A2744' : '#F0EFF8', transition: 'color 150ms',
                  }}>
                    {pm.label}
                  </span>
                  <span style={{
                    fontFamily: DM, fontSize: 12, lineHeight: 1.4,
                    color:      isSel ? 'rgba(26,39,68,0.65)' : 'rgba(255,255,255,0.38)',
                    transition: 'color 150ms',
                  }}>
                    {pm.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── SECTION 1.5: Pricing Details (conditional) ───────────────────── */}
        {pricingModel && (
          <section style={{ marginBottom: 36, animation: 'fadeSlideIn 200ms ease-out' }}>
            <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {pricingModel === 'hourly' ? 'YOUR HOURLY RATE'
                  : pricingModel === 'split' ? 'YOUR REVENUE SHARE'
                  : pricingModel === 'hybrid' ? 'BOOKING FEE + REVENUE SHARE'
                  : 'F&B MINIMUM SPEND'}
              </span>
            </div>

            {/* HOURLY: single rate input */}
            {pricingModel === 'hourly' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {['500', '1000', '1500', '2000', '3000'].map(v => (
                    <button key={v} type="button"
                      onClick={() => { setPricingAmount(v); try { sessionStorage.setItem(SK.v_pricing_amount, v) } catch {} }}
                      style={{
                        padding: '6px 14px', cursor: 'pointer', transition: 'all 120ms',
                        background: pricingAmount === v ? ACCENT : 'transparent',
                        border: `1px solid ${pricingAmount === v ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                        fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
                        color: pricingAmount === v ? '#1A2744' : 'rgba(255,255,255,0.50)',
                      }}>₹{v}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 18, color: ACCENT }}>₹</span>
                  <input
                    type="number" inputMode="numeric" placeholder="Custom amount / hour"
                    value={pricingAmount}
                    onChange={e => { setPricingAmount(e.target.value); try { sessionStorage.setItem(SK.v_pricing_amount, e.target.value) } catch {} }}
                    style={{
                      flex: 1, background: '#09090E', border: '1px solid rgba(255,255,255,0.16)',
                      padding: '10px 14px', fontFamily: MONO, fontSize: 16,
                      color: '#F0EFF8', outline: 'none',
                    }}
                  />
                  <span style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', whiteSpace: 'nowrap' }}>per hr</span>
                </div>
                {pricingAmount && (
                  <p style={{ fontFamily: DM, fontSize: 11, color: ACCENT, margin: '8px 0 0' }}>
                    ₹{parseInt(pricingAmount).toLocaleString('en-IN')} / hour — creators see this before booking
                  </p>
                )}
              </>
            )}

            {/* DOOR SPLIT: % chips + custom */}
            {pricingModel === 'split' && (
              <>
                <p style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', margin: '0 0 12px' }}>
                  Your share of ticket revenue. Creators keep the rest.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {['10', '15', '20', '25', '30', '40'].map(v => (
                    <button key={v} type="button"
                      onClick={() => { setPricingSplit(v); try { sessionStorage.setItem(SK.v_pricing_split, v) } catch {} }}
                      style={{
                        padding: '8px 16px', cursor: 'pointer', transition: 'all 120ms',
                        background: pricingSplit === v ? ACCENT : 'transparent',
                        border: `1px solid ${pricingSplit === v ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                        fontFamily: MONO, fontSize: 13, letterSpacing: '0.04em',
                        color: pricingSplit === v ? '#1A2744' : 'rgba(255,255,255,0.50)',
                      }}>{v}%</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number" inputMode="numeric" placeholder="Custom %" min={1} max={99}
                    value={pricingSplit}
                    onChange={e => { setPricingSplit(e.target.value); try { sessionStorage.setItem(SK.v_pricing_split, e.target.value) } catch {} }}
                    style={{
                      flex: 1, background: '#09090E', border: '1px solid rgba(255,255,255,0.16)',
                      padding: '10px 14px', fontFamily: MONO, fontSize: 16,
                      color: '#F0EFF8', outline: 'none',
                    }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 18, color: ACCENT }}>%</span>
                  <span style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', whiteSpace: 'nowrap' }}>your share</span>
                </div>
                {pricingSplit && (
                  <p style={{ fontFamily: DM, fontSize: 11, color: ACCENT, margin: '8px 0 0' }}>
                    You get {pricingSplit}% — creators keep {100 - parseInt(pricingSplit)}% of ticket revenue
                  </p>
                )}
              </>
            )}

            {/* HYBRID: booking fee + split */}
            {pricingModel === 'hybrid' && (
              <>
                <p style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', margin: '0 0 16px' }}>
                  A small upfront fee to confirm the booking, plus a share of ticket revenue.
                </p>
                {/* Booking fee */}
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    BOOKING FEE (₹)
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['500', '1000', '1500', '2000'].map(v => (
                      <button key={v} type="button"
                        onClick={() => { setPricingAmount(v); try { sessionStorage.setItem(SK.v_pricing_amount, v) } catch {} }}
                        style={{
                          padding: '6px 14px', cursor: 'pointer', transition: 'all 120ms',
                          background: pricingAmount === v ? ACCENT : 'transparent',
                          border: `1px solid ${pricingAmount === v ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                          fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
                          color: pricingAmount === v ? '#1A2744' : 'rgba(255,255,255,0.50)',
                        }}>₹{v}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 18, color: ACCENT }}>₹</span>
                    <input
                      type="number" inputMode="numeric" placeholder="Custom booking fee"
                      value={pricingAmount}
                      onChange={e => { setPricingAmount(e.target.value); try { sessionStorage.setItem(SK.v_pricing_amount, e.target.value) } catch {} }}
                      style={{
                        flex: 1, background: '#09090E', border: '1px solid rgba(255,255,255,0.16)',
                        padding: '10px 14px', fontFamily: MONO, fontSize: 16,
                        color: '#F0EFF8', outline: 'none',
                      }}
                    />
                  </div>
                </div>
                {/* Revenue split */}
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    + REVENUE SHARE (YOUR %)
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['5', '10', '15', '20'].map(v => (
                      <button key={v} type="button"
                        onClick={() => { setPricingSplit(v); try { sessionStorage.setItem(SK.v_pricing_split, v) } catch {} }}
                        style={{
                          padding: '6px 14px', cursor: 'pointer', transition: 'all 120ms',
                          background: pricingSplit === v ? ACCENT : 'transparent',
                          border: `1px solid ${pricingSplit === v ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                          fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
                          color: pricingSplit === v ? '#1A2744' : 'rgba(255,255,255,0.50)',
                        }}>{v}%</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number" inputMode="numeric" placeholder="Custom %" min={1} max={99}
                      value={pricingSplit}
                      onChange={e => { setPricingSplit(e.target.value); try { sessionStorage.setItem(SK.v_pricing_split, e.target.value) } catch {} }}
                      style={{
                        flex: 1, background: '#09090E', border: '1px solid rgba(255,255,255,0.16)',
                        padding: '10px 14px', fontFamily: MONO, fontSize: 16,
                        color: '#F0EFF8', outline: 'none',
                      }}
                    />
                    <span style={{ fontFamily: MONO, fontSize: 18, color: ACCENT }}>%</span>
                    <span style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', whiteSpace: 'nowrap' }}>your share</span>
                  </div>
                </div>
              </>
            )}

            {/* F&B MINIMUM: spend input */}
            {pricingModel === 'fnb' && (
              <>
                <p style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', margin: '0 0 12px' }}>
                  The minimum total F&B bill the creator's group must spend during the event.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {['2000', '5000', '10000', '15000', '20000'].map(v => (
                    <button key={v} type="button"
                      onClick={() => { setPricingAmount(v); try { sessionStorage.setItem(SK.v_pricing_amount, v) } catch {} }}
                      style={{
                        padding: '6px 14px', cursor: 'pointer', transition: 'all 120ms',
                        background: pricingAmount === v ? ACCENT : 'transparent',
                        border: `1px solid ${pricingAmount === v ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                        fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em',
                        color: pricingAmount === v ? '#1A2744' : 'rgba(255,255,255,0.50)',
                      }}>₹{parseInt(v).toLocaleString('en-IN')}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 18, color: ACCENT }}>₹</span>
                  <input
                    type="number" inputMode="numeric" placeholder="Custom minimum spend"
                    value={pricingAmount}
                    onChange={e => { setPricingAmount(e.target.value); try { sessionStorage.setItem(SK.v_pricing_amount, e.target.value) } catch {} }}
                    style={{
                      flex: 1, background: '#09090E', border: '1px solid rgba(255,255,255,0.16)',
                      padding: '10px 14px', fontFamily: MONO, fontSize: 16,
                      color: '#F0EFF8', outline: 'none',
                    }}
                  />
                  <span style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', whiteSpace: 'nowrap' }}>total</span>
                </div>
                {pricingAmount && (
                  <p style={{ fontFamily: DM, fontSize: 11, color: ACCENT, margin: '8px 0 0' }}>
                    Creators must ensure ₹{parseInt(pricingAmount).toLocaleString('en-IN')} in F&B sales for their group
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* ── SECTION 2: Event Preferences ─────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              EVENT PREFERENCES
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: ACCENT }}>
              {eventTypes.length} / {EVENT_TYPES.length} selected
            </span>
          </div>
          <p style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', margin: '0 0 12px' }}>
            We use this to match you with the right creators.
          </p>
          {suggestions.length > 0 && (
            <p style={{ fontFamily: DM, fontSize: 11, color: '#5C5A72', margin: '0 0 10px' }}>
              ✦ Recommended for your venue type shown first
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sortedEventTypes.map(type => {
              const isSel = eventTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleEventType(type)}
                  style={{
                    padding:       '4px 12px',
                    background:    isSel ? ACCENT : '#1A2744',
                    border:        `1px solid ${isSel ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                    cursor:        'pointer',
                    fontFamily:    MONO, fontWeight: isSel ? 700 : 400,
                    fontSize:      10, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color:         isSel ? '#1A2744' : 'rgba(255,255,255,0.50)',
                    transition:    'all 120ms',
                    whiteSpace:    'nowrap',
                  }}
                >
                  {type}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── SECTION 3: Availability ───────────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <style>{`
            select option { background: #1A2744; color: #F0EFF8; }
          `}</style>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              AVAILABILITY
            </span>
            {googleHint && !isEditingSchedule && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: DM, fontSize: 11, color: `${ACCENT}99` }}>✦ From Google</span>
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(true)}
                  style={{
                    background: ACCENT, border: 'none', cursor: 'pointer',
                    fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: '0.12em',
                    color: '#1A2744', padding: '4px 10px', textTransform: 'uppercase',
                  }}
                >EDIT</button>
              </div>
            )}
            {googleHint && isEditingSchedule && (
              <span style={{ fontFamily: DM, fontSize: 11, color: `${ACCENT}80` }}>✦ From Google · editing</span>
            )}
          </div>

          {/* ── Summary view (Google pre-fill, not yet editing) ── */}
          {!isEditingSchedule && Object.keys(daySchedules).length > 0 && (
            <div
              onClick={() => setIsEditingSchedule(true)}
              style={{
                border: `1px solid rgba(93,217,208,0.20)`,
                background: `rgba(93,217,208,0.04)`,
                padding: '12px 16px',
                cursor: 'pointer',
                marginBottom: 0,
              }}
            >
              {DAYS.map(day => {
                const sched = daySchedules[day]
                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em',
                      color: sched?.enabled ? ACCENT : 'rgba(255,255,255,0.18)',
                      width: 36, flexShrink: 0,
                    }}>{day}</span>
                    {sched?.enabled ? (
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#F0EFF8' }}>
                        {sched.slots.map((s, i) => (
                          <span key={i}>
                            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 6px' }}>·</span>}
                            {fmt12h(s.open)} – {fmt12h(s.close)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ fontFamily: DM, fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>Closed</span>
                    )}
                  </div>
                )
              })}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: `${ACCENT}80`, lineHeight: 1 }}>edit</span>
                <span style={{ fontFamily: DM, fontSize: 11, color: `${ACCENT}80` }}>Tap to edit schedule</span>
              </div>
            </div>
          )}

          {/* ── Edit view ── */}
          <div style={{ display: isEditingSchedule ? 'flex' : 'none', flexDirection: 'column' }}>
            {DAYS.map(day => {
              const sched = daySchedules[day] ?? { enabled: false, slots: [{ open: '11:00', close: '22:00' }] }
              return (
                <div key={day} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {/* Day label */}
                  <button
                    type="button"
                    onClick={() => toggleDayEnabled(day)}
                    style={{
                      width: 36, textAlign: 'left', flexShrink: 0,
                      fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em',
                      color: sched.enabled ? ACCENT : 'rgba(255,255,255,0.20)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      transition: 'color 150ms',
                    }}
                  >{day}</button>

                  {/* Active dot */}
                  <div
                    onClick={() => toggleDayEnabled(day)}
                    style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: sched.enabled ? ACCENT : 'rgba(255,255,255,0.10)',
                      cursor: 'pointer', transition: 'background 150ms',
                    }}
                  />

                  {sched.enabled ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sched.slots.map((slot, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <TimeInput
                            value={slot.open}
                            onChange={v => updateSlot(day, i, 'open', v)}
                            accent={ACCENT}
                          />
                          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.20)' }}>→</span>
                          <TimeInput
                            value={slot.close}
                            onChange={v => updateSlot(day, i, 'close', v)}
                            accent={ACCENT}
                          />
                          {sched.slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlot(day, i)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: MONO, fontSize: 14, lineHeight: 1, padding: '0 2px',
                                color: 'rgba(255,255,255,0.22)',
                              }}
                            >×</button>
                          )}
                        </div>
                      ))}
                      {sched.slots.length < 3 && (
                        <button
                          type="button"
                          onClick={() => addSlot(day)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontFamily: MONO, fontSize: 9, letterSpacing: '0.10em',
                            color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', textAlign: 'left',
                          }}
                        >+ ADD SLOT</button>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontFamily: DM, fontSize: 12, color: 'rgba(255,255,255,0.18)', marginTop: 2 }}>
                      Closed
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Apply first day's hours to all open days — edit mode only */}
          {isEditingSchedule && DAYS.some(d => daySchedules[d]?.enabled) && (
            <button
              type="button"
              onClick={applyFirstHoursToAll}
              style={{
                marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.10em', textTransform: 'uppercase',
              }}
            >
              ↓ COPY {(DAYS.find(d => daySchedules[d]?.enabled) ?? 'MON')}'S HOURS TO ALL OPEN DAYS
            </button>
          )}
        </section>

        {/* ── SECTION 4: Lead Time ─────────────────────────────────────────── */}
        <section>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              BOOKING LEAD TIME
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {LEAD_OPTIONS.map(opt => {
              const isSel = leadTime === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setLeadTime(opt)
                    try { sessionStorage.setItem(SK.v_lead, opt) } catch {}
                  }}
                  style={{
                    flex:          1, padding: '10px 0', textAlign: 'center',
                    background:    isSel ? ACCENT : 'transparent',
                    border:        `1px solid ${isSel ? 'transparent' : 'rgba(255,255,255,0.16)'}`,
                    cursor:        'pointer',
                    fontFamily:    MONO, fontWeight: isSel ? 700 : 400,
                    fontSize:      12, letterSpacing: '0.04em',
                    color:         isSel ? '#1A2744' : 'rgba(255,255,255,0.40)',
                    transition:    'all 120ms',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          <p style={{ fontFamily: DM, fontSize: 12, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic', margin: '10px 0 0' }}>
            Most spaces on WIMC request 2 weeks&apos; notice. You can update this from your dashboard any time.
          </p>
        </section>
      </div>

      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, height: 72,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: `linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)`,
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/business/V6')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || isSaving}
          style={{
            background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
            color:         canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:    BARLOW, fontWeight: 700, fontSize: 15,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding:       '12px 32px', border: 'none',
            boxShadow:     canProceed ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
            cursor:        canProceed ? 'pointer' : 'not-allowed',
            display:       'flex', alignItems: 'center', gap: 6,
            transition:    'all 150ms', opacity: isSaving ? 0.7 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>
            {isSaving ? 'pending' : 'arrow_forward'}
          </span>
          {isSaving ? 'Saving…' : 'Next step'}
        </button>
      </footer>
    </>
  )
}
