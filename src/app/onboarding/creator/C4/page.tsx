'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { CITIES, type City } from '@/lib/constants/interests'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'

const DEFAULT_TOP = ['Ahmedabad', 'Gandhinagar']

const CITY_TAGLINES: Record<string, string> = {
  'Gandhinagar':          "India's greenest planned capital — 54 trees per person",
  'Ahmedabad':            "UNESCO World Heritage city with 600-year-old stepwells",
}

export default function C4Page() {
  const router = useRouter()
  const [selectedCity,  setSelectedCity]  = useState<City | null>(null)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [showDropdown,  setShowDropdown]  = useState(true)
  const [isAdvancing,   setIsAdvancing]   = useState(false)
  const [accent,        setAccent]        = useState('#F5A800')
  const [creatorName,   setCreatorName]   = useState('')
  const [categoryId,    setCategoryId]    = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cat = sessionStorage.getItem(SK.c_category)
    if (!cat) { router.replace('/onboarding/creator/C3'); return }
    setCategoryId(cat)
    setAccent(getCategoryColour(cat))
    const n = sessionStorage.getItem(SK.c_name)
    if (n) setCreatorName(n)
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
    try {
      sessionStorage.setItem(SK.c_city, city.name)
      window.dispatchEvent(new Event('ob-snap-update'))
    } catch {}
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
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <CreatorEventTicket
          name={creatorName || undefined}
          category={categoryId || undefined}
          city={selectedCity?.name}
          accent={accent}
        />

        <p style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: `${accent}99`, margin: '0 0 10px' }}>
          — ALMOST THERE
        </p>
        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 42px)',
          color:      '#F0EFF8',
          lineHeight: 0.95,
          margin:     '0 0 32px',
        }}>
          Which city are you repping?
        </h1>

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
              borderBottom:  `2px solid ${selectedCity ? accent : 'rgba(255,255,255,0.15)'}`,
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
            <div style={{ marginTop: 4, background: '#09090E', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 24px rgba(0,0,0,0.50)', overflow: 'hidden' }}>
              {filteredCities.map(city => {
                const isSel = selectedCity?.name === city.name
                return (
                  <div
                    key={city.name}
                    onClick={() => handleCitySelect(city)}
                    style={{
                      padding:        '12px 16px',
                      background:     isSel ? accent : 'transparent',
                      borderBottom:   '1px solid rgba(255,255,255,0.06)',
                      display:        'flex',
                      justifyContent: 'space-between',
                      alignItems:     'center',
                      cursor:         'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isSel ? '#1A2744' : '#F0EFF8' }}>
                        {city.name}
                      </span>
                      <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: isSel ? 'rgba(26,39,68,0.50)' : 'rgba(240,239,248,0.35)' }}>
                        {city.state}
                      </span>
                    </div>
                    {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1A2744' }}>check</span>}
                  </div>
                )
              })}
            </div>
          )}

          {selectedCity && !showDropdown && (
            <div style={{ marginTop: 14 }}>
              {CITY_TAGLINES[selectedCity.name] ? (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: accent, margin: '0 0 4px', lineHeight: 1.5 }}>
                  {CITY_TAGLINES[selectedCity.name]}
                </p>
              ) : (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: accent, margin: '0 0 4px' }}>
                  {selectedCity.name} is on your page
                </p>
              )}
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: 0, letterSpacing: '0.04em' }}>
                {selectedCity.state}
              </p>
            </div>
          )}
        </div>
      </div>

      <OnboardingFooter
        onBack={() => router.push('/onboarding/creator/C3')}
        cta={ONBOARDING_CTA.C4}
        onContinue={handleContinue}
        ctaDisabled={!canProceed}
        ctaAccent={accent}
      />
    </>
  )
}
