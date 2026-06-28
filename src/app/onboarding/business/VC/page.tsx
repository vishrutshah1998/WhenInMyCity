'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { VenueNoticePoster } from '@/components/onboarding/BoardingPassArtifact'

const ACCENT = '#5DD9D0'

interface CapacityData {
  standing:  number | null
  seated:    number | null
  classroom: number | null
  min_pax:   number | null
}

const CONFIGS = [
  {
    key:         'standing'  as const,
    label:       'Standing / Cocktail',
    icon:        'groups',
    color:       ACCENT,
    placeholder: '100',
    desc:        'Max for mingling, networking',
  },
  {
    key:         'seated'    as const,
    label:       'Seated / Theatre',
    icon:        'event_seat',
    color:       '#A78BFA',
    placeholder: '60',
    desc:        'Rows or chairs facing a stage',
  },
  {
    key:         'classroom' as const,
    label:       'Workshop / Classroom',
    icon:        'table_restaurant',
    color:       '#60A5FA',
    placeholder: '40',
    desc:        'Tables, U-shape, breakout',
  },
  {
    key:         'min_pax'   as const,
    label:       'Minimum Group Size',
    icon:        'person',
    color:       '#FFB23F',
    placeholder: '15',
    desc:        "Smallest event you'll host",
  },
]

const SIZE_PRESETS = [
  { label: 'Intimate',  max: 30,  hint: '< 30 pax' },
  { label: 'Medium',    max: 80,  hint: '30–80 pax' },
  { label: 'Large',     max: 200, hint: '80–200 pax' },
]

export default function VCPage() {
  const router = useRouter()

  const [cap,      setCap]      = useState<CapacityData>({ standing: null, seated: null, classroom: null, min_pax: null })
  const [bName,    setBName]    = useState('')
  const [bCity,    setBCity]    = useState('')
  const [vType,    setVType]    = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    const amenities = sessionStorage.getItem(SK.v_amenities)
    if (!amenities) { router.replace('/onboarding/business/V6'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    try {
      const types = sessionStorage.getItem(SK.v_types)
      if (types) {
        const parsed = JSON.parse(types) as string[]
        if (parsed[0]) setVType(parsed[0])
      }
    } catch {}
    try {
      const saved = sessionStorage.getItem(SK.v_capacity)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CapacityData>
        setCap(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [router])

  function setField(key: keyof CapacityData, raw: string) {
    const n = raw === '' ? null : parseInt(raw, 10)
    const val = n !== null && !isNaN(n) && n > 0 ? n : null
    setCap(prev => {
      const next = { ...prev, [key]: val }
      try { sessionStorage.setItem(SK.v_capacity, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function applyPreset(max: number) {
    const updated: CapacityData = {
      standing:  max,
      seated:    Math.round(max * 0.7),
      classroom: Math.round(max * 0.5),
      min_pax:   cap.min_pax,
    }
    setCap(updated)
    try { sessionStorage.setItem(SK.v_capacity, JSON.stringify(updated)) } catch {}
  }

  async function handleNext() {
    if (isSaving) return
    setIsSaving(true)
    try { sessionStorage.setItem(SK.v_capacity, JSON.stringify(cap)) } catch {}
    router.push('/onboarding/business/V7')
  }

  const hasAny = Object.values(cap).some(v => v !== null)

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <VenueNoticePoster
          name={bName || undefined}
          city={bCity || undefined}
          type={vType || undefined}
          accent={ACCENT}
        />

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          How many people fit your space?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 24px' }}>
          Creators search by capacity — fill what applies, skip the rest
        </p>

        {/* Quick-size presets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C5A72', alignSelf: 'center', marginRight: 4 }}>
            Quick fill:
          </span>
          {SIZE_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.max)}
              style={{
                padding:      '6px 14px',
                borderRadius: 999,
                cursor:       'pointer',
                border:       `1px solid ${ACCENT}30`,
                background:   'transparent',
                color:        '#9896B0',
                fontFamily:   "'DM Sans', sans-serif",
                fontWeight:   600,
                fontSize:     12,
                transition:   'all 150ms',
              }}
            >
              {preset.label} <span style={{ color: '#5C5A72', fontWeight: 400 }}>{preset.hint}</span>
            </button>
          ))}
        </div>

        {/* Capacity inputs */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CONFIGS.map((cfg, idx) => {
            const val = cap[cfg.key]
            const filled = val !== null
            return (
              <div
                key={cfg.key}
                style={{
                  display:     'grid',
                  gridTemplateColumns: '1fr 100px',
                  alignItems:  'center',
                  padding:     '14px 16px',
                  background:  filled ? `${cfg.color}08` : 'transparent',
                  borderLeft:   `1px solid ${filled ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  borderRight:  `1px solid ${filled ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  borderBottom: `1px solid ${filled ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  borderTop:    idx === 0 ? `1px solid ${filled ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}` : 'none',
                  transition:  'all 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize:             20,
                      color:                filled ? cfg.color : '#3C3A52',
                      fontVariationSettings: filled ? "'FILL' 1" : undefined,
                      flexShrink:           0,
                    }}
                  >{cfg.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: filled ? cfg.color : '#9896B0' }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#3C3A52', marginTop: 1 }}>
                      {cfg.desc}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <input
                    type="number"
                    min={1}
                    value={val ?? ''}
                    onChange={e => setField(cfg.key, e.target.value)}
                    placeholder={cfg.placeholder}
                    style={{
                      width:      64,
                      textAlign:  'right',
                      background: 'transparent',
                      border:     'none',
                      borderBottom: `1px solid ${filled ? cfg.color + '60' : 'rgba(255,255,255,0.15)'}`,
                      outline:    'none',
                      fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
                      fontWeight: 700,
                      fontSize:   20,
                      color:      filled ? '#F0EFF8' : 'rgba(255,255,255,0.20)',
                      caretColor: cfg.color,
                      paddingBottom: 4,
                    }}
                  />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#5C5A72' }}>pax</span>
                </div>
              </div>
            )
          })}
        </div>

        {!hasAny && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#3C3A52', marginTop: 12, fontStyle: 'italic' }}>
            You can update this any time from the dashboard.
          </p>
        )}
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/business/V6')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleNext} disabled={isSaving}
          style={{
            background:    ACCENT,
            color:         '#07070A',
            fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight:    700,
            fontSize:      15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     '8px 8px 0px 0px #000000',
            cursor:        'pointer',
            opacity:       isSaving ? 0.7 : 1,
          }}>
          {isSaving ? 'Saving…' : hasAny ? `Continue →` : 'Skip for now →'}
        </button>
      </footer>
    </>
  )
}
