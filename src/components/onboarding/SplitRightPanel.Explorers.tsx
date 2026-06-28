'use client'

import { useState, useRef } from 'react'
import { PAPER } from '@/lib/onboarding/design-tokens'
import { type Snap } from './SplitRightPanel.shared'

// ── E3 — Tilting Explorer ticket card ────────────────────────────────────────
export function E3RightPanel({ snap }: { snap: Snap }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const accent   = '#9B8FFF'
  const scene    = snap.e_scene

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    const x =  ((e.clientY - rect.top)  / rect.height - 0.5) * 6
    const y = -((e.clientX - rect.left) / rect.width  - 0.5) * 6
    setRotation({ x, y })
  }

  return (
    <div
      ref={panelRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 48px 100px',
        overflow: 'hidden',
        background: PAPER.bg,
        backgroundImage: PAPER.texture,
        cursor: 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotation({ x: 0, y: 0 })}
    >
      {/* Watermark */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none', overflow: 'hidden' }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 400, opacity: 0.07, color: '#1A2744', lineHeight: 1 }}>03</span>
      </div>

      {/* Physical ticket card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: 380,
        background: 'white',
        borderLeft: `8px solid ${accent}`,
        boxShadow: '20px 20px 60px rgba(0,0,0,0.3)',
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotate(-2deg)`,
        transition: 'transform 0.1s ease-out',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(26,39,68,0.10)', background: 'rgba(26,39,68,0.05)' }}>
          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(26,39,68,0.60)', letterSpacing: '0.10em' }}>
            SERIAL NO. 883-XC-2024
          </span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(26,39,68,0.60)' }}>
            WIMC // EXPLORER_PASS
          </span>
        </div>

        {/* Main content */}
        <div style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 56, color: '#1A2744', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
              EXPLORER
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ padding: '3px 10px', fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, color: 'white', backgroundColor: accent, letterSpacing: '0.12em' }}>
                OFFLINE FIRST
              </div>
              <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(26,39,68,0.50)' }}>
                IND-24-MUM-V1
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Current Class
              </p>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 24, lineHeight: 1, margin: 0, color: scene ? accent : 'rgba(26,39,68,0.30)' }}>
                {scene ? scene.toUpperCase() : 'UNASSIGNED'}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Access Tier
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900, fontSize: 18, color: '#1A2744', margin: 0 }}>
                CULTURAL HUB
              </p>
            </div>
          </div>
        </div>

        {/* Perforation */}
        <div style={{ margin: '24px 0 0', height: 1, borderTop: '2px dashed rgba(26,39,68,0.15)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: PAPER.bg }} />
          <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: PAPER.bg }} />
        </div>

        {/* Stub */}
        <div style={{ height: 80, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f5f0' }}>
          <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'stretch' }}>
            {[2,4,1,3,1,2,5,1,2,1,3,1].map((w,i) => (
              <div key={i} style={{ width: w, background: 'rgba(26,39,68,0.20)' }} />
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontSize: 24, color: 'rgba(26,39,68,0.30)', fontStyle: 'italic' }}>
            ADMIT ONE
          </span>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(26,39,68,0.40)', margin: 0 }}>ISSUED AT</p>
            <p style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontSize: 11, color: 'rgba(26,39,68,0.60)', margin: 0 }}>
              2025 // WIMC
            </p>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 48, right: 48, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 200, opacity: 0.03, color: accent, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>03</div>
    </div>
  )
}

// ── E4 — Dark cityscape with city name hero + lavender marquee ────────────────
export function E4RightPanel({ snap }: { snap: Snap }) {
  const city   = snap.e_city
  const accent = '#9B8FFF'

  return (
    <div style={{ width: '100%', height: '100%', background: '#07070A', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Dot grid overlay */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, rgba(155,143,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      {/* Hero city name */}
      <div style={{ position: 'relative', zIndex: 20, textAlign: 'center', maxWidth: 640, padding: '0 24px' }}>
        <div style={{ display: 'inline-block', marginBottom: 24, padding: '4px 16px', border: `2px solid rgba(155,143,255,0.40)`, background: 'rgba(0,0,0,0.20)', fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: accent, letterSpacing: '0.30em' }}>
          COORDINATES_LOCKED
        </div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: '#e5e1e6', lineHeight: 1, letterSpacing: '-0.045em', fontSize: 'clamp(52px, 9vw, 112px)', margin: '0 0 16px', mixBlendMode: 'overlay' }}>
          {city ? city.toUpperCase() : 'SELECT CITY'}
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#dec0ba', maxWidth: 400, margin: '0 auto' }}>
          Select your starting grid. WIMC maps your urban footprint through cultural nodes.
        </p>
      </div>

      {/* Side metadata bar */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, borderLeft: '1px solid #57423e', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 0', alignItems: 'center', zIndex: 30, background: 'rgba(0,0,0,0.20)' }}>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: 'rgba(222,192,186,0.40)', fontSize: 9, letterSpacing: '0.50em', writingMode: 'vertical-rl' as const, whiteSpace: 'nowrap' }}>
          STREETS_ARE_TALKING
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          {['location_on', 'hub', 'sensors'].map(icon => (
            <span key={icon} className="material-symbols-outlined" style={{ fontSize: 20, color: 'rgba(155,143,255,0.60)' }}>{icon}</span>
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", color: 'rgba(222,192,186,0.40)', fontSize: 9, letterSpacing: '0.50em', writingMode: 'vertical-rl' as const, whiteSpace: 'nowrap' }}>
          V1.0_UTILITY
        </span>
      </div>

      {/* Marquee strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: accent, color: '#1A2744', display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 30 }}>
        <div style={{ display: 'flex', gap: 40, whiteSpace: 'nowrap', fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, animation: 'marquee 20s linear infinite' }}>
          {['CULTURE FIRST // URBAN UTILITY', 'ADMIT ONE // ENTRY GUARANTEED', 'PHYSICAL UTILITY // DIGITAL IDENTITY', 'CULTURE FIRST // URBAN UTILITY', 'ADMIT ONE // ENTRY GUARANTEED', 'PHYSICAL UTILITY // DIGITAL IDENTITY'].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── E5 — Dark sonar/radar with floating interest nodes ────────────────────────
export function E5RightPanel({ snap }: { snap: Snap }) {
  const accent    = '#9B8FFF'
  const interests = snap.e_interests

  const positions: React.CSSProperties[] = [
    { top: '20%',   left: '20%'  },
    { bottom: '30%', right: '15%' },
    { top: '40%',   right: '25%' },
    { bottom: '15%', left: '30%' },
  ]

  return (
    <div style={{ width: '100%', height: '100%', background: '#07070A', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Sonar expanding rings */}
      {[0, 2, 4, 6].map(delay => (
        <div key={delay} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: `1px solid rgba(155,143,255,0.20)`,
          animation: `sonarExpand 8s ${delay}s infinite linear`,
        }} />
      ))}

      {/* Centre radar icon */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: accent, fontVariationSettings: "'FILL' 1" }}>radar</span>
        <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.40em', color: accent, marginTop: 8 }}>
          EXPLORING_VIBES
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
          {[8,4,6,2,8,4].map((h,i) => (
            <div key={i} style={{ width: 4, background: accent, height: h * 4 }} />
          ))}
        </div>
      </div>

      {/* Floating interest nodes */}
      {interests.slice(0, 4).map((interest, i) => (
        <div key={interest} style={{
          position: 'absolute',
          ...positions[i],
          background: '#201f23',
          border: '1px solid rgba(155,143,255,0.40)',
          padding: 12,
          animation: `float 6s ${i * 0.7}s ease-in-out infinite`,
        }}>
          <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: accent, margin: '0 0 4px' }}>
            NODE_ID: P-0{i + 1}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#e5e1e6', fontSize: 14, margin: 0 }}>
            {interest.toUpperCase()}
          </p>
        </div>
      ))}

      {/* Coords overlay */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(222,192,186,0.40)', lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>LAT: 28.6139° N</p>
        <p style={{ margin: 0 }}>LON: 77.2090° E</p>
        <p style={{ margin: 0 }}>SIG_STR: OPTIMAL</p>
      </div>

      {/* Postmark stamp */}
      <div style={{ position: 'absolute', top: 32, right: 32, width: 128, height: 128, borderRadius: '50%', border: '2px dashed rgba(222,192,186,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)', opacity: 0.20 }}>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, textAlign: 'center', color: '#dec0ba', lineHeight: 1.4 }}>
          WIMC//OFFLINE<br />AUTHENTICATED<br />2025
        </span>
      </div>

      {/* Watermark */}
      <div style={{ position: 'absolute', bottom: 32, right: 32, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 120, opacity: 0.03, color: accent, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>05</div>
    </div>
  )
}

// ── E6 — Split EXPLORE / CREATE visual ───────────────────────────────────────
export function E6RightPanel() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#07070A', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      {/* Background split */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <div style={{ width: '50%', height: '100%', background: 'rgba(155,143,255,0.05)', borderRight: '1px dashed rgba(155,143,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: '#9B8FFF', fontSize: 120, opacity: 0.10, transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>EXPLORE</span>
        </div>
        <div style={{ width: '50%', height: '100%', background: 'rgba(232,112,90,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: '#E8705A', fontSize: 120, opacity: 0.10, transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>CREATE</span>
        </div>
      </div>

      {/* Centre content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80, marginBottom: 48 }}>
          <div style={{ width: 96, height: 96, background: '#9B8FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(155,143,255,0.4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#07070A', fontVariationSettings: "'FILL' 1" }}>explore</span>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#9B8FFF', fontSize: 32 }}>trending_flat</span>
          <div style={{ width: 96, height: 96, border: '2px solid rgba(232,112,90,0.40)', background: 'rgba(232,112,90,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#E8705A' }}>auto_awesome</span>
          </div>
        </div>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: '#F0EFF8', margin: '0 0 16px' }}>
          Most creators started as explorers.
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: '#9896B0', maxWidth: 380, margin: '0 auto' }}>
          Whether you&apos;re here to watch or build, there&apos;s a space for you in the city&apos;s pulse.
        </p>
      </div>

      {/* Postmark */}
      <div style={{ position: 'absolute', top: 40, right: 40, opacity: 0.20, transform: 'rotate(12deg)', width: 128, height: 128, borderRadius: '50%', border: '2px dashed #9B8FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, textAlign: 'center', color: '#9B8FFF', lineHeight: 1.5 }}>
          CITY CULTURE<br />CREATOR HUB
        </span>
      </div>

      {/* Watermark */}
      <div style={{ position: 'absolute', bottom: -20, right: -10, fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 240, opacity: 0.025, color: '#9B8FFF', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>06</div>
    </div>
  )
}
