'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT = '#9B8FFF'
const NAVY   = '#1A2744'
const DARK   = '#2a292d'

const SCENES = [
  { id: 'music',       emoji: '🎵', label: 'Music Fan'      },
  { id: 'theatre',     emoji: '🎭', label: 'Theatre Goer'   },
  { id: 'art',         emoji: '🎨', label: 'Art Explorer'   },
  { id: 'film',        emoji: '🎬', label: 'Film Buff'       },
  { id: 'books',       emoji: '📚', label: 'Book Lover'      },
  { id: 'comedy',      emoji: '🎤', label: 'Comedy Fan'      },
  { id: 'podcast',     emoji: '🎧', label: 'Podcast Fan'     },
  { id: 'photography', emoji: '📸', label: 'Photography'     },
  { id: 'events',      emoji: '🎪', label: 'Event Hunter'    },
  { id: 'dance',       emoji: '💃', label: 'Dance'           },
  { id: 'poetry',      emoji: '✍️', label: 'Poetry Fan'      },
  { id: 'food',        emoji: '🌮', label: 'Food Explorer'   },
] as const

type SceneId = typeof SCENES[number]['id']

export default function E3Page() {
  const router = useRouter()
  const [selected,  setSelected]  = useState<SceneId | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [eName,     setEName]     = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const name = sessionStorage.getItem(SK.e_name)
    if (!name) { router.replace('/onboarding/explorer/E2'); return }
    setEName(name)
    const saved = sessionStorage.getItem(SK.e_scene) as SceneId | null
    if (saved) setSelected(saved)
  }, [router])

  function handleSelect(id: SceneId) {
    if (advancing) return
    setSelected(id)
    try { sessionStorage.setItem(SK.e_scene, id) } catch {}
    // Visual selection state — user confirms with Continue button
  }

  function handleContinue() {
    if (!selected || advancing) return
    setAdvancing(true)
    router.push('/onboarding/explorer/E4')
  }

  const selectedScene = SCENES.find(s => s.id === selected)

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        {/* Compact boarding pass bar */}
        <div style={{
          width:          '100%',
          background:     DARK,
          borderLeft:     `3px solid ${ACCENT}`,
          padding:        16,
          marginBottom:   32,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          position:       'relative',
          flexShrink:     0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.20em', color: `${ACCENT}B3` }}>Passenger</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#e5e1e6' }}>{eName || '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', borderLeft: '1px solid rgba(87,66,62,0.30)', borderRight: '1px solid rgba(87,66,62,0.30)', padding: '0 16px' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.20em', color: `${ACCENT}B3` }}>Role</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: ACCENT }}>EXPLORER</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.20em', color: `${ACCENT}B3` }}>Class</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#e5e1e6', fontStyle: 'italic' }}>
              {selectedScene?.label || '—'}
            </span>
          </div>
          {/* Notch */}
          <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, background: NAVY, borderRadius: '50%' }} />
        </div>

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          What&apos;s your<br />scene?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          We&apos;ll fill your feed with events that match your vibe
        </p>

        {/* 3-column category grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 520 }}>
          {SCENES.map(scene => {
            const isSel   = selected === scene.id
            const isOther = selected !== null && !isSel
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSelect(scene.id)}
                disabled={advancing && !isSel}
                style={{
                  textAlign:  'left',
                  padding:    '16px',
                  position:   'relative',
                  background: isSel ? 'rgba(155,143,255,0.10)' : '#1b1b1f',
                  border:     `1px solid ${isSel ? ACCENT : 'rgba(155,143,255,0.15)'}`,
                  borderLeft: `3px solid ${isSel ? ACCENT : 'rgba(155,143,255,0.30)'}`,
                  opacity:    isOther ? 0.35 : 1,
                  cursor:     advancing ? 'default' : 'pointer',
                  transition: 'all 200ms',
                  overflow:   'hidden',
                  clipPath:   'polygon(0% 0%, 100% 0%, 100% 35%, 96% 40%, 100% 45%, 100% 100%, 0% 100%, 0% 45%, 4% 40%, 0% 35%)',
                }}
              >
                <span style={{ fontSize: 18, display: 'block', marginBottom: 6 }}>{scene.emoji}</span>
                <div style={{
                  fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
                  fontWeight:    700,
                  fontSize:      13,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color:         isSel ? ACCENT : '#F0EFF8',
                  lineHeight:    1.2,
                  transition:    'color 200ms',
                }}>
                  {scene.label}
                </div>
                {isSel && (
                  <span className="material-symbols-outlined" style={{ position: 'absolute', top: 8, right: 8, fontSize: 16, color: ACCENT, fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
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
        <button type="button" onClick={() => router.push('/onboarding/explorer/E2')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || advancing}
          style={{
            background:    selected && !advancing ? ACCENT : 'rgba(155,143,255,0.12)',
            color:         selected && !advancing ? '#1A2744' : 'rgba(155,143,255,0.35)',
            fontFamily:    "'DM Sans', sans-serif",
            fontWeight:    700, fontSize: 15,
            letterSpacing: '0.08em',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     selected && !advancing ? '4px 4px 0px #000000' : 'none',
            cursor:        selected && !advancing ? 'pointer' : 'not-allowed',
            transition:    'all 150ms',
          }}
        >
          Continue →
        </button>
      </footer>
    </>
  )
}
