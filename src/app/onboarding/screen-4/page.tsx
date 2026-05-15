'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CITIES } from '@/lib/constants/interests'

const E = [0.22, 1, 0.36, 1] as const
const ACCENT = '#F5A800'

// ---------------------------------------------------------------------------
// Suggestion pills
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { id: 'indore',     name: 'Indore',     tip: 'Indore — best street food + jazz scene 🔥' },
  { id: 'jaipur',    name: 'Jaipur',     tip: 'Jaipur — the Pink City 🌸' },
  { id: 'ahmedabad', name: 'Ahmedabad',  tip: 'Ahmedabad — UNESCO heritage streets 🏛️' },
]

const TIER_2 = new Set([
  'indore', 'jaipur', 'ahmedabad', 'bhopal', 'nagpur', 'surat', 'vadodara',
  'rajkot', 'lucknow', 'kanpur', 'varanasi', 'agra', 'prayagraj', 'meerut',
  'coimbatore', 'madurai', 'kochi', 'mysuru', 'mangaluru', 'nashik', 'kolhapur',
  'amritsar', 'ludhiana', 'chandigarh', 'dehradun', 'bhubaneswar', 'raipur',
  'guwahati', 'patna', 'ranchi', 'jamshedpur', 'shillong', 'puducherry',
  'vijayawada', 'visakhapatnam', 'warangal', 'udaipur', 'jodhpur', 'kota',
  'jalandhar', 'srinagar', 'jammu',
])

const CITY_TIPS: Record<string, string> = {
  indore:    'Indore — best street food + jazz scene 🔥',
  jaipur:    'Jaipur — the Pink City 🌸',
  ahmedabad: 'Ahmedabad — UNESCO heritage streets 🏛️',
  bhopal:    'Bhopal — the City of Lakes 🌊',
  nagpur:    'Nagpur — the Orange City 🍊',
  surat:     'Surat — diamond city of India 💎',
  vadodara:  "Vadodara — Gujarat's cultural capital 🎭",
  lucknow:   'Lucknow — city of nawabs 🕌',
  varanasi:  'Varanasi — oldest living city 🪔',
  kochi:     'Kochi — Queen of the Arabian Sea ⛵',
  mysuru:    'Mysuru — city of palaces 👑',
  chandigarh:'Chandigarh — city beautiful 🌳',
  dehradun:  'Dehradun — gateway to the Himalayas 🏔️',
  udaipur:   'Udaipur — the Venice of the East 🏯',
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Screen4Page() {
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [showTypeahead, setShowTypeahead] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as { creatorType?: string } | null
      if (!s1?.creatorType) { router.replace('/onboarding/screen-3'); return }
    } catch { /* ignore */ }
  }, [router])

  useEffect(() => {
    if (showTypeahead) setTimeout(() => inputRef.current?.focus(), 80)
  }, [showTypeahead])

  function handleSuggestion(id: string, name: string) {
    if (selectedCity) return
    setSelectedCity(id)
    setSelectedName(name)
  }

  function handleTypeaheadSelect(id: string, name: string) {
    setShowTypeahead(false)
    setQuery('')
    setSelectedCity(id)
    setSelectedName(name)
  }

  function handleContinue() {
    if (!selectedCity) return
    sessionStorage.setItem('wimc_city', selectedName)
    try {
      const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || '{}')
      sessionStorage.setItem('wimc_s2', JSON.stringify({ ...s2, city: selectedName }))
    } catch { /* ignore */ }
    router.push('/onboarding/screen-5')
  }

  const filtered = query.trim().length >= 1
    ? CITIES
        .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          const aT = TIER_2.has(a.id) ? 0 : 1
          const bT = TIER_2.has(b.id) ? 0 : 1
          return aT !== bT ? aT - bT : a.name.localeCompare(b.name)
        })
        .slice(0, 8)
    : []

  const tip = selectedCity
    ? (CITY_TIPS[selectedCity] ?? `${selectedName} — your city 🏙️`)
    : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 24px 88px' }}>
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Chat bubble with icon */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: `${ACCENT}18`,
              border: `1px solid ${ACCENT}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18,
            }}
          >
            📍
          </div>
          <div
            style={{
              flex: 1,
              background: '#0D0D12',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700, color: '#F0EFF8', margin: 0, lineHeight: 1.4 }}>
              Which city are you repping?
            </p>
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#9896B0', margin: '4px 0 0', lineHeight: 1.5 }}>
              We&apos;ll show you what&apos;s happening near you.
            </p>
          </div>
        </motion.div>

        {/* 2×2 suggestion grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E, delay: 0.08 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {SUGGESTIONS.map((s, i) => {
            const isSelected = selectedCity === s.id
            const isDisabled = !!selectedCity && !isSelected
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => handleSuggestion(s.id, s.name)}
                disabled={!!selectedCity}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: isDisabled ? 0.3 : 1, y: 0 }}
                transition={{ duration: 0.3, ease: E, delay: 0.05 * i }}
                whileTap={{ scale: isSelected ? 1 : 0.97 }}
                style={{
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 12px',
                  background: isSelected ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 0,
                  cursor: selectedCity ? 'default' : 'pointer',
                  transition: 'background 0.18s ease, border-color 0.18s ease',
                }}
              >
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: isSelected ? ACCENT : '#F0EFF8',
                    letterSpacing: '0.02em',
                    transition: 'color 0.18s ease',
                  }}
                >
                  {s.name}
                </span>
              </motion.button>
            )
          })}

          {/* + Pick another city */}
          <AnimatePresence>
            {!selectedCity && (
              <motion.button
                key="pick-another"
                type="button"
                onClick={() => setShowTypeahead(true)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: E, delay: 0.15 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '0 12px',
                  background: 'transparent',
                  border: `1px dashed rgba(255,255,255,0.12)`,
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
                  + Pick another city
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* City tip */}
        <AnimatePresence>
          {tip && (
            <motion.p
              key={tip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: E }}
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 13,
                color: ACCENT,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              📍 {tip}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Typeahead panel */}
        <AnimatePresence>
          {showTypeahead && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: E }}
              style={{
                border: `1px solid ${ACCENT}28`,
                background: `${ACCENT}04`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '7px 14px',
                  borderBottom: `1px solid ${ACCENT}14`,
                  background: `${ACCENT}08`,
                  gap: 8,
                }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: `${ACCENT}88`, textTransform: 'uppercase', flexShrink: 0 }}>
                  YOUR CITY
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type to search…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#F0EFF8',
                    caretColor: ACCENT,
                  }}
                  className="placeholder-[#3C3A52]"
                />
                <button
                  type="button"
                  onClick={() => { setShowTypeahead(false); setQuery('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, color: `${ACCENT}55`, padding: '2px 4px', letterSpacing: '0.1em' }}
                >
                  ESC
                </button>
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filtered.length === 0 && query.trim().length >= 1 && (
                  <div style={{ padding: '14px 16px', fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#5C5A72' }}>
                    No cities found for &quot;{query}&quot;
                  </div>
                )}
                {filtered.map(city => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleTypeaheadSelect(city.id, city.name)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}0A` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{city.emoji}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 600, color: '#F0EFF8', lineHeight: 1.2 }}>{city.name}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5C5A72', letterSpacing: '0.1em', marginTop: 2 }}>{city.state}</div>
                    </div>
                    {TIER_2.has(city.id) && (
                      <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.2em', color: `${ACCENT}66`, textTransform: 'uppercase' }}>
                        TIER 2
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky footer: BACK + CONTINUE */}
      <footer
        className="ob-cta-footer"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          padding: '14px 24px',
          background: 'rgba(7,7,10,0.92)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '16px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: 13,
              color: '#9896B0',
              letterSpacing: '0.05em',
            }}
          >
            BACK
          </button>
          <motion.button
            type="button"
            onClick={handleContinue}
            disabled={!selectedCity}
            whileTap={{ scale: selectedCity ? 0.98 : 1 }}
            style={{
              padding: '16px 24px',
              background: selectedCity ? ACCENT : `${ACCENT}44`,
              border: 'none',
              borderRadius: 0,
              cursor: selectedCity ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: 15,
              color: '#07070A',
              transition: 'background 0.2s ease',
            }}
          >
            CONTINUE →
          </motion.button>
        </div>
      </footer>
    </div>
  )
}
