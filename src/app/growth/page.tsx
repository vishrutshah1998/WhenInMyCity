'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { WimcLogo } from '@/components/WimcLogo'

const E = [0.22, 1, 0.36, 1] as const
const VP = { once: true, margin: '0px 0px -8% 0px' } as const

const fu = (delay = 0, y = 32) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: VP,
  transition: { duration: 0.72, ease: E, delay },
})

const STATS = [
  { value: '75–90%', numeric: null, label: 'Revenue to you — grows with tier', gradient: 'linear-gradient(135deg, #E8705A, #F5A800)' },
  { value: '₹0', numeric: null, label: 'Listing fee, forever', gradient: 'linear-gradient(135deg, #5DD9D0, #22D3EE)' },
  { value: '18', numeric: 18, suffix: '+', label: 'Tier-2 cities at launch', gradient: 'linear-gradient(135deg, #F5A800, #E8705A)' },
  { value: '3', numeric: 3, suffix: '', label: 'Sides of one community', gradient: 'linear-gradient(135deg, #9B8FFF, #5DD9D0)' },
]

const TIERS = [
  {
    num: '01', id: 'wanderer', name: 'Wanderer', story: 'I\'m exploring my city.',
    color: '#9896B0', bg: 'rgba(152,150,176,0.07)', border: 'rgba(152,150,176,0.15)', icon: 'explore',
    perks: ['Weekly digest curated to your taste', 'Save events & follow creators', 'Attendance streak & city leaderboard'],
    gate: 'Default on sign-up',
  },
  {
    num: '02', id: 'local', name: 'Local', story: 'I belong to this scene.',
    color: '#F5A800', bg: 'rgba(245,168,0,0.07)', border: 'rgba(245,168,0,0.2)', icon: 'home_pin',
    perks: ['Early access before public ticket sales', 'Local-only pricing at partner Addas', 'Streak freeze tokens — life happens'],
    gate: '6 events attended in 90 days',
  },
  {
    num: '03', id: 'lantern', name: 'Lantern', story: 'I bring people together.',
    color: '#5DD9D0', bg: 'rgba(93,217,208,0.07)', border: 'rgba(93,217,208,0.2)', icon: 'light_mode',
    perks: ['Lantern Studio: full creator toolkit', 'Platform fee drops from 10% → 8%', 'Priority placement when events go live'],
    gate: '3 events hosted, ≥4.5★ rating',
  },
  {
    num: '04', id: 'beacon', name: 'Beacon', story: 'My passion is my livelihood.',
    color: '#a855f7', bg: 'rgba(168,85,247,0.07)', border: 'rgba(168,85,247,0.22)', icon: 'workspace_premium',
    perks: ['Platform fee as low as 5%', 'Beacon Fund grants for ambitious events', 'Permanent Hall of Lights listing'],
    gate: '36 events hosted, ≥4.7★, ≥30% repeat',
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

/* ── Animated counter ── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.8 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1200
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(ease * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])

  return <span ref={ref}>{display}{suffix}</span>
}

/* ── Scissors ticket-cut divider ── */
function TicketCutDivider({ accentColor = '#F5A800' }: { accentColor?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.1'] })
  const scissorsLeft = useTransform(scrollYProgress, [0.05, 0.85], ['0%', '94%'])
  const topY = useTransform(scrollYProgress, [0.5, 0.95], ['0px', '-10px'])
  const botY = useTransform(scrollYProgress, [0.5, 0.95], ['0px', '10px'])

  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'relative', height: 56, overflow: 'visible', zIndex: 10 }}>
      <motion.div style={{ y: topY, position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          backgroundImage: `radial-gradient(circle, ${accentColor}55 5px, transparent 5px)`,
          backgroundSize: '18px 10px', backgroundRepeat: 'repeat-x', backgroundPosition: 'center',
        }} />
      </motion.div>
      <motion.div style={{ y: botY, position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          backgroundImage: `radial-gradient(circle, ${accentColor}33 5px, transparent 5px)`,
          backgroundSize: '18px 10px', backgroundRepeat: 'repeat-x', backgroundPosition: 'center',
        }} />
      </motion.div>
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
      <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accentColor}44` }}>
        TEAR HERE
      </div>
    </div>
  )
}

/* ── Ambient blob ── */
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

/* ── Tier progress path (scroll-linked) ── */
function TierProgressLine({ tierColors }: { tierColors: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] })
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <div ref={ref} className="hidden md:flex items-center justify-center gap-0 mt-6 relative">
      {/* animated progress track */}
      <div style={{ position: 'absolute', top: '50%', left: 12, right: 12, height: 1, background: 'rgba(255,255,255,0.06)', transform: 'translateY(-50%)' }} />
      <motion.div
        style={{
          position: 'absolute', top: '50%', left: 12, height: 1,
          right: 12, transformOrigin: 'left center', scaleX,
          background: `linear-gradient(90deg, ${tierColors.join(', ')})`,
          transform: 'translateY(-50%)',
          opacity: 0.4,
        }}
      />
      {tierColors.map((color, i) => (
        <div key={i} className="flex items-center" style={{ position: 'relative', zIndex: 1, flex: i < tierColors.length - 1 ? 1 : undefined }}>
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ background: color, flexShrink: 0 }}
            initial={{ scale: 0.4, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.6 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.4, ease: E, delay: i * 0.15 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function GrowthPage() {
  const heroRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLElement>(null)
  const tiersRef = useRef<HTMLElement>(null)

  /* hero parallax */
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], ['0px', '80px'])
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0.2])

  return (
    <div className="min-h-screen bg-[#07070A] text-[#F0EFF8] overflow-x-hidden">

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
        <Link href="/"><WimcLogo color="white" size="lg" /></Link>
        <div className="flex items-center gap-1">
          <Link href="/mission" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Mission</Link>
          <Link href="/explore" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#5C5A72] hover:text-[#9896B0] transition-colors">Explore</Link>
          <Link href="/growth" className="hidden md:flex items-center justify-center w-24 font-mono text-[10px] tracking-[0.15em] uppercase text-[#F0EFF8]">Growth</Link>
          <div className="w-4" />
          <Link href="/signin" className="px-5 py-2 font-mono text-[11px] font-bold tracking-[0.15em] uppercase bg-white text-[#07070A] hover:bg-[#E8E7F0] transition-colors" style={{ borderRadius: 0 }}>Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative z-10 px-6 pt-20 pb-20 md:px-14 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AmbientBlob color="#F5A800" top="10%" left="65%" width="380px" scrollRef={heroRef} />
        <AmbientBlob color="#5DD9D0" top="60%" left="15%" width="280px" scrollRef={heroRef} />
        <div className="max-w-7xl mx-auto relative">
          <motion.p
            className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] mb-6"
            style={{ color: '#5C5A72' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: E }}
          >
            HOW YOU GROW · COLLECTIBLE SERIES
          </motion.p>
          <motion.h1
            className="font-display font-black tracking-[-0.045em] leading-[0.88] text-white mb-6"
            style={{ fontSize: 'clamp(44px, 7vw, 96px)', y: heroY, opacity: heroOpacity }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: E, delay: 0.1 }}
          >
            Your path<br />through the city.
          </motion.h1>
          <motion.p
            className="text-[16px] leading-relaxed max-w-lg"
            style={{ color: '#9896B0' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: E, delay: 0.25 }}
          >
            Every WIMC member earns their place. The more you show up, the more the city opens up for you.
          </motion.p>
        </div>
      </section>

      <TicketCutDivider accentColor="#F5A800" />

      {/* Stats */}
      <section ref={statsRef} className="relative z-10 px-6 py-14 md:px-14 overflow-hidden" style={{ background: '#07070A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AmbientBlob color="#9B8FFF" top="0%" left="50%" width="450px" scrollRef={statsRef} />
        <div className="max-w-7xl mx-auto relative">
          <motion.div className="flex items-center gap-4 mb-10" {...fu(0)}>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#5C5A72]">WIMC · INDIA SERIES · ISSUE 001</span>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                className="relative p-7 md:p-9"
                style={{ background: '#07070A', textAlign: 'center' }}
                initial={{ opacity: 0, y: 28, scale: 0.92 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={VP}
                transition={{ duration: 0.65, ease: E, delay: i * 0.09 }}
              >
                <CornerMarks />
                <div style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5C5A72', marginBottom: 12 }}>INDIA</div>
                <div className="font-display font-black leading-none mb-3" style={{ fontSize: 'clamp(38px, 4vw, 58px)', backgroundImage: s.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {s.numeric !== null
                    ? <AnimatedCounter target={s.numeric} suffix={s.suffix} />
                    : s.value
                  }
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />
                <div className="text-[11px] font-medium leading-snug" style={{ color: '#9896B0' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TicketCutDivider accentColor="#5DD9D0" />

      {/* Tiers */}
      <section ref={tiersRef} className="relative z-10 px-6 py-20 md:px-14 overflow-hidden" style={{ background: '#06060A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AmbientBlob color="#a855f7" top="30%" left="75%" width="360px" scrollRef={tiersRef} />
        <div className="max-w-7xl mx-auto relative">

          <motion.div className="mb-14" {...fu(0)}>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: '#5C5A72' }}>THE FOUR TIERS</p>
            <p className="text-[14px] leading-relaxed max-w-lg" style={{ color: '#9896B0' }}>
              Tiers are earned by showing up — attending events, hosting shows, building community. Every tier earned, never bought.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-4">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.id}
                className="relative flex flex-col overflow-hidden"
                style={{ border: `1px solid ${tier.border}`, background: '#07070A' }}
                /* stamp impression */
                initial={{ opacity: 0, y: 40, scale: 0.88, rotate: i % 2 === 0 ? -1.5 : 1.5, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.85, ease: E, delay: i * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.22, ease: 'easeOut' } }}
              >
                <CornerMarks />

                {/* top accent stripe grows in */}
                <motion.div
                  style={{ position: 'absolute', top: 0, left: 0, height: 2, background: tier.color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: '50%' }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, ease: E, delay: i * 0.1 + 0.35 }}
                />

                <div className="flex items-center justify-between px-4 pt-3 pb-3" style={{ borderBottom: `1px solid ${tier.border}`, background: `${tier.color}08` }}>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: tier.color }}>{tier.num}</span>
                  <div className="w-7 h-7 flex items-center justify-center" style={{ background: tier.bg }}>
                    <span className="material-symbols-outlined" style={{ color: tier.color, fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>{tier.icon}</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div>
                    <h3 className="font-display font-black text-white tracking-tight leading-none mb-2" style={{ fontSize: 'clamp(22px, 2.5vw, 30px)' }}>{tier.name}</h3>
                    <p className="text-[11px] italic" style={{ color: tier.color, opacity: 0.85 }}>&ldquo;{tier.story}&rdquo;</p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-[12px]" style={{ color: '#9896B0' }}>
                        <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: tier.color }} />{perk}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-3 flex items-center gap-2" style={{ borderTop: `1px solid ${tier.border}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#5C5A72' }}>{i === 0 ? 'radio_button_checked' : 'lock'}</span>
                    <span className="font-mono text-[10px] font-medium" style={{ color: '#5C5A72' }}>{tier.gate}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <TierProgressLine tierColors={TIERS.map((t) => t.color)} />
          <p className="hidden md:block text-center font-mono text-[10px] mt-3 tracking-widest uppercase" style={{ color: '#5C5A72' }}>
            Every tier earned — never bought.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 md:px-14">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <motion.div {...fu(0)}>
            <h2 className="font-display font-black tracking-[-0.04em] text-white leading-[0.9]" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
              Start earning<br />your place.
            </h2>
          </motion.div>
          <motion.div className="flex flex-col gap-3" {...fu(0.1)}>
            <Link href="/signin?next=/onboarding/screen-1" className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold tracking-wide text-[#07070A] bg-white hover:bg-[#E8E7F0] transition-colors" style={{ borderRadius: 0 }}>
              Join for free <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
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
          <WimcLogo color="white" size="sm" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2" style={{ color: '#5C5A72' }}>
            <Link href="/explore" className="font-mono text-[10px] tracking-[0.15em] uppercase hover:text-[#9896B0] transition-colors">Explore</Link>
            <Link href="/mission" className="font-mono text-[10px] tracking-[0.15em] uppercase hover:text-[#9896B0] transition-colors">Mission</Link>
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
