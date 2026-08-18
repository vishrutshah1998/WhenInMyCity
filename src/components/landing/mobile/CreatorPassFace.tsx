'use client'

import { UsernameClaimInput } from '@/components/landing/UsernameClaimInput'
import { PersonaShowcasePhone } from './PersonaShowcasePhone'

export function CreatorPassFace() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', padding: '16px 18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 18, height: 1, background: '#FFC53D' }} />
        <span className="font-vib-stamp" style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: '#D8432E' }}>YOUR CREATOR PAGE</span>
      </div>
      <h2 className="font-vib-stamp" style={{ fontSize: 26, lineHeight: 1.0, letterSpacing: '-0.01em', color: '#201A12', marginTop: 8 }}>
        Your page,<br /><span style={{ color: '#FF6B35' }}>live in minutes.</span>
      </h2>

      <PersonaShowcasePhone />

      <UsernameClaimInput />
    </div>
  )
}
