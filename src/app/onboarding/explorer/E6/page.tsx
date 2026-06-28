'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
const ACCENT = '#9B8FFF'
const NAVY   = '#1A2744'

const INTENT_OPTIONS = [
  { id: 'host',     emoji: '🎤', text: 'Maybe host an open mic or event'                   },
  { id: 'share',    emoji: '🎨', text: 'Share my work online someday'                       },
  { id: 'already',  emoji: '📸', text: "I already create — just haven't set up a page"      },
  { id: 'discover', emoji: '🙌', text: "Nah, I'm purely here to discover"                   },
] as const

export default function E6Page() {
  const router = useRouter()
  const [selectedIntent, setSelectedIntent] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const interests = sessionStorage.getItem(SK.e_interests)
    if (interests === null) { router.replace('/onboarding/explorer/E5'); return }
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
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 40px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          Any creators<br />you already follow?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          Just a quick gut check — totally optional
        </p>

        {/* TYPE B single-select tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
          {INTENT_OPTIONS.map(opt => {
            const isSel = selectedIntent === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedIntent(prev => prev === opt.id ? '' : opt.id)}
                style={{
                  width:      '100%',
                  textAlign:  'left',
                  padding:    '14px 16px 14px 20px',
                  position:   'relative',
                  height:     64,
                  background: '#09090E',
                  border:     `1px solid ${isSel ? `${ACCENT}60` : `${ACCENT}20`}`,
                  borderLeft: `3px solid ${ACCENT}`,
                  cursor:     'pointer',
                  transition: 'all 200ms',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        12,
                  overflow:   'visible',
                }}
              >
                {/* Ticket notch */}
                <div style={{
                  position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, borderRadius: '50%', background: NAVY, zIndex: 2,
                }} />
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize:   15,
                  color:      isSel ? '#F0EFF8' : 'rgba(240,239,248,0.60)',
                  transition: 'color 200ms',
                }}>
                  {opt.text}
                </span>
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
        <button type="button" onClick={() => router.push('/onboarding/explorer/E5')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip for now
          </button>
          <button type="button" onClick={handleContinue}
            style={{
              background:    ACCENT,
              color:         '#1A2744',
              fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontWeight:    700,
              fontSize:      15,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding:       '12px 32px',
              border:        'none',
              boxShadow:     '8px 8px 0px 0px #000000',
              cursor:        'pointer',
            }}>
            Continue →
          </button>
        </div>
      </footer>
    </>
  )
}
