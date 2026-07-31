'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// Auto-flipping showcase inside Card 2 — cycles Creator / Venue / Brand example pages
// every 2.6s (per the mobile design handoff), pausing while the user scrolls a preview's
// own content. Imagery uses initials/icon placeholders (no hotlinked photos), matching the
// precedent already shipped in desktop's ShrutiPhoneMockup (src/app/page.tsx).

const AUTO_MS = 2600
const RESUME_MS = 3000

// ── Small shared presentational primitives (local to this file — only used here) ──

function Avatar({ initials, ring, size = 46, fontSize = 18, radius = '50%' }: { initials: string; ring: string; size?: number; fontSize?: number; radius?: string | number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, border: `2px solid ${ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-dm-serif), serif', fontSize, color: ring, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function IconChip({ icon, color }: { icon: string; color: string }) {
  return (
    <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 11, color }}>{icon}</span>
    </div>
  )
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontFamily: 'monospace', fontSize: 6.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 14, color, background: bg }}>{label}</span>
}

function PBlock({ eyebrow, children, bg }: { eyebrow: string; children: React.ReactNode; bg: string }) {
  return (
    <div style={{ borderRadius: 10, padding: '9px 11px', width: '100%', background: bg }}>
      <div style={{ fontFamily: 'monospace', fontSize: 6, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 4 }}>{eyebrow}</div>
      {children}
    </div>
  )
}

function EventRow({ month, day, title, sub, accent, bg }: { month: string; day: string; title: string; sub: string; accent: string; bg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: 5, borderRadius: 7, background: bg }}>
      <div style={{ fontFamily: 'monospace', fontSize: 6, fontWeight: 700, textAlign: 'center', padding: '2px 5px', borderRadius: 4, lineHeight: 1.2, background: `${accent}22`, color: accent }}>{month}<br />{day}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 8, display: 'block' }}>{title}</b>
        <span style={{ fontSize: 6.5, opacity: 0.75 }}>{sub}</span>
      </div>
    </div>
  )
}

function IconTileRow({ icon, color, n = 3 }: { icon: string; color: string; n?: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: `${color}90` }}>{icon}</span>
        </div>
      ))}
    </div>
  )
}

function Stat3({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex' }}>
      {stats.map((s) => (
        <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
          <b style={{ fontSize: 14, display: 'block' }}>{s.value}</b>
          <span style={{ fontFamily: 'monospace', fontSize: 6, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.6 }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function PressRow({ outlets, color }: { outlets: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
      {outlets.map((o) => (
        <span key={o} style={{ fontFamily: 'monospace', fontSize: 6, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.6, color }}>{o}</span>
      ))}
    </div>
  )
}

function CtaLink({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 9, fontSize: 9.5, fontWeight: 700, width: '100%', background: bg, color }}>
      {label} <span>→</span>
    </div>
  )
}

const bodyWrap: React.CSSProperties = { padding: '34px 14px 16px', display: 'flex', flexDirection: 'column', gap: 9, height: '100%', overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y' }
const headWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }

// ── Persona 1 — Creator ──────────────────────────────────────────────────

function CreatorPersonaBody() {
  const gold = '#F5A800'
  return (
    <div style={{ ...bodyWrap, background: '#1A1108', color: '#F7F2E8' }}>
      <div style={headWrap}>
        <Avatar initials="DA" ring={gold} />
        <div style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 16, marginTop: 7 }}>Dev Anandwala</div>
        <div style={{ fontSize: 9, opacity: 0.4, marginTop: 6, lineHeight: 1.4 }}>Stand-up. Mostly true stories about weddings.</div>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.35, marginTop: 4 }}>CREATOR · COMEDY &amp; THEATRE</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge label="✓ Verified" color={gold} bg={`${gold}22`} />
          <Badge label="Growth tier" color="#F7F2E8" bg="rgba(255,255,255,0.08)" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <IconChip icon="photo_camera" color="#E4405F" />
        <IconChip icon="play_circle" color="#FA243C" />
        <IconChip icon="language" color="#F7F2E8" />
      </div>
      <PBlock eyebrow="Text / bio" bg="#241708">
        <p style={{ fontSize: 9, opacity: 0.8, lineHeight: 1.4 }}>Five years on stages from Baroda to Bangalore. If you&apos;ve survived a big fat wedding, you&apos;re basically my co-writer.</p>
      </PBlock>
      <PBlock eyebrow="Announcement" bg="#241708">
        <h4 style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>&quot;Arranged&quot; — new hour, live</h4>
        <p style={{ fontSize: 8.5, opacity: 0.8 }}>Copper &amp; Canvas · Sep 20 · tickets moving fast</p>
      </PBlock>
      <PBlock eyebrow="Video" bg="#241708">
        <IconTileRow icon="play_circle" color={gold} n={1} />
        <p style={{ fontSize: 8.5, opacity: 0.8, marginTop: 4 }}>&quot;The Rishta Aunty Cinematic Universe&quot; — 240k views</p>
      </PBlock>
      <PBlock eyebrow="Event calendar" bg="#241708">
        <EventRow month="SEP" day="20" title="&quot;Arranged&quot; — new hour" sub="Copper & Canvas · ₹599" accent={gold} bg="#0F0A04" />
        <EventRow month="OCT" day="05" title="Open Mic Night" sub="The Proscenium · Free" accent={gold} bg="#0F0A04" />
      </PBlock>
      <PBlock eyebrow="Past events" bg="#241708">
        <IconTileRow icon="photo_library" color={gold} />
        <p style={{ fontSize: 8.5, opacity: 0.8, marginTop: 5 }}>Sold-out run at The Proscenium, Aug 2026</p>
      </PBlock>
      <PBlock eyebrow="Testimonials" bg="#241708">
        <div style={{ color: gold, fontSize: 8, marginBottom: 2 }}>★★★★★</div>
        <p style={{ fontSize: 8.5, opacity: 0.8 }}>&quot;Haven&apos;t laughed like that since college.&quot; — Priya R.</p>
      </PBlock>
      <PBlock eyebrow="Support / tip jar" bg="#241708">
        <p style={{ fontSize: 8.5, opacity: 0.8, marginBottom: 3 }}>Enjoyed the set?</p>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 7, fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, background: `${gold}15`, color: gold }}>₹50</div>
          <div style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 7, fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, background: `${gold}15`, color: gold }}>₹100</div>
          <div style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 7, fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, background: gold, color: '#1A1108' }}>₹200</div>
        </div>
      </PBlock>
      <PBlock eyebrow="Press feature" bg="#241708">
        <PressRow outlets={['Ahmedabad Mirror', 'Scoopwhoop']} color="#F7F2E8" />
      </PBlock>
      <CtaLink label="Book Dev for your event" bg={gold} color="#1A1108" />
    </div>
  )
}

// ── Persona 2 — Venue ────────────────────────────────────────────────────

function VenuePersonaBody() {
  const ink = '#1A1A1A'
  return (
    <div style={{ ...bodyWrap, background: '#FAFAFA', color: ink }}>
      <div style={headWrap}>
        <Avatar initials="KLG" ring={ink} radius={12} size={56} fontSize={14} />
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 7 }}>Kabir Lane Gallery</div>
        <div style={{ fontSize: 9, opacity: 0.75, marginTop: 6, lineHeight: 1.4, maxWidth: 200 }}>White walls, natural light, one show at a time.</div>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5, marginTop: 4 }}>VENUE · GALLERY</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge label="✓ Verified venue" color={ink} bg={`${ink}0D`} />
          <Badge label="Capacity 60" color="#4A4A4A" bg="rgba(0,0,0,0.06)" />
        </div>
      </div>
      <PBlock eyebrow="Photo gallery" bg="#F0F0F0">
        <IconTileRow icon="image" color={ink} />
      </PBlock>
      <PBlock eyebrow="Text / bio" bg="#F0F0F0">
        <p style={{ fontSize: 8.5, opacity: 0.8, lineHeight: 1.4 }}>A converted textile warehouse turned café-gallery hybrid. Exposed brick, one wall of natural light, and a rotating solo show every six weeks.</p>
      </PBlock>
      <PBlock eyebrow="Community stats" bg="#F0F0F0">
        <Stat3 stats={[{ value: '52', label: 'Events hosted' }, { value: '3.1k', label: 'Attendees' }, { value: '4.8★', label: 'Avg rating' }]} />
      </PBlock>
      <PBlock eyebrow="Event calendar" bg="#F0F0F0">
        <EventRow month="SEP" day="20" title="&quot;Arranged&quot; — Dev Anandwala" sub="Hosted here · ₹599" accent={ink} bg="#FFFFFF" />
        <EventRow month="OCT" day="02" title="Clay Workshop II" sub="₹450 · 12 seats" accent={ink} bg="#FFFFFF" />
      </PBlock>
      <PBlock eyebrow="Past events" bg="#F0F0F0">
        <h4 style={{ fontSize: 10, fontWeight: 700 }}>&quot;Fragments&quot; — solo show</h4>
        <p style={{ fontSize: 8.5, opacity: 0.8 }}>Closed Aug 2026 · 400+ visitors</p>
      </PBlock>
      <PBlock eyebrow="Instagram feed" bg="#F0F0F0">
        <IconTileRow icon="photo_camera" color={ink} />
        <p style={{ fontSize: 8.5, opacity: 0.8, marginTop: 5 }}>@kabirlanegallery · updated daily</p>
      </PBlock>
      <PBlock eyebrow="Testimonials" bg="#F0F0F0">
        <div style={{ color: ink, fontSize: 8, marginBottom: 2 }}>★★★★★</div>
        <p style={{ fontSize: 8.5, opacity: 0.8 }}>&quot;The lighting made our opening night look like a magazine shoot.&quot; — House of Kalkki</p>
      </PBlock>
      <PBlock eyebrow="Press feature" bg="#F0F0F0">
        <PressRow outlets={['Architectural Digest India', 'Homegrown']} color={ink} />
      </PBlock>
      <PBlock eyebrow="Waitlist" bg="#F0F0F0">
        <p style={{ fontSize: 8.5, opacity: 0.8, marginBottom: 3 }}>Private hire books out fast.</p>
        <CtaLink label="Join the private-hire waitlist" bg={`${ink}0D`} color={ink} />
      </PBlock>
      <CtaLink label="Propose an event here" bg={ink} color="#FAFAFA" />
    </div>
  )
}

// ── Persona 3 — Brand ────────────────────────────────────────────────────

function BrandPersonaBody() {
  const cyan = '#22D3EE'
  const indigo = '#818CF8'
  return (
    <div style={{ ...bodyWrap, background: '#080812', color: '#E8E8FF', position: 'relative' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: cyan, opacity: 0.16, filter: 'blur(38px)', top: -40, right: -40 }} />
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: indigo, opacity: 0.14, filter: 'blur(38px)', bottom: -30, left: -30 }} />
      </div>
      <div style={{ ...headWrap, position: 'relative', zIndex: 1 }}>
        <Avatar initials="C" ring={cyan} radius={14} size={56} fontSize={20} />
        <div className="font-space-grotesk" style={{ fontSize: 18, fontWeight: 700, marginTop: 7 }}>Circuit</div>
        <div style={{ fontSize: 9, opacity: 0.75, marginTop: 6, lineHeight: 1.4, maxWidth: 200 }}>Mobility for the cities that don&apos;t have enough of it yet.</div>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5, marginTop: 4 }}>BRAND · STARTUP</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge label="✓ Verified brand" color={cyan} bg={`${cyan}22`} />
          <Badge label="4 cities live" color="#E8E8FF" bg="rgba(255,255,255,0.08)" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <IconChip icon="photo_camera" color={cyan} />
        <IconChip icon="play_circle" color="#E8E8FF" />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <PBlock eyebrow="Text / bio" bg="#0F0F22">
          <p style={{ fontSize: 8.5, opacity: 0.8, lineHeight: 1.4 }}>We fund the last mile between &quot;I want to go&quot; and &quot;I showed up&quot; — starting with free rides to the events Tier-2 India actually cares about.</p>
        </PBlock>
        <PBlock eyebrow="Announcement" bg="#0F0F22">
          <h4 style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Launching in Ahmedabad — Sep 2026</h4>
          <p style={{ fontSize: 8.5, opacity: 0.8 }}>Free rides to our first 10 partner venues</p>
        </PBlock>
        <PBlock eyebrow="White-label event" bg="#0F0F22">
          <h4 style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Circuit x WIMC: Launch Night</h4>
          <p style={{ fontSize: 8.5, opacity: 0.8 }}>Skyline Social · Sep 14 · presented by Circuit</p>
        </PBlock>
        <PBlock eyebrow="Stats grid" bg="#0F0F22">
          <Stat3 stats={[{ value: '12k', label: 'Rides given' }, { value: '4', label: 'Cities live' }, { value: '19', label: 'Venues partnered' }]} />
        </PBlock>
        <PBlock eyebrow="Photo gallery" bg="#0F0F22">
          <IconTileRow icon="directions_car" color={cyan} />
        </PBlock>
        <PBlock eyebrow="Press feature" bg="#0F0F22">
          <PressRow outlets={['YourStory', 'Inc42']} color="#E8E8FF" />
        </PBlock>
        <PBlock eyebrow="Collab invite" bg="#0F0F22">
          <h4 style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Venues, get listed as a Circuit stop</h4>
          <p style={{ fontSize: 8.5, opacity: 0.8 }}>Free foot traffic from every ride we fund</p>
        </PBlock>
        <PBlock eyebrow="Newsletter signup" bg="#0F0F22">
          <p style={{ fontSize: 8.5, opacity: 0.8, marginBottom: 4 }}>Get notified when Circuit launches in your city.</p>
          <CtaLink label="Notify me" bg={`${cyan}22`} color={cyan} />
        </PBlock>
        <CtaLink label="Download partnership deck" bg={cyan} color="#080812" />
      </div>
    </div>
  )
}

// ── Flip carousel shell ──────────────────────────────────────────────────

const PERSONAS = [CreatorPersonaBody, VenuePersonaBody, BrandPersonaBody]
const LABELS = ['CREATOR', 'VENUE', 'BRAND']

export function PersonaShowcasePhone() {
  const [current, setCurrent] = useState(0)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => setCurrent((c) => (c + 1) % PERSONAS.length), AUTO_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function pause() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => {
      intervalRef.current = setInterval(() => setCurrent((c) => (c + 1) % PERSONAS.length), AUTO_MS)
    }, RESUME_MS)
  }

  return (
    <div style={{ position: 'relative', width: 250, height: 380, margin: '14px auto 26px', perspective: 1300 }}>
      {PERSONAS.map((Persona, i) => {
        const n = PERSONAS.length
        const isShow = i === current
        const isPrev = i === (current - 1 + n) % n
        const rotateY = isShow ? 0 : isPrev ? -130 : 130
        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ rotateY, opacity: isShow ? 1 : 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute', inset: 0, borderRadius: 38, overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.14)',
              boxShadow: '0 20px 42px rgba(32,26,18,0.38), inset 0 0 0 1px rgba(255,255,255,0.04)',
              zIndex: isShow ? 3 : isPrev ? 1 : 2,
              pointerEvents: isShow ? 'auto' : 'none',
              backfaceVisibility: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 72, height: 20, background: '#000', borderRadius: 11, zIndex: 5 }} />
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', zIndex: 5, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>
              {LABELS[i]}
            </div>
            <div
              style={{ height: '100%' }}
              onWheelCapture={(e) => { e.stopPropagation(); pause() }}
              onTouchStartCapture={(e) => { e.stopPropagation(); pause() }}
              onTouchMoveCapture={(e) => { e.stopPropagation(); pause() }}
              onScrollCapture={() => pause()}
            >
              <Persona />
            </div>
          </motion.div>
        )
      })}

      <div style={{ position: 'absolute', bottom: -18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
        {PERSONAS.map((_, i) => (
          <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i === current ? '#FF6B35' : 'rgba(32,26,18,0.18)', transform: i === current ? 'scale(1.3)' : 'none', transition: 'background 0.25s, transform 0.25s' }} />
        ))}
      </div>
    </div>
  )
}
