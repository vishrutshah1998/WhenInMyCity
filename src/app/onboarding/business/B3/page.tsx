'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'


const TEAL    = '#5DD9D0'
const AMBER   = '#F5A800'
const WARM_BG = '#FFF8F5'

type PathType = 'venue' | 'brand'

const PATHS = [
  {
    id:       'venue'  as PathType,
    emoji:    '🏠',
    accent:   TEAL,
    label:    'Open your doors',
    subtitle: 'Café, rooftop, studio, gallery — creators book your space',
    cta:      '→ Get a WIMC Adda listing',
    next:     '/onboarding/business/V4',
  },
  {
    id:       'brand' as PathType,
    emoji:    '🏷️',
    accent:   AMBER,
    label:    'Partner with culture',
    subtitle: 'Shop, agency, startup, D2C — reach creators and culture lovers',
    cta:      '→ Get a WIMC brand page',
    next:     '/onboarding/business/R4',
  },
] as const

export default function B3Page() {
  const router = useRouter()
  const [selected,  setSelected]  = useState<PathType | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [bName,     setBName]     = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name = sessionStorage.getItem(SK.b_name) ?? ''
    if (!name) { router.replace('/onboarding/business/B2'); return }
    setBName(name)
  }, [router])

  async function handleSelect(type: PathType, next: string) {
    if (advancing) return
    setSelected(type)
    setAdvancing(true)
    try { sessionStorage.setItem(SK.b_subpath, type) } catch {}
    await new Promise<void>(r => setTimeout(r, 500))
    router.push(next)
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          How do you show up to culture?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Your category defines how you appear in discovery
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {PATHS.map(p => {
            const isSel   = selected === p.id
            const isOther = selected !== null && !isSel
            return (
              <button key={p.id} type="button" onClick={() => handleSelect(p.id, p.next)} disabled={advancing && !isSel}
                style={{
                  width: '100%', textAlign: 'left', padding: '16px 20px', cursor: advancing ? 'default' : 'pointer',
                  border:       `1px solid ${isSel ? `${p.accent}40` : 'rgba(255,255,255,0.09)'}`,
                  borderLeft:   `4px solid ${isSel ? p.accent : 'rgba(255,255,255,0.08)'}`,
                  background:   isSel ? `${p.accent}14` : 'rgba(9,9,14,0.45)',
                  opacity:      isOther ? 0.30 : 1,
                  transition:   'all 200ms',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          14,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, color: isSel ? p.accent : '#F0EFF8', marginBottom: 4, transition: 'color 200ms' }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.45)', marginBottom: 6 }}>
                    {p.subtitle}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: p.accent, opacity: 0.75 }}>
                    {p.cta}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.25)', marginTop: 20, fontStyle: 'italic' }}>
          Not sure? Pick the closest — you can always add the other later.
        </p>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', padding: '0 24px', background: 'linear-gradient(to top, #1A2744 60%, transparent 100%)' }}>
        <button type="button" onClick={() => router.push('/onboarding/business/B2')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
      </footer>
    </>
  )
}
