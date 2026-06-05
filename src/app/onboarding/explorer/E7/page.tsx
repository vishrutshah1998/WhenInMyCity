'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { completeExplorerOnboarding } from '@/app/actions/persona-complete'
import RubberStamp from '@/components/ui/RubberStamp'

const ACCENT = '#9B8FFF'

export default function E7Page() {
  const router = useRouter()

  const [cityName,     setCityName]     = useState('Your City')
  const [explorerName, setExplorerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    setExplorerName(sessionStorage.getItem(SK.e_name)     || '')
    setCityName(    sessionStorage.getItem(SK.e_city)     || 'Your City')
  }, [router])

  async function handleComplete() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
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
      const city = sessionStorage.getItem(SK.e_city) || 'Ahmedabad'
      ;[SK.e_name, SK.e_username, SK.e_scene, SK.e_city, SK.e_interests, SK.e_intent, SK.persona]
        .forEach(k => { try { sessionStorage.removeItem(k) } catch {} })
      const pending = sessionStorage.getItem('wimc_post_onboarding_redirect')
      if (pending) { sessionStorage.removeItem('wimc_post_onboarding_redirect'); router.push(pending) }
      else router.push(`/explore?city=${encodeURIComponent(city)}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style>{`@keyframes e7-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      <div style={{ minHeight: '100%', background: '#07070A', overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        {/* Explorer pass card */}
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 40 }}>
          {/* RubberStamp */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
            <RubberStamp text={"EXPLORER\nPASS\nISSUED"} color={ACCENT} size={56} rotate={12} opacity={0.85} animate />
          </div>

          <div style={{ background: '#111116', border: `1px solid ${ACCENT}30`, padding: 28, position: 'relative' }}>
            {/* Badge */}
            <div style={{ display: 'inline-block', background: ACCENT, padding: '3px 12px', marginBottom: 16 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 10, color: '#1A2744', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Explorer pass issued</span>
            </div>

            {/* Name */}
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 32, color: '#ffffff', textTransform: 'uppercase', lineHeight: 1, marginBottom: 8 }}>
              {explorerName || 'Explorer'}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {cityName} · Culture Explorer
            </div>

            {/* Tear line */}
            <div style={{
              margin:     '20px 0',
              height:     2,
              background: `repeating-linear-gradient(90deg, ${ACCENT}, ${ACCENT} 3px, transparent 3px, transparent 6px)`,
            }} />

            {/* Stats */}
            <div style={{ display: 'flex', gap: 8 }}>
              {['0 events saved', '0 creators followed'].map((s, i) => (
                <div key={i} style={{ background: '#07070A', padding: '6px 10px', flex: 1 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,40px)', color: '#ffffff', lineHeight: 1.05, margin: '0 0 12px', maxWidth: 480 }}>
          You&apos;re in! Welcome to the culture.
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', maxWidth: 400 }}>
          Your explorer page is live. Start discovering what&apos;s on in {cityName}.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
          {submitError && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B', margin: 0 }}>
              {submitError}
            </p>
          )}
          <button type="button" onClick={handleComplete} disabled={isSubmitting}
            style={{ background: ACCENT, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, padding: '16px 24px', border: 'none', cursor: isSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Entering...' : `Explore ${cityName} →`}
          </button>
          <button type="button" onClick={() => {
            try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
            router.push('/onboarding')
          }}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.60)', fontFamily: "'DM Sans', sans-serif", fontSize: 15, padding: '12px 24px', cursor: 'pointer' }}
          >
            Start creating instead
          </button>
        </div>
      </div>

      {/* Footer: back only */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', padding: '0 24px', background: 'linear-gradient(to top, #07070A 60%, transparent 100%)' }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E6')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}>← Back</button>
      </footer>
    </>
  )
}
