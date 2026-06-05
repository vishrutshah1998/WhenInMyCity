'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#9B8FFF'
const WARM_BG = '#F8F6FF'

const SCENES = [
  { id: 'music',     emoji: '🎵', label: 'Music & Nightlife', subtitle: 'Gigs, raves, open mics'              },
  { id: 'art',       emoji: '🎨', label: 'Art & Culture',      subtitle: 'Galleries, pop-ups, performances'   },
  { id: 'food',      emoji: '🍜', label: 'Food & Drink',       subtitle: 'Supper clubs, tastings, markets'    },
  { id: 'tech',      emoji: '💻', label: 'Tech & Talks',       subtitle: 'Meetups, hackathons, conferences'   },
  { id: 'sport',     emoji: '🏃', label: 'Sport & Wellness',   subtitle: 'Runs, yoga, outdoor events'         },
  { id: 'community', emoji: '🌆', label: 'Community',          subtitle: 'Flea markets, neighbourhood events' },
] as const

type SceneId = typeof SCENES[number]['id']

export default function E3Page() {
  const router = useRouter()
  const [selected,     setSelected]     = useState<SceneId | null>(null)
  const [explorerName, setExplorerName] = useState('')
  const [advancing,    setAdvancing]    = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const name = sessionStorage.getItem(SK.e_name)
    if (!name) { router.replace('/onboarding/explorer/E2'); return }
    setExplorerName(name)
    const saved = sessionStorage.getItem(SK.e_scene) as SceneId | null
    if (saved) setSelected(saved)
  }, [router])

  async function handleSelect(id: SceneId) {
    if (advancing) return
    setSelected(id)
    setAdvancing(true)
    try { sessionStorage.setItem(SK.e_scene, id) } catch {}
    await new Promise(r => setTimeout(r, 400))
    router.push('/onboarding/explorer/E4')
  }

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What&apos;s your scene?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          We&apos;ll fill your feed with events that match your vibe
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {SCENES.map(scene => {
            const isSel  = selected === scene.id
            const isOther = selected !== null && !isSel
            return (
              <button key={scene.id} type="button" onClick={() => handleSelect(scene.id)} disabled={advancing && !isSel}
                style={{
                  width: '100%', textAlign: 'left', padding: '16px 20px', cursor: advancing ? 'default' : 'pointer',
                  borderLeft:   `4px solid ${isSel ? ACCENT : 'transparent'}`,
                  borderTop:    `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`,
                  borderRight:  `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`,
                  borderBottom: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`,
                  background:   isSel ? `${ACCENT}12` : 'rgba(255,255,255,0.85)',
                  opacity:      isOther ? 0.35 : 1,
                  transition:   'all 200ms',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          14,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{scene.emoji}</span>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, color: isSel ? ACCENT : '#1A1A1A', marginBottom: 3, transition: 'color 200ms' }}>
                    {scene.label}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: isSel ? `${ACCENT}99` : 'rgba(240,239,248,0.45)', transition: 'color 200ms' }}>
                    {scene.subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E2')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
      </footer>
    </>
  )
}
