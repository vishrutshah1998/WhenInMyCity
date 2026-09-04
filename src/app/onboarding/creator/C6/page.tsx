'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { PLATFORM_REGISTRY } from '@/lib/platforms'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'

// Local icon filenames in /public/platform-icons/
const ICON_FILE: Record<string, string> = {
  instagram:  'instagram',
  youtube:    'youtube',
  whatsapp:   'whatsapp',
  spotify:    'spotify',
  soundcloud: 'soundcloud',
  twitter:    'x',
  linkedin:   'linkedin',
  website:    'website',
  telegram:   'telegram',
  substack:   'substack',
  behance:    'behance',
  github:     'github',
}

export default function C6Page() {
  const router = useRouter()
  const [selected,  setSelected]  = useState<string[]>([])
  const [name,      setName]      = useState('')
  const [category,  setCategory]  = useState('')
  const [city,      setCity]      = useState('')
  const [accent,    setAccent]    = useState('#F5A800')
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const subtypes = sessionStorage.getItem(SK.c_subtypes)
    if (!subtypes) { router.replace('/onboarding/creator/C5'); return }
    const cat = sessionStorage.getItem(SK.c_category) || ''
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    const n = sessionStorage.getItem(SK.c_name)
    if (n) setName(n)
    const c = sessionStorage.getItem(SK.c_city)
    if (c) setCity(c)
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_platforms) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]
    setSelected(next)
    try { sessionStorage.setItem(SK.c_platforms, JSON.stringify(next)) } catch {}
    window.dispatchEvent(new Event('ob-snap-update'))
  }

  function handleContinue() {
    if (advancing) return
    setAdvancing(true)
    router.push('/onboarding/creator/C7')
  }

  function handleSkip() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_platforms, '[]') } catch {}
    router.push('/onboarding/creator/C7')
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
          fontSize:   'clamp(24px, 6vw, 42px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   640,
          whiteSpace: 'nowrap',
        }}>
          Where are you creating?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 20px', maxWidth: 400 }}>
          Pick every platform you&apos;re active on
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {PLATFORM_REGISTRY.map(plat => {
            const isSel = selected.includes(plat.id)
            const slug  = ICON_FILE[plat.id] ?? ''
            return (
              <button
                key={plat.id}
                type="button"
                onClick={() => toggle(plat.id)}
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            8,
                  padding:        '16px 8px',
                  borderRadius:   14,
                  border:         isSel ? `1.5px solid ${plat.color}` : '1.5px solid rgba(255,255,255,0.07)',
                  background:     isSel ? `${plat.color}1A` : 'rgba(255,255,255,0.03)',
                  cursor:         'pointer',
                  transition:     'all 150ms',
                  position:       'relative',
                }}
              >
                {/* checkmark badge */}
                {isSel && (
                  <div style={{
                    position:       'absolute', top: 7, right: 7,
                    width:          16, height: 16, borderRadius: '50%',
                    background:     plat.color,
                    display:        'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink:     0,
                  }}>
                    <svg viewBox="0 0 24 24" width="9" height="9" fill="none"
                      stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* icon circle */}
                <div style={{
                  width:          38, height: 38, borderRadius: '50%',
                  background:     isSel ? plat.color : 'rgba(255,255,255,0.09)',
                  display:        'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink:     0,
                  transition:     'background 150ms',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/platform-icons/${slug}.svg`}
                    width={20} height={20}
                    alt={plat.label}
                    style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                  />
                </div>

                {/* label */}
                <span style={{
                  fontFamily:  "'DM Sans', sans-serif",
                  fontSize:    11,
                  fontWeight:  600,
                  color:       isSel ? '#F0EFF8' : 'rgba(255,255,255,0.38)',
                  textAlign:   'center',
                  lineHeight:  1.2,
                  transition:  'color 150ms',
                }}>
                  {plat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <OnboardingFooter
        onBack={() => router.push('/onboarding/creator/C5')}
        cta={canProceed ? ONBOARDING_CTA.C6.withCount(selected.length) : ONBOARDING_CTA.C6.base}
        onContinue={handleContinue}
        ctaDisabled={!canProceed || advancing}
        ctaAccent={accent}
        secondaryAction={{ label: 'Skip', onClick: handleSkip }}
      />
    </>
  )
}
