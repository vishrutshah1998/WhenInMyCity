'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#9B8FFF'
const WARM_BG = '#F8F6FF'

const INTENT_OPTIONS = [
  { id: 'host',     emoji: '🎤', text: 'Maybe host an open mic or event'                      },
  { id: 'share',    emoji: '🎨', text: 'Share my work online someday'                          },
  { id: 'already',  emoji: '📸', text: "I already create — just haven't set up a page"         },
  { id: 'discover', emoji: '🙌', text: "Nah, I'm purely here to discover"                      },
] as const

export default function E6Page() {
  const router = useRouter()
  const [selectedIntent, setSelectedIntent] = useState<string>('')
  const [explorerName,   setExplorerName]   = useState<string>('')
  const [city,           setCity]           = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const interests = sessionStorage.getItem(SK.e_interests)
    if (interests === null) { router.replace('/onboarding/explorer/E5'); return }
    setExplorerName(sessionStorage.getItem(SK.e_name) || '')
    setCity(sessionStorage.getItem(SK.e_city) || '')
    const savedIntent = sessionStorage.getItem(SK.e_intent)
    if (savedIntent) setSelectedIntent(savedIntent)
  }, [router])

  function handleContinue() {
    if (selectedIntent) {
      try { sessionStorage.setItem(SK.e_intent, selectedIntent) } catch {}
    }
    router.push('/onboarding/explorer/E7')
  }

  function handleSkip() {
    router.push('/onboarding/explorer/E7')
  }

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          Any creators you already follow?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Just a quick gut check — totally optional
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {INTENT_OPTIONS.map(opt => {
            const isSel = selectedIntent === opt.id
            return (
              <button key={opt.id} type="button" onClick={() => setSelectedIntent(prev => prev === opt.id ? '' : opt.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '16px 20px', cursor: 'pointer', transition: 'all 200ms',
                  borderLeft:   `4px solid ${isSel ? ACCENT : 'transparent'}`,
                  borderTop:    `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`,
                  borderRight:  `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`,
                  borderBottom: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`,
                  background:   isSel ? `${ACCENT}12` : 'rgba(255,255,255,0.85)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 16, color: isSel ? '#1A1A1A' : 'rgba(26,26,26,0.60)', transition: 'color 200ms' }}>
                  {opt.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E5')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>Skip for now</button>
          <button type="button" onClick={handleContinue}
            style={{ background: ACCENT, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: 'pointer' }}>
            Continue
          </button>
        </div>
      </footer>
    </>
  )
}
