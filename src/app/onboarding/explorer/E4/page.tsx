'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#9B8FFF'
const WARM_BG = '#F8F6FF'

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
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showDropdown, setShowDropdown] = useState(true)
  const [explorerName, setExplorerName] = useState('')
  const [isAdvancing,  setIsAdvancing]  = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const scene = sessionStorage.getItem(SK.e_scene)
    if (!scene) { router.replace('/onboarding/explorer/E3'); return }
    setExplorerName(sessionStorage.getItem(SK.e_name) || '')
    const saved = sessionStorage.getItem(SK.e_city)
    if (saved) {
      const city = CITIES.find(c => c.name === saved)
      if (city) { setSelectedCity(city); setSearchQuery(city.name); setShowDropdown(false) }
    }
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
    try { sessionStorage.setItem(SK.e_city, selectedCity.name) } catch {}
    router.push('/onboarding/explorer/E5')
  }

  const canProceed = !!selectedCity

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          Which city are you exploring?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Your city shapes your entire explore feed
        </p>

        <div style={{ maxWidth: 480 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.35)', marginBottom: 12 }}>Your city</label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search your city..."
            autoComplete="off"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${selectedCity ? ACCENT : 'rgba(255,255,255,0.20)'}`, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: '#F0EFF8', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
          />
          {showDropdown && filteredCities.length > 0 && (
            <div style={{ marginTop: 4, background: 'rgba(9,9,14,0.85)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {filteredCities.map(city => {
                const isSel = selectedCity?.name === city.name
                return (
                  <div key={city.name} onClick={() => handleCitySelect(city)}
                    style={{ padding: '12px 16px', background: isSel ? `${ACCENT}12` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: isSel ? ACCENT : '#1A1A1A' }}>{city.name}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(240,239,248,0.30)' }}>{city.state}</span>
                    </div>
                    {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: ACCENT }}>check</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E3')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.10)', color: canProceed ? '#ffffff' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed' }}>
          Continue
        </button>
      </footer>
    </>
  )
}
