'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { saveAddaOnboardingStep } from '@/app/actions/adda-onboarding'

const ACCENT  = '#5DD9D0'
const WARM_BG = '#F2FFFE'

const PRICING_MODELS = [
  { id: 'hourly', label: 'Hourly',      desc: 'Creators pay a flat hourly rate'   },
  { id: 'split',  label: 'Door split',  desc: 'Revenue sharing on ticket sales'   },
  { id: 'hybrid', label: 'Hybrid',      desc: 'Small booking fee + minor split'   },
  { id: 'fnb',    label: 'F&B minimum', desc: 'Guaranteed min food/drink spend'   },
] as const

const EVENT_TYPES: Array<{ label: string; emoji: string }> = [
  { label: 'Gigs',         emoji: '🎸' }, { label: 'Workshops',    emoji: '🛠️' },
  { label: 'Screenings',   emoji: '🎬' }, { label: 'Concerts',     emoji: '🎶' },
  { label: 'Art Shows',    emoji: '🎨' }, { label: 'Open Mic',     emoji: '🎤' },
  { label: 'Networking',   emoji: '🤝' }, { label: 'Pop-ups',      emoji: '🛍️' },
  { label: 'Stand-up',     emoji: '😄' }, { label: 'Dance',        emoji: '💃' },
  { label: 'Yoga',         emoji: '🧘' }, { label: 'Meetups',      emoji: '☕' },
  { label: 'Talks',        emoji: '💡' }, { label: 'DJ Night',     emoji: '🎧' },
  { label: 'Theatre',      emoji: '🎭' },
]

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const LEAD_OPTIONS = ['1 week', '2 weeks', '1 month+']

export default function V7Page() {
  const router = useRouter()

  const [pricingModel,  setPricingModel]  = useState('')
  const [eventTypes,    setEventTypes]    = useState<string[]>([])
  const [availableDays, setAvailableDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
  const [leadTime,      setLeadTime]      = useState('1 week')
  const [bName,         setBName]         = useState('')
  const [bCity,         setBCity]         = useState('')
  const [isSaving,      setIsSaving]      = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    const savedPricing = sessionStorage.getItem(SK.v_pricing)
    if (savedPricing) setPricingModel(savedPricing)
    try {
      const savedEvents = sessionStorage.getItem(SK.v_events)
      if (savedEvents) setEventTypes(JSON.parse(savedEvents) as string[])
      const savedDays = sessionStorage.getItem(SK.v_days)
      if (savedDays) setAvailableDays(JSON.parse(savedDays) as string[])
    } catch {}
    const savedLead = sessionStorage.getItem(SK.v_lead)
    if (savedLead) setLeadTime(savedLead)
  }, [router])

  function toggleDay(d: string) {
    setAvailableDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function toggleEvent(label: string) {
    setEventTypes(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label])
  }

  async function handleNext() {
    if (isSaving) return
    setIsSaving(true)
    try {
      sessionStorage.setItem(SK.v_pricing, pricingModel)
      sessionStorage.setItem(SK.v_events,  JSON.stringify(eventTypes))
      sessionStorage.setItem(SK.v_days,    JSON.stringify(availableDays))
      sessionStorage.setItem(SK.v_lead,    leadTime)
      await saveAddaOnboardingStep(3, {
        step: 3, amenities: [],
        pricing_model: (pricingModel || 'fixed_rental') as 'fixed_rental' | 'door_split' | 'hybrid' | 'f_and_b_minimum',
        pricing_config: {},
      })
    } catch {}
    router.push('/onboarding/business/V8')
  }

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What can creators expect?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Set up your booking preferences
        </p>

        {/* Pricing model */}
        <section style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(240,239,248,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Pricing model
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
            {PRICING_MODELS.map(pm => {
              const isSel = pricingModel === pm.id
              return (
                <button key={pm.id} type="button" onClick={() => setPricingModel(isSel ? '' : pm.id)}
                  style={{ textAlign: 'left', padding: 16, cursor: 'pointer', transition: 'all 150ms', borderLeft: `4px solid ${isSel ? ACCENT : 'transparent'}`, borderTop: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`, borderRight: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`, borderBottom: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`, background: isSel ? `${ACCENT}12` : 'rgba(255,255,255,0.85)' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: isSel ? '#1A1A1A' : 'rgba(26,26,26,0.70)', display: 'block', marginBottom: 2 }}>{pm.label}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.35)' }}>{pm.desc}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Available days */}
        <section style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(240,239,248,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Available days
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DAYS.map(d => {
              const isSel = availableDays.includes(d)
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  style={{ width: 44, height: 44, cursor: 'pointer', transition: 'all 150ms', border: isSel ? 'none' : '1px solid rgba(255,255,255,0.14)', borderRadius: 999, background: isSel ? ACCENT : 'rgba(255,255,255,0.9)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: isSel ? '#07070A' : 'rgba(26,26,26,0.55)', textTransform: 'uppercase' }}>
                  {d.slice(0, 1)}
                </button>
              )
            })}
          </div>
        </section>

        {/* Event types */}
        <section style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(240,239,248,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            What kind of events work here?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 520 }}>
            {EVENT_TYPES.map(et => {
              const isSel = eventTypes.includes(et.label)
              return (
                <button key={et.label} type="button" onClick={() => toggleEvent(et.label)}
                  style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', transition: 'all 150ms', border: isSel ? 'none' : '1px solid rgba(255,255,255,0.14)', background: isSel ? ACCENT : 'rgba(255,255,255,0.9)', color: isSel ? '#07070A' : '#1A1A1A', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{et.emoji}</span>{et.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Lead time */}
        <section>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(240,239,248,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Booking lead time required
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LEAD_OPTIONS.map(lo => {
              const isSel = leadTime === lo
              return (
                <button key={lo} type="button" onClick={() => setLeadTime(lo)}
                  style={{ padding: '10px 18px', borderRadius: 999, cursor: 'pointer', transition: 'all 150ms', border: isSel ? 'none' : '1px solid rgba(255,255,255,0.14)', background: isSel ? ACCENT : 'rgba(255,255,255,0.9)', color: isSel ? '#07070A' : '#1A1A1A', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14 }}>
                  {lo}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/business/V6')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleNext} disabled={isSaving}
          style={{ background: ACCENT, color: '#1A2744', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}>
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </footer>
    </>
  )
}
