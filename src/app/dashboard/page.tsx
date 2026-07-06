'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, Event } from '@/types/database'
import PostComposer from '@/components/dashboard/PostComposer'
import { deletePost, type CreatorPost } from '@/app/actions/posts'
import { getPayableEvents } from '@/app/actions/payouts'
import { profileUrl } from '@/lib/profile-url'
import { TIER_THRESHOLDS } from '@/lib/constants/interests'
import PersonaSwitcherPills from '@/components/PersonaSwitcherPills'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookingRequest {
  id: string
  event_title: string
  status: string
  proposed_date: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MARQUEE_TEXT = 'ADMIT ONE // CREATOR COMMAND // CITY VERIFIED // DISCOVER THE UNDERGROUND // WIMC // LOCAL FIRST // '

const BOARD_CSS = `
@keyframes board-marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.board-marquee { animation: board-marquee 22s linear infinite; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`

// Perforated divider used on ticket/boarding-pass cards
const PERF_STYLE: React.CSSProperties = {
  width: 1,
  flexShrink: 0,
  background: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, rgba(26,39,68,0.18) 4px, rgba(26,39,68,0.18) 8px)',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    day:   d.getDate().toString(),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year:  d.getFullYear().toString(),
  }
}

// Compact rupee display for headline stat — matches the paise() format in payouts pages.
function formatPaiseCompact(p: number): string {
  const r = p / 100
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`
  if (r >= 1000)   return `₹${(r / 1000).toFixed(1)}k`
  return '₹' + Math.round(r).toLocaleString('en-IN')
}

function formatPaiseFull(p: number): string {
  return '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── PaperCard ─────────────────────────────────────────────────────────────────

function PaperCard({ children, style, accent }: {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
}) {
  return (
    <div style={{
      background: '#FEFCF8',
      border: '1px solid var(--wimc-coral-dim)',
      borderTop: accent ? `3px solid ${accent}` : '3px solid rgba(232,112,90,0.22)',
      borderRadius: 0,
      boxShadow: '0 2px 8px rgba(26,39,68,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── EventTicket ───────────────────────────────────────────────────────────────
// Inspired by: stamp perforations, concert ticket stubs

function EventTicket({ ev, soldCount = 0 }: { ev: Event; soldCount?: number }) {
  const { day, month, year } = fmtDate(ev.starts_at)
  return (
    <Link
      href={`/dashboard/events/${ev.id}/manage`}
      style={{ display: 'flex', textDecoration: 'none', borderBottom: '1px solid rgba(26,39,68,0.07)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(26,39,68,0.02)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      {/* Left date stamp — coral */}
      <div style={{
        width: 64, flexShrink: 0, background: '#E8705A',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px 8px',
      }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1, fontFamily: 'var(--font-syne)' }}>{day}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: 1, marginTop: 2 }}>{month}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 1 }}>{year}</span>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1A2744', fontFamily: 'var(--font-dm-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {ev.title}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(26,39,68,0.45)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📍 {ev.venue_name}
        </p>
      </div>

      {/* Perforated divider */}
      <div style={PERF_STYLE} />

      {/* Stub — ticket count */}
      <div style={{
        width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '14px 10px',
        background: 'rgba(26,39,68,0.025)',
      }}>
        <span style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', marginBottom: 4 }}>SOLD</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#E8705A', fontFamily: 'var(--font-syne)', lineHeight: 1 }}>
          {soldCount}{ev.capacity ? `/${ev.capacity}` : ''}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'rgba(26,39,68,0.25)', marginTop: 4 }}>chevron_right</span>
      </div>
    </Link>
  )
}

// ── BoardingPass ──────────────────────────────────────────────────────────────
// Inspired by: Traverse boarding pass, airline ticket aesthetic

function BoardingPass({ req, idx, onAccept, onDecline }: {
  req: BookingRequest
  idx: number
  onAccept?: () => void
  onDecline?: () => void
}) {
  const colors = ['#E8705A', '#0D9488', '#D97706', '#3B6BCC']
  const accent = colors[idx % colors.length]
  const dateStr = req.proposed_date
    ? new Date(req.proposed_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
    : 'TBD'

  return (
    <div style={{ border: '1px solid rgba(26,39,68,0.14)', background: '#FEFCF8', overflow: 'hidden', boxShadow: '0 1px 6px rgba(26,39,68,0.06)' }}>
      {/* Header strip — navy */}
      <div style={{ background: '#1A2744', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 2 }}>
          PROPOSAL SENT
        </span>
        <span style={{ fontSize: 8, color: accent, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>
          ◉ PENDING
        </span>
      </div>

      {/* Body */}
      <div style={{ display: 'flex' }}>
        {/* Accent stripe */}
        <div style={{ width: 3, background: accent, flexShrink: 0 }} />

        {/* Main info */}
        <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
          <div style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', marginBottom: 3 }}>EVENT / OCCASION</div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A2744', fontFamily: 'var(--font-dm-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
            {req.event_title}
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 8, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', marginBottom: 1 }}>DATE</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1A2744', fontFamily: 'var(--font-jetbrains-mono)' }}>{dateStr}</div>
            </div>
          </div>
        </div>

        {/* Perforated divider */}
        <div style={PERF_STYLE} />

        {/* Stub — actions */}
        <div style={{ width: 76, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 10px', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,39,68,0.025)' }}>
          <button
            onClick={onAccept}
            style={{ width: '100%', padding: '5px 0', background: 'rgba(13,148,136,0.12)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 0, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer' }}
          >
            ACCEPT
          </button>
          <button
            onClick={onDecline}
            style={{ width: '100%', padding: '5px 0', background: 'rgba(220,38,38,0.06)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.18)', borderRadius: 0, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer' }}
          >
            DECLINE
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Postmark decoration ───────────────────────────────────────────────────────

function Postmark({ text, rotate = 0, opacity = 0.07 }: { text: string; rotate?: number; opacity?: number }) {
  return (
    <svg
      width={80} height={80}
      viewBox="0 0 80 80"
      style={{ position: 'absolute', pointerEvents: 'none', opacity, transform: `rotate(${rotate}deg)` }}
    >
      <circle cx={40} cy={40} r={36} fill="none" stroke="#1A2744" strokeWidth={1.5} />
      <circle cx={40} cy={40} r={30} fill="none" stroke="#1A2744" strokeWidth={0.5} />
      <text x={40} y={37} textAnchor="middle" fill="#1A2744" fontSize={7} fontFamily="'JetBrains Mono', monospace" fontWeight={700} letterSpacing={1}>
        {text.slice(0, 8)}
      </text>
      <text x={40} y={47} textAnchor="middle" fill="#1A2744" fontSize={6} fontFamily="'JetBrains Mono', monospace">
        WIMC
      </text>
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [profile,         setProfile]         = useState<UserProfile | null>(null)
  const [events,          setEvents]          = useState<Event[]>([])
  const [requests,        setRequests]        = useState<BookingRequest[]>([])
  const [dashPosts,       setDashPosts]       = useState<CreatorPost[]>([])
  const [loading,         setLoading]         = useState(true)
  const [hideChecklist,   setHideChecklist]   = useState(false)
  const [activePersona] = useState<string>('creator')
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [soldCountMap,    setSoldCountMap]    = useState<Record<string, number>>({})
  const [availablePaise,  setAvailablePaise]  = useState(0)
  const [mtdEarnedPaise,  setMtdEarnedPaise]  = useState(0)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/onboarding'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [pr, er, rr, posts, sr, payable] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('events').select('*').eq('creator_id', session.user.id).order('starts_at').limit(10),
        supabase.from('maker_adda_proposals').select('id, event_title, status, proposed_date').eq('maker_id', session.user.id).eq('status', 'pending').limit(5),
        db.from('creator_posts').select('*').eq('creator_id', session.user.id).order('created_at', { ascending: false }).limit(5)
          .then((r: { data: CreatorPost[] | null }) => r)
          .catch(() => ({ data: [] })),
        supabase
          .from('maker_subscribers')
          .select('id', { count: 'exact', head: true })
          .eq('maker_id', session.user.id)
          .eq('is_active', true)
          .gte('subscribed_at', monthStart),
        getPayableEvents(),
      ])

      if (pr.data) {
        setProfile(pr.data)
        const primaryPersona = pr.data.user_role === 'maker' ? 'creator' : 'explorer'
        void primaryPersona // activePersona is always 'creator' on this page
      }
      if (er.data) {
        setEvents(er.data)
        const eventIds = er.data.map(e => e.id)
        if (eventIds.length > 0) {
          const { data: rsvpData } = await supabase
            .from('rsvps')
            .select('event_id')
            .in('event_id', eventIds)
            .eq('payment_status', 'captured')
          if (rsvpData) {
            const countMap: Record<string, number> = {}
            for (const row of rsvpData) {
              countMap[row.event_id] = (countMap[row.event_id] ?? 0) + 1
            }
            setSoldCountMap(countMap)
          }
        }
      }
      if (rr.data)    setRequests(rr.data as BookingRequest[])
      if (posts.data) setDashPosts(posts.data)
      setSubscriberCount(sr.count ?? 0)
      if (payable.data) {
        setAvailablePaise(payable.data.reduce((s, e) => s + e.maker_paise, 0))
        setMtdEarnedPaise(
          payable.data
            .filter(e => e.starts_at >= monthStart)
            .reduce((s, e) => s + e.maker_paise, 0)
        )
      }
      setLoading(false)
    })()
  }, [router])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const displayName = profile?.display_name || profile?.username || 'Creator'

  const upcomingEvents = events.filter(
    (e) => e.status === 'published' && new Date(e.starts_at) >= new Date(),
  )

  const isFirstLogin = events.length === 0 && requests.length === 0 && !profile?.bio

  const completionItems = [
    { label: 'Verify Social Handles', done: !!profile?.social_links && Object.keys(profile.social_links as object).length > 0 },
    { label: 'Add Portfolio Links',   done: !!profile?.website_url },
    { label: 'Complete Bio Section',  done: !!profile?.bio },
  ]
  const completionPct = Math.round(
    (completionItems.filter((c) => c.done).length / completionItems.length) * 100,
  )

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: '#F2EDE3' }}>
        <p style={{ color: '#1A2744', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'var(--font-jetbrains-mono)' }}>
          LOADING BOARD...
        </p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const personas = profile?.personas ?? []

  return (
    <>
      <style>{BOARD_CSS}</style>

      {/* ── Persona switcher ── */}
      <PersonaSwitcherPills personas={personas} currentPersona="creator" variant="light" />

      {/* ═══════════════ DESKTOP ══════════════════════════════════════════════ */}
      <div className="hidden md:block" style={{ background: '#F2EDE3', minHeight: '100vh' }}>
        <div style={{ padding: '32px 40px 60px', maxWidth: 1280, margin: '0 auto' }}>

          {/* ── Post Composer ───────────────────────────────────────────────── */}
          <PostComposer
            onPostCreated={(post) => setDashPosts((prev) => [post, ...prev].slice(0, 5))}
          />

          {/* ── Expand your presence — shown when user has missing personas ── */}
          {(() => {
            const ALL_P = ['creator', 'explorer', 'venue', 'brand'] as const
            const missing = ALL_P.filter(p => !personas.includes(p))
            if (missing.length === 0) return null
            const PERSONA_URL: Record<string, string> = {
              creator: '/onboarding?mode=add&persona=creator', explorer: '/onboarding?mode=add&persona=explorer',
              venue: '/onboarding?mode=add&persona=venue', brand: '/onboarding?mode=add&persona=brand',
            }
            const PERSONA_LABEL: Record<string, string> = {
              creator: 'Become a Creator', explorer: 'Become an Explorer',
              venue: 'List an Adda', brand: 'Add a Brand',
            }
            return (
              <PaperCard accent="#5DD9D0" style={{ padding: 24, marginBottom: 32 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5DD9D0', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 4 }}>✦ EXPAND YOUR PRESENCE</p>
                <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 16, fontWeight: 700, color: '#1A2744', marginBottom: 12 }}>Add another side to your WIMC profile</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {missing.map(p => (
                    <Link
                      key={p}
                      href={PERSONA_URL[p]}
                      style={{ padding: '8px 16px', background: '#1A2744', color: '#F2EDE3', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
                      {PERSONA_LABEL[p]}
                    </Link>
                  ))}
                </div>
              </PaperCard>
            )
          })()}

          {/* ── Checklist (first login) ─────────────────────────────────────── */}
          {isFirstLogin && !hideChecklist && (
            <PaperCard accent="#E8705A" style={{ padding: 24, marginBottom: 32, position: 'relative' }}>
              <button onClick={() => setHideChecklist(true)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,39,68,0.35)', padding: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 4 }}>GETTING STARTED</p>
              <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 18, fontWeight: 700, color: '#1A2744', marginBottom: 20 }}>3 things to do first</h2>
              {[
                { done: !!profile?.avatar_url, label: 'Add a profile photo',     cta: 'ADD PHOTO →',    href: '/dashboard/studio' },
                { done: events.length > 0,     label: 'Create your first event', cta: 'CREATE EVENT →', href: '/dashboard/events/create' },
                { done: false,                 label: 'Share your page',         cta: 'COPY LINK →',    href: null },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px dashed rgba(26,39,68,0.1)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: item.done ? '#16A34A' : 'rgba(26,39,68,0.2)', fontVariationSettings: item.done ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span style={{ fontSize: 14, color: '#1A2744', fontFamily: 'var(--font-dm-sans)' }}>{item.label}</span>
                  </div>
                  {!item.done && (
                    item.href
                      ? <a href={item.href} style={{ fontSize: 10, color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none' }}>{item.cta}</a>
                      : <button onClick={() => { if (profile?.username) { navigator.clipboard.writeText(`https://wheninmycity.com${profileUrl(profile.city, profile.username)}`) } }} style={{ fontSize: 10, color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{item.cta}</button>
                  )}
                </div>
              ))}
            </PaperCard>
          )}

          {/* ── Stat cards — philatelic catalog style ───────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 18, color: '#1A2744', margin: 0 }}>Overview</h2>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: 'rgba(26,39,68,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>THIS MONTH</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
            {[
              { label: 'PAGE VIEWS',      value: String(profile?.monthly_page_visitors ?? 0), accent: '#E8705A', icon: 'visibility', sub: 'This month', href: '/dashboard/studio' },
              { label: 'NEW SUBSCRIBERS', value: String(subscriberCount), accent: '#0D9488', icon: 'group', sub: 'This month', href: '/dashboard/leads' },
              { label: 'UPCOMING EVENTS', value: String(upcomingEvents.length), accent: '#D97706', icon: 'event', sub: `${events.length} total`, href: '/dashboard/events' },
              { label: 'EARNINGS', value: formatPaiseCompact(availablePaise), accent: '#D97706', icon: 'sell', sub: `${formatPaiseFull(mtdEarnedPaise)} this month`, href: '/dashboard/payouts' },
            ].map(({ label, value, accent, icon, sub, href }) => (
              <a key={label} href={href} style={{
                background: '#FEFCF8',
                border: '1px solid var(--wimc-coral-dim)',
                borderTop: `3px solid ${accent}`,
                padding: '20px 24px 18px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(26,39,68,0.05)',
                textDecoration: 'none',
                display: 'block',
                cursor: 'pointer',
              }}>
                {/* Postmark watermark */}
                <div style={{ position: 'absolute', top: 8, right: 10 }}>
                  <Postmark text={label.split(' ')[0]} rotate={12} opacity={0.06} />
                </div>

                {/* Catalog ref */}
                <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.35)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
                  {label}
                </p>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: `${accent}15`, display: 'grid', placeItems: 'center', color: accent, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1, color: accent }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-dm-sans)', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* ── Earn snapshot — gateway to /dashboard/earn ──────────────────── */}
          <a
            href="/dashboard/earn"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FEFCF8',
              border: '1px solid rgba(217,119,6,0.2)',
              borderTop: '3px solid #D97706',
              padding: '18px 24px', marginBottom: 32,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(26,39,68,0.05)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(26,39,68,0.02)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEFCF8'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                background: 'rgba(217,119,6,0.10)', display: 'grid', placeItems: 'center', color: '#D97706',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>sell</span>
              </div>
              <div>
                <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.35)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>EARN HUB</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 900, lineHeight: 1, color: '#D97706' }}>
                    {formatPaiseCompact(mtdEarnedPaise)}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(26,39,68,0.45)', fontFamily: 'var(--font-dm-sans)' }}>
                    earned this month · {formatPaiseFull(availablePaise)} available
                  </span>
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#D97706', fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
              border: '1px solid rgba(217,119,6,0.3)', padding: '8px 16px', flexShrink: 0,
            }}>
              Booking requests &amp; more
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
            </div>
          </a>

          {/* ── Quick Actions ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 18, color: '#1A2744', margin: 0 }}>Quick Actions</h2>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: 'rgba(26,39,68,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>CREATOR_OPS</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { icon: 'add_circle', label: 'Create Event',   href: '/dashboard/events/create',      primary: true  },
                { icon: 'edit_note',  label: 'Edit My Page',   href: '/dashboard/studio',              primary: false },
                { icon: 'bar_chart',  label: 'Analytics',      href: '/dashboard/analytics',           primary: false },
                { icon: 'group',      label: 'Leads',          href: '/dashboard/leads',               primary: false },
              ].map(({ icon, label, href, primary }) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px',
                    background: primary ? '#E8705A' : 'transparent',
                    border: `1px solid ${primary ? '#E8705A' : 'rgba(26,39,68,0.2)'}`,
                    color: primary ? '#fff' : '#1A2744',
                    fontFamily: 'var(--font-dm-sans)', fontWeight: 600, fontSize: 13,
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => { if (!primary) (e.currentTarget as HTMLElement).style.background = 'rgba(26,39,68,0.06)' }}
                  onMouseLeave={e => { if (!primary) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Recent Posts ────────────────────────────────────────────────── */}
          {dashPosts.length > 0 && (
            <PaperCard style={{ padding: 24, marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-abril)', fontSize: 20, color: '#1A2744', margin: 0 }}>Recent Posts</h3>
                <span style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase' }}>YOUR UPDATES</span>
              </div>
              {dashPosts.map((post) => {
                const typeEmoji = post.post_type === 'text' ? '✍️' : post.post_type === 'photo' ? '📸' : '🔗'
                const preview = post.content ? post.content.slice(0, 60) + (post.content.length > 60 ? '…' : '') : post.link_title ?? post.link_url ?? '—'
                const diff  = Date.now() - new Date(post.created_at).getTime()
                const hours = Math.floor(diff / 3_600_000)
                const relTime = hours < 1 ? 'just now' : hours < 24 ? `${hours}h ago` : `${Math.floor(diff / 86_400_000)}d ago`
                return (
                  <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: '1px dashed rgba(26,39,68,0.09)' }} className="group">
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{typeEmoji}</span>
                    <p style={{ flex: 1, fontSize: 13, color: '#1A2744', fontFamily: 'var(--font-dm-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{preview}</p>
                    <span style={{ fontSize: 10, color: 'rgba(26,39,68,0.35)', fontFamily: 'var(--font-jetbrains-mono)', flexShrink: 0 }}>{relTime}</span>
                    <button
                      onClick={async () => { const { error } = await deletePost(post.id); if (!error) setDashPosts(prev => prev.filter(p => p.id !== post.id)) }}
                      style={{ color: 'rgba(26,39,68,0.25)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                      aria-label="Delete post"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete_outline</span>
                    </button>
                  </div>
                )
              })}
            </PaperCard>
          )}

          {/* ── Main grid ───────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 40 }}>

            {/* ── Events board ─────────────────────────────────────────────── */}
            <div style={{ background: '#FEFCF8', border: '1px solid var(--wimc-coral-dim)', borderTop: '3px solid rgba(232,112,90,0.22)', boxShadow: '0 2px 10px rgba(26,39,68,0.06)', overflow: 'hidden' }}>

              {/* Board header — navy, exhibition poster style */}
              <div style={{ background: '#1A2744', padding: '20px 24px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 6 }}>CONFIRMED &amp; ACTIVE</p>
                  <h2 style={{ fontFamily: 'var(--font-abril)', fontSize: 'clamp(26px,3.2vw,44px)', color: 'white', lineHeight: 1, margin: 0 }}>Live Pipeline</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <a href="/dashboard/events" style={{ fontSize: 9, color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #E8705A' }}>VIEW ALL →</a>
                </div>
              </div>

              {/* Event tickets */}
              {upcomingEvents.length === 0 ? (
                <div style={{ padding: '44px 24px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'rgba(26,39,68,0.18)', display: 'block', marginBottom: 10 }}>calendar_month</span>
                  <p style={{ fontSize: 11, color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', letterSpacing: '0.28em', fontFamily: 'var(--font-jetbrains-mono)' }}>No events on the board</p>
                  <a href="/dashboard/events/create" style={{ marginTop: 14, display: 'inline-block', fontSize: 10, color: '#E8705A', textDecoration: 'none', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', borderBottom: '1px solid #E8705A' }}>
                    PIN YOUR FIRST EVENT →
                  </a>
                </div>
              ) : (
                upcomingEvents.slice(0, 5).map((ev) => (
                  <EventTicket key={ev.id} ev={ev} soldCount={soldCountMap[ev.id] ?? 0} />
                ))
              )}

              {/* Add to board CTA */}
              <div style={{ padding: '13px 24px', borderTop: '1px solid rgba(26,39,68,0.06)' }}>
                <a href="/dashboard/events/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#1A2744', fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none', textTransform: 'uppercase', opacity: 0.55 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>push_pin</span>
                  Pin new event
                </a>
              </div>
            </div>

            {/* ── Right column ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Booking Requests — boarding pass stack */}
              <PaperCard style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(26,39,68,0.07)' }}>
                  <p style={{ fontFamily: 'var(--font-abril)', fontSize: 18, color: '#1A2744', margin: '0 0 2px' }}>My Venue Proposals</p>
                  <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', margin: 0 }}>AWAITING RESPONSE</p>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'rgba(26,39,68,0.35)', fontFamily: 'var(--font-jetbrains-mono)', textAlign: 'center', padding: '8px 0' }}>No pending requests</p>
                  ) : (
                    requests.slice(0, 2).map((req, i) => (
                      <BoardingPass key={req.id} req={req} idx={i} />
                    ))
                  )}
                </div>
              </PaperCard>

              {/* Profile Completion */}
              <PaperCard style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(26,39,68,0.45)', textTransform: 'uppercase', letterSpacing: 1.2 }}>PROFILE STATUS</span>
                  <span style={{ fontSize: 13, color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700 }}>{completionPct}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(26,39,68,0.08)', marginBottom: 16 }}>
                  <div style={{ background: '#E8705A', height: '100%', width: `${completionPct}%`, transition: 'width 600ms ease' }} />
                </div>
                {completionItems.map(({ label, done }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: done ? '#16A34A' : 'rgba(26,39,68,0.2)', fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
                      {done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span style={{ fontSize: 13, color: done ? '#1A2744' : 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-dm-sans)' }}>{label}</span>
                  </div>
                ))}
                <a href="/dashboard/profile/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none', textTransform: 'uppercase', marginTop: 4 }}>
                  EDIT PROFILE →
                </a>
              </PaperCard>

              {/* My Page — live profile card with copy link */}
              <div style={{ background: '#1A2744', overflow: 'hidden' }}>
                <div style={{ padding: '14px 22px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.5 }}>LIVE · YOUR LINK-IN-BIO</span>
                </div>
                <div style={{ padding: '12px 22px 16px' }}>
                  <p style={{ fontSize: 11.5, color: '#E8705A', fontFamily: 'var(--font-jetbrains-mono)', margin: '0 0 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    wheninmycity.com{profile ? profileUrl(profile.city, profile.username) : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { if (profile) navigator.clipboard.writeText(`https://wheninmycity.com${profileUrl(profile.city, profile.username)}`) }}
                      style={{ flex: 1, padding: '8px 0', background: '#E8705A', color: 'white', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>content_copy</span>
                      Copy Link
                    </button>
                    <Link
                      href="/dashboard/studio"
                      style={{ padding: '8px 14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none', textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Mode teasers ──────────────────────────────────────────────────── */}
          <div style={{ borderTop: '2px dashed rgba(26,39,68,0.12)', paddingTop: 36, marginTop: 16 }}>
            {/* Exhibition poster header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.35)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 4 }}>SYSTEM MODES — COMING SOON</p>
                <h3 style={{ fontFamily: 'var(--font-abril)', fontSize: 28, color: '#1A2744', margin: 0, lineHeight: 1 }}>Expand your role.</h3>
              </div>
              <div style={{ width: 60, height: 60, border: '1.5px solid rgba(26,39,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(26,39,68,0.2)', fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', flexDirection: 'column', gap: 2 }}>
                <span>◼◼</span><span style={{ fontSize: 7, letterSpacing: 1 }}>LOCKED</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* ADDA MODE — active if user has venue persona */}
              {personas.includes('venue') ? (
                <Link href="/business/venue/dashboard" style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#FEFCF8', border: '1px solid rgba(13,148,136,0.3)', borderLeft: '4px solid #0D9488', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0D9488' }}>apartment</span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains-mono)', color: '#0D9488', textTransform: 'uppercase', letterSpacing: 1.5 }}>ADDA MODE</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 20, color: '#1A2744', margin: '0 0 8px' }}>Manage Adda</p>
                    <p style={{ fontSize: 12, color: 'rgba(26,39,68,0.55)', fontFamily: 'var(--font-dm-sans)', margin: '0 0 14px', lineHeight: 1.55 }}>List your space, manage bookings from creators, track revenue and availability.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(13,148,136,0.2)' }} />
                      <span style={{ fontSize: 9, color: '#0D9488', fontFamily: 'var(--font-jetbrains-mono)' }}>OPEN →</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: -16, right: -10, fontSize: 100, color: '#0D9488', opacity: 0.04, pointerEvents: 'none' }}>apartment</span>
                  </div>
                </Link>
              ) : (
                <div style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', borderLeft: '4px solid #0D9488', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', opacity: 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0D9488' }}>apartment</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains-mono)', color: '#0D9488', textTransform: 'uppercase', letterSpacing: 1.5 }}>ADDA MODE</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 20, color: '#1A2744', margin: '0 0 8px' }}>Manage Adda</p>
                  <p style={{ fontSize: 12, color: 'rgba(26,39,68,0.55)', fontFamily: 'var(--font-dm-sans)', margin: '0 0 14px', lineHeight: 1.55 }}>List your space, manage bookings from creators, track revenue and availability.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(26,39,68,0.1)' }} />
                    <span style={{ fontSize: 9, color: 'rgba(26,39,68,0.3)', fontFamily: 'var(--font-jetbrains-mono)' }}>LOCKED</span>
                  </div>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: -16, right: -10, fontSize: 100, color: '#0D9488', opacity: 0.04, pointerEvents: 'none' }}>apartment</span>
                </div>
              )}

              {/* BRAND MODE — coming soon */}
              <div style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', borderLeft: '4px solid #D97706', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', opacity: 0.65 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#D97706' }}>campaign</span>
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains-mono)', color: '#D97706', textTransform: 'uppercase', letterSpacing: 1.5 }}>BRAND MODE</span>
                </div>
                <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 20, color: '#1A2744', margin: '0 0 8px' }}>Activate Campaigns</p>
                <p style={{ fontSize: 12, color: 'rgba(26,39,68,0.55)', fontFamily: 'var(--font-dm-sans)', margin: '0 0 14px', lineHeight: 1.55 }}>Run campaigns with creators, sponsor events, track engagement and ROI.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(26,39,68,0.1)' }} />
                  <span style={{ fontSize: 9, color: 'rgba(26,39,68,0.3)', fontFamily: 'var(--font-jetbrains-mono)' }}>LOCKED</span>
                </div>
                <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: -16, right: -10, fontSize: 100, color: '#D97706', opacity: 0.04, pointerEvents: 'none' }}>campaign</span>
              </div>
            </div>
          </div>

          {/* ── Hub progress widget — only for Wanderer tier ── */}
          {profile?.user_tier === 'wanderer' && (
            <div
              style={{
                background: '#131317',
                border: '1px solid #57423e',
                borderLeft: '3px solid #5DD9D0',
                marginTop: 24,
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#5DD9D0' }}>hub</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: '#5DD9D0', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    Hub unlocks at Local
                  </span>
                </div>
                <Link
                  href="/dashboard/hub"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: '#9896B0', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  See progress →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#9896B0' }}>Events attended</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: '#5DD9D0' }}>
                    {profile.events_attended_count ?? 0} / {TIER_THRESHOLDS.local.eventsAttendedIn90d}
                  </span>
                </div>
                <div style={{ height: 4, background: '#1b1b1f', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((profile.events_attended_count ?? 0) / TIER_THRESHOLDS.local.eventsAttendedIn90d) * 100)}%`,
                    background: '#5DD9D0',
                    transition: 'width 0.7s ease',
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Marquee strip — navy ────────────────────────────────────────────── */}
        <div style={{ background: '#1A2744', height: 34, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <div className="flex whitespace-nowrap board-marquee">
            {[0, 1].map((k) => (
              <span key={k} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)', padding: '0 16px', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {MARQUEE_TEXT}
              </span>
            ))}
          </div>
        </div>

        {/* ── FAB ────────────────────────────────────────────────────────────── */}
        <Link
          href="/dashboard/events/create"
          style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 50, width: 56, height: 56, background: 'var(--wimc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '4px 4px 0 #1A2744', textDecoration: 'none', transition: 'transform 180ms ease' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
          aria-label="Create event"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
        </Link>
      </div>

      {/* ═══════════════ MOBILE ═══════════════════════════════════════════════ */}
      <div className="md:hidden min-h-screen pb-6" style={{ background: '#F2EDE3' }}>

        {/* Greeting — navy strip */}
        <div style={{ background: '#1A2744', padding: '16px' }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 4, letterSpacing: 1.5 }}>WELCOME BACK,</p>
          <p style={{ fontFamily: 'var(--font-abril)', fontSize: 28, color: 'white', lineHeight: 1.1, margin: 0 }}>{displayName}</p>
          <p style={{ fontSize: 8, color: '#E8705A', textTransform: 'uppercase', marginTop: 4, fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: 1.5 }}>CREATOR // ACTIVE</p>
        </div>

        {/* Stat pills */}
        <div className="overflow-x-auto py-4 no-scrollbar px-4" style={{ borderBottom: '1px solid rgba(26,39,68,0.1)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { value: String(subscriberCount), label: 'SUBSCRIBERS', color: '#E8705A' },
              { value: String(upcomingEvents.length), label: 'EVENTS', color: '#E8705A' },
              { value: String(profile?.monthly_page_visitors ?? 0), label: 'VIEWS', color: '#E8705A' },
              { value: String(requests.length), label: 'REQUESTS', color: '#E8705A' },
              { value: formatPaiseCompact(availablePaise), label: 'EARNINGS', color: '#D97706', href: '/dashboard/payouts' },
            ].map(({ value, label, color, href }) => {
              const content = (
                <>
                  <p style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 900, color, lineHeight: 1, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 6, letterSpacing: 1 }}>{label}</p>
                </>
              )
              return href ? (
                <a key={label} href={href} style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', borderTop: `2px solid ${color}`, padding: '12px 16px', minWidth: 110, flexShrink: 0, textDecoration: 'none', display: 'block' }}>
                  {content}
                </a>
              ) : (
                <div key={label} style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', padding: '12px 16px', minWidth: 110, flexShrink: 0 }}>
                  {content}
                </div>
              )
            })}
          </div>
        </div>

        {/* Earn snapshot — compact card gateway to /dashboard/earn */}
        <a
          href="/dashboard/earn"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            margin: '0 16px 16px',
            padding: '14px 16px',
            background: '#FEFCF8',
            border: '1px solid rgba(217,119,6,0.2)',
            borderLeft: '3px solid #D97706',
            textDecoration: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#D97706', fontVariationSettings: "'FILL' 1" }}>sell</span>
            <div>
              <p style={{ fontSize: 8, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>EARN HUB</p>
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 700, color: '#1A2744', lineHeight: 1.2 }}>
                {formatPaiseCompact(mtdEarnedPaise)}{' '}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(26,39,68,0.5)' }}>this month</span>
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#D97706' }}>arrow_forward</span>
        </a>

        {/* PostComposer */}
        <div style={{ padding: '16px' }}>
          <PostComposer onPostCreated={(post) => setDashPosts(prev => [post, ...prev].slice(0, 5))} />
        </div>

        {/* Upcoming Events as tickets */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: '#1A2744', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1.5 }}>YOUR EVENTS</span>
            <Link href="/dashboard/events/create" style={{ fontSize: 9, color: '#E8705A', border: '1px solid rgba(232,112,90,0.3)', padding: '4px 10px', fontFamily: 'var(--font-jetbrains-mono)', textDecoration: 'none', letterSpacing: 1 }}>
              PIN +
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div style={{ border: '1px dashed rgba(26,39,68,0.18)', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)' }}>No events pinned yet</p>
            </div>
          ) : (
            <div style={{ border: '1px solid rgba(26,39,68,0.12)', background: '#FEFCF8', overflow: 'hidden' }}>
              {upcomingEvents.slice(0, 3).map(ev => <EventTicket key={ev.id} ev={ev} soldCount={soldCountMap[ev.id] ?? 0} />)}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: 'edit_note',  label: 'MY PAGE',   href: '/dashboard/studio' },
            { icon: 'event',      label: 'ADD EVENT', href: '/dashboard/events/create' },
            { icon: 'bar_chart',  label: 'ANALYTICS', href: '/dashboard/analytics' },
            { icon: 'sell',       label: 'EARN',      href: '/dashboard/earn' },
          ].map(({ icon, label, href }) => (
            <a key={label} href={href} style={{ background: '#FEFCF8', border: '1px solid rgba(26,39,68,0.12)', padding: 16, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#E8705A', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              <span style={{ fontSize: 9, color: '#1A2744', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', textAlign: 'center', letterSpacing: 1 }}>{label}</span>
            </a>
          ))}
        </div>

        {/* Marquee */}
        <div style={{ background: '#1A2744', height: 30, display: 'flex', alignItems: 'center', overflow: 'hidden', marginTop: 8 }}>
          <div className="flex whitespace-nowrap board-marquee">
            {[0, 1].map((k) => (
              <span key={k} style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.3em', paddingRight: '2rem' }}>
                CITY CREATORS · OFFLINE FIRST · LOCAL SCENE ·&nbsp;
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
