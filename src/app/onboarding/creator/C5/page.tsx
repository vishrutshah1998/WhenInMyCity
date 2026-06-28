'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryConfig } from '@/lib/constants/categories'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import type { CreatorType } from '@/types/database'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'


export default function C5Page() {
  const router = useRouter()
  const [selected,  setSelected]  = useState<string[]>([])
  const [category,  setCategory]  = useState('')
  const [accent,    setAccent]    = useState('#F5A800')
  const [advancing, setAdvancing] = useState(false)
  const [name,      setName]      = useState('')
  const [city,      setCity]      = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cityVal = sessionStorage.getItem(SK.c_city)
    if (!cityVal) { router.replace('/onboarding/creator/C4'); return }
    setCity(cityVal)
    const cat = sessionStorage.getItem(SK.c_category) || ''
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    const n = sessionStorage.getItem(SK.c_name)
    if (n) setName(n)
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  const options = useMemo(
    () => getCategoryConfig(category as CreatorType)?.subTypes ?? [],
    [category],
  )

  const NOT_YET = 'not_yet'

  function toggle(val: string) {
    setSelected(prev => {
      let next: string[]
      if (val === NOT_YET) {
        next = prev.includes(NOT_YET) ? [] : [NOT_YET]
      } else {
        const without = prev.filter(s => s !== NOT_YET)
        next = without.includes(val) ? without.filter(s => s !== val) : [...without, val]
      }
      try { sessionStorage.setItem(SK.c_subtypes, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handleContinue() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_subtypes, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/creator/C6')
  }

  function handleSkip() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_subtypes, '[]') } catch {}
    router.push('/onboarding/creator/C6')
  }

  const canProceed = selected.length > 0

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <CreatorEventTicket
          name={name || undefined}
          category={category || undefined}
          city={city || undefined}
          accent={accent}
        />

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 42px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          What do you<br />specialise in?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          Pick everything that applies
        </p>

        {/* TYPE C multi-select chips */}
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
                  fontSize:     14,
                  cursor:       'pointer',
                  transition:   'all 150ms',
                  border:       isSel ? `1px solid ${accent}` : `1px solid ${accent}30`,
                  background:   isSel ? accent : 'transparent',
                  color:        isSel ? '#1A2744' : 'rgba(255,255,255,0.60)',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                }}
              >
                {opt.emoji && <span>{opt.emoji}</span>}
                {opt.label}
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
        <button type="button" onClick={() => router.push('/onboarding/creator/C4')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip
          </button>
          <button type="button" onClick={handleContinue} disabled={!canProceed || advancing}
            style={{
              background:    canProceed ? accent : 'rgba(255,255,255,0.08)',
              color:         canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
              fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontWeight:    700,
              fontSize:      15,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding:       '12px 32px',
              border:        'none',
              boxShadow:     canProceed ? '8px 8px 0px 0px #000000' : 'none',
              cursor:        canProceed ? 'pointer' : 'not-allowed',
              transition:    'background 200ms',
            }}>
            {canProceed ? `Continue (${selected.length})` : 'Continue'}
          </button>
        </div>
      </footer>
    </>
  )
}
