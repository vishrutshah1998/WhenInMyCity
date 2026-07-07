'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView } from 'framer-motion'
import { WimcWordmark } from '@/components/WimcWordmark'

const E = [0.22, 1, 0.36, 1] as const
const VP = { once: true, margin: '0px 0px -8% 0px' } as const

const fu = (delay = 0, y = 32) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: VP,
  transition: { duration: 0.72, ease: E, delay },
})

const MISSION_ROWS = [
  { prefix: 'A platform for building', word: 'SAFE SPACES.', color: '#4ADE80', bg: 'rgba(74,222,128,0.10)' },
  { prefix: 'A platform for building', word: 'INCLUSIVE COMMUNITIES.', color: '#93B4FF', bg: 'rgba(99,149,255,0.10)' },
  { prefix: 'A platform for building', word: 'SECOND HOMES.', color: '#F5C842', bg: 'rgba(245,200,66,0.12)' },
]

const PILLARS = [
  {
    num: '01', label: 'Makers', color: '#E8705A', bg: 'rgba(232,112,90,0.07)', icon: 'mic',
    desc: 'Musicians, comedians, artists, pottery teachers — anyone who creates live experiences and wants an audience for them.',
  },
  {
    num: '02', label: 'Venues', color: '#5DD9D0', bg: 'rgba(93,217,208,0.07)', icon: 'storefront',
    desc: 'Café backrooms, rooftops, studios, galleries — spaces with character that want to host culture, not just coffee.',
  },
  {
    num: '03', label: 'Community', color: '#F5A800', bg: 'rgba(245,168,0,0.07)', icon: 'groups',
    desc: 'Explorers, regulars, first-timers — the city itself, discovering events and building the audience every creator needs.',
  },
]

function CornerMarks() {
  const base = { position: 'absolute' as const, width: 12, height: 12 }
  const c = '1px solid rgba(255,255,255,0.22)'
  return (
    <>
      <span aria-hidden="true" style={{ ...base, top: 8, left: 8, borderTop: c, borderLeft: c }} />
      <span aria-hidden="true" style={{ ...base, top: 8, right: 8, borderTop: c, borderRight: c }} />
      <span aria-hidden="true" style={{ ...base, bottom: 8, left: 8, borderBottom: c, borderLeft: c }} />
      <span aria-hidden="true" style={{ ...base, bottom: 8, right: 8, borderBottom: c, borderRight: c }} />
    </>
  )
}

/* ── Scissors ticket-cut divider ── */
function TicketCutDivider({ accentColor = '#F5C842' }: { accentColor?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.1'] })
  const scissorsLeft = useTransform(scrollYProgress, [0.05, 0.85], ['0%', '94%'])
  const topY = useTransform(scrollYProgress, [0.5, 0.95], ['0px', '-10px'])
  const botY = useTransform(scrollYProgress, [0.5, 0.95], ['0px', '10px'])

  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'relative', height: 56, overflow: 'visible', zIndex: 10, margin: '0 0' }}>
      {/* top half */}
      <motion.div style={{ y: topY, position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          backgroundImage: `radial-gradient(circle, ${accentColor}55 5px, transparent 5px)`,
          backgroundSize: '18px 10px', backgroundRepeat: 'repeat-x', backgroundPosition: 'center',
        }} />
      </motion.div>
      {/* bottom half */}
      <motion.div style={{ y: botY, position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          backgroundImage: `radial-gradient(circle, ${accentColor}33 5px, transparent 5px)`,
          backgroundSize: '18px 10px', backgroundRepeat: 'repeat-x', backgroundPosition: 'center',
        }} />
      </motion.div>
      {/* scissors */}
      <motion.div
        style={{
          position: 'absolute', top: '50%', left: scissorsLeft,
          transform: 'translateY(-50%)',
          zIndex: 20,
        }}
      >
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none" style={{ display: 'block', filter: `drop-shadow(0 0 5px ${accentColor}88)` }}>
          <circle cx="6" cy="6" r="4.5" stroke={accentColor} strokeWidth="1.5" fill="none" />
          <circle cx="6" cy="14" r="4.5" stroke={accentColor} strokeWidth="1.5" fill="none" />
          <line x1="10" y1="8" x2="26" y2="2" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="12" x2="26" y2="18" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.div>
      {/* "TEAR HERE" label */}
      <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accentColor}44` }}>
        TEAR HERE
      </div>
    </div>
  )
}

/* ── Ambient blob parallax ── */
function AmbientBlob({ color, top, left, width, scrollRef }: { color: string; top: string; left: string; width: string; scrollRef: React.RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-30px', '30px'])
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute', top, left, width, aspectRatio: '1',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        borderRadius: '50%', filter: 'blur(60px)', opacity: 0.08, pointerEvents: 'none', y,
      }}
    />
  )
}

export default function MissionPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const whyRef = useRef<HTMLElement>(null)
  const pillarsRef = useRef<HTMLElement>(null)

  /* hero heading parallax */
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], ['0px', '80px'])
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0.2])

  return (
    <div ref={pageRef} className="min-h-screen bg-[#07070A] text-[#F0EFF8] overflow-x-hidden">

      {/* Noise grain */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none select-none opacity-[0.028]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-3 md:px-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,10,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', position: 'sticky', top: 0 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}><WimcWordmark color="white" height={30} /></Link>
        <div className="flex items-center gap-1">
          <Link href="/mission" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#F0EFF8]">Mission</Link>
          <Link href="/explore" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Explore</Link>
          <Link href="/growth" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Growth</Link>
          <div className="w-4" />
          <Link href="/signin" className="px-5 py-2 font-mono text-[11px] font-bold tracking-[0.15em] uppercase bg-white text-[#07070A] hover:bg-[#E8E7F0] transition-colors" style={{ borderRadius: 0 }}>Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative z-10 px-6 pt-20 pb-24 md:px-14 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AmbientBlob color="#4ADE80" top="10%" left="60%" width="400px" scrollRef={heroRef} />
        <AmbientBlob color="#93B4FF" top="50%" left="20%" width="300px" scrollRef={heroRef} />
        <div className="max-w-7xl mx-auto relative">
          <motion.p
            className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] mb-6"
            style={{ color: '#5C5A72' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: E }}
          >
            OUR MISSION · ISSUED BY WIMC
          </motion.p>
          <motion.h1
            className="font-display font-black tracking-[-0.045em] leading-[0.88] text-white mb-12"
            style={{ fontSize: 'clamp(44px, 7vw, 96px)', y: heroY, opacity: heroOpacity }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: E, delay: 0.1 }}
          >
            Culture belongs<br />to everyone.
          </motion.h1>

          <div className="space-y-3 max-w-4xl">
            {MISSION_ROWS.map((row, i) => (
              <motion.div
                key={i}
                className="flex flex-wrap items-stretch gap-x-2 gap-y-2"
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: E, delay: 0.2 + i * 0.12 }}
              >
                <div className="flex items-center px-4 py-3 md:px-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="font-display font-bold text-[#9896B0]" style={{ fontSize: 'clamp(15px, 2.6vw, 26px)', letterSpacing: '-0.02em' }}>{row.prefix}</span>
                </div>
                <motion.div
                  className="flex items-center px-4 py-3 md:px-6"
                  style={{ background: row.bg }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="font-display font-black" style={{ fontSize: 'clamp(15px, 2.6vw, 26px)', letterSpacing: '-0.02em', color: row.color }}>{row.word}</span>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.p className="mt-10 text-[15px] leading-relaxed max-w-xl" style={{ color: '#9896B0' }} {...fu(0.5, 16)}>
            Every creator, Venue, and explorer in{' '}
            <span style={{ color: '#F5C842', fontWeight: 600 }}>OURCITY</span>
            {' '}is on their own unique path to becoming a City Zen™.
          </motion.p>
        </div>
      </section>

      <TicketCutDivider accentColor="#4ADE80" />

      {/* Why we built this */}
      <section ref={whyRef} className="relative z-10 px-6 py-20 md:px-14 overflow-hidden" style={{ background: '#05050A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AmbientBlob color="#F5C842" top="0%" left="70%" width="350px" scrollRef={whyRef} />
        <div className="max-w-7xl mx-auto relative">
          <motion.p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] mb-8" style={{ color: '#5C5A72' }} {...fu(0)}>
            WHY WE BUILT THIS
          </motion.p>

          {/* Scroll-linked ticket stamp */}
          <motion.div
            className="absolute right-0 top-0 hidden md:flex flex-col items-center justify-center"
            style={{ width: 100, height: 100 }}
            initial={{ opacity: 0, rotate: -12, scale: 0.7 }}
            whileInView={{ opacity: 0.18, rotate: -8, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, ease: E }}
          >
            <div style={{ width: 90, height: 90, border: '2.5px solid #F5C842', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', color: '#F5C842', textTransform: 'uppercase' }}>WIMC</span>
              <span style={{ fontFamily: 'monospace', fontSize: 6, fontWeight: 700, letterSpacing: '0.12em', color: '#F5C842', textTransform: 'uppercase' }}>INDIA</span>
              <span style={{ fontFamily: 'monospace', fontSize: 5, fontWeight: 700, letterSpacing: '0.12em', color: '#F5C842', textTransform: 'uppercase' }}>2025</span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 md:gap-20">
            <motion.div {...fu(0.05)}>
              <p className="text-[16px] leading-loose" style={{ color: '#9896B0' }}>
                India&apos;s Tier-2 cities are full of extraordinary creative talent —
                musicians performing in living rooms, comedians doing 30-seat shows,
                artists teaching pottery out of borrowed studio space.
              </p>
            </motion.div>
            <motion.div {...fu(0.15)}>
              <p className="text-[16px] leading-loose" style={{ color: '#9896B0' }}>
                The infrastructure to connect these creators with their cities simply
                didn&apos;t exist. No discovery, no ticketing, no professional home.
                WIMC is that infrastructure — built for the places that need it most.
              </p>
            </motion.div>
          </div>

          {/* Animated stat row */}
          <motion.div
            className="mt-14 grid grid-cols-3 gap-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: E, delay: 0.2 }}
          >
            {[
              { val: '₹0', lbl: 'to list your first event' },
              { val: '18+', lbl: 'Tier-2 cities at launch' },
              { val: '100%', lbl: 'community-built' },
            ].map((item, i) => (
              <div key={item.lbl} className="p-5 text-center" style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : undefined }}>
                <div className="font-display font-black text-white mb-1" style={{ fontSize: 'clamp(22px, 3vw, 34px)', letterSpacing: '-0.03em' }}>{item.val}</div>
                <div className="font-mono text-[10px]" style={{ color: '#5C5A72', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.lbl}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <TicketCutDivider accentColor="#93B4FF" />

      {/* Three Pillars */}
      <section ref={pillarsRef} className="relative z-10 px-6 py-20 md:px-14 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AmbientBlob color="#E8705A" top="20%" left="80%" width="400px" scrollRef={pillarsRef} />
        <div className="max-w-7xl mx-auto relative">
          <motion.p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] mb-12" style={{ color: '#5C5A72' }} {...fu(0, 16)}>
            THE PLATFORM FOR
          </motion.p>
          <div className="grid md:grid-cols-3 gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.num}
                className="relative p-8 md:p-10 flex flex-col"
                style={{ background: '#07070A', border: `1px solid ${p.color}20` }}
                /* stamp impression: scale up from 88%, rotate in, lose blur */
                initial={{ opacity: 0, y: 36, scale: 0.88, rotate: -1.5, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.8, ease: E, delay: i * 0.12 }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
              >
                <CornerMarks />

                {/* Animated accent line grows in on view */}
                <motion.div
                  style={{ position: 'absolute', top: 0, left: 0, height: 2, background: p.color, borderRadius: '0 2px 2px 0' }}
                  initial={{ width: 0 }}
                  whileInView={{ width: '40%' }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.7, ease: E, delay: i * 0.12 + 0.3 }}
                />

                <div className="flex items-start justify-between mb-8">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: p.color }}>{p.num}</span>
                  <div className="w-8 h-8 flex items-center justify-center" style={{ background: p.bg }}>
                    <span className="material-symbols-outlined" style={{ color: p.color, fontSize: '16px' }}>{p.icon}</span>
                  </div>
                </div>
                <h3 className="font-display font-black text-white tracking-tight mb-4" style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}>{p.label}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#9896B0' }}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.p className="mt-10 text-[13px] leading-relaxed max-w-2xl" style={{ color: '#9896B0' }} {...fu(0.1, 20)}>
            When makers find venues and communities show up — that&apos;s when a city stops being a place you live in and starts being a place you belong to.
          </motion.p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 md:px-14">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <motion.div {...fu(0)}>
            <h2 className="font-display font-black tracking-[-0.04em] text-white leading-[0.9]" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
              Ready to build<br />your city?
            </h2>
          </motion.div>
          <motion.div className="flex flex-col gap-3" {...fu(0.1)}>
            <Link href="/signin?next=/onboarding" className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold tracking-wide text-[#07070A] bg-white hover:bg-[#E8E7F0] transition-colors" style={{ borderRadius: 0 }}>
              Start for free <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            </Link>
            <Link href="/" className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">
              ← Back to home
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 md:px-14" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <WimcWordmark color="white" height={22} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2" style={{ color: '#5C5A72' }}>
            <Link href="/explore" className="font-mono text-[10px] tracking-[0.15em] uppercase hover:text-[#9896B0] transition-colors">Explore</Link>
            <Link href="/growth" className="font-mono text-[10px] tracking-[0.15em] uppercase hover:text-[#9896B0] transition-colors">Growth</Link>
            <Link href="/signin" className="font-mono text-[10px] tracking-[0.15em] uppercase hover:text-[#9896B0] transition-colors">Sign in</Link>
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase">© 2025 WIMC</span>
          </div>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
