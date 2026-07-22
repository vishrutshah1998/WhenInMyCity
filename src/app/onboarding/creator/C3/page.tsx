'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'

const NAVY = '#1A2744'

export default function C3Page() {
  const router = useRouter()

  const [selected, setSelected] = useState<string | null>(null)
  const [name,     setName]     = useState('')

  useEffect(() => {
    if (sessionStorage.getItem(SK.persona) !== 'creator') { router.replace('/onboarding'); return }
    const n = sessionStorage.getItem(SK.c_name)
    if (!n) { router.replace('/onboarding/creator/C2'); return }
    setName(n)
    const saved = sessionStorage.getItem(SK.c_category)
    if (saved) setSelected(saved)
  }, [router])

  function handleSelect(id: string) {
    setSelected(id)
    try { sessionStorage.setItem(SK.c_category, id) } catch {}
    // Notify right panel immediately (same-tab storage events don't fire)
    window.dispatchEvent(new CustomEvent('ob-snap-update'))
    // Card flip animation still runs; user confirms with Continue button
  }

  function handleContinue() {
    if (selected) router.push('/onboarding/creator/C4')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <CreatorEventTicket
          name={name || undefined}
          category={selected ?? undefined}
          accent={selected ? getCategoryColour(selected) : '#E8705A'}
        />

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          What do you create?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          Shapes your page colour and who discovers your work
        </p>

        {/* 4-column category grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxWidth: 480 }}>
          {CREATOR_CATEGORIES.map(cat => {
            const catAccent  = cat.primaryColor
            const isSelected = selected === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                style={{
                  position:       'relative',
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            6,
                  padding:        '12px 4px',
                  aspectRatio:    '1',
                  background:     isSelected ? `${catAccent}1A` : '#0D0B18',
                  border:         `1px solid ${isSelected ? catAccent : 'rgba(255,255,255,0.05)'}`,
                  transform:      isSelected ? 'scale(1.05)' : 'scale(1)',
                  zIndex:         isSelected ? 10 : 1,
                  cursor:         'pointer',
                  transition:     'all 200ms',
                }}
              >
                {isSelected && (
                  <div style={{
                    position:        'absolute',
                    top: -8, right:  -8,
                    width:           20, height: 20,
                    borderRadius:    '50%',
                    backgroundColor: catAccent,
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    zIndex:          2,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#fff' }}>check</span>
                  </div>
                )}
                <span style={{ fontSize: 20, lineHeight: 1 }}>{cat.emoji}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize:   11,
                  color:      isSelected ? catAccent : '#dec0ba',
                  textAlign:  'center',
                  lineHeight: 1.2,
                }}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9896B0', fontStyle: 'italic', margin: '8px 0 0' }}>
          {selected ? 'Change your mind? Tap another.' : 'Tap to select your category.'}
        </p>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C2')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          style={{
            background:    selected ? (CREATOR_CATEGORIES.find(c => c.id === selected)?.primaryColor ?? '#E8705A') : 'rgba(255,255,255,0.08)',
            color:         selected ? '#ffffff' : 'rgba(255,255,255,0.22)',
            fontFamily:    "'DM Sans', sans-serif",
            fontWeight:    700, fontSize: 15,
            letterSpacing: '0.08em',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     selected ? '4px 4px 0px #000000' : 'none',
            cursor:        selected ? 'pointer' : 'not-allowed',
            transition:    'all 150ms',
          }}
        >
          Continue →
        </button>
      </footer>
    </>
  )
}
