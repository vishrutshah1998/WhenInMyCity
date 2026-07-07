'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { VenueNoticePoster } from '@/components/onboarding/BoardingPassArtifact'
import { saveAddaOnboardingStep } from '@/app/actions/venue-onboarding'
import { deriveWimcTypes } from '@/lib/onboarding/google-type-map'

const ACCENT = '#5DD9D0'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const OUTFIT = "'Outfit', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"

const VENUE_TYPES = [
  { id: 'cafe',       emoji: '☕', icon: 'coffee',          label: 'CAFÉ'       },
  { id: 'coworking',  emoji: '🏠', icon: 'corporate_fare',  label: 'CO-WORKING' },
  { id: 'studio',     emoji: '🎙️', icon: 'mic_external_on', label: 'STUDIO'     },
  { id: 'rooftop',    emoji: '🌿', icon: 'deck',            label: 'ROOFTOP'    },
  { id: 'gallery',    emoji: '🏛️', icon: 'museum',          label: 'GALLERY'    },
  { id: 'theatre',    emoji: '🎭', icon: 'theater_comedy',  label: 'THEATRE'    },
  { id: 'event_hall', emoji: '🎪', icon: 'stadium',         label: 'EVENT HALL' },
  { id: 'retail',     emoji: '🏪', icon: 'storefront',      label: 'RETAIL'     },
  { id: 'bar',        emoji: '🍺', icon: 'local_bar',       label: 'BAR'        },
  { id: 'outdoor',    emoji: '🌊', icon: 'water',           label: 'OUTDOOR'    },
  { id: 'library',    emoji: '📚', icon: 'local_library',   label: 'LIBRARY'    },
  { id: 'sports',     emoji: '🏋️', icon: 'fitness_center',  label: 'SPORTS'     },
  { id: 'film_set',   emoji: '🎬', icon: 'movie',           label: 'FILM SET'   },
  { id: 'hotel_hall', emoji: '🏨', icon: 'hotel_class',     label: 'HOTEL HALL' },
  { id: 'garden',     emoji: '🌳', icon: 'park',            label: 'GARDEN'     },
  { id: 'workshop',   emoji: '🎓', icon: 'school',          label: 'WORKSHOP'   },
] as const

type VenueTypeId = typeof VENUE_TYPES[number]['id']

type ValidAddaType =
  | 'cafe' | 'coworking' | 'gallery' | 'community_hall'
  | 'rooftop' | 'garden' | 'studio' | 'library' | 'restaurant'

const TYPE_TO_VALID: Record<string, ValidAddaType> = {
  cafe:       'cafe',       coworking:  'coworking', studio:     'studio',
  rooftop:    'rooftop',   gallery:    'gallery',   theatre:    'community_hall',
  event_hall: 'community_hall', retail: 'restaurant', bar:       'restaurant',
  outdoor:    'garden',    library:    'library',   sports:     'coworking',
  film_set:   'studio',    hotel_hall: 'community_hall', garden: 'garden',
  workshop:   'coworking',
}

function toValidAddaTypes(types: string[]): ValidAddaType[] {
  const result = new Set<ValidAddaType>()
  types.forEach(t => { const v = TYPE_TO_VALID[t]; if (v) result.add(v) })
  return Array.from(result)
}

const CHROME_HEADER: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '5px 14px', borderBottom: '1px solid rgba(26,39,68,0.06)',
  background: 'rgba(26,39,68,0.02)',
}
const CHROME_LABEL: React.CSSProperties = {
  fontFamily: MONO, fontSize: 8, color: 'rgba(26,39,68,0.50)',
  textTransform: 'uppercase' as const, letterSpacing: '0.18em',
}

// Maps WimcVenueType values to V4 VenueTypeId values (most are identical)
const WIMC_TYPE_TO_TILE: Partial<Record<string, VenueTypeId>> = {
  cafe:           'cafe',
  coworking:      'coworking',
  studio:         'studio',
  rooftop:        'rooftop',
  gallery:        'gallery',
  community_hall: 'event_hall',
  garden:         'garden',
  library:        'library',
  restaurant:     'retail',
}

export default function V4Page() {
  const router = useRouter()
  const [venueTypes,         setVenueTypes]         = useState<VenueTypeId[]>([])
  const [googleDerivedTypes, setGoogleDerivedTypes] = useState<Set<VenueTypeId>>(new Set())
  const [minCapacity,        setMinCapacity]        = useState<number | ''>('')
  const [maxCapacity,        setMaxCapacity]        = useState<number | ''>('')
  const [advancing,          setAdvancing]          = useState(false)
  const [bName,              setBName]              = useState('')
  const [bCity,              setBCity]              = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    const city = sessionStorage.getItem(SK.b_city)
    if (city) setBCity(city)

    const saved = sessionStorage.getItem(SK.v_types)
    if (saved) {
      try { setVenueTypes(JSON.parse(saved) as VenueTypeId[]) } catch {}
    } else {
      // Pre-select from Google types if user hasn't chosen yet
      try {
        const googleTypes = JSON.parse(sessionStorage.getItem(SK.v_google_types) ?? '[]') as string[]
        if (googleTypes.length > 0) {
          const wimcTypes = deriveWimcTypes(googleTypes)
          const tileIds = wimcTypes
            .map(wt => WIMC_TYPE_TO_TILE[wt])
            .filter((t): t is VenueTypeId => !!t)
          if (tileIds.length > 0) {
            setVenueTypes(tileIds)
            setGoogleDerivedTypes(new Set(tileIds))
            sessionStorage.setItem(SK.v_types, JSON.stringify(tileIds))
          }
        }
      } catch {}
    }

    try {
      const savedCap = sessionStorage.getItem(SK.v_capacity)
      if (savedCap) {
        const parsed = JSON.parse(savedCap) as { min?: number; max?: number }
        if (parsed.min) setMinCapacity(parsed.min)
        if (parsed.max) setMaxCapacity(parsed.max)
      }
    } catch {}
  }, [router])

  function toggleType(id: VenueTypeId) {
    setVenueTypes(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
      try { sessionStorage.setItem(SK.v_types, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handleMinChange(val: string) {
    const n = val === '' ? '' : (parseInt(val, 10) || 1)
    setMinCapacity(n)
    try { sessionStorage.setItem(SK.v_capacity, JSON.stringify({ min: n || null, max: maxCapacity || null })) } catch {}
  }

  function handleMaxChange(val: string) {
    const n = val === '' ? '' : (parseInt(val, 10) || 1)
    setMaxCapacity(n)
    try { sessionStorage.setItem(SK.v_capacity, JSON.stringify({ min: minCapacity || null, max: n || null })) } catch {}
  }

  const canProceed = venueTypes.length >= 1 && maxCapacity !== '' && (maxCapacity as number) > 0

  async function handleContinue() {
    if (!canProceed || advancing) return
    setAdvancing(true)
    try {
      sessionStorage.setItem(SK.v_types, JSON.stringify(venueTypes))
      sessionStorage.setItem(SK.v_capacity, JSON.stringify({ min: minCapacity || null, max: maxCapacity || null }))
    } catch {}
    try {
      // Save step 1 (address) — captured in B2, persisted here once subpath is confirmed
      const address       = sessionStorage.getItem(SK.v_address) ?? ''
      const neighbourhood = sessionStorage.getItem(SK.v_neighbourhood) || undefined
      const lat           = parseFloat(sessionStorage.getItem(SK.v_lat) ?? '') || undefined
      const lng           = parseFloat(sessionStorage.getItem(SK.v_lng) ?? '') || undefined
      const city          = sessionStorage.getItem(SK.v_city) || sessionStorage.getItem(SK.b_city) || bCity
      if (address.trim().length >= 5) {
        await saveAddaOnboardingStep(1, {
          step: 1, name: bName, city,
          address, neighbourhood, lat, lng,
        })
      }
    } catch {}
    try {
      const validTypes = toValidAddaTypes(venueTypes)
      if (validTypes.length > 0) {
        const capMin = typeof minCapacity === 'number' ? minCapacity : undefined
        const capMax = typeof maxCapacity === 'number' ? maxCapacity : undefined
        await saveAddaOnboardingStep(2, {
          step:                    2,
          adda_type:               validTypes,
          capacity_min:            capMin,
          capacity_max:            capMax,
          capacity_configurations: [],
        })
      }
    } catch {}
    router.push('/onboarding/business/V6')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        <VenueNoticePoster
          name={bName || undefined}
          city={bCity || undefined}
          type={venueTypes[0] ?? undefined}
          accent={ACCENT}
        />

        <p style={{
          fontFamily: BARLOW, fontWeight: 600, fontSize: 10,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: `${ACCENT}99`, margin: '0 0 10px',
        }}>
          — YOUR SPACE
        </p>

        <h1 style={{
          fontFamily: ABRIL, fontSize: 'clamp(28px, 7vw, 44px)',
          color: '#F0EFF8', lineHeight: 1.05,
          margin: '0 0 8px',
        }}>
          What kind of space is it?
        </h1>
        <p style={{ fontFamily: DM, fontSize: 13, color: '#9896B0', margin: '0 0 20px' }}>
          Pick everything that applies — shapes how creators find you.
        </p>

        {/* 4-column type grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6, marginBottom: 20,
        }}>
          {VENUE_TYPES.map(vt => {
            const isSel = venueTypes.includes(vt.id)
            return (
              <button
                key={vt.id}
                type="button"
                onClick={() => toggleType(vt.id)}
                style={{
                  height:         72,
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            5,
                  background:     isSel ? `${ACCENT}18` : '#09090E',
                  border:         `${isSel ? 2 : 1}px solid ${isSel ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                  boxShadow:      isSel ? '0 0 20px rgba(93,217,208,0.20)' : 'none',
                  cursor:         'pointer',
                  position:       'relative',
                  overflow:       'hidden',
                  padding:        0,
                  transition:     'all 150ms',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize:              24,
                    color:                 isSel ? ACCENT : 'rgba(255,255,255,0.40)',
                    fontVariationSettings: isSel ? "'FILL' 1" : "'FILL' 0",
                    transition:            'color 150ms',
                  }}
                >
                  {vt.icon}
                </span>
                <span style={{
                  fontFamily:    MONO, fontSize: 9,
                  color:         isSel ? ACCENT : 'rgba(255,255,255,0.55)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  lineHeight:    1, transition: 'color 150ms',
                }}>
                  {vt.label}
                </span>
                {isSel && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 16, height: 16,
                    background: ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 10, color: '#1A2744' }}>check</span>
                  </div>
                )}
                {googleDerivedTypes.has(vt.id) && (
                  <div style={{
                    position: 'absolute', bottom: 2, left: 0, right: 0,
                    textAlign: 'center',
                    fontFamily: MONO, fontSize: 6,
                    color: isSel ? ACCENT : 'rgba(93,217,208,0.55)',
                    letterSpacing: '0.06em',
                  }}>
                    ✦ google
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Capacity inputs */}
        <p style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase',
          letterSpacing: '0.12em', margin: '0 0 4px',
        }}>
          CAPACITY LIMITS
        </p>
        <p style={{ fontFamily: DM, fontSize: 12, color: '#9896B0', margin: '0 0 10px' }}>
          Min = smallest group you&apos;ll host &nbsp;·&nbsp; Max = total standing or seated capacity
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: '#FAF7F0', borderLeft: `4px solid ${ACCENT}`, overflow: 'hidden' }}>
            <div style={CHROME_HEADER}>
              <span style={CHROME_LABEL}>MIN CAPACITY</span>
            </div>
            <input
              type="number"
              value={minCapacity}
              onChange={e => handleMinChange(e.target.value)}
              placeholder="10"
              min={1}
              style={{
                display: 'block', width: '100%', padding: '12px 14px',
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: OUTFIT, fontWeight: 900, fontSize: 28,
                color: '#1A2744', textAlign: 'center', caretColor: ACCENT,
              }}
            />
          </div>
          <div style={{ flex: 1, background: '#FAF7F0', borderLeft: `4px solid ${ACCENT}`, overflow: 'hidden' }}>
            <div style={CHROME_HEADER}>
              <span style={CHROME_LABEL}>MAX CAPACITY</span>
              {maxCapacity !== '' && (
                <span style={{ fontFamily: MONO, fontSize: 8, color: ACCENT }}>
                  UP TO {maxCapacity} PEOPLE
                </span>
              )}
            </div>
            <input
              type="number"
              value={maxCapacity}
              onChange={e => handleMaxChange(e.target.value)}
              placeholder="150"
              min={1}
              style={{
                display: 'block', width: '100%', padding: '12px 14px',
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: OUTFIT, fontWeight: 900, fontSize: 28,
                color: '#1A2744', textAlign: 'center', caretColor: ACCENT,
              }}
            />
          </div>
        </div>

        <p style={{ fontFamily: DM, fontSize: 13, color: '#9896B0', fontStyle: 'italic', margin: 0 }}>
          Tap to select — pick all that apply.
        </p>

      </div>

      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/business/B2')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canProceed || advancing}
          style={{
            background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
            color:         canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:    BARLOW, fontWeight: 700, fontSize: 15,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            padding:       '12px 32px', border: 'none',
            boxShadow:     canProceed ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
            cursor:        canProceed ? 'pointer' : 'not-allowed',
            transition:    'all 150ms',
          }}
        >
          {advancing ? 'Saving…' : canProceed ? `Next (${venueTypes.length}) →` : 'Next →'}
        </button>
      </footer>
    </>
  )
}
