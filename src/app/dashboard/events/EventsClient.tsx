'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Event, EventStatus, BookingRow } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────────────────

function isUpcoming(e: Event) {
  return e.status === 'published' && new Date(e.starts_at) > new Date()
}
function isPast(e: Event) {
  return e.status === 'completed' || (e.status === 'published' && new Date(e.starts_at) <= new Date())
}

function formatEventMeta(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

function formatRevenue(paise: number): string {
  const rs = paise / 100
  if (rs >= 1000) return `₹${(rs / 1000).toFixed(1)}K`
  return `₹${rs.toLocaleString('en-IN')}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<EventStatus, { label: string; bg: string; color: string; border: string; accent: string }> = {
  published: { label: '✦ Live',      bg: 'rgba(74,222,128,0.12)', color: '#4ADE80', border: 'rgba(74,222,128,0.2)', accent: '#E8705A' },
  draft:     { label: 'Draft',       bg: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-muted)', border: 'var(--wimc-border-default)', accent: '#5C5A72' },
  cancelled: { label: 'Cancelled',   bg: 'rgba(232,52,42,0.12)',  color: '#E8342A', border: 'rgba(232,52,42,0.2)', accent: '#E8342A' },
  completed: { label: 'Completed',   bg: 'rgba(59,107,204,0.12)', color: '#3B6BCC', border: 'rgba(59,107,204,0.2)', accent: '#3B6BCC' },
}

interface EventCardProps {
  event: Event
  booked: number
  revenue: number
  username: string
  onEdit: (e: Event) => void
}

function EventCard({ event, booked, revenue, username, onEdit }: EventCardProps) {
  const s = STATUS_STYLES[event.status]
  const isFree = event.ticket_price === 0
  const priceStr = isFree ? 'Free' : `₹${(event.ticket_price / 100).toLocaleString('en-IN')}`
  const fill = event.capacity ? Math.min(100, Math.round((booked / event.capacity) * 100)) : 0
  const spotsLeft = event.capacity ? event.capacity - booked : null

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
      borderRadius: 18, overflow: 'hidden',
      transition: 'border-color 220ms ease, transform 220ms ease',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-border-strong)'; el.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-border-default)'; el.style.transform = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ width: 4, flexShrink: 0, background: s.accent }} />
        <div style={{ flex: 1, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                  wheninmycity.com/{username}/{event.slug}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 17, fontWeight: 700 }}>{event.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => onEdit(event)}
                style={{
                  padding: '0 12px', height: 32, border: '1px solid var(--wimc-border-default)',
                  borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--wimc-coral)',
                  background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                }}
              >
                Edit
              </button>
              <button style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--wimc-text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>share</span>
              </button>
              <button style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--wimc-text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>more_vert</span>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {[
              { icon: 'calendar_today', text: formatEventMeta(event.starts_at) },
              { icon: 'location_on', text: event.venue_name },
              { icon: 'payments', text: `${priceStr} / person` },
            ].map((m) => (
              <div key={m.icon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{m.icon}</span>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div style={{
        display: 'flex', gap: 32, padding: '16px 24px',
        background: 'var(--wimc-bg-overlay)', borderTop: '1px solid var(--wimc-border-subtle)',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: 'var(--wimc-teal)' }}>{booked}</div>
          <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Registered</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700 }}>{event.capacity ?? '∞'}</div>
          <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Capacity</div>
        </div>
        {!isFree && (
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, color: 'var(--wimc-success)' }}>{formatRevenue(revenue)}</div>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Revenue</div>
          </div>
        )}
        {event.capacity && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
            <div style={{ height: 6, background: 'var(--wimc-base)', borderRadius: 3, overflow: 'hidden', minWidth: 120 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: fill > 80 ? 'var(--wimc-amber)' : 'var(--wimc-teal)',
                width: `${fill}%`,
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {fill}% filled{spotsLeft != null && spotsLeft > 0 ? ` · ${spotsLeft} spots left` : spotsLeft === 0 ? ' · SOLD OUT' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'drafts' | 'past' | 'all'

interface EventsClientProps {
  events: Event[]
  bookings: BookingRow[]
  username: string
}

export default function EventsClient({ events, bookings, username }: EventsClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('upcoming')

  const bookingsByEvent: Record<string, BookingRow[]> = {}
  for (const b of bookings) {
    if (!bookingsByEvent[b.event_id]) bookingsByEvent[b.event_id] = []
    bookingsByEvent[b.event_id].push(b)
  }

  const upcomingEvents = events.filter(isUpcoming)
  const draftEvents    = events.filter((e) => e.status === 'draft')
  const pastEvents     = events.filter(isPast)

  const tabEvents: Record<Tab, Event[]> = {
    upcoming: upcomingEvents,
    drafts: draftEvents,
    past: pastEvents,
    all: events,
  }

  const displayed = tabEvents[tab]

  const TAB_LABELS: { key: Tab; label: string; count?: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { key: 'drafts',   label: 'Drafts',   count: draftEvents.length },
    { key: 'past',     label: 'Past',     count: pastEvents.length },
    { key: 'all',      label: 'All' },
  ]

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }
  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none', fontFamily: 'var(--font-dm-sans)',
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>My Events</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={{ ...btn, background: 'transparent', color: 'var(--wimc-text-secondary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span> Search
          </button>
          <button
            onClick={() => router.push('/dashboard/events/create')}
            style={{ ...btn, background: 'var(--wimc-coral)', color: '#fff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> New Event
          </button>
        </div>
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Tab row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--wimc-border-subtle)' }}>
          {TAB_LABELS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '10px 18px', fontSize: 13.5, fontWeight: 600,
                color: tab === key ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                borderBottom: tab === key ? '2px solid var(--wimc-coral)' : '2px solid transparent',
                marginBottom: -1, background: 'transparent', border: 'none',
                borderBottomStyle: 'solid',
                cursor: 'pointer', transition: 'color 220ms ease',
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              {label}
              {count != null && (
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                  background: 'var(--wimc-bg-elevated)', padding: '1px 7px',
                  borderRadius: 9999, marginLeft: 5,
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Event cards */}
        {displayed.length === 0 ? (
          <div
            style={{
              border: '2px dashed var(--wimc-border-default)', borderRadius: 18,
              padding: 40, textAlign: 'center', cursor: 'pointer',
              transition: 'all 220ms ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-coral)'; el.style.background = 'var(--wimc-coral-dim)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-border-default)'; el.style.background = 'transparent' }}
            onClick={() => router.push('/dashboard/events/create')}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 18, background: 'var(--wimc-bg-elevated)',
              display: 'grid', placeItems: 'center', margin: '0 auto 14px',
              border: '1px solid var(--wimc-border-default)',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--wimc-coral)' }}>add_circle</span>
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Create your next experience
            </div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
              Walks, workshops, pop-ups, screenings — anything.
            </div>
          </div>
        ) : (
          displayed.map((event) => {
            const eBookings = bookingsByEvent[event.id] ?? []
            const revenue = eBookings.reduce((s, b) => s + (b.amount_paid ?? 0), 0)
            return (
              <EventCard
                key={event.id}
                event={event}
                booked={eBookings.length}
                revenue={revenue}
                username={username}
                onEdit={(e) => router.push(`/dashboard/events/${e.id}`)}
              />
            )
          })
        )}

        {/* Add more prompt when events exist */}
        {displayed.length > 0 && (
          <div
            style={{
              border: '2px dashed var(--wimc-border-default)', borderRadius: 18,
              padding: 24, textAlign: 'center', cursor: 'pointer',
              transition: 'all 220ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              color: 'var(--wimc-text-secondary)', fontSize: 14, fontWeight: 600,
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-coral)'; el.style.color = 'var(--wimc-coral)'; el.style.background = 'var(--wimc-coral-dim)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-border-default)'; el.style.color = 'var(--wimc-text-secondary)'; el.style.background = 'transparent' }}
            onClick={() => router.push('/dashboard/events/create')}
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add a new event
          </div>
        )}
      </div>
    </>
  )
}
