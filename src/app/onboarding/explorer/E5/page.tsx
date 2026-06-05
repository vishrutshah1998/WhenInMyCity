'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#9B8FFF'
const WARM_BG = '#F8F6FF'

interface ChipOption { label: string; emoji: string }

const INTEREST_CHIPS: ChipOption[] = [
  { label: 'Live music',      emoji: '🎵' },
  { label: 'Art walks',       emoji: '🎨' },
  { label: 'Food events',     emoji: '🍕' },
  { label: 'Theatre',         emoji: '🎭' },
  { label: 'Photography',     emoji: '📸' },
  { label: 'Active events',   emoji: '🏃' },
  { label: 'Tech talks',      emoji: '💻' },
  { label: 'Wellness',        emoji: '🌿' },
  { label: 'Markets & pop-ups', emoji: '🎪' },
  { label: 'Film',            emoji: '🎬' },
  { label: 'Workshops',       emoji: '📚' },
  { label: 'Neighbourhood',   emoji: '🌆' },
]

export default function E5Page() {
  const router = useRouter()
  const [selected,     setSelected]     = useState<string[]>([])
  const [explorerName, setExplorerName] = useState('')
  const [city,         setCity]         = useState('')
  const [isAdvancing,  setIsAdvancing]  = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const cityVal = sessionStorage.getItem(SK.e_city)
    if (!cityVal) { router.replace('/onboarding/explorer/E4'); return }
    setCity(cityVal)
    setExplorerName(sessionStorage.getItem(SK.e_name) || '')
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

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What do you want to discover?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          The more you pick, the better your recommendations
        </p>

        {/* TYPE C — rounded-full pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {INTEREST_CHIPS.map(chip => {
            const isSel = selected.includes(chip.label)
            return (
              <button key={chip.label} type="button" onClick={() => toggle(chip.label)}
                style={{
                  padding: '10px 18px', borderRadius: 999, cursor: 'pointer', transition: 'all 150ms',
                  border:      isSel ? 'none' : '1px solid rgba(255,255,255,0.14)',
                  background:  isSel ? ACCENT : 'rgba(255,255,255,0.9)',
                  color:       isSel ? '#ffffff' : '#1A1A1A',
                  fontFamily:  "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>{chip.emoji}</span>
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E4')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>Skip</button>
          <button type="button" onClick={handleContinue} disabled={isAdvancing || selected.length === 0}
            style={{ background: selected.length > 0 ? ACCENT : 'rgba(255,255,255,0.10)', color: selected.length > 0 ? '#ffffff' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: selected.length > 0 ? 'pointer' : 'not-allowed', opacity: isAdvancing ? 0.6 : 1 }}>
            Continue{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </footer>
    </>
  )
}
