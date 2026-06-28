'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
const ACCENT = '#9B8FFF'

interface ChipOption { label: string; emoji: string }

const INTEREST_CHIPS: ChipOption[] = [
  { label: 'Live music',        emoji: '🎵' },
  { label: 'Art walks',         emoji: '🎨' },
  { label: 'Food events',       emoji: '🍕' },
  { label: 'Theatre',           emoji: '🎭' },
  { label: 'Photography',       emoji: '📸' },
  { label: 'Active events',     emoji: '🏃' },
  { label: 'Tech talks',        emoji: '💻' },
  { label: 'Wellness',          emoji: '🌿' },
  { label: 'Markets & pop-ups', emoji: '🎪' },
  { label: 'Film',              emoji: '🎬' },
  { label: 'Workshops',         emoji: '📚' },
  { label: 'Neighbourhood',     emoji: '🌆' },
]

export default function E5Page() {
  const router = useRouter()
  const [selected,    setSelected]    = useState<string[]>([])
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [eName,       setEName]       = useState('')
  const [eScene,      setEScene]      = useState('')
  const [eCity,       setECity]       = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const cityVal = sessionStorage.getItem(SK.e_city)
    if (!cityVal) { router.replace('/onboarding/explorer/E4'); return }
    setECity(cityVal)
    const n = sessionStorage.getItem(SK.e_name)
    if (n) setEName(n)
    const s = sessionStorage.getItem(SK.e_scene)
    if (s) setEScene(s)
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.e_interests) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  function toggle(label: string) {
    setSelected(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label])
  }

  function handleContinue() {
    if (isAdvancing) return
    setIsAdvancing(true)
    try { sessionStorage.setItem(SK.e_interests, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/explorer/E6')
  }

  function handleSkip() {
    try { sessionStorage.setItem(SK.e_interests, '[]') } catch {}
    router.push('/onboarding/explorer/E6')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        {/* Cream ticket stub card */}
        <div style={{ position: 'relative', width: '100%', background: '#F5F1E6', color: '#1A2744', marginBottom: 32, flexShrink: 0, display: 'flex', flexDirection: 'column', boxShadow: '8px 8px 0px 0px #000000', border: '1px solid rgba(26,39,68,0.15)' }}>
          {/* Lavender left bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#9B8FFF' }} />

          <div style={{ padding: '20px 20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(26,39,68,0.60)' }}>
                Serial No. 882-901-E5 · PHASE_05
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', border: '1px solid rgba(26,39,68,0.20)', fontFamily: "'DM Sans', sans-serif" }}>
                ECONOMY
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              {[
                { label: 'NAME', value: eName || '—' },
                { label: 'ROLE', value: 'EXPLORER'   },
                { label: 'CLASS', value: eScene || '—' },
                { label: 'CITY', value: eCity || '—'  },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(26,39,68,0.50)', textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 14, textTransform: 'uppercase', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Perforation */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: -8, width: 16, height: 16, background: '#1A2744', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', right: -8, width: 16, height: 16, background: '#1A2744', borderRadius: '50%' }} />
            <div style={{ flex: 1, borderTop: '2px dashed rgba(26,39,68,0.10)', margin: '0 8px' }} />
          </div>

          {/* Stub */}
          <div style={{ height: 34, background: 'rgba(26,39,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, fontWeight: 900, color: 'rgba(26,39,68,0.30)', letterSpacing: '0.30em', textTransform: 'uppercase' }}>
              ADMIT ONE // 2024
            </span>
            <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'stretch' }}>
              {[1,2,1,3,1,2,1,1].map((w,i) => (
                <div key={i} style={{ background: 'rgba(26,39,68,0.40)', width: w * 3, height: '100%' }} />
              ))}
            </div>
          </div>
        </div>

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 40px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          What do you<br />want to discover?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          The more you pick, the better your recommendations
        </p>

        {/* TYPE C multi-select chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {INTEREST_CHIPS.map(chip => {
            const isSel = selected.includes(chip.label)
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => toggle(chip.label)}
                style={{
                  padding:      '10px 18px',
                  borderRadius: 999,
                  cursor:       'pointer',
                  transition:   'all 150ms',
                  border:       isSel ? `1px solid ${ACCENT}` : `1px solid ${ACCENT}30`,
                  background:   isSel ? ACCENT : 'transparent',
                  color:        isSel ? '#1A2744' : 'rgba(255,255,255,0.60)',
                  fontFamily:   "'DM Sans', sans-serif",
                  fontWeight:   600,
                  fontSize:     14,
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                }}
              >
                <span>{chip.emoji}</span>
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E4')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip
          </button>
          <button type="button" onClick={handleContinue} disabled={isAdvancing || selected.length === 0}
            style={{
              background:    selected.length > 0 ? ACCENT : 'rgba(255,255,255,0.08)',
              color:         selected.length > 0 ? '#1A2744' : 'rgba(255,255,255,0.22)',
              fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontWeight:    700,
              fontSize:      15,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding:       '12px 32px',
              border:        'none',
              boxShadow:     selected.length > 0 ? '8px 8px 0px 0px #000000' : 'none',
              cursor:        selected.length > 0 ? 'pointer' : 'not-allowed',
              opacity:       isAdvancing ? 0.6 : 1,
            }}>
            {selected.length > 0 ? `Continue (${selected.length})` : 'Continue'}
          </button>
        </div>
      </footer>
    </>
  )
}
