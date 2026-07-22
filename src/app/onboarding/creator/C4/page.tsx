'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { CITIES, type City } from '@/lib/constants/interests'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'

const DEFAULT_TOP = ['Indore', 'Jaipur', 'Bhopal', 'Chandigarh', 'Kochi', 'Ahmedabad', 'Mumbai']

const CITY_TAGLINES: Record<string, string> = {
  'Gandhinagar':          "India's greenest planned capital — 54 trees per person",
  'Jaipur':               "Pink sandstone city of palaces & bazaars since 1727",
  'Indore':               "Cleanest city in India, 7 years running — and counting",
  'Chandigarh':           "Le Corbusier's modernist grid meets Himalayan skies",
  'Kochi':                "Arabian Sea spice routes still flow through here",
  'Ahmedabad':            "UNESCO World Heritage city with 600-year-old stepwells",
  'Mumbai':               "Maximum city. Maximum dreams. Maximum everything.",
  'Delhi':                "3,000 years of empire, still the seat of power",
  'Bhopal':               "City of lakes cradled between the Vindhya hills",
  'Varanasi':             "Oldest continuously inhabited city on the planet",
  'Udaipur':              "Venice of the East — palaces rising from three lakes",
  'Jodhpur':              "Every house painted blue — 500 years of tradition",
  'Mysuru':               "Sandalwood, silk & a palace lit by 100,000 bulbs",
  'Panaji':               "Latin facades, feni cocktails, eternal sea breeze",
  'Shimla':               "Summer capital of the British Raj at 2,200m above sea",
  'Srinagar':             "Dal Lake + chinar leaves + saffron fields in autumn",
  'Shillong':             "Scotland of the East — rock capital of India",
  'Amritsar':             "The Golden Temple feeds 100,000 people free. Daily.",
  'Lucknow':              "Tehzeeb so refined, even arguments end with 'pehle aap'",
  'Nashik':               "India's wine country on the banks of the Godavari",
  'Nagpur':               "Geographical center of India — the true zero mile",
  'Guwahati':             "Gateway to the Northeast on the mighty Brahmaputra",
  'Coimbatore':           "Manchester of South India — textile spine of the nation",
  'Madurai':              "Meenakshi temple built when Rome was still rising",
  'Dehradun':             "Valley of doons, ringed by snow-capped Himalayan peaks",
  'Visakhapatnam':        "Steel, submarines & 2,000 km of Eastern coast",
  'Pune':                 "Oxford of the East — 50+ universities, one vibrant city",
  'Surat':                "Cuts 90% of the world's diamonds. Right. Here.",
  'Patna':                "Pataliputra — capital of the Mauryan Empire",
  'Bengaluru':            "Silicon Valley of India and garden city — all in one",
  'Hyderabad':            "Biryani, pearls, and a $100B tech ecosystem",
  'Chennai':              "Classical Carnatic music + Marina Beach at sunrise",
  'Kolkata':              "City of joy — Tagore, trams & mishti doi",
  'Rajkot':               "Mahatma Gandhi's childhood city in Kathiawar",
  'Vadodara':             "Art, culture & the grand Gaekwad royal legacy",
  'Thiruvananthapuram':   "Kerala's capital — Padmanabhaswamy's golden vaults",
  'Tirupati':             "Most-visited pilgrim city on earth, atop Tirumala Hills",
  'Ujjain':               "One of seven sacred Hindu cities — where time began",
  'Gwalior':              "A fortress that has never been conquered in war",
  'Raipur':               "Fastest-growing city in central India's heartland",
  'Ranchi':               "Jharkhand's cool plateau capital, city of waterfalls",
  'Bhubaneswar':          "Temple city of India — 700 temples, one skyline",
  'Mangaluru':            "Where the Western Ghats meet the Arabian Sea",
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

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C3')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{
            background:   canProceed ? accent : 'rgba(255,255,255,0.08)',
            color:        canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:   "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight:   700,
            fontSize:     15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:      '12px 32px',
            border:       'none',
            boxShadow:    canProceed ? '8px 8px 0px 0px #000000' : 'none',
            cursor:       canProceed ? 'pointer' : 'not-allowed',
            transition:   'background 200ms',
          }}>
          Continue →
        </button>
      </footer>
    </>
  )
}
