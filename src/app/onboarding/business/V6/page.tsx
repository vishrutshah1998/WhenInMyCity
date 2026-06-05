'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { saveAddaOnboardingStep } from '@/app/actions/adda-onboarding'

const ACCENT  = '#5DD9D0'
const WARM_BG = '#F2FFFE'

export default function V6Page() {
  const router = useRouter()

  const [capacity, setCapacity] = useState('')
  const [bName,    setBName]    = useState('')
  const [bCity,    setBCity]    = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    const address = sessionStorage.getItem(SK.v_address) ?? ''
    if (!address) { router.replace('/onboarding/business/V5'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    const saved = sessionStorage.getItem(SK.v_capacity)
    if (saved) setCapacity(saved)
  }, [router])

  async function handleNext() {
    if (!capacity || isSaving) return
    setIsSaving(true)
    sessionStorage.setItem(SK.v_capacity, capacity)
    try {
      const cap = parseInt(capacity, 10) || 0
      await saveAddaOnboardingStep(2, {
        step: 2, adda_type: JSON.parse(sessionStorage.getItem(SK.v_types) || '[]'),
        capacity_max: cap, capacity_min: 1, capacity_configurations: [],
      })
    } catch {}
    router.push('/onboarding/business/V7')
  }

  const capNum     = parseInt(capacity, 10) || 0
  const canProceed = capacity.trim().length > 0 && capNum > 0

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What&apos;s your capacity?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Shown on your venue page so creators plan the right event
        </p>

        <div style={{ maxWidth: 300 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.35)', marginBottom: 12 }}>Capacity (people)</label>
          <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="0" min="1" max="10000" autoFocus
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${capacity ? ACCENT : 'rgba(255,255,255,0.20)'}`,
              fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 64, color: '#F0EFF8',
              outline: 'none', paddingBottom: 8, caretColor: ACCENT, textAlign: 'left',
              transition: 'border-color 200ms', MozAppearance: 'textfield',
            }}
          />
          {capNum > 0 && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.45)', marginTop: 12 }}>
              Up to {capNum} people
            </p>
          )}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/business/V5')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleNext} disabled={!canProceed || isSaving}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.10)', color: canProceed ? '#07070A' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'background 200ms' }}>
          Continue
        </button>
      </footer>
    </>
  )
}
