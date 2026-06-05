'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { saveAddaOnboardingStep } from '@/app/actions/adda-onboarding'

const ACCENT  = '#5DD9D0'
const WARM_BG = '#F2FFFE'

export default function V5Page() {
  const router      = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addressValue,  setAddressValue]  = useState('')
  const [neighbourhood, setNeighbourhood] = useState('')
  const [bName,         setBName]         = useState('')
  const [bCity,         setBCity]         = useState('')
  const [isSaving,      setIsSaving]      = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    const types = sessionStorage.getItem(SK.v_types) ?? ''
    if (!types) { router.replace('/onboarding/business/V4'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    const savedAddr = sessionStorage.getItem(SK.v_address)
    if (savedAddr) setAddressValue(savedAddr)
    const savedNbhd = sessionStorage.getItem('wimc_ob_v_neighbourhood')
    if (savedNbhd) setNeighbourhood(savedNbhd)
  }, [router])

  const handleAddressChange = useCallback((val: string) => {
    setAddressValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  async function handleNext() {
    if (addressValue.trim().length < 5 || isSaving) return
    setIsSaving(true)
    sessionStorage.setItem(SK.v_address, addressValue)
    sessionStorage.setItem('wimc_ob_v_neighbourhood', neighbourhood)
    try {
      await saveAddaOnboardingStep(1, {
        step: 1, name: bName, city: bCity, address: addressValue,
        neighbourhood: neighbourhood || undefined, lat: 22.7196, lng: 75.8577,
      })
    } catch {}
    router.push('/onboarding/business/V6')
  }

  const canProceed = addressValue.trim().length >= 5

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          Where is it?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Street address or landmark — appears on your venue page
        </p>

        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.35)', marginBottom: 12 }}>Address</label>
            <input type="text" value={addressValue} onChange={e => handleAddressChange(e.target.value)} placeholder="123 MG Road, Near..." autoComplete="off" autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${addressValue ? ACCENT : 'rgba(255,255,255,0.20)'}`, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 24, color: '#F0EFF8', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.35)', marginBottom: 12 }}>
              Neighbourhood <span style={{ color: 'rgba(26,26,26,0.25)' }}>(optional)</span>
            </label>
            <input type="text" value={neighbourhood} onChange={e => setNeighbourhood(e.target.value)} placeholder="e.g. Koregaon Park, Banjara Hills" autoComplete="off"
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${neighbourhood ? ACCENT : 'rgba(255,255,255,0.14)'}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 18, color: 'rgba(26,26,26,0.70)', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
            />
          </div>
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/business/V4')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleNext} disabled={!canProceed || isSaving}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.10)', color: canProceed ? '#07070A' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'background 200ms' }}>
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </footer>
    </>
  )
}
