'use client'

import { useState, useEffect, useCallback } from 'react'
import { readSnapshot, Snap } from './SplitRightPanel.shared'
import { C3RightPanel, C4RightPanel, C5RightPanel, C6RightPanel, C7RightPanel, C8RightPanel } from './SplitRightPanel.Creators'
import { E3RightPanel, E4RightPanel, E5RightPanel, E6RightPanel } from './SplitRightPanel.Explorers'
import { B2RightPanel, B3RightPanel, V4RightPanel, V5RightPanel, V6RightPanel, VCRightPanel, V7RightPanel, V8RightPanel } from './SplitRightPanel.Venues'
import { R1RightPanel, R2RightPanel, R3RightPanel, R4RightPanel, R5RightPanel } from './SplitRightPanel.Brands'

function DefaultRightPanel({ screen }: { screen: string }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', bottom: -40, right: -20,
        pointerEvents: 'none', userSelect: 'none',
        fontFamily: "var(--font-syne), 'Outfit', sans-serif",
        fontWeight: 900,
        fontSize: 'clamp(48px, 6vw, 90px)',
        color: 'rgba(26,39,68,0.06)',
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}>
        {screen}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SplitRightPanel({ pathname }: { pathname: string }) {
  const [snap, setSnap] = useState<Snap | null>(null)

  const refresh = useCallback(() => setSnap(readSnapshot()), [])

  useEffect(() => {
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('ob-snap-update', refresh)  // same-tab instant refresh
    const iv = setInterval(refresh, 800)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ob-snap-update', refresh)
      clearInterval(iv)
    }
  }, [refresh])

  if (!snap) return null

  // Extract screen code from pathname: e.g. '/onboarding/creator/C3' → 'C3'
  const screen = pathname.split('/').pop()?.toUpperCase() ?? ''

  switch (screen) {
    case 'C3':  return <C3RightPanel snap={snap} />
    case 'C4':  return <C4RightPanel snap={snap} />
    case 'C5':
    case 'C5B': return <C5RightPanel snap={snap} />
    case 'C6':  return <C6RightPanel snap={snap} />
    case 'C7':  return <C7RightPanel snap={snap} />
    case 'C8':  return <C8RightPanel snap={snap} />
    case 'E3':  return <E3RightPanel snap={snap} />
    case 'E4':  return <E4RightPanel snap={snap} />
    case 'E5':  return <E5RightPanel snap={snap} />
    case 'E6':  return <E6RightPanel />
    case 'B2':  return <B2RightPanel snap={snap} />
    case 'B3':  return <B3RightPanel snap={snap} />
    case 'V4':  return <V4RightPanel snap={snap} />
    case 'V5':  return <V5RightPanel snap={snap} />
    case 'VC':  return <VCRightPanel snap={snap} />
    case 'V6':  return <V6RightPanel snap={snap} />
    case 'V7':  return <V7RightPanel snap={snap} />
    case 'V8':  return <V8RightPanel snap={snap} />
    case 'R1':  return <R1RightPanel snap={snap} />
    case 'R2':  return <R2RightPanel snap={snap} />
    case 'R3':  return <R3RightPanel snap={snap} />
    case 'R4':  return <R4RightPanel snap={snap} />
    case 'R5':  return <R5RightPanel snap={snap} />
    default:    return <DefaultRightPanel screen={screen} />
  }
}
