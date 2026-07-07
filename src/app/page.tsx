'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import Image from 'next/image'
import { WimcWordmark } from '@/components/WimcWordmark'

const E = [0.22, 1, 0.36, 1] as const
const NAV_H = 100
const STUB_H = 34  // bottom info strip height (fixed px)

// ── Horizontal tear-edge geometry ────────────────────────────────────────
// Tear propagates LEFT → RIGHT along the bottom perforated edge.
// Each entry: [x (0-1), y-offset from the perf line as a fraction of total ticket height].
// Irregular spacing + amplitude mimics real paper-fibre breaks.
const HORIZ_JAGS: ReadonlyArray<[number, number]> = [
  [0.00,  0.000],
  [0.02, +0.012], [0.05, -0.017], [0.08, +0.020],
  [0.11, -0.010], [0.14, +0.016], [0.17, -0.022],
  [0.20, +0.013], [0.23, -0.018], [0.26, +0.023],
  [0.29, -0.009], [0.32, +0.019], [0.35, -0.014],
  [0.38, +0.021], [0.41, -0.018], [0.44, +0.011],
  [0.47, -0.023], [0.50, +0.017], [0.53, -0.012],
  [0.56, +0.020], [0.59, -0.016], [0.62, +0.014],
  [0.65, -0.021], [0.68, +0.018], [0.71, -0.011],
  [0.74, +0.022], [0.77, -0.015], [0.80, +0.018],
  [0.83, -0.020], [0.86, +0.013], [0.89, -0.019],
  [0.92, +0.017], [0.95, -0.010], [0.98, +0.014],
  [1.00,  0.000],
]

// perfY: perf-line y-position as % of element height (e.g. 94.7).
// Returns the clip-path for the CURRENT (outgoing) ticket, removing the
// already-torn left portion of the stub while keeping the main body intact.
function buildHorizTearClip(tearProgress: number, perfY: number): string {
  if (tearProgress <= 0.001) return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'

  if (tearProgress >= 0.999) {
    // Fully torn — clip away entire stub, leave only main body with jagged bottom
    const pts = [...HORIZ_JAGS].reverse().map(([x, dy]) => {
      const py = Math.max(0, Math.min(100, perfY + dy * 100))
      return `${(x * 100).toFixed(2)}% ${py.toFixed(2)}%`
    }).join(', ')
    return `polygon(0% 0%, 100% 0%, 100% ${perfY.toFixed(2)}%, ${pts}, 0% ${perfY.toFixed(2)}%)`
  }

  const tearX = tearProgress * 100

  // Jag points for the already-torn edge, traversed right → left (tearX → 0)
  const jagPts = HORIZ_JAGS
    .filter(([x]) => x <= tearProgress)
    .slice()
    .reverse()
    .map(([x, dy]) => {
      const py = Math.max(0, Math.min(100, perfY + dy * 100))
      return `${(x * 100).toFixed(2)}% ${py.toFixed(2)}%`
    })
    .join(', ')

  // Visible region: full main body + right stub still attached (tearX → 100%)
  return `polygon(0% 0%, 100% 0%, 100% 100%, ${tearX.toFixed(2)}% 100%, ${tearX.toFixed(2)}% ${perfY.toFixed(2)}%, ${jagPts}, 0% ${perfY.toFixed(2)}%)`
}

// ── State machine ────────────────────────────────────────────
// idle → (scroll) → tearing → flying → entering → idle
type TearState = 'idle' | 'tearing' | 'flying' | 'entering'

// ── Data ─────────────────────────────────────────────────────
const CITIES = ['Indore','Jaipur','Bhopal','Chandigarh','Kochi','Mysuru','Vadodara','Dehradun','Ranchi','Coimbatore','Agra','Vijayawada','Surat','Nagpur','Lucknow','Amritsar','Jodhpur','Udaipur']
const EVENT_TAGS = [
  { label: 'Jazz Nights',   color: '#E8705A' },
  { label: 'Stand-up',      color: '#F5A800' },
  { label: 'Workshops',     color: '#5DD9D0' },
  { label: 'Art Pop-ups',   color: '#9B8FFF' },
  { label: 'Open Mics',     color: '#E8705A' },
  { label: 'Poetry Slams',  color: '#4ADE80' },
  { label: 'Music Gigs',    color: '#F5A800' },
]
const MAKER_FEATURES = ['Ticketed events with UPI checkout','Link-in-bio page at /{username}','Keep 75–90% of every rupee earned']
const VENUE_FEATURES  = ['Verified listing in creator search','Booking calendar & Venue proposals','Revenue from idle evening slots']

const TICKET_META = [
  { serial: 'WIMC·001', type: 'ENTRY PASS',   accent: '#E8705A', stub: 'GENERAL ADMISSION · INDIA · 2025',          bg: '#0B0807' },
  { serial: 'WIMC·002', type: 'CREATOR PASS', accent: '#F5A800', stub: 'CLAIM YOUR PAGE · WIMCITY.IN · FREE',        bg: '#0B0A06' },
  { serial: 'WIMC·003', type: 'ROLE SELECT',  accent: '#5DD9D0', stub: 'CHOOSE YOUR PATH · MAKERS & VENUES · 2025',  bg: '#060B0B' },
]

// ── Shared sub-components ─────────────────────────────────────

function AhmedabadPostmarkSVG() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="apm-arc-top" d="M 22,100 A 78,78 0 0,1 178,100" />
      </defs>
      <circle cx="100" cy="100" r="94" stroke="white" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="78" stroke="white" strokeWidth="1.2" />
      <text fill="white" fontSize="14" fontFamily="monospace" fontWeight="800" letterSpacing="8">
        <textPath href="#apm-arc-top" startOffset="50%" textAnchor="middle">WIMC</textPath>
      </text>
      <text x="100" y="155" fill="white" fontSize="8.5" fontFamily="monospace" fontWeight="700" letterSpacing="2.5" textAnchor="middle">AHMEDABAD</text>
      <line x1="36" y1="149" x2="57" y2="149" stroke="white" strokeWidth="0.8" opacity="0.4"/>
      <line x1="143" y1="149" x2="164" y2="149" stroke="white" strokeWidth="0.8" opacity="0.4"/>
      <text x="100" y="167" fill="white" fontSize="7" fontFamily="monospace" fontWeight="600" letterSpacing="3" textAnchor="middle" opacity="0.5">2025</text>
      <line x1="30" y1="77" x2="170" y2="77" stroke="white" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.35"/>
      <line x1="32" y1="142" x2="168" y2="142" stroke="white" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.35"/>
      {/* Teen Darwaza — three-arch gateway, Ahmedabad's city landmark */}
      <line x1="55" y1="132" x2="145" y2="132" stroke="white" strokeWidth="1.5" />
      <path d="M 60,132 L 60,114 Q 60,105 69,105 Q 78,105 78,114 L 78,132" stroke="white" strokeWidth="1.2" />
      <path d="M 85,132 L 85,103 Q 84.5,86 100,86 Q 115.5,86 115,103 L 115,132" stroke="white" strokeWidth="1.8" />
      <path d="M 122,132 L 122,114 Q 122,105 131,105 Q 140,105 140,114 L 140,132" stroke="white" strokeWidth="1.2" />
      <line x1="85" y1="93" x2="115" y2="93" stroke="white" strokeWidth="1" />
      <rect x="87" y="86" width="4" height="8" fill="white" />
      <rect x="95" y="86" width="4" height="8" fill="white" />
      <rect x="103" y="86" width="4" height="8" fill="white" />
      <rect x="111" y="86" width="4" height="8" fill="white" />
      <line x1="60" y1="109" x2="78" y2="109" stroke="white" strokeWidth="0.8" />
      <rect x="61" y="104" width="3" height="6" fill="white" opacity="0.85"/>
      <rect x="67" y="104" width="3" height="6" fill="white" opacity="0.85"/>
      <rect x="73" y="104" width="3" height="6" fill="white" opacity="0.85"/>
      <line x1="122" y1="109" x2="140" y2="109" stroke="white" strokeWidth="0.8" />
      <rect x="123" y="104" width="3" height="6" fill="white" opacity="0.85"/>
      <rect x="129" y="104" width="3" height="6" fill="white" opacity="0.85"/>
      <rect x="135" y="104" width="3" height="6" fill="white" opacity="0.85"/>
      <line x1="55" y1="136" x2="145" y2="136" stroke="white" strokeWidth="0.7" opacity="0.5"/>
    </svg>
  )
}

function ShrutiPhoneMockup({ fast, revealDelay }: { fast: boolean; revealDelay: number }) {
  const enterDur = fast ? 0.45 : 0.9
  return (
    <motion.div initial={{ opacity: 0, y: fast ? 30 : 60, scale: 0.93 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: enterDur, ease: E, delay: revealDelay + (fast ? 0.10 : 0) }}>
      <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="relative overflow-hidden" style={{ width: 360, height: 640, background: '#0D0C1A', borderRadius: 56, border: '1px solid rgba(232,112,90,0.22)', boxShadow: '0 56px 112px rgba(0,0,0,0.80), 0 0 0 1px rgba(232,112,90,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-9 pt-6 pb-1">
            <span className="font-mono text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="w-1.5 h-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>
          <div className="mx-6 mb-3 px-4 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>lock</span>
            <span className="font-mono text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>wheninmycity.com/shruti</span>
          </div>
          <div className="relative px-6 pt-4 pb-5" style={{ background: 'linear-gradient(170deg, rgba(232,112,90,0.14) 0%, rgba(245,168,0,0.04) 50%, transparent 100%)' }}>
            <div className="flex justify-center mb-3">
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #E8705A 0%, #F5A800 100%)', padding: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(145deg, #2D1A10, #1A0D08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#E8705A', fontFamily: 'var(--font-syne)' }}>S</div>
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-white" style={{ fontSize: 18 }}>Shruti</p>
              <p style={{ fontSize: 13, color: '#E8705A', marginTop: 3 }}>Indie Pop · Singer-Songwriter</p>
              <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>Nashik, India</p>
              <div className="flex justify-center gap-3 mt-3">
                <div style={{ width: 34, height: 34, borderRadius: 9999, background: 'rgba(30,215,96,0.12)', border: '1px solid rgba(30,215,96,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1ED760"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 9999, background: 'rgba(252,61,57,0.12)', border: '1px solid rgba(252,61,57,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC3D39"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182c5.418 0 9.818 4.4 9.818 9.818S17.418 21.818 12 21.818 2.182 17.418 2.182 12 6.582 2.182 12 2.182zm-.545 3.272v9.092l7.636-4.546-7.636-4.546z" /></svg>
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 9999, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(232,112,90,0.12)', margin: '0 24px' }} />
          <div className="px-5 pt-4 pb-2 space-y-2.5">
            <p className="font-mono font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.2)', paddingLeft: 2 }}>UPCOMING GIGS</p>
            {/* Event 1 */}
            <div style={{ borderRadius: 18, padding: '12px 14px', background: 'rgba(232,112,90,0.08)', border: '1px solid rgba(232,112,90,0.2)' }}>
              <div className="flex items-center gap-3.5">
                <div className="flex-shrink-0 text-center" style={{ width: 42, padding: '6px 0', borderRadius: 12, background: 'rgba(232,112,90,0.18)' }}>
                  <p className="font-mono font-bold uppercase" style={{ fontSize: 8, color: '#E8705A', letterSpacing: '0.1em' }}>MAY</p>
                  <p className="font-bold" style={{ fontSize: 22, color: '#F5A800', lineHeight: 1, fontFamily: 'var(--font-syne)' }}>31</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white leading-tight" style={{ fontSize: 14 }}>Nashik Unplugged</p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Graffiti Studio · Nashik</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold" style={{ fontSize: 13, color: '#E8705A' }}>₹299</span>
                    <span className="font-mono font-bold" style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9999, background: 'rgba(232,112,90,0.15)', color: '#E8705A' }}>8 left</span>
                  </div>
                </div>
                <div className="shrink-0 font-bold" style={{ fontSize: 10, padding: '6px 11px', borderRadius: 9999, background: '#E8705A', color: 'white' }}>RSVP</div>
              </div>
            </div>
            {/* Event 2 */}
            <div style={{ borderRadius: 18, padding: '12px 14px', background: 'rgba(245,168,0,0.06)', border: '1px solid rgba(245,168,0,0.16)' }}>
              <div className="flex items-center gap-3.5">
                <div className="flex-shrink-0 text-center" style={{ width: 42, padding: '6px 0', borderRadius: 12, background: 'rgba(245,168,0,0.14)' }}>
                  <p className="font-mono font-bold uppercase" style={{ fontSize: 8, color: '#F5A800', letterSpacing: '0.1em' }}>JUN</p>
                  <p className="font-bold" style={{ fontSize: 22, color: '#F5A800', lineHeight: 1, fontFamily: 'var(--font-syne)' }}>14</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white leading-tight" style={{ fontSize: 14 }}>Rooftop Sessions</p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>The Loft · Pune</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold" style={{ fontSize: 13, color: '#F5A800' }}>₹499</span>
                    <span className="font-mono font-bold" style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9999, background: 'rgba(245,168,0,0.12)', color: '#F5A800' }}>24 left</span>
                  </div>
                </div>
                <div className="shrink-0 font-bold" style={{ fontSize: 10, padding: '6px 11px', borderRadius: 9999, background: 'rgba(245,168,0,0.15)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.3)' }}>RSVP</div>
              </div>
            </div>
          </div>
          {/* Bottom fade + home indicator */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 56, background: 'linear-gradient(to top, #0D0C1A 40%, transparent 100%)' }} />
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center pointer-events-none">
            <div style={{ width: 120, height: 5, borderRadius: 9999, background: 'rgba(255,255,255,0.18)' }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function UsernameClaimInput() {
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
      <div style={{ border: `1px solid ${focused ? 'rgba(245,168,0,0.52)' : 'rgba(245,168,0,0.24)'}`, background: 'rgba(245,168,0,0.03)', transition: 'border-color 0.2s ease' }}>
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(245,168,0,0.14)', background: 'rgba(245,168,0,0.07)' }}>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: '#F5A800' }}>CLAIM YOUR PAGE</span>
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] px-2.5 py-1" style={{ background: '#F5A800', color: '#0B0A06' }}>FREE</span>
        </div>
        {/* URL input */}
        <div className="flex items-stretch" style={{ borderBottom: '1px solid rgba(245,168,0,0.14)' }}>
          <span className="flex items-center font-mono text-[11px] font-bold shrink-0" style={{ color: '#F5A800', borderRight: '1px solid rgba(245,168,0,0.14)', padding: '14px 16px', whiteSpace: 'nowrap', background: 'rgba(245,168,0,0.05)' }}>
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
            className="flex-1 bg-transparent outline-none font-mono text-[16px] text-white placeholder-[#4A4830]"
            style={{ padding: '14px 16px', minWidth: 0, caretColor: '#F5A800' }}
          />
        </div>
        {/* CTA */}
        <button
          onClick={handleClaim}
          className="w-full inline-flex items-center justify-center gap-2.5 py-4 font-mono text-[11px] font-bold tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-[0.99]"
          style={{ background: '#F5A800', color: '#0B0A06', borderRadius: 0 }}
        >
          GET YOUR FREE PAGE
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_forward</span>
        </button>
      </div>
      <div className="flex items-center gap-5 mt-3 px-1">
        {['ALWAYS FREE', '75–90% YOURS', '5 MIN SETUP'].map((label) => (
          <span key={label} className="flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.12em]" style={{ color: 'rgba(245,168,0,0.55)' }}>
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#F5A800', opacity: 0.8 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Ticket chrome overlays ─────────────────────────────────────

const HEADER_H = 36  // ticket header strip height

function TicketChrome({ index, tearP }: { index: number; tearP: MotionValue<number> }) {
  const meta       = TICKET_META[index]
  const BW         = [3,1,2,1,3,2,1,2,1,3,1,2,3,1,2,2,1,3]
  const perfOpacity = useTransform(tearP, [0, 1], [0.28, 1.0])
  return (
    <>
      {/* Accent glow border */}
      <div style={{ position: 'absolute', inset: 0, border: `1px solid ${meta.accent}28`, zIndex: 20, pointerEvents: 'none', borderRadius: 'inherit' }} />

      {/* Top header strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        background: `linear-gradient(90deg, ${meta.accent}14 0%, transparent 40%, transparent 60%, ${meta.accent}0A 100%)`,
        borderBottom: `1px solid ${meta.accent}20`,
        zIndex: 18, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)' }}>WHEN IN MY CITY</span>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 500, letterSpacing: '0.20em', textTransform: 'uppercase', color: `${meta.accent}55`, marginLeft: 12 }}>· {meta.type}</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: `${meta.accent}70` }}>{meta.serial}</span>
      </div>

      {/* Left accent bar — physical ticket colour band */}
      <div style={{ position: 'absolute', top: HEADER_H, left: 0, bottom: STUB_H, width: 3, background: meta.accent, opacity: 0.6, zIndex: 18, pointerEvents: 'none' }} />

      {/* Perforated tear-here line — above the stub strip, brightens on scroll */}
      <motion.div style={{
        position: 'absolute', bottom: STUB_H, left: 32, right: 32,
        height: 1, zIndex: 18, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${meta.accent} 3px, transparent 3px)`,
        backgroundSize: '26px 8px', backgroundRepeat: 'repeat-x', backgroundPosition: 'left center',
        opacity: perfOpacity,
      }} />

      {/* Punch-hole notches at the face/stub boundary */}
      {(['left','right'] as const).map((side) => (
        <div key={side} style={{
          position: 'absolute', bottom: STUB_H,
          [side]: 0, transform: side === 'left' ? 'translate(-50%, 50%)' : 'translate(50%, 50%)',
          width: 26, height: 26, borderRadius: '50%',
          background: '#010109',
          border: `1px solid ${meta.accent}50`,
          boxShadow: `inset 0 2px 6px rgba(0,0,0,0.95), 0 0 8px ${meta.accent}30`,
          zIndex: 25, pointerEvents: 'none',
        }} />
      ))}

      {/* Bottom stub strip — thin, fixed height */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: STUB_H,
        background: `${meta.accent}08`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', zIndex: 15, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${meta.accent}99` }}>ADMIT ONE</span>
          <span style={{ width: 2, height: 2, borderRadius: '50%', background: `${meta.accent}44`, display: 'inline-block' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${meta.accent}55` }}>{meta.stub}</span>
        </div>
        <div style={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0, opacity: 0.28 }}>
          {BW.map((w, i) => <div key={i} style={{ width: w, height: 20, background: meta.accent, borderRadius: 0.5 }} />)}
        </div>
      </div>
    </>
  )
}

// ── Section content ───────────────────────────────────────────
// revealDelay: extra offset added to all entrance animations
// fast: use shorter durations (for tear re-entries)

// ── Hero stamp — large white logo pressed like an ink stamp ───

// Coarse grain: big organic splotches for heavy ink erosion
const GRAIN_COARSE = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='gc'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.45' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23gc)'/%3E%3C/svg%3E\")"
// Fine grain: ink fibre micro-texture
const GRAIN_FINE   = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='gf'%3E%3CfeTurbulence type='turbulence' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23gf)'/%3E%3C/svg%3E\")"

function HeroStamp({ pmX, pmY, revealDelay, fast }: { pmX: MotionValue<number>; pmY: MotionValue<number>; revealDelay: number; fast: boolean }) {
  const stampDelay = revealDelay + (fast ? 0.18 : 0.90)
  return (
    <motion.div
      aria-hidden
      className="absolute pointer-events-none select-none hidden md:block"
      style={{ right: -60, top: '50%', marginTop: -280, width: 560, height: 560, x: pmX, y: pmY }}
    >
      <motion.div
        style={{ width: '100%', height: '100%', rotate: -12 }}
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.32 }}
        transition={{
          type: 'spring', stiffness: 520, damping: 26, mass: 1.0, delay: stampDelay,
          opacity: { type: 'tween', duration: 0.08, delay: stampDelay + 0.06 },
        }}
      >
        {/* White logo — contrast boosted so grain erosion reads clearly */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('/logo.png')",
          backgroundSize: '494% auto',
          backgroundPosition: '49.96% 50.02%',
          backgroundRepeat: 'no-repeat',
          filter: 'invert(1) contrast(1.5)',
        }} />
        {/* Coarse grain layer — multiply erodes large patches of white ink */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: GRAIN_COARSE,
          backgroundSize: '220px 220px',
          mixBlendMode: 'multiply',
          opacity: 0.88,
        }} />
        {/* Fine grain — micro ink-fibre texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: GRAIN_FINE,
          backgroundSize: '80px 80px',
          mixBlendMode: 'multiply',
          opacity: 0.65,
        }} />
        {/* Second coarse pass at offset angle — irregular splotch density */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: GRAIN_COARSE,
          backgroundSize: '165px 165px',
          backgroundPosition: '55px 75px',
          mixBlendMode: 'multiply',
          opacity: 0.48,
          transform: 'rotate(31deg) scale(1.3)',
        }} />
      </motion.div>
    </motion.div>
  )
}

function AhmedabadPostmarkDecal({ revealDelay, fast }: { revealDelay: number; fast: boolean }) {
  const delay = revealDelay + (fast ? 0.30 : 1.10)
  return (
    <motion.div
      aria-hidden
      className="absolute pointer-events-none select-none hidden md:block"
      style={{ right: 36, bottom: '13%', width: 176, height: 176 }}
      initial={{ scale: 0.55, opacity: 0, rotate: 9 }}
      animate={{ scale: 1, opacity: 0.22, rotate: 9 }}
      transition={{
        type: 'spring', stiffness: 500, damping: 22, mass: 1.0, delay,
        opacity: { type: 'tween', duration: 0.08, delay: delay + 0.07 },
      }}
    >
      {/* Grain erosion layers — same multiply technique as main stamp */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: GRAIN_COARSE, backgroundSize: '120px 120px', mixBlendMode: 'multiply', opacity: 0.85 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, backgroundImage: GRAIN_FINE, backgroundSize: '52px 52px', mixBlendMode: 'multiply', opacity: 0.60 }} />
      <AhmedabadPostmarkSVG />
    </motion.div>
  )
}

interface FaceProps {
  revealDelay: number
  fast: boolean
  badgeX: MotionValue<number>
  badgeY: MotionValue<number>
  pmX: MotionValue<number>
  pmY: MotionValue<number>
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
}

function HeroFace({ revealDelay, fast, badgeX, badgeY, pmX, pmY, onMouseMove }: FaceProps) {
  const marquee = [...CITIES, ...CITIES]
  const dur  = fast ? 0.38 : 0.82
  const d0   = revealDelay
  const hDel = fast ? [0, 0.07, 0.14, 0.21] : [0.15, 0.25, 0.35, 0.45]
  return (
    <div className="flex flex-col h-full" onMouseMove={onMouseMove}>
      {/* Postal strip */}
      <motion.div className="relative px-6 md:px-14 py-2 shrink-0" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: fast ? 0.3 : 0.55, ease: E, delay: d0 }}>
        <div className="flex items-center gap-6 font-mono text-[9px] tracking-[0.22em] uppercase text-[#5C5A72]">
          <span>FROM: WHEN IN MY CITY</span>
          <span className="hidden md:block">· TO: TIER-2 INDIA</span>
          <span className="hidden lg:block">· CLASS: FIRST CULTURE</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8705A]" style={{ animation: 'wimc-bloom-pulse 2s ease-in-out infinite' }} />
            POSTING NOW
          </span>
        </div>
      </motion.div>

      {/* Ambient blobs */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div style={{ position: 'absolute', top: '10%', left: '55%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,112,90,0.07) 0%, transparent 65%)', animation: 'wimc-blob 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', left: '72%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,168,0,0.05) 0%, transparent 65%)', animation: 'wimc-blob 25s ease-in-out infinite', animationDelay: '-8s' }} />
        {/* Large "01" watermark */}
        <div style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-syne)', fontSize: 'clamp(200px, 28vw, 380px)', fontWeight: 900, lineHeight: 1, color: 'rgba(232,112,90,0.028)', letterSpacing: '-0.06em', userSelect: 'none', pointerEvents: 'none' }}>01</div>
      </div>

      {/* Hero body */}
      <div className="relative flex-1 px-6 md:px-14 flex flex-col justify-center overflow-hidden">
        {/* Large watermark stamp — white logo, rubber-stamp entrance */}
        <HeroStamp pmX={pmX} pmY={pmY} revealDelay={d0} fast={fast} />
        {/* Ahmedabad postal stamp — smaller postmark in lower-right */}
        <AhmedabadPostmarkDecal revealDelay={d0} fast={fast} />
        <div className="max-w-7xl mx-auto w-full">
          {/* (no right-panel decorations — replaced by stamp above) */}

          <h1 className="font-display font-black tracking-[-0.045em] leading-[0.86] mb-10" style={{ fontSize: 'clamp(52px, 9vw, 112px)' }}>
            {([
              { text: 'Culture lives', style: { color: '#ffffff' } },
              { text: 'offline.',      style: { backgroundImage: 'linear-gradient(110deg, #E8705A 0%, #F5A800 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } },
              { text: 'We keep it',    style: { color: '#7878A0' } },
              { text: 'connected.',   style: { color: '#ffffff' } },
            ] as const).map(({ text, style }, i) => (
              <motion.span key={text} className="block" style={style}
                initial={{ opacity: 0, y: fast ? 22 : 44 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur, ease: E, delay: d0 + hDel[i] }}>
                {text}
              </motion.span>
            ))}
          </h1>

          <motion.div className="flex flex-col md:flex-row gap-8 md:gap-16 md:items-end"
            initial={{ opacity: 0, y: fast ? 14 : 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: fast ? 0.35 : 0.78, ease: E, delay: d0 + (fast ? 0.28 : 0.65) }}>
            <p className="text-base md:text-[17px] leading-relaxed text-[#9896B0] max-w-md">
              WIMC is where India&apos;s Tier-2 cities build their offline culture — connecting creators who perform, Venues (local spaces) that host, and communities who show up.
            </p>
            <div className="flex flex-col gap-3 shrink-0">
              <Link href="/signin?next=/onboarding" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold tracking-wide text-[#07070A] bg-white hover:bg-[#E8E7F0] transition-colors" style={{ borderRadius: 0 }}>
                Start for free <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </Link>
              <Link href="/explore" className="inline-flex items-center gap-2 px-6 py-3 font-mono text-[11px] tracking-[0.12em] uppercase text-[#9896B0] hover:text-white transition-colors" style={{ border: '1px solid rgba(255,255,255,0.09)', borderRadius: 0 }}>
                Browse events <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </Link>
              <Link
                href="/vishrut_797"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors border-b border-white/20 hover:border-white/40 pb-[2px] self-start"
                style={{ borderRadius: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                SEE AN EXAMPLE PAGE
              </Link>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap gap-2 mt-8"
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: d0 + (fast ? 0.32 : 0.8) } } }}>
            {EVENT_TAGS.map((tag) => (
              <motion.span key={tag.label}
                className="px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.15em] uppercase cursor-default"
                style={{ background: `${tag.color}10`, color: tag.color, border: `1px solid ${tag.color}28`, borderRadius: 0 }}
                variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: fast ? 0.28 : 0.5, ease: E } } }}
                whileHover={{ scale: 1.06, transition: { duration: 0.15 } }}>
                {tag.label}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Cities marquee */}
      <div className="shrink-0 overflow-hidden py-2" style={{ background: '#050508', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center whitespace-nowrap marquee-normal" style={{ width: 'max-content' }}>
          {marquee.map((city, i) => (
            <span key={i} className="flex items-center gap-3 mx-4">
              <span className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase text-[#5C5A72]">{city}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(232,112,90,0.35)' }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShowcaseFace({ revealDelay, fast }: { revealDelay: number; fast: boolean }) {
  const dur = fast ? 0.38 : 0.8
  const d0 = revealDelay
  const hDel = fast ? [0, 0.06, 0.12, 0.20] : [0, 0.14, 0.26, 0.40]
  return (
    <div className="relative flex h-full overflow-hidden">
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stronger amber glow */}
        <div style={{ position: 'absolute', top: '-10%', right: '-8%', width: 720, height: 720, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,168,0,0.11) 0%, transparent 60%)', animation: 'wimc-blob 22s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '5%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,112,90,0.06) 0%, transparent 65%)', animation: 'wimc-blob 17s ease-in-out infinite', animationDelay: '-7s' }} />
        {/* Diagonal boarding-pass stripes on right half */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '48%', backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(245,168,0,0.014) 20px, rgba(245,168,0,0.014) 22px)', pointerEvents: 'none' }} />
        {/* Large "02" watermark */}
        <div style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-syne)', fontSize: 'clamp(200px, 28vw, 380px)', fontWeight: 900, lineHeight: 1, color: 'rgba(245,168,0,0.028)', letterSpacing: '-0.06em', userSelect: 'none', pointerEvents: 'none' }}>02</div>
        {/* Stamp watermark — lower left */}
        <div aria-hidden style={{ position: 'absolute', left: 10, bottom: 10, width: 260, height: 260, backgroundImage: "url('/logo.png')", backgroundSize: '494% auto', backgroundPosition: '49.96% 50.02%', backgroundRepeat: 'no-repeat', filter: 'invert(1)', opacity: 0.055, transform: 'rotate(-12deg)', pointerEvents: 'none', userSelect: 'none' }} />
      </div>

      <div className="relative flex-1 px-6 py-4 md:px-14 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
            <div className="flex flex-col">
              {/* Eyebrow */}
              <motion.div
                className="flex items-center gap-3 mb-5"
                initial={{ opacity: 0, x: fast ? -16 : -32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: fast ? 0.28 : 0.55, ease: E, delay: d0 + hDel[0] }}
              >
                <div style={{ width: 24, height: 1, background: '#F5A800', opacity: 0.7 }} />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: '#F5A800' }}>YOUR CREATOR PAGE</span>
              </motion.div>

              {/* Headline */}
              <div className="mb-7">
                <motion.h2
                  className="font-display font-black tracking-[-0.045em] leading-[0.88] block text-white"
                  style={{ fontSize: 'clamp(40px, 5.5vw, 74px)' }}
                  initial={{ opacity: 0, y: fast ? 18 : 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur, ease: E, delay: d0 + hDel[1] }}
                >
                  Your page,
                </motion.h2>
                <motion.h2
                  className="font-display font-black tracking-[-0.045em] leading-[0.88] block"
                  style={{ fontSize: 'clamp(40px, 5.5vw, 74px)', backgroundImage: 'linear-gradient(110deg, #F5A800 10%, #E8705A 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  initial={{ opacity: 0, y: fast ? 18 : 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur, ease: E, delay: d0 + hDel[2] }}
                >
                  live in minutes.
                </motion.h2>
              </div>

              {/* Claim input */}
              <motion.div
                initial={{ opacity: 0, y: fast ? 14 : 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur, ease: E, delay: d0 + hDel[3] }}
              >
                <UsernameClaimInput />
              </motion.div>
            </div>

            <div className="flex justify-center md:justify-end">
              <ShrutiPhoneMockup fast={fast} revealDelay={revealDelay} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RolesFace({ revealDelay, fast }: { revealDelay: number; fast: boolean }) {
  const dur = fast ? 0.38 : 0.8
  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', top: '20%', left: '45%', width: 650, height: 650, borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,217,208,0.04) 0%, transparent 65%)', animation: 'wimc-blob 28s ease-in-out infinite' }} />
        {/* Large "03" watermark */}
        <div style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-syne)', fontSize: 'clamp(200px, 28vw, 380px)', fontWeight: 900, lineHeight: 1, color: 'rgba(93,217,208,0.028)', letterSpacing: '-0.06em', userSelect: 'none', pointerEvents: 'none' }}>03</div>
        {/* Stamp watermark — upper right corner */}
        <div aria-hidden style={{ position: 'absolute', right: 16, top: 16, width: 200, height: 200, backgroundImage: "url('/logo.png')", backgroundSize: '494% auto', backgroundPosition: '49.96% 50.02%', backgroundRepeat: 'no-repeat', filter: 'invert(1)', opacity: 0.055, transform: 'rotate(10deg)', pointerEvents: 'none', userSelect: 'none' }} />
      </div>

      <div className="relative flex-1 px-6 py-6 md:px-14 flex flex-col justify-center overflow-hidden">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
            initial={{ opacity: 0, y: fast ? 14 : 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: fast ? 0.32 : 0.7, ease: E, delay: revealDelay }}>
            <h2 className="font-display font-black tracking-[-0.045em] leading-[0.88] text-white" style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}>
              Choose<br />your role.
            </h2>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#9896B0' }}>
              Two paths, one platform. Whether you make the culture or make the space — WIMC has a home for you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: fast ? -22 : -48 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: dur, ease: E, delay: revealDelay + 0.07 }}>
              <Link href="/signin?next=/onboarding" className="group block overflow-hidden transition-all duration-300 hover:-translate-y-1" style={{ outline: '1px solid rgba(232,112,90,0.22)', borderRadius: 0 }}>
                <div className="relative overflow-hidden px-7 pt-7 pb-8 md:px-9" style={{ background: '#E8705A', minHeight: '140px' }}>
                  <div aria-hidden className="absolute bottom-[-16px] right-[-8px] font-display font-black leading-none select-none pointer-events-none" style={{ fontSize: 'clamp(100px, 14vw, 180px)', color: 'rgba(255,255,255,0.09)', letterSpacing: '-0.06em' }}>01</div>
                  <div className="absolute top-4 right-5 text-right" style={{ opacity: 0.45 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>INDIA</div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 }}>₹01</div>
                  </div>
                  <div className="relative flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">For Makers</span>
                    <div className="w-7 h-7 border border-white/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>arrow_forward</span>
                    </div>
                  </div>
                  <h3 className="relative font-display font-black text-white leading-[0.84] tracking-[-0.045em]" style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}>Your<br />stage.</h3>
                </div>
                <div className="px-7 py-4 md:px-9 flex flex-col gap-3" style={{ background: '#100908' }}>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#9896B0' }}>Host ticketed events, build your link-in-bio, sell tickets with UPI — and keep 75–90% of everything you earn.</p>
                  <ul className="space-y-1.5">
                    {MAKER_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[12px]" style={{ color: '#9896B0' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#E8705A' }} />{f}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold" style={{ background: '#E8705A', color: 'white', borderRadius: 0, alignSelf: 'flex-start' }}>
                    Start for free <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: fast ? 22 : 48 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: dur, ease: E, delay: revealDelay + 0.14 }}>
              <Link href="/signin?next=%2Fonboarding%3Fpersona%3Dvenue" className="group block overflow-hidden transition-all duration-300 hover:-translate-y-1" style={{ outline: '1px solid rgba(93,217,208,0.18)', borderRadius: 0 }}>
                <div className="relative overflow-hidden px-7 pt-7 pb-8 md:px-9" style={{ background: '#5DD9D0', minHeight: '140px' }}>
                  <div aria-hidden className="absolute bottom-[-16px] right-[-8px] font-display font-black leading-none select-none pointer-events-none" style={{ fontSize: 'clamp(100px, 14vw, 180px)', color: 'rgba(0,0,0,0.07)', letterSpacing: '-0.06em' }}>02</div>
                  <div className="absolute top-4 right-5 text-right" style={{ opacity: 0.4 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>INDIA</div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: 26, fontWeight: 900, color: '#07070A', lineHeight: 1 }}>₹02</div>
                  </div>
                  <div className="relative flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#07070A]/50">For Venues</span>
                    <div className="w-7 h-7 border border-[#07070A]/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#07070A]" style={{ fontSize: '14px' }}>arrow_forward</span>
                    </div>
                  </div>
                  <h3 className="relative font-display font-black text-[#07070A] leading-[0.84] tracking-[-0.045em]" style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}>Open<br />your doors.</h3>
                </div>
                <div className="px-7 py-4 md:px-9 flex flex-col gap-3" style={{ background: '#07100F' }}>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#9896B0' }}>List your café, rooftop, studio, or gallery. Let creators come to you with real bookings.</p>
                  <ul className="space-y-1.5">
                    {VENUE_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[12px]" style={{ color: '#9896B0' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#5DD9D0' }} />{f}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold" style={{ background: '#5DD9D0', color: '#07070A', borderRadius: 0, alignSelf: 'flex-start' }}>
                    List your Venue <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer inside ticket 3 — kept lean to maximise card area */}
      <div className="relative px-6 md:px-14 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#05050A', padding: '7px 56px' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WimcWordmark color="white" height={18} />
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase hidden sm:block" style={{ color: '#3C3A52' }}>wheninmycity.com</span>
          </div>
          <div className="flex items-center gap-x-4" style={{ color: '#5C5A72' }}>
            <Link href="/explore" className="font-mono text-[9px] tracking-[0.14em] uppercase hover:text-[#9896B0] transition-colors">Explore</Link>
            <Link href="/signin?next=/onboarding" className="font-mono text-[9px] tracking-[0.14em] uppercase hover:text-[#9896B0] transition-colors hidden sm:block">Creators</Link>
            <Link href="/signin?next=%2Fonboarding%3Fpersona%3Dvenue" className="font-mono text-[9px] tracking-[0.14em] uppercase hover:text-[#9896B0] transition-colors hidden sm:block">Venues</Link>
            <Link href="/signin" className="font-mono text-[9px] tracking-[0.14em] uppercase hover:text-[#9896B0] transition-colors">Sign in</Link>
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase">© 2025</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Full ticket (chrome + face) ───────────────────────────────

interface TicketSectionProps {
  index: number
  tearP: MotionValue<number>
  revealDelay?: number
  fast?: boolean
  badgeX: MotionValue<number>
  badgeY: MotionValue<number>
  pmX: MotionValue<number>
  pmY: MotionValue<number>
  onHeroMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
}

function TicketSection({ index, tearP, revealDelay = 0, fast = false, badgeX, badgeY, pmX, pmY, onHeroMouseMove }: TicketSectionProps) {
  const faceProps = { revealDelay, fast, badgeX, badgeY, pmX, pmY, onMouseMove: onHeroMouseMove }
  const bg = TICKET_META[index].bg
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: bg, overflow: 'hidden' }}>
      <TicketChrome index={index} tearP={tearP} />
      {/* Content fills full height between header and stub strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: STUB_H, paddingTop: HEADER_H, overflow: 'hidden' }}>
        {index === 0 && <HeroFace    {...faceProps} />}
        {index === 1 && <ShowcaseFace revealDelay={revealDelay} fast={fast} />}
        {index === 2 && <RolesFace   revealDelay={revealDelay} fast={fast} />}
      </div>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────

function ProgressDots({ active, onDotClick }: { active: number; onDotClick: (i: number) => void }) {
  return (
    <div style={{ position: 'absolute', bottom: STUB_H + 18, right: 20, display: 'flex', flexDirection: 'column', gap: 7, zIndex: 40 }}>
      {[0,1,2].map((i) => (
        <button key={i} onClick={() => onDotClick(i)}
          style={{ width: 3, height: i === active ? 22 : 8, borderRadius: 2, background: i === active ? TICKET_META[i].accent : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)' }} />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function LandingPage() {
  const [active,        setActive]        = useState(0)
  const [previewTarget, setPreviewTarget] = useState<number | null>(null)
  const [tearState,     setTearState]     = useState<TearState>('idle')
  const isAnimRef     = useRef(false)
  const tearAccRef    = useRef(0)
  const tearIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tearDirRef    = useRef<1 | -1>(1)
  const tearP         = useMotionValue(0)
  const zeroP         = useMotionValue(0)
  // Perf-line y-position as % of ticket height — updated by ResizeObserver below
  const perfYRef      = useRef(95)
  // Clips away the torn left-portion of the current ticket's stub
  const currentClipPath = useTransform(tearP, (v: number) =>
    buildHorizTearClip(v, perfYRef.current)
  )
  // Ticket body drifts upper-right as tear propagates — simulates paper being freed from the stub
  const driftX = useTransform(tearP, [0, 1], [0, 12])
  const driftY = useTransform(tearP, [0, 1], [0, -8])

  // Parallax for hero only
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const spX  = useSpring(mouseX, { stiffness: 35, damping: 20 })
  const spY  = useSpring(mouseY, { stiffness: 35, damping: 20 })
  const badgeX = useTransform(spX, [-1, 1], [-10, 10])
  const badgeY = useTransform(spY, [-1, 1], [-10, 10])
  const pmX    = useTransform(spX, [-1, 1], [  6, -6])
  const pmY    = useTransform(spY, [-1, 1], [  6, -6])
  function handleHeroMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    mouseX.set(((e.clientX - r.left) / r.width  - 0.5) * 2)
    mouseY.set(((e.clientY - r.top)  / r.height - 0.5) * 2)
  }

  const sharedProps  = { badgeX, badgeY, pmX, pmY, onHeroMouseMove: handleHeroMouseMove }
  const ticketRef    = useRef<HTMLDivElement>(null)

  // Track ticket height so we can express perf-line as a percentage
  useEffect(() => {
    const el = ticketRef.current
    if (!el) return
    const update = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) perfYRef.current = ((h - STUB_H) / h) * 100
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Tear sequence ────────────────────────────────────────────
  // Forward (dir>0): tearP sweeps left→right along the perf line, then ticket flies up.
  // Backward (dir<0): no stub tear — ticket simply slides off screen.
  const doTear = useCallback(async (target: number) => {
    if (isAnimRef.current || target < 0 || target > 2 || target === active) return
    isAnimRef.current = true
    if (tearIdleTimer.current) { clearTimeout(tearIdleTimer.current); tearIdleTimer.current = null }

    tearDirRef.current = target > active ? 1 : -1

    if (tearDirRef.current > 0) {
      setPreviewTarget(target)
      const cv = tearP.get()
      // Lift-off starts immediately — stub tear races to completion in the background
      setTearState('flying')
      if (cv < 0.98) {
        animate(tearP, 1, { duration: Math.max(0.08, (1 - cv) * 0.18), ease: [0.5, 0, 1, 1] })
      }
      await new Promise<void>((r) => setTimeout(r, 560))
    } else {
      // Backward: preview flies in on top (zIndex 3); current ticket stays put underneath
      setPreviewTarget(target)
      await new Promise<void>((r) => setTimeout(r, 520))
    }

    // Commit: synchronously reset tearP so new ticket mounts without clip
    tearP.set(0)
    tearAccRef.current = 0
    setActive(target)
    setPreviewTarget(null)
    setTearState('entering')

    await new Promise<void>((r) => setTimeout(r, 480))
    setTearState('idle')
    isAnimRef.current = false
  }, [active, tearP])

  // Input handlers
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const THRESH = 240
    function onWheel(e: WheelEvent) {
      if (isAnimRef.current) return
      const prevAcc = tearAccRef.current
      tearAccRef.current += e.deltaY
      tearAccRef.current = Math.max(-THRESH, Math.min(THRESH, tearAccRef.current))

      if (tearAccRef.current > 0 && active < 2) {
        // Forward scroll: drive tearP to animate the horizontal stub tear
        if (prevAcc <= 0) {
          tearDirRef.current = 1
          setPreviewTarget(active + 1)
        }
        tearP.set(tearAccRef.current / THRESH)
      } else if (tearAccRef.current < 0 && active > 0) {
        // Backward scroll (also handles mid-tear reversal crossing 0)
        tearP.set(0)
      } else {
        // Out-of-bounds or at rest — reset completely
        tearP.set(0)
        setPreviewTarget(null)
      }

      if (tearAccRef.current >= THRESH) {
        tearAccRef.current = 0
        if (tearIdleTimer.current) { clearTimeout(tearIdleTimer.current); tearIdleTimer.current = null }
        doTear(active + 1)
        return
      }
      if (tearAccRef.current <= -THRESH) {
        tearAccRef.current = 0
        if (tearIdleTimer.current) { clearTimeout(tearIdleTimer.current); tearIdleTimer.current = null }
        doTear(active - 1)
        return
      }

      // Spring back if user stops before threshold
      if (tearIdleTimer.current) clearTimeout(tearIdleTimer.current)
      tearIdleTimer.current = setTimeout(() => {
        tearAccRef.current = 0
        setPreviewTarget(null)
        animate(tearP, 0, { duration: 0.5, ease: [0.36, 1, 0.4, 1] })
      }, 380)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (tearIdleTimer.current) clearTimeout(tearIdleTimer.current)
    }
  }, [active, doTear, tearP])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') doTear(active + 1)
      if (e.key === 'ArrowUp')   doTear(active - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, doTear])

  useEffect(() => {
    let startY = 0
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onEnd   = (e: TouchEvent) => {
      const dy = startY - e.changedTouches[0].clientY
      if (Math.abs(dy) < 50) return
      if (dy > 0) doTear(active + 1); else doTear(active - 1)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend',   onEnd,   { passive: true })
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd) }
  }, [active, doTear])

  return (
    <div className="bg-[#07070A] text-[#F0EFF8]" style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>

      {/* Noise grain */}
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none select-none opacity-[0.028]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '200px 200px' }} />

      {/* Nav */}
      <motion.nav className="relative z-50 flex items-center justify-between px-6 md:px-14"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,10,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', height: NAV_H }}
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: E }}>
        <Link href="/" aria-label="When in My City" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/logo-stamp.png" alt="When in My City" width={88} height={88} style={{ width: 88, height: 88, flexShrink: 0, filter: 'invert(1)' }} priority />
          </Link>
        <div className="flex items-center gap-1">
          <Link href="/mission" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Mission</Link>
          <Link href="/growth"  className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Growth</Link>
          <Link href="/explore" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Explore</Link>
          <div className="relative group hidden md:flex items-center justify-center w-28">
            <button className="flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] group-hover:text-[#9896B0] transition-colors cursor-default select-none">
              Discover <span style={{ fontSize: 7, marginTop: 1 }}>▾</span>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 hidden group-hover:block z-[100]">
              <div style={{ background: '#0D0C1A', border: '1px solid rgba(255,255,255,0.1)', minWidth: 180 }}>
                <Link href="/hall-of-lights" className="flex items-center gap-2.5 px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase text-[#5C5A72] hover:text-[#F5A800] hover:bg-[#F5A800]/05 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#F5A800' }}>auto_awesome</span>
                  Hall of Lights
                </Link>
                <Link href="/map-of-legends" className="flex items-center gap-2.5 px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase text-[#5C5A72] hover:text-[#5DD9D0] hover:bg-[#5DD9D0]/05 transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#5DD9D0' }}>location_city</span>
                  Map of Legends
                </Link>
              </div>
            </div>
          </div>
          <div className="w-4" />
          <Link href="/signin" className="px-5 py-2 font-mono text-[11px] font-bold tracking-[0.15em] uppercase bg-white text-[#07070A] hover:bg-[#E8E7F0] transition-colors" style={{ borderRadius: 0 }}>Login</Link>
        </div>
      </motion.nav>

      {/* Ticket stage — dark desk surface visible around ticket edges */}
      <div style={{ position: 'absolute', top: NAV_H, left: 0, right: 0, bottom: 0, padding: '14px 20px 20px', background: '#010109', display: 'flex' }}>

        {/* Physical ticket — rounded corners + shadow make it look like a real object.
            overflow:hidden clips punch-holes to half-circles at the edges (correct real-ticket look). */}
        <div ref={ticketRef} style={{ position: 'relative', flex: 1, borderRadius: 22, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

          {/* ── Preview ticket ── */}
          {previewTarget !== null && (tearDirRef.current < 0 ? (
            // Backward: fly in on top so the current ticket stays visible underneath
            <motion.div
              initial={{ y: '-116%', x: '6%', rotateX: 22, rotate: -2, scale: 0.92, opacity: 0.58 }}
              animate={{ y: 0, x: 0, rotateX: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.50, ease: [0.44, 0, 0.82, 1] }}
              style={{ position: 'absolute', inset: 0, zIndex: 3, transformPerspective: 1000 }}
            >
              <TicketSection index={previewTarget} tearP={zeroP} revealDelay={9999} fast={false} {...sharedProps} />
            </motion.div>
          ) : (
            // Forward: sit underneath, revealed as current ticket tears and flies away
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <TicketSection index={previewTarget} tearP={zeroP} revealDelay={9999} fast={false} {...sharedProps} />
            </div>
          ))}

          {/* ── Current ticket — paper-flip upward after bottom stub tears ── */}
          <motion.div
            key={active}
            initial={false}
            style={{ position: 'absolute', inset: 0, zIndex: 2, clipPath: currentClipPath, transformPerspective: 1000, x: driftX, y: driftY }}
            animate={
              tearState === 'flying'
                ? { y: '-116%', x: '6%', rotateX: 22, rotate: -2, scale: 0.92, opacity: 0.58 }
                : { y: 0, x: 0, rotateX: 0, rotate: 0, scale: 1, opacity: 1 }
            }
            transition={tearState === 'flying' ? { duration: 0.50, ease: [0.18, 0, 0.56, 1] } : { duration: 0 }}
          >
            <TicketSection
              index={active}
              tearP={tearP}
              revealDelay={0}
              fast={tearState === 'entering'}
              {...sharedProps}
            />
          </motion.div>

          {/* ── Scroll hint ── */}
          {active === 0 && tearState === 'idle' && previewTarget === null && (
            <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 30 }}
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 2.8, duration: 1 }}>
              <motion.span className="material-symbols-outlined text-white/30" style={{ fontSize: 22 }}
                animate={{ y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                keyboard_arrow_down
              </motion.span>
            </motion.div>
          )}

          <ProgressDots active={active} onDotClick={doTear} />

        </div>{/* end physical ticket */}
      </div>{/* end stage */}

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
