'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
const ACCENT = '#9B8FFF'

interface City { name: string; state: string }

const CITIES: City[] = [
  { name: 'Ahmedabad',   state: 'GJ' }, { name: 'Gandhinagar', state: 'GJ' },
  { name: 'Surat',       state: 'GJ' }, { name: 'Vadodara',    state: 'GJ' },
  { name: 'Indore',      state: 'MP' }, { name: 'Bhopal',      state: 'MP' },
  { name: 'Jaipur',      state: 'RJ' }, { name: 'Chandigarh',  state: 'CH' },
  { name: 'Kochi',       state: 'KL' }, { name: 'Mysuru',      state: 'KA' },
  { name: 'Bengaluru',   state: 'KA' }, { name: 'Hyderabad',   state: 'TS' },
  { name: 'Pune',        state: 'MH' }, { name: 'Mumbai',      state: 'MH' },
  { name: 'Delhi',       state: 'DL' }, { name: 'Lucknow',     state: 'UP' },
]

const DEFAULT_TOP = ['Ahmedabad', 'Indore', 'Jaipur', 'Chandigarh', 'Kochi', 'Bengaluru']

export default function E4Page() {
  const router = useRouter()
  const [selectedCity,   setSelectedCity]   = useState<City | null>(null)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [showDropdown,   setShowDropdown]   = useState(true)
  const [isAdvancing,    setIsAdvancing]    = useState(false)
  const [eName,          setEName]          = useState('')
  const [eScene,         setEScene]         = useState('')
  const [neighbourhood,  setNeighbourhood]  = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const scene = sessionStorage.getItem(SK.e_scene)
    if (!scene) { router.replace('/onboarding/explorer/E3'); return }
    setEScene(scene)
    const n = sessionStorage.getItem(SK.e_name)
    if (n) setEName(n)
    const saved = sessionStorage.getItem(SK.e_city)
    if (saved) {
      const city = CITIES.find(c => c.name === saved)
      if (city) { setSelectedCity(city); setSearchQuery(city.name); setShowDropdown(false) }
    }
    const savedNeighbourhood = sessionStorage.getItem(SK.e_neighbourhood)
    if (savedNeighbourhood) setNeighbourhood(savedNeighbourhood)
  }, [router])

  const filteredCities = useMemo<City[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return CITIES.filter(c => DEFAULT_TOP.includes(c.name))
    return CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6)
  }, [searchQuery])

  function handleCitySelect(city: City) {
    setSelectedCity(city)
    setSearchQuery(city.name)
    setShowDropdown(false)
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val)
    setShowDropdown(true)
    if (selectedCity && val !== selectedCity.name) setSelectedCity(null)
  }

  function handleContinue() {
    if (!selectedCity || isAdvancing) return
    setIsAdvancing(true)
    try {
      sessionStorage.setItem(SK.e_city, selectedCity.name)
      sessionStorage.setItem(SK.e_neighbourhood, neighbourhood.trim())
    } catch {}
    router.push('/onboarding/explorer/E5')
  }

  const canProceed = !!selectedCity

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        {/* Dark ticket card */}
        <div style={{ position: 'relative', width: '100%', background: '#201f23', marginBottom: 32, flexShrink: 0 }}>
          {/* Left accent bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: ACCENT }} />

          {/* Header strip */}
          <div style={{ padding: '8px 16px', borderBottom: '1px dashed #57423e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(57,57,61,0.50)' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: '#dec0ba' }}>
              INIT_SEQUENCE::STUB_E4
            </span>
            <span className="material-symbols-outlined" style={{ color: ACCENT, fontSize: 18, fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
          </div>

          {/* Main */}
          <div style={{ padding: 24, paddingLeft: 28 }}>
            <label style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(222,192,186,0.60)', textTransform: 'uppercase', letterSpacing: '0.20em', display: 'block', marginBottom: 4 }}>
              Destination Point
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: ACCENT, fontSize: 14 }}>TO:</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: ACCENT, letterSpacing: '-0.02em', textShadow: selectedCity ? `0 0 12px rgba(155,143,255,0.6)` : 'none' }}>
                {selectedCity ? selectedCity.name.toUpperCase() : 'SELECT_CITY'}
              </span>
            </div>
          </div>

          {/* Perforation */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '0 16px' }}>
            <div style={{ position: 'absolute', left: -24, width: 24, height: 24, background: '#1A2744', borderRadius: '50%', zIndex: 10 }} />
            <div style={{ flex: 1, borderTop: '1px dashed #57423e' }} />
            <div style={{ position: 'absolute', right: -24, width: 24, height: 24, background: '#1A2744', borderRadius: '50%', zIndex: 10 }} />
          </div>

          {/* Stub */}
          <div style={{ height: 34, background: '#353438', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(222,192,186,0.40)', letterSpacing: '0.40em', textTransform: 'uppercase' }}>ADMIT ONE</span>
            <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'stretch' }}>
              {[1,2,1,3,1,2,1,1,2].map((w,i) => (
                <div key={i} style={{ background: 'rgba(222,192,186,0.30)', width: w * 2, height: '100%' }} />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(222,192,186,0.40)' }}>VER_ID_4829</span>
          </div>
        </div>

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          Which city are<br />you exploring?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          Your city shapes your entire explore feed
        </p>

        <div style={{ maxWidth: 480 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search your city..."
            autoComplete="off"
            style={{
              width:         '100%',
              background:    'transparent',
              border:        'none',
              borderBottom:  `2px solid ${selectedCity ? ACCENT : 'rgba(255,255,255,0.15)'}`,
              fontFamily:    "'Outfit', sans-serif",
              fontWeight:    900,
              fontSize:      28,
              color:         '#F0EFF8',
              outline:       'none',
              paddingBottom: 8,
              caretColor:    ACCENT,
              transition:    'border-color 200ms',
            }}
          />

          {showDropdown && filteredCities.length > 0 && (
            <div style={{ marginTop: 4, background: '#09090E', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 4px 16px rgba(0,0,0,0.50)', overflow: 'hidden' }}>
              {filteredCities.map(city => {
                const isSel = selectedCity?.name === city.name
                return (
                  <div
                    key={city.name}
                    onClick={() => handleCitySelect(city)}
                    style={{
                      padding:        '12px 16px',
                      background:     isSel ? ACCENT : 'transparent',
                      borderBottom:   '1px solid rgba(255,255,255,0.07)',
                      display:        'flex',
                      justifyContent: 'space-between',
                      alignItems:     'center',
                      cursor:         'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isSel ? '#1A2744' : '#F0EFF8' }}>
                        {city.name}
                      </span>
                      <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: isSel ? 'rgba(26,39,68,0.50)' : 'rgba(240,239,248,0.30)' }}>
                        {city.state}
                      </span>
                    </div>
                    {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1A2744' }}>check</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Neighbourhood — optional */}
        <div style={{ maxWidth: 480, marginTop: 36 }}>
          <label style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: 'rgba(155,143,255,0.60)', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Neighbourhood <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={neighbourhood}
            onChange={e => setNeighbourhood(e.target.value)}
            placeholder="e.g. Satellite, Koramangala, Baner"
            style={{
              width:         '100%',
              background:    'transparent',
              border:        'none',
              borderBottom:  `2px solid ${neighbourhood ? ACCENT : 'rgba(255,255,255,0.10)'}`,
              fontFamily:    "'DM Sans', sans-serif",
              fontWeight:    500,
              fontSize:      18,
              color:         '#F0EFF8',
              outline:       'none',
              paddingBottom: 6,
              caretColor:    ACCENT,
              transition:    'border-color 200ms',
            }}
          />
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E3')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{
            background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
            color:         canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight:    700,
            fontSize:      15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     canProceed ? '8px 8px 0px 0px #000000' : 'none',
            cursor:        canProceed ? 'pointer' : 'not-allowed',
          }}>
          Continue →
        </button>
      </footer>
    </>
  )
}
