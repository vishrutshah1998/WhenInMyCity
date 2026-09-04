'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { ExplorerPass } from '@/components/onboarding/BoardingPassArtifact'
import { useExistingProfileData } from '@/hooks/useExistingProfileData'
import { prefillExplorerKeys } from '@/lib/onboarding/prefill'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'

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
    router.push('/onboarding/explorer/E4')
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
        }}>
          What should we call you?
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

        {canProceed && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: ACCENT, margin: '14px 0 0' }}>
            Hey {displayName.trim()}, glad you&apos;re here.
          </p>
        )}
      </div>

      <OnboardingFooter
        onBack={() => router.push('/onboarding')}
        cta={ONBOARDING_CTA.E2}
        onContinue={handleContinue}
        ctaDisabled={!canProceed}
        ctaAccent={ACCENT}
      />
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
