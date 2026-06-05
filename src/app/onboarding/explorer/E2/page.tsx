'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#9B8FFF'
const WARM_BG = '#F8F6FF'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

export default function E2Page() {
  const router                                        = useRouter()
  const [displayName, setDisplayName]                = useState('')
  const [usernamePreview, setUsernamePreview]        = useState('username')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const saved = sessionStorage.getItem(SK.e_name)
    if (saved) {
      setDisplayName(saved)
      setUsernamePreview(slugify(saved).substring(0, 20) || 'username')
    }
  }, [router])

  function handleNameChange(value: string) {
    setDisplayName(value)
    setUsernamePreview(value.trim().length >= 2 ? slugify(value).substring(0, 20) || 'username' : 'username')
  }

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

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What&apos;s your name?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          This is how you&apos;ll explore the city with us
        </p>

        <div style={{ maxWidth: 480 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.35)', marginBottom: 12 }}>
            Your name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Ria from Bhopal, Weekend Wanderer"
            autoComplete="off"
            autoFocus
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${displayName.length > 0 ? ACCENT : 'rgba(255,255,255,0.20)'}`,
              fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 32,
              color: '#F0EFF8', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms',
            }}
          />
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!canProceed}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.10)', color: canProceed ? '#ffffff' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'background 200ms' }}>
          Continue
        </button>
      </footer>
    </>
  )
}
