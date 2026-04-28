'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UserProfile, Event, BookingRow } from '@/types/database'
import type { LinkClickStats } from '@/app/actions/analytics'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function isUpcoming(event: Event): boolean {
  return event.status === 'published' && new Date(event.starts_at) > new Date()
}

function formatEventDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-IN', { day: 'numeric' }),
    mon: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
  }
}

function formatRevenueMTD(bookings: BookingRow[]): string {
  const now = new Date()
  const mtd = bookings.filter((b) => {
    const d = new Date(b.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const total = mtd.reduce((sum, b) => sum + (b.amount_paid ?? 0), 0) / 100
  if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`
  if (total >= 1000) return `₹${Math.round(total / 1000)}K`
  return `₹${total.toLocaleString('en-IN')}`
}

function capacityFill(booked: number, capacity: number | null): number {
  if (!capacity || capacity === 0) return 0
  return Math.min(100, Math.round((booked / capacity) * 100))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, delta, iconColor, iconBg }: {
  icon: string; value: string; label: string; delta: string
  iconColor: string; iconBg: string
}) {
  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      borderRadius: 18, padding: '22px 24px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 220ms ease, transform 220ms ease',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--wimc-border-strong)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'var(--wimc-border-default)' }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 6, display: 'grid', placeItems: 'center',
        marginBottom: 14, background: iconBg, color: iconColor,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--font-jetbrains-mono)' }}>{label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--wimc-success)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-jetbrains-mono)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
        {delta}
      </div>
    </div>
  )
}

function EventPill({ status }: { status: Event['status'] }) {
  const map: Record<Event['status'], { label: string; bg: string; color: string }> = {
    published:  { label: 'Live',        bg: 'var(--wimc-teal-dim)',  color: 'var(--wimc-teal)'  },
    draft:      { label: 'Draft',       bg: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-muted)' },
    cancelled:  { label: 'Cancelled',   bg: 'rgba(232,52,42,0.12)',  color: 'var(--wimc-gulaal)' },
    completed:  { label: 'Completed',   bg: 'rgba(59,107,204,0.12)', color: 'var(--wimc-neel)'  },
  }
  const s = map[status]
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 9999,
      fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)',
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ── Nudge card ────────────────────────────────────────────────────────────────

function NudgeCard({ icon, iconColor, iconBg, title, description, href }: {
  icon: string; iconColor: string; iconBg: string
  title: string; description: string; href: string
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      borderRadius: 12, padding: '14px 18px',
      textDecoration: 'none', color: 'inherit',
      transition: 'border-color 200ms ease, transform 200ms ease',
      flex: 1, minWidth: 0,
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'var(--wimc-border-strong)'; el.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'var(--wimc-border-default)'; el.style.transform = '' }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        display: 'grid', placeItems: 'center', background: iconBg, color: iconColor,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-dm-sans)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>{description}</div>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--wimc-text-muted)', flexShrink: 0 }}>arrow_forward</span>
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface DashboardOverviewProps {
  profile: UserProfile
  events: Event[]
  bookings: BookingRow[]
  linkClickStats: LinkClickStats
}

export default function DashboardOverview({ profile, events, bookings, linkClickStats }: DashboardOverviewProps) {
  const router = useRouter()

  const upcoming = events.filter(isUpcoming)
  const totalAttendees = bookings.length
  const revenueMTD = formatRevenueMTD(bookings)
  const totalPageVisits = linkClickStats?.totalClicks ?? 0
  const displayName = profile.display_name ?? profile.username ?? 'Creator'

  // Tier display
  const TIER_EMOJI: Record<string, string> = { mohalla: '🏘️', nukkad: '🏙️', chowk: '🏛️', maidan: '🌆' }
  const TIER_NEXT: Record<string, string> = { mohalla: 'Nukkad', nukkad: 'Chowk', chowk: 'Maidan', maidan: '—' }
  const tierKey = profile.user_tier ?? 'wanderer'
  const tierLabel = tierKey.charAt(0).toUpperCase() + tierKey.slice(1)
  const nextTier = TIER_NEXT[tierKey]

  const hasSocials = profile.social_links != null &&
    typeof profile.social_links === 'object' &&
    Object.keys(profile.social_links as Record<string, unknown>).length > 0

  // Booking counts per event
  const bookingsByEvent: Record<string, number> = {}
  for (const b of bookings) {
    bookingsByEvent[b.event_id] = (bookingsByEvent[b.event_id] ?? 0) + 1
  }

  // Recent activity: last 3 bookings
  const recentActivity = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  function activityTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
    return 'Yesterday'
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(12px)', zIndex: 40,
  }
  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none', fontFamily: 'var(--font-dm-sans)',
  }

  return (
    <>
      {/* Topbar */}
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Overview</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href={`/${profile.username}`}
            target="_blank"
            style={{
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12,
              color: 'var(--wimc-teal)', background: 'var(--wimc-teal-dim)',
              padding: '4px 10px', borderRadius: 9999,
              border: '1px solid rgba(93,217,208,0.2)', textDecoration: 'none',
            }}
          >
            wheninmycity.com/{profile.username} ↗
          </Link>
          <button
            style={{ ...btn, background: 'transparent', color: 'var(--wimc-text-secondary)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/events/create')}
            style={{ ...btn, background: 'var(--wimc-coral)', color: '#fff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Event
          </button>
        </div>
      </header>

      <div style={{ padding: 32, display: 'grid', gap: 24 }}>

        {/* Welcome strip */}
        <div style={{
          background: 'linear-gradient(135deg, var(--wimc-bg-elevated) 0%, var(--wimc-bg-overlay) 100%)',
          border: '1px solid var(--wimc-border-default)', borderRadius: 18,
          padding: '28px 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', right: -60, top: -60,
            width: 240, height: 240,
            background: 'radial-gradient(circle, var(--wimc-coral-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 26, fontWeight: 800 }}>
              Hey, <span style={{ color: 'var(--wimc-coral-light)' }}>{displayName}</span> 👋
            </div>
            <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 13.5, marginTop: 6 }}>
              Here&apos;s what&apos;s happening with your creator page today.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => router.push('/dashboard/studio')}
                style={{ ...btn, background: 'var(--wimc-coral)', color: '#fff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit_note</span>
                Edit My Page
              </button>
              <button
                onClick={() => router.push('/dashboard/events')}
                style={{ ...btn, background: 'transparent', color: 'var(--wimc-text-secondary)' }}
              >
                View Events →
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Live Page Visits
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 52, fontWeight: 800, color: 'var(--wimc-coral-light)', lineHeight: 1 }}>
              {totalPageVisits.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--wimc-success)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              ↑ all time
            </div>
          </div>
        </div>

        {/* Setup nudges — shown until socials are added */}
        {!hasSocials && (
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
              Finish setting up your page
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <NudgeCard
                icon="share"
                iconColor="var(--wimc-coral)"
                iconBg="var(--wimc-coral-dim)"
                title="Add your social links"
                description="Let fans find you on Instagram, YouTube, and more."
                href="/dashboard/profile"
              />
              <NudgeCard
                icon="palette"
                iconColor="var(--wimc-teal)"
                iconBg="var(--wimc-teal-dim)"
                title="Customize your look"
                description="Pick a theme that matches your vibe."
                href="/dashboard/studio"
              />
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard
            icon="event" value={String(upcoming.length)} label="Upcoming Events"
            delta="+active" iconColor="var(--wimc-coral)" iconBg="var(--wimc-coral-dim)"
          />
          <StatCard
            icon="groups" value={String(totalAttendees)} label="Total Attendees"
            delta="all bookings" iconColor="var(--wimc-teal)" iconBg="var(--wimc-teal-dim)"
          />
          <StatCard
            icon="payments" value={revenueMTD} label="Revenue (MTD)"
            delta="this month" iconColor="var(--wimc-amber)" iconBg="var(--wimc-amber-dim)"
          />
          <StatCard
            icon="person_add" value={String(totalPageVisits)} label="Page Visits"
            delta="all time" iconColor="var(--wimc-neel)" iconBg="rgba(59,107,204,0.15)"
          />
        </div>

        {/* Two-column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Upcoming events */}
            <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>Upcoming Events</div>
                <Link href="/dashboard/events" style={{ fontSize: 12, color: 'var(--wimc-coral)', fontWeight: 600, textDecoration: 'none' }}>See all →</Link>
              </div>
              {upcoming.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13 }}>
                  No upcoming events.{' '}
                  <Link href="/dashboard/events/create" style={{ color: 'var(--wimc-coral)', textDecoration: 'none', fontWeight: 600 }}>Create one →</Link>
                </div>
              ) : (
                upcoming.slice(0, 4).map((event) => {
                  const { day, mon } = formatEventDate(event.starts_at)
                  const booked = bookingsByEvent[event.id] ?? 0
                  const fill = capacityFill(booked, event.capacity)
                  return (
                    <div key={event.id} style={{
                      padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
                      borderBottom: '1px solid var(--wimc-border-subtle)',
                      cursor: 'pointer', transition: 'background 220ms ease',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-overlay)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      onClick={() => router.push('/dashboard/events')}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                        background: 'var(--wimc-coral-dim)', color: 'var(--wimc-coral-light)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{day}</div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-jetbrains-mono)', opacity: 0.8 }}>{mon}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2, fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {event.venue_name}
                        </div>
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ height: 4, background: 'var(--wimc-bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: 'var(--wimc-teal)', width: `${fill}%` }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textAlign: 'right', marginTop: 3 }}>
                          {booked}/{event.capacity ?? '∞'}
                        </div>
                      </div>
                      <EventPill status={event.status} />
                    </div>
                  )
                })
              )}
            </div>

            {/* Quick actions */}
            <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>Quick Actions</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '20px 24px' }}>
                {[
                  { icon: 'add_circle',    label: 'Create Event', href: '/dashboard/events/create', color: 'var(--wimc-coral)',   bg: 'var(--wimc-coral-dim)' },
                  { icon: 'edit_note',     label: 'Edit Page',    href: '/dashboard/studio',        color: 'var(--wimc-teal)',    bg: 'var(--wimc-teal-dim)' },
                  { icon: 'group_add',     label: 'Invite Leads', href: '/dashboard/leads',         color: 'var(--wimc-amber)',   bg: 'var(--wimc-amber-dim)' },
                  { icon: 'workspace_premium', label: 'Tier Progress', href: '/dashboard/tier', color: 'var(--wimc-neel)', bg: 'rgba(59,107,204,0.15)' },
                ].map((qa) => (
                  <Link key={qa.href} href={qa.href} style={{
                    background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)',
                    borderRadius: 6, padding: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)',
                    textDecoration: 'none', transition: 'background 220ms ease, border-color 220ms ease',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--wimc-bg-hover)'; el.style.borderColor = 'var(--wimc-border-strong)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--wimc-bg-overlay)'; el.style.borderColor = 'var(--wimc-border-default)' }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0, background: qa.bg, color: qa.color }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{qa.icon}</span>
                    </div>
                    {qa.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Tier Progress card */}
            <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>Tier Progress</div>
                <Link href="/dashboard/tier" style={{ fontSize: 12, color: 'var(--wimc-coral)', fontWeight: 600, textDecoration: 'none' }}>Details →</Link>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 6,
                    background: 'linear-gradient(135deg, var(--wimc-amber), var(--wimc-coral))',
                    display: 'grid', placeItems: 'center', fontSize: 20,
                  }}>
                    {TIER_EMOJI[tierKey]}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800 }}>{tierLabel}</div>
                    {nextTier !== '—' && (
                      <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                        Next: {nextTier}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metric bars */}
                {[
                  { label: 'Events hosted', current: events.filter(e => e.status === 'published' || e.status === 'completed').length, target: 12, color: 'var(--wimc-coral)', colorLight: 'var(--wimc-coral-light)' },
                  { label: 'Attendees', current: totalAttendees, target: 300, color: 'var(--wimc-teal)', colorLight: '#A8F0EC' },
                  { label: 'GMV', current: Math.round(bookings.reduce((s, b) => s + (b.amount_paid ?? 0), 0) / 100), target: 75000, isRupee: true, color: 'var(--wimc-amber)', colorLight: '#FFD166' },
                ].map((m) => {
                  const pct = Math.min(100, Math.round((m.current / m.target) * 100))
                  return (
                    <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: 'var(--wimc-text-secondary)' }}>{m.label}</span>
                        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>
                          {m.isRupee ? `₹${m.current >= 1000 ? Math.round(m.current / 1000) + 'K' : m.current} / ₹${m.target / 1000}K` : `${m.current} / ${m.target}`}
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'var(--wimc-bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${m.color}, ${m.colorLight})`, width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}

                {nextTier !== '—' && (
                  <div style={{
                    background: 'var(--wimc-coral-dim)', border: '1px solid rgba(232,112,90,0.2)',
                    borderRadius: 6, padding: 14, fontSize: 13,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--wimc-coral)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      Unlock at {nextTier}
                    </div>
                    Premium venue access, priority discovery, bulk ticket tools
                  </div>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>Recent Activity</div>
              </div>
              <div style={{ padding: '8px 0' }}>
                {recentActivity.length === 0 ? (
                  <div style={{ padding: '20px 24px', fontSize: 13, color: 'var(--wimc-text-secondary)' }}>No recent activity yet.</div>
                ) : (
                  recentActivity.map((b, i) => (
                    <div key={b.id} style={{
                      padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'flex-start',
                      borderBottom: i < recentActivity.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--wimc-success)', marginTop: 5, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 13 }}>
                          New booking from <strong>{b.attendee_name}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>
                          {activityTime(b.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
