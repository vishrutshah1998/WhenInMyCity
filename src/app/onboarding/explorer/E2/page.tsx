'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { ExplorerPass } from '@/components/onboarding/BoardingPassArtifact'
import { useExistingProfileData } from '@/hooks/useExistingProfileData'
import { prefillExplorerKeys } from '@/lib/onboarding/prefill'

const ACCENT = '#9B8FFF'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function E2Content() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isAddMode    = searchParams.get('mode') === 'add'
  const [displayName, setDisplayName] = useState('')

  const { data: existingData } = useExistingProfileData()

  useEffect(() => {
    if (isAddMode && existingData) {
      prefillExplorerKeys(existingData)
      if (existingData.name && !displayName) setDisplayName(existingData.name)
    }
  }, [isAddMode, existingData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAddMode && sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    if (isAddMode) {
      sessionStorage.setItem('wimc_ob_mode', 'add')
      sessionStorage.setItem(SK.persona, 'explorer')
    }
    const saved = sessionStorage.getItem(SK.e_name)
    if (saved) setDisplayName(saved)
  }, [router, isAddMode])

  const canProceed = displayName.trim().length >= 2

  function handleContinue() {
    if (!canProceed) return
    try {
      sessionStorage.setItem(SK.e_name,     displayName.trim())
      sessionStorage.setItem(SK.e_username, slugify(displayName.trim()).substring(0, 20))
    } catch {}
    router.push('/onboarding/explorer/E3')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <ExplorerPass name={displayName || undefined} />

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 48px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          What should<br />we call you?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 40px', maxWidth: 400 }}>
          This is how you&apos;ll explore the city with us
        </p>

        <div style={{ maxWidth: 480 }}>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
            placeholder="Ria from Bhopal, Weekend Wanderer"
            autoComplete="off"
            autoFocus
            style={{
              width:         '100%',
              background:    'transparent',
              border:        'none',
              borderBottom:  `2px solid ${displayName.length > 0 ? ACCENT : 'rgba(255,255,255,0.15)'}`,
              fontFamily:    "'Outfit', sans-serif",
              fontWeight:    900,
              fontSize:      32,
              color:         '#F0EFF8',
              outline:       'none',
              paddingBottom: 8,
              caretColor:    ACCENT,
              transition:    'border-color 200ms',
            }}
          />
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{
            background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
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
          Continue →
        </button>
      </footer>
    </>
  )
}

export default function E2Page() {
  return (
    <Suspense>
      <E2Content />
    </Suspense>
  )
}
