'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys } from '@/lib/onboarding/session-keys'
import { completeExplorerOnboarding } from '@/app/actions/persona-complete'
import { updatePersonas } from '@/lib/onboarding/update-personas'
import RubberStamp from '@/components/ui/RubberStamp'

const ACCENT = '#9B8FFF'
const NAVY   = '#1A2744'
const DM     = "'DM Sans', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const OUTFIT = "'Outfit', sans-serif"

const KEYFRAMES = `
@keyframes e7-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes e7-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes e7-fade-up { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
`

export default function E7Page() {
  const router = useRouter()

  const [phase,        setPhase]        = useState<'saving' | 'revealed' | 'error'>('saving')
  const [cityName,     setCityName]     = useState('Your City')
  const [explorerName, setExplorerName] = useState('')
  const [isAddMode,       setIsAddMode]       = useState(false)
  const [submitError,     setSubmitError]     = useState<string | null>(null)
  const [isLeaving,       setIsLeaving]       = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mode = sessionStorage.getItem('wimc_ob_mode')
    const persona = sessionStorage.getItem(SK.persona)
    if (!mode && persona !== 'explorer') { router.replace('/onboarding'); return }

    setIsAddMode(mode === 'add')
    setExplorerName(sessionStorage.getItem(SK.e_name) || '')
    setCityName(sessionStorage.getItem(SK.e_city) || 'Your City')
    setPendingRedirect(sessionStorage.getItem('wimc_post_onboarding_redirect'))

    async function save() {
      try {
        await completeExplorerOnboarding({
          displayName:           sessionStorage.getItem(SK.e_name)      || '',
          username:              sessionStorage.getItem(SK.e_username)  || '',
          city:                  sessionStorage.getItem(SK.e_city)      || '',
          explorerScene:         sessionStorage.getItem(SK.e_scene)     || '',
          interestTags:          JSON.parse(sessionStorage.getItem(SK.e_interests) || '[]') as string[],
          explorerCreatorIntent: sessionStorage.getItem(SK.e_intent)
            ? [sessionStorage.getItem(SK.e_intent)!]
            : [],
        })
        setPhase('revealed')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        setPhase('error')
      }
    }
    save()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function finishOnboarding(dest: string) {
    if (isLeaving) return
    setIsLeaving(true)
    if (isAddMode) {
      try { await updatePersonas('explorer') } catch {}
    }
    try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
    clearNewOnboardingKeys()
    router.push(dest)
  }

  // ── Saving phase ─────────────────────────────────────────────────────────────
  if (phase === 'saving') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
        <div style={{
          position: 'fixed', inset: 0, background: NAVY,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${ACCENT}`, borderTopColor: 'transparent',
            animation: 'e7-spin 1s linear infinite',
          }} />
          <span style={{ fontFamily: DM, fontSize: 14, color: 'rgba(255,255,255,0.40)' }}>
            Issuing your pass…
          </span>
        </div>
      </>
    )
  }

  // ── Error phase ──────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
        <div style={{
          position: 'fixed', inset: 0, background: NAVY,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: ACCENT }}>error</span>
          <p style={{ fontFamily: DM, fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 320, margin: 0 }}>
            {submitError || 'Could not issue your pass. Please try again.'}
          </p>
          <button
            onClick={() => router.replace('/onboarding/explorer/E6')}
            style={{ background: ACCENT, color: '#ffffff', fontFamily: DM, fontWeight: 600, fontSize: 14, padding: '12px 24px', border: 'none', cursor: 'pointer' }}
          >
            Go back
          </button>
        </div>
      </>
    )
  }

  // ── Revealed phase ───────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{ minHeight: '100%', background: NAVY, overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        {/* Explorer boarding pass card */}
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 40, animation: 'e7-fade-up 0.6s ease 0.1s both' }}>
          {/* RubberStamp */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
            <RubberStamp text={"EXPLORER\nPASS\nISSUED"} color={ACCENT} size={56} rotate={12} opacity={0.85} animate />
          </div>

          <div style={{ background: '#111116', border: `1px solid ${ACCENT}30`, padding: 28, position: 'relative' }}>
            {/* Badge */}
            <div style={{ display: 'inline-block', background: ACCENT, padding: '3px 12px', marginBottom: 16 }}>
              <span style={{ fontFamily: DM, fontWeight: 600, fontSize: 10, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Explorer pass issued
              </span>
            </div>

            {/* Name */}
            <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 32, color: '#ffffff', textTransform: 'uppercase', lineHeight: 1, marginBottom: 8 }}>
              {explorerName || 'Explorer'}
            </div>
            <div style={{ fontFamily: DM, fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {cityName} · Culture Explorer
            </div>

            {/* Tear line */}
            <div style={{
              margin: '20px 0', height: 2,
              background: `repeating-linear-gradient(90deg, ${ACCENT}, ${ACCENT} 3px, transparent 3px, transparent 6px)`,
            }} />

            {/* Stat placeholders */}
            <div style={{ display: 'flex', gap: 8 }}>
              {['0 events saved', '0 creators followed'].map((s, i) => (
                <div key={i} style={{ background: '#07070A', padding: '6px 10px', flex: 1 }}>
                  <span style={{ fontFamily: DM, fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: ABRIL, fontSize: 'clamp(28px,7vw,40px)',
          color: '#F0EFF8', lineHeight: 1.05,
          margin: '0 0 12px', maxWidth: 480,
          animation: 'e7-fade-up 0.5s ease 0.3s both',
        }}>
          {isAddMode ? '✦ Explorer added to your profile' : "You're in! Welcome to the culture."}
        </h1>
        <p style={{
          fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.45)',
          margin: '0 0 32px', maxWidth: 400,
          animation: 'e7-fade-up 0.5s ease 0.4s both',
        }}>
          {isAddMode
            ? 'Switch between your personas from your dashboard.'
            : `Your explorer page is live. Start discovering what's on in ${cityName}.`}
        </p>

        {/* Single CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360,
          animation: 'e7-fade-up 0.5s ease 0.5s both',
        }}>
          <button
            type="button"
            onClick={() => finishOnboarding(pendingRedirect || '/explore/dashboard/studio')}
            disabled={isLeaving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: ACCENT, color: '#ffffff',
              fontFamily: DM, fontWeight: 600, fontSize: 16,
              padding: '16px 20px', border: 'none',
              cursor: isLeaving ? 'wait' : 'pointer',
              opacity: isLeaving ? 0.7 : 1,
            }}
          >
            <span>Continue to your dashboard</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Footer: back only */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        background: `linear-gradient(to top, ${NAVY} 60%, transparent 100%)`,
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/explorer/E6')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
      </footer>
    </>
  )
}
