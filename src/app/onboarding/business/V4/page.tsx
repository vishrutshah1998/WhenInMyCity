'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#5DD9D0'
const WARM_BG = '#F2FFFE'

const VENUE_TYPES = [
  { id: 'cafe',           emoji: '☕', label: 'Café'             },
  { id: 'gallery',        emoji: '🎨', label: 'Gallery'          },
  { id: 'studio',         emoji: '🎵', label: 'Studio'           },
  { id: 'rooftop',        emoji: '🌆', label: 'Rooftop'          },
  { id: 'coworking',      emoji: '💻', label: 'Co-working'       },
  { id: 'community_hall', emoji: '🏛️', label: 'Community hall'   },
  { id: 'restaurant',     emoji: '🍽️', label: 'Restaurant'       },
  { id: 'garden',         emoji: '🌿', label: 'Outdoor / Garden' },
  { id: 'library',        emoji: '📚', label: 'Library'          },
] as const

type VenueTypeId = typeof VENUE_TYPES[number]['id']

export default function V4Page() {
  const router = useRouter()

  const [selected,  setSelected]  = useState<VenueTypeId[]>([])
  const [advancing, setAdvancing] = useState(false)
  const [bName,     setBName]     = useState('')
  const [bCity,     setBCity]     = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    try {
      const saved = sessionStorage.getItem(SK.v_types)
      if (saved) setSelected(JSON.parse(saved) as VenueTypeId[])
    } catch {}
  }, [router])

  function toggleType(id: VenueTypeId) {
    setSelected(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])
  }

  async function handleContinue() {
    if (advancing || selected.length === 0) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.v_types, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/business/V5')
  }

  const canProceed = selected.length > 0

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What describes your space?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Pick everything that applies — this shapes your listing
        </p>

        {/* TYPE C — rounded-full multi-select pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {VENUE_TYPES.map(vt => {
            const isSel = selected.includes(vt.id)
            return (
              <button key={vt.id} type="button" onClick={() => toggleType(vt.id)}
                style={{
                  padding: '10px 18px', borderRadius: 999, cursor: 'pointer', transition: 'all 150ms',
                  border:      isSel ? 'none' : '1px solid rgba(255,255,255,0.14)',
                  background:  isSel ? ACCENT : 'rgba(255,255,255,0.9)',
                  color:       isSel ? '#07070A' : '#1A1A1A',
                  fontFamily:  "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <span>{vt.emoji}</span>
                {vt.label}
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/business/B3')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.10)', color: canProceed ? '#07070A' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'background 200ms' }}>
          Continue{canProceed ? ` (${selected.length})` : ''}
        </button>
      </footer>
    </>
  )
}
