'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryColour, getCategoryWarmBg } from '@/lib/onboarding/design-tokens'
import { CITIES, type City } from '@/lib/constants/interests'

const DEFAULT_TOP = ['Indore', 'Jaipur', 'Bhopal', 'Chandigarh', 'Kochi', 'Ahmedabad', 'Mumbai']

export default function C4Page() {
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showDropdown, setShowDropdown] = useState(true)
  const [holderName,   setHolderName]   = useState('')
  const [category,     setCategory]     = useState('')
  const [isAdvancing,  setIsAdvancing]  = useState(false)
  const [accent,       setAccent]       = useState('#E8705A')
  const [warmBg,       setWarmBg]       = useState('#FFF8F5')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cat = sessionStorage.getItem(SK.c_category)
    if (!cat) { router.replace('/onboarding/creator/C3'); return }
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    setWarmBg(getCategoryWarmBg(cat))
    const name = sessionStorage.getItem(SK.c_name)
    if (name) setHolderName(name)
    const saved = sessionStorage.getItem(SK.c_city)
    if (saved) {
      const city = CITIES.find(c => c.name === saved)
      if (city) { setSelectedCity(city); setSearchQuery(city.name); setShowDropdown(false) }
    }
  }, [router])

  const filteredCities = useMemo(() => {
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
    try { sessionStorage.setItem(SK.c_city, selectedCity.name) } catch {}
    router.push('/onboarding/creator/C5')
  }

  const canProceed = !!selectedCity && !isAdvancing

  return (
    <>
      <div style={{
        minHeight:     '100%',
        overflowY:     'auto',
        paddingTop:    48,
        paddingBottom: 96,
        paddingLeft:   24,
        paddingRight:  24,
      }}>
        <h1 style={{
          fontFamily:  "'Outfit', sans-serif",
          fontWeight:  900,
          fontSize:    'clamp(28px, 7vw, 44px)',
          color:       '#F0EFF8',
          lineHeight:  1.05,
          margin:      '0 0 8px',
          maxWidth:    480,
        }}>
          Where are you based?
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   15,
          color:      'rgba(240,239,248,0.5)',
          margin:     '0 0 40px',
          maxWidth:   400,
        }}>
          Your city appears on your page and seeds local discovery
        </p>

        {/* Search input */}
        <div style={{ maxWidth: 480 }}>
          <label style={{
            display:    'block',
            fontFamily: "'DM Sans', sans-serif",
            fontSize:   13,
            color:      'rgba(240,239,248,0.40)',
            marginBottom: 12,
          }}>
            Your city
          </label>
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
              borderBottom:  `2px solid ${selectedCity ? accent : 'rgba(255,255,255,0.20)'}`,
              fontFamily:    "'Outfit', sans-serif",
              fontWeight:    900,
              fontSize:      28,
              color:         '#F0EFF8',
              outline:       'none',
              paddingBottom: 8,
              caretColor:    accent,
              transition:    'border-color 200ms',
            }}
          />

          {/* Dropdown */}
          {showDropdown && filteredCities.length > 0 && (
            <div style={{
              marginTop:  4,
              background: 'rgba(9,9,14,0.90)',
              border:     '1px solid rgba(255,255,255,0.10)',
              boxShadow:  '0 8px 24px rgba(0,0,0,0.40)',
              overflow:   'hidden',
            }}>
              {filteredCities.map(city => {
                const isSel = selectedCity?.name === city.name
                return (
                  <div
                    key={city.name}
                    onClick={() => handleCitySelect(city)}
                    style={{
                      padding:        '12px 16px',
                      background:     isSel ? `${accent}18` : 'transparent',
                      borderBottom:   '1px solid rgba(255,255,255,0.06)',
                      display:        'flex',
                      justifyContent: 'space-between',
                      alignItems:     'center',
                      cursor:         'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 16 }}>{city.emoji}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: isSel ? accent : '#F0EFF8' }}>
                        {city.name}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(240,239,248,0.35)' }}>
                        {city.state}
                      </span>
                    </div>
                    {isSel && (
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: accent }}>check</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {selectedCity && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: accent, marginTop: 12, opacity: 0.85 }}>
              ✦ {selectedCity.name} is now on your page
            </p>
          )}
        </div>
      </div>

      <footer style={{
        position:       'fixed',
        bottom:         0,
        left:           0,
        right:          0,
        height:         72,
        zIndex:         50,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        background:     'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C3')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{
            background:  canProceed ? accent : 'rgba(255,255,255,0.08)',
            color:       canProceed ? '#ffffff' : 'rgba(255,255,255,0.22)',
            fontFamily:  "'DM Sans', sans-serif",
            fontWeight:  600,
            fontSize:    15,
            padding:     '12px 32px',
            border:      'none',
            cursor:      canProceed ? 'pointer' : 'not-allowed',
            transition:  'background 200ms',
          }}>
          Continue
        </button>
      </footer>
    </>
  )
}
