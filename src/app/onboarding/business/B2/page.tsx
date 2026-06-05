'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { checkUsernameAvailable } from '@/app/actions/onboarding'


const ACCENT  = '#5DD9D0'
const WARM_BG = '#FFF8F5'

interface City { name: string; state: string }

const CITIES: City[] = [
  { name: 'Indore',      state: 'MP' }, { name: 'Jaipur',     state: 'RJ' },
  { name: 'Bhopal',      state: 'MP' }, { name: 'Chandigarh', state: 'CH' },
  { name: 'Kochi',       state: 'KL' }, { name: 'Vadodara',   state: 'GJ' },
  { name: 'Gandhinagar', state: 'GJ' }, { name: 'Mysuru',     state: 'KA' },
  { name: 'Surat',       state: 'GJ' }, { name: 'Nagpur',     state: 'MH' },
  { name: 'Ahmedabad',   state: 'GJ' }, { name: 'Mumbai',     state: 'MH' },
  { name: 'Delhi',       state: 'DL' }, { name: 'Bengaluru',  state: 'KA' },
  { name: 'Pune',        state: 'MH' }, { name: 'Hyderabad',  state: 'TS' },
]

const DEFAULT_TOP = ['Indore', 'Jaipur', 'Bhopal', 'Chandigarh', 'Kochi']

function slugify(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

export default function B2Page() {
  const router = useRouter()

  const [businessName, setBusinessName] = useState('')
  const [city,         setCity]         = useState('')
  const [slugPreview,  setSlugPreview]  = useState('')
  const [isAvailable,  setIsAvailable]  = useState<boolean | null>(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAdvancing,  setIsAdvancing]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'business') router.replace('/onboarding')
    const saved = sessionStorage.getItem(SK.b_name)
    if (saved) { setBusinessName(saved); setSlugPreview(slugify(saved)) }
    const savedCity = sessionStorage.getItem(SK.b_city)
    if (savedCity) {
      const c = CITIES.find(x => x.name === savedCity)
      if (c) { setSelectedCity(c); setSearchQuery(c.name); setCity(c.name) }
    }
  }, [router])

  const filteredCities = useMemo<City[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return CITIES.filter(c => DEFAULT_TOP.includes(c.name))
    return CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6)
  }, [searchQuery])

  const handleNameChange = useCallback((val: string) => {
    setBusinessName(val)
    const slug = slugify(val)
    setSlugPreview(slug)
    setIsAvailable(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(async () => {
        const res = await checkUsernameAvailable(slug)
        setIsAvailable(res.available)
      }, 800)
    }
  }, [])

  function handleCitySelect(c: City) {
    setSelectedCity(c); setCity(c.name); setSearchQuery(c.name); setShowDropdown(false)
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val); setShowDropdown(true)
    if (selectedCity && val !== selectedCity.name) { setSelectedCity(null); setCity('') }
  }

  const canProceed = businessName.trim().length >= 3 && city !== ''

  function handleNext() {
    if (!canProceed || isAdvancing) return
    setIsAdvancing(true)
    try {
      sessionStorage.setItem(SK.b_name, businessName)
      sessionStorage.setItem(SK.b_city, city)
      sessionStorage.setItem(SK.b_slug, slugPreview)
    } catch {}
    router.push('/onboarding/business/B3')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          Tell us about your space
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Your venue will get its own page at wheninmycity.com/{slugPreview || 'yourspace'}
        </p>

        {/* Business name */}
        <div style={{ maxWidth: 480, marginBottom: 32 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.40)', marginBottom: 12 }}>Business name</label>
          <input type="text" value={businessName} onChange={e => handleNameChange(e.target.value)} placeholder="The Hidden Courtyard, Chai Culture..." autoComplete="off"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${businessName ? ACCENT : 'rgba(255,255,255,0.20)'}`, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: '#F0EFF8', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
          />
          {isAvailable !== null && slugPreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: isAvailable ? '#4ade80' : '#f87171' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: isAvailable ? '#4ade80' : '#f87171' }}>
                {isAvailable ? `wheninmycity.com/${slugPreview} is available` : 'Slug taken — try a different name'}
              </span>
            </div>
          )}
        </div>

        {/* City */}
        <div style={{ maxWidth: 480 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.40)', marginBottom: 12 }}>City</label>
          <input type="text" value={searchQuery} onChange={e => handleSearchChange(e.target.value)} onFocus={() => setShowDropdown(true)} placeholder="Search your city..." autoComplete="off"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${selectedCity ? ACCENT : 'rgba(255,255,255,0.20)'}`, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 22, color: '#F0EFF8', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
          />
          {showDropdown && filteredCities.length > 0 && (
            <div style={{ marginTop: 4, background: 'rgba(9,9,14,0.90)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 24px rgba(0,0,0,0.40)', overflow: 'hidden' }}>
              {filteredCities.map(c => {
                const isSel = selectedCity?.name === c.name
                return (
                  <div key={c.name} onClick={() => handleCitySelect(c)} style={{ padding: '12px 16px', background: isSel ? `${ACCENT}18` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: isSel ? ACCENT : '#F0EFF8' }}>{c.name}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(240,239,248,0.35)' }}>{c.state}</span>
                    </div>
                    {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: ACCENT }}>check</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'linear-gradient(to top, #1A2744 60%, transparent 100%)' }}>
        <button type="button" onClick={() => router.push('/onboarding')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleNext} disabled={!canProceed}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.08)', color: canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'background 200ms' }}>
          Continue
        </button>
      </footer>
    </>
  )
}
