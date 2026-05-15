'use client'

// src/app/onboarding/complete/complete-view.tsx  —  REDESIGNED
// Aesthetic: full-bleed ticket reveal, "ADMIT ONE" stamp thump, confetti burst.
// Logic: 100% preserved from original.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getValueAxis, VALUE_CALLOUT } from '@/lib/theme/hsv'
import { WimcLogo } from '@/components/WimcLogo'
import { motion, AnimatePresence } from 'framer-motion'

const E = [0.22, 1, 0.36, 1] as const

interface CompleteViewProps {
  username: string
  displayName: string
  city: string
  avatarUrl: string | null
  creatorType?: string
  bio?: string | null
  pageTheme?: { colorScheme?: string } | null
  interestTags?: string[]
  passingThrough?: boolean
}

const SCHEME_PRIMARY: Record<string, string> = {
  default: '#E8572A', midnight: '#818CF8', ocean: '#22D3EE', forest: '#6EE7B7',
  blush: '#E11D48', sand: '#B45309', pista: '#2D7A4F', gulaal: '#E8342A',
  neel: '#F5A800', turmeric: '#F5A800', steel: '#5B8DEF', sienna: '#C04A00',
  indigo: '#818CF8', aurora: '#D946EF', sage: '#3D7F53', mint: '#0C8B6B',
  electric: '#00E5FF', velvet: '#8B2340', nightforest: '#7EC8A0',
  parchment: '#4A3728', gallery: '#1A1A1A', terracotta: '#C4552A',
}

const PHONE_W = 216
const VIEWPORT_W = 390
const VIEWPORT_H = 844
const SCALE = PHONE_W / VIEWPORT_W
const PHONE_H = Math.round(VIEWPORT_H * SCALE)

// Confetti particle component
function ConfettiParticle({ x, delay, color }: { x: number; delay: number; color: string }) {
  return (
    <motion.div
      style={{
        position: 'absolute', top: 0, left: `${x}%`,
        width: 6, height: 10, background: color,
        transformOrigin: 'center top',
      }}
      initial={{ y: -20, rotate: 0, opacity: 1, scaleX: 1 }}
      animate={{ y: '100vh', rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: 0, scaleX: [1, 0.3, 1, 0.3, 1] }}
      transition={{ duration: 1.8 + Math.random() * 0.8, delay, ease: 'easeIn' }}
    />
  )
}

export default function CompleteView({
  username, displayName, creatorType, pageTheme, interestTags, passingThrough: _passingThrough,
}: CompleteViewProps) {
  const firstName = displayName.split(' ')[0]
  const isExplorer = creatorType === 'exploring'
  const scheme  = pageTheme?.colorScheme ?? 'default'
  const primary = SCHEME_PRIMARY[scheme] ?? '#E8572A'
  const { cluster } = getValueAxis(interestTags ?? [])
  const hsvCallout = (cluster !== 'mixed' && scheme !== 'default') ? VALUE_CALLOUT[cluster] : null
  const schemeName = scheme.charAt(0).toUpperCase() + scheme.slice(1)

  const [iframeSrc, setIframeSrc] = useState(`/${username}`)
  const [stampVisible, setStampVisible] = useState(false)
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; delay: number; color: string }[]>([])
  const [showContent, setShowContent] = useState(false)

  // Clear all onboarding sessionStorage on successful completion
  useEffect(() => {
    try {
      const KEYS = ['wimc_s1', 'wimc_s2', 'wimc_role', 'wimc_persona', 'wimc_city',
                    'wimc_subtypes', 'wimc_platforms', 'wimc_claimed_username', 'wimc_goal']
      KEYS.forEach(k => sessionStorage.removeItem(k))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setIframeSrc(`/${username}?_t=${Date.now()}`)
    // Stagger the reveal: stamp first, then confetti, then content
    setTimeout(() => setStampVisible(true), 300)
    setTimeout(() => {
      const colors = ['#E8705A', '#F5A800', '#5DD9D0', '#F0EFF8', '#1A2744', primary]
      const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
      setConfettiParticles(particles)
      setTimeout(() => setConfettiParticles([]), 3000)
    }, 600)
    setTimeout(() => setShowContent(true), 500)
  }, [username, primary])

  return (
    <div
      className="flex flex-col min-h-screen font-body"
      style={{ background: '#07070A', color: '#F0EFF8', overflow: 'hidden', position: 'relative' }}
    >
      {/* Noise grain */}
      <div aria-hidden className="fixed inset-0 pointer-events-none select-none" style={{ zIndex: 0, opacity: 0.028, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '200px 200px' }} />

      {/* Confetti */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none', overflow: 'hidden' }}>
        {confettiParticles.map(p => (
          <ConfettiParticle key={p.id} x={p.x} delay={p.delay} color={p.color} />
        ))}
      </div>

      {/* Ambient glow */}
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${primary}14 0%, transparent 65%)`, animation: 'wimc-blob 20s ease-in-out infinite' }} />
      </div>

      {/* ── Full-page ticket layout ── */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '14px 16px 16px',
          background: '#010109',
          minHeight: '100dvh',
        }}
      >
        {/* Ticket body */}
        <div
          style={{
            position: 'relative', flex: 1, borderRadius: 18,
            overflow: 'hidden', background: '#09090E',
            boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07), 0 0 40px ${primary}18`,
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Stamp watermark — bottom right background */}
          <div
            aria-hidden
            style={{
              position: 'absolute', bottom: 30, right: 20,
              width: 300, height: 300,
              backgroundImage: "url('/logo.png')",
              backgroundSize: '494% auto',
              backgroundPosition: '49.96% 50.02%',
              backgroundRepeat: 'no-repeat',
              filter: 'invert(1)',
              opacity: 0.06,
              transform: 'rotate(-12deg)',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          />

          {/* Ticket chrome */}
          <div style={{ position: 'absolute', inset: 0, border: `1px solid ${primary}25`, borderRadius: 'inherit', zIndex: 20, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(90deg, ${primary}12 0%, transparent 60%)`, borderBottom: `1px solid ${primary}18`, zIndex: 18, pointerEvents: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>WHEN IN MY CITY</span>
            <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${primary}80` }}>WIMC·001</span>
          </div>
          <div style={{ position: 'absolute', top: 32, left: 0, bottom: 34, width: 3, background: primary, opacity: 0.5, zIndex: 18, pointerEvents: 'none' }} />

          {/* Bottom stub */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, background: `${primary}08`, borderTop: `1px dashed ${primary}35`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 18, pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${primary}99` }}>ADMIT ONE</span>
            <div style={{ display: 'flex', gap: 1.5, alignItems: 'center', opacity: 0.25 }}>
              {[3,1,2,1,3,2,1,2,1,3,1,2,3].map((w, i) => <div key={i} style={{ width: w, height: 18, background: primary }} />)}
            </div>
          </div>

          {/* Content — below header, above stub */}
          <div style={{ paddingTop: 32, paddingBottom: 34, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ width: '100%', maxWidth: 380, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
                >
                  {/* Logo */}
                  <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45, ease: E }}>
                    <WimcLogo size="md" color="white" />
                  </motion.div>

                  {/* "ADMIT ONE" stamp — thumps in */}
                  <AnimatePresence>
                    {stampVisible && (
                      <motion.div
                        initial={{ scale: 0.4, rotate: -18, opacity: 0 }}
                        animate={{ scale: 1, rotate: -12, opacity: 0.9,
                          transition: { type: 'spring', stiffness: 520, damping: 18, delay: 0 } }}
                        style={{ position: 'relative' }}
                      >
                        <div
                          style={{
                            padding: '12px 24px',
                            border: `3px solid ${primary}`,
                            transform: 'rotate(-12deg)',
                            background: `${primary}12`,
                          }}
                        >
                          <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 900, letterSpacing: '0.08em', color: primary, lineHeight: 1, textTransform: 'uppercase', textAlign: 'center' }}>
                            ADMIT ONE
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', color: `${primary}88`, textTransform: 'uppercase', textAlign: 'center', marginTop: 4 }}>
                            WHEN IN MY CITY · 2025
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Headline */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: E }}
                    style={{ textAlign: 'center' }}
                  >
                    <h1 className="font-display font-black tracking-[-0.04em] leading-[0.9]" style={{ fontSize: 'clamp(28px, 7vw, 40px)', color: '#F0EFF8' }}>
                      You&apos;re live,<br />
                      <span style={{ backgroundImage: `linear-gradient(110deg, ${primary} 0%, ${primary}BB 80%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {firstName}! 🎉
                      </span>
                    </h1>
                    <p style={{ fontSize: 14, color: '#9896B0', marginTop: 8, lineHeight: 1.6 }}>
                      {isExplorer
                        ? 'Your profile is ready — start discovering events.'
                        : 'This is exactly how your page looks to visitors.'}
                    </p>
                  </motion.div>

                  {/* Phone preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.45, duration: 0.6, ease: E }}
                    style={{ position: 'relative', width: PHONE_W }}
                  >
                    <div
                      style={{
                        width: PHONE_W, height: PHONE_H, borderRadius: 28,
                        border: '4px solid rgba(255,255,255,0.12)',
                        backgroundColor: '#000', overflow: 'hidden',
                        boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${primary}22`,
                      }}
                    >
                      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 72, height: 10, background: '#000', borderRadius: 9999, zIndex: 10 }} />
                      <iframe
                        src={iframeSrc}
                        title="Your page preview"
                        scrolling="no"
                        style={{ width: VIEWPORT_W, height: VIEWPORT_H, transform: `scale(${SCALE})`, transformOrigin: 'top left', border: 'none', pointerEvents: 'none', display: 'block' }}
                      />
                      <div style={{ position: 'absolute', inset: 'auto 0 0', height: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)', pointerEvents: 'none' }} />
                    </div>

                    {/* LIVE badge */}
                    <div style={{ position: 'absolute', top: -8, right: -12, width: 52, height: 52, borderRadius: '50%', background: primary, border: '4px solid #07070A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${primary}60` }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#07070A', lineHeight: 1 }}>LIVE</span>
                      <span style={{ fontFamily: 'var(--font-syne)', fontSize: 12, fontWeight: 900, color: '#07070A', lineHeight: 1.1 }}>NEW</span>
                    </div>
                  </motion.div>

                  {/* HSV callout */}
                  {hsvCallout && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', border: `1px solid ${primary}28`, background: `${primary}10`, fontSize: 12, fontWeight: 500, color: primary }}
                    >
                      <span style={{ fontSize: 12, flexShrink: 0 }}>✦</span>
                      <span>
                        <span style={{ fontWeight: 700 }}>{schemeName} · </span>
                        {hsvCallout}
                      </span>
                    </motion.div>
                  )}

                  {/* CTAs */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65, duration: 0.45, ease: E }}
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}
                  >
                    {isExplorer ? (
                      <Link
                        href="/explore"
                        className="w-full flex items-center justify-center gap-2 font-display font-black tracking-[-0.02em] transition-all active:scale-98"
                        style={{ padding: '16px 24px', background: primary, color: '#07070A', fontSize: 15, borderRadius: 0, textDecoration: 'none' }}
                      >
                        Start exploring →
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/${username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 font-display font-black tracking-[-0.02em] transition-all active:scale-[0.98]"
                          style={{ padding: '16px 24px', background: primary, color: '#07070A', fontSize: 15, borderRadius: 0, textDecoration: 'none' }}
                        >
                          Visit my page
                          <span style={{ opacity: 0.7, fontSize: 13 }}>↗</span>
                        </Link>
                        <Link
                          href="/dashboard/studio"
                          className="w-full flex items-center justify-center gap-2 font-display font-black tracking-[-0.02em] transition-all active:scale-[0.98]"
                          style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.06)', color: '#F0EFF8', fontSize: 15, borderRadius: 0, border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
                        >
                          Edit my page
                        </Link>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
