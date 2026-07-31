'use client'

import { motion, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { WimcWordmark } from '@/components/WimcWordmark'
import type { TicketMeta } from './data'

// Fixed chrome heights (px) — content panes offset by these, mirroring desktop's
// TicketChrome/STUB_H pattern in src/app/page.tsx.
export const HEADER_H = 40
export const STUB_H = 30
export const TALL_STUB_H = 56

export function stubHeight(meta: TicketMeta) {
  return meta.tallStub ? TALL_STUB_H : STUB_H
}

export function MobileTicketChrome({ meta, tearP }: { meta: TicketMeta; tearP: MotionValue<number> }) {
  const stubH = stubHeight(meta)
  const perfOpacity = useTransform(tearP, [0, 1], [0.28, 1.0])
  const BW = [3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 2, 3]

  return (
    <>
      {/* Accent glow border */}
      <div style={{ position: 'absolute', inset: 0, border: `1px solid ${meta.accent}28`, zIndex: 20, pointerEvents: 'none' }} />

      {/* Top header strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px',
        background: `linear-gradient(90deg, ${meta.accent}14 0%, transparent 45%, transparent 55%, ${meta.accent}0A 100%)`,
        borderBottom: `1px solid ${meta.accent}20`,
        zIndex: 18, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.35)', whiteSpace: 'nowrap' }}>WHEN IN MY CITY</span>
          <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: `${meta.accent}66`, whiteSpace: 'nowrap' }}>· {meta.type}</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${meta.accent}80`, flexShrink: 0 }}>{meta.serial}</span>
      </div>

      {/* Left accent bar */}
      <div style={{ position: 'absolute', top: HEADER_H, left: 0, bottom: stubH, width: 3, background: meta.accent, opacity: 0.6, zIndex: 18, pointerEvents: 'none' }} />

      {/* Perforated tear-here line — brightens as drag progresses */}
      <motion.div style={{
        position: 'absolute', bottom: stubH, left: 24, right: 24,
        height: 1, zIndex: 18, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${meta.accent} 2.5px, transparent 2.5px)`,
        backgroundSize: '18px 6px', backgroundRepeat: 'repeat-x', backgroundPosition: 'left center',
        opacity: perfOpacity,
      }} />

      {/* Punch-hole notches */}
      {(['left', 'right'] as const).map((side) => (
        <div key={side} style={{
          position: 'absolute', bottom: stubH,
          [side]: 0, transform: side === 'left' ? 'translate(-50%, 50%)' : 'translate(50%, 50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: '#F3E8D6',
          border: `1px solid ${meta.accent}50`,
          boxShadow: `inset 0 2px 5px rgba(0,0,0,0.55), 0 0 6px ${meta.accent}30`,
          zIndex: 25, pointerEvents: 'none',
        }} />
      ))}

      {/* Bottom stub strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: stubH,
        background: `${meta.accent}08`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
        padding: '0 18px', zIndex: 15, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 6.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${meta.accent}99`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.stubLabel}</span>
          <div style={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0, opacity: 0.28 }}>
            {BW.map((w, i) => <div key={i} style={{ width: w, height: 16, background: meta.accent, borderRadius: 0.5 }} />)}
          </div>
        </div>
        {meta.tallStub && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <WimcWordmark color="black" height={11} />
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 6.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.4)' }}>Explore</span>
              <span style={{ fontFamily: 'monospace', fontSize: 6.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.4)' }}>Sign in</span>
              <span style={{ fontFamily: 'monospace', fontSize: 6.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.4)' }}>© 2025</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
