'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryColour, getCategoryWarmBg } from '@/lib/onboarding/design-tokens'
import { getCategoryConfig } from '@/lib/constants/categories'
import type { CreatorType } from '@/types/database'

export default function C5Page() {
  const router = useRouter()
  const [selected,   setSelected]   = useState<string[]>([])
  const [category,   setCategory]   = useState('')
  const [holderName, setHolderName] = useState('')
  const [city,       setCity]       = useState('')
  const [accent,     setAccent]     = useState('#E8705A')
  const [warmBg,     setWarmBg]     = useState('#FFF8F5')
  const [advancing,  setAdvancing]  = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cityVal = sessionStorage.getItem(SK.c_city)
    if (!cityVal) { router.replace('/onboarding/creator/C4'); return }
    setCity(cityVal)
    const cat = sessionStorage.getItem(SK.c_category) || ''
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    setWarmBg(getCategoryWarmBg(cat))
    const name = sessionStorage.getItem(SK.c_name) || ''
    setHolderName(name)
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  const options = useMemo(
    () => getCategoryConfig(category as CreatorType)?.subTypes ?? [],
    [category],
  )

  function toggle(val: string) {
    setSelected(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val])
  }

  function nextScreen() {
    const config = getCategoryConfig(category as CreatorType)
    const hasOfflineActs = config?.offlineActivities && config.offlineActivities.length > 0
    return hasOfflineActs ? '/onboarding/creator/C5b' : '/onboarding/creator/C6'
  }

  function handleContinue() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_subtypes, JSON.stringify(selected)) } catch {}
    router.push(nextScreen())
  }

  function handleSkip() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_subtypes, '[]') } catch {}
    router.push(nextScreen())
  }

  const canProceed = selected.length > 0

  return (
    <>
      <div style={{
        minHeight:     '100%',
        overflowY:     'auto',
        paddingTop:    48,
        paddingBottom: 96,
        paddingLeft:   24,
        paddingRight:  24,
      }}>
        <h1 style={{
          fontFamily:  "'Outfit', sans-serif",
          fontWeight:  900,
          fontSize:    'clamp(28px, 7vw, 44px)',
          color:       '#F0EFF8',
          lineHeight:  1.05,
          margin:      '0 0 8px',
          maxWidth:    480,
        }}>
          What do you create?
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   15,
          color:      'rgba(240,239,248,0.5)',
          margin:     '0 0 40px',
          maxWidth:   400,
        }}>
          These appear as chips on your page — show your range
        </p>

        {/* Multi-select pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {options.map(opt => {
            const isSel = selected.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                style={{
                  padding:      '10px 18px',
                  borderRadius: 999,
                  fontFamily:   "'DM Sans', sans-serif",
                  fontWeight:   600,
                  fontSize:     15,
                  cursor:       'pointer',
                  transition:   'all 150ms',
                  border:       isSel ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.14)',
                  background:   isSel ? accent : 'rgba(255,255,255,0.06)',
                  color:        isSel ? '#ffffff' : 'rgba(240,239,248,0.75)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{
        position:       'fixed',
        bottom:         0,
        left:           0,
        right:          0,
        height:         72,
        zIndex:         50,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        background:     'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C4')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip
          </button>
          <button type="button" onClick={handleContinue} disabled={!canProceed || advancing}
            style={{
              background:  canProceed ? accent : 'rgba(255,255,255,0.08)',
              color:       canProceed ? '#ffffff' : 'rgba(255,255,255,0.22)',
              fontFamily:  "'DM Sans', sans-serif",
              fontWeight:  600,
              fontSize:    15,
              padding:     '12px 32px',
              border:      'none',
              cursor:      canProceed ? 'pointer' : 'not-allowed',
              transition:  'background 200ms',
            }}>
            Continue{canProceed ? ` (${selected.length})` : ''}
          </button>
        </div>
      </footer>
    </>
  )
}
