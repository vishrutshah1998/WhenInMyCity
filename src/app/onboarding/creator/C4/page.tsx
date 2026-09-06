'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { CITIES, type City } from '@/lib/constants/interests'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'
import { CitySelect } from '@/components/shared/CitySelect'

const CITY_TAGLINES: Record<string, string> = {
  'Gandhinagar':          "India's greenest planned capital — 54 trees per person",
  'Ahmedabad':            "UNESCO World Heritage city with 600-year-old stepwells",
}

export default function C4Page() {
  const router = useRouter()
  const [selectedCity,  setSelectedCity]  = useState<City | null>(null)
  const [pickerOpen,    setPickerOpen]    = useState(false)
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
      if (city) setSelectedCity(city)
    }
  }, [router])

  function handleCityChange(city: City | null) {
    setSelectedCity(city)
    if (city) {
      try {
        sessionStorage.setItem(SK.c_city, city.name)
        window.dispatchEvent(new Event('ob-snap-update'))
      } catch {}
    }
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
          <CitySelect
            value={selectedCity?.name ?? ''}
            onChange={handleCityChange}
            onOpenChange={setPickerOpen}
            dropdownWhenEmpty
            theme={{ accent }}
            placeholder="Search your city..."
            inputStyle={{
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

          {selectedCity && !pickerOpen && (
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
