'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Shared by both the desktop (src/app/page.tsx ShowcaseFace) and mobile
// (src/components/landing/mobile/CreatorPassFace.tsx) Creator Pass card.
export function UsernameClaimInput() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [focused, setFocused] = useState(false)
  function handleClaim() {
    const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    try { if (cleaned) sessionStorage.setItem('wimc_claimed_username', cleaned) } catch { /* ignore */ }
    router.push('/signin?next=/onboarding')
  }
  return (
    <div className="w-full max-w-md">
      <div style={{ border: `1.5px dashed ${focused ? 'rgba(255,197,61,0.65)' : 'rgba(255,197,61,0.35)'}`, background: '#FFFFFF', transition: 'border-color 0.2s ease' }}>
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,197,61,0.24)', background: 'rgba(255,197,61,0.12)' }}>
          <span className="font-vib-stamp text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D8432E' }}>CLAIM YOUR PAGE</span>
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] px-2.5 py-1" style={{ background: '#FFC53D', color: '#201A12' }}>FREE</span>
        </div>
        {/* URL input */}
        <div className="flex items-stretch" style={{ borderBottom: '1px solid rgba(255,197,61,0.24)' }}>
          <span className="flex items-center font-mono text-[11px] font-bold shrink-0" style={{ color: '#D8432E', borderRight: '1px solid rgba(255,197,61,0.24)', padding: '14px 16px', whiteSpace: 'nowrap', background: 'rgba(255,197,61,0.08)' }}>
            wheninmycity.com/
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="yourname"
            className="flex-1 bg-transparent outline-none font-mono text-[16px] text-vib-ink placeholder-[#B8AC94]"
            style={{ padding: '14px 16px', minWidth: 0, caretColor: '#D8432E' }}
          />
        </div>
        {/* CTA */}
        <button
          onClick={handleClaim}
          className="w-full inline-flex items-center justify-center gap-2.5 py-4 font-mono text-[11px] font-bold tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-[0.99]"
          style={{ background: '#FFC53D', color: '#201A12', borderRadius: 0 }}
        >
          GET YOUR FREE PAGE
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_forward</span>
        </button>
      </div>
      <div className="flex items-center gap-5 mt-3 px-1">
        {['ALWAYS FREE', '75–90% YOURS', '5 MIN SETUP'].map((label) => (
          <span key={label} className="flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.12em]" style={{ color: 'rgba(216,67,46,0.7)' }}>
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#FFC53D', opacity: 0.9 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
