'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { unsaveEvent } from '@/app/actions/explorer'
import type { ExplorerIdentity } from '@/app/actions/explorer'
import type { MyTicket } from '@/app/actions/rsvp'
import type { Event } from '@/types/database'
import type { SpotList } from '@/app/actions/spotLists'
import SpotListsPanel from './SpotListsPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileTab = 'tickets' | 'saved' | 'spots'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1
    ? name.slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatTag(tag: string): string {
  return tag.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

function fmtDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(new Date(iso))
}

function fmtPrice(paise: number): string {
  return paise === 0 ? 'FREE' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  identity:    ExplorerIdentity | null
  tickets:     MyTicket[]
  savedEvents: Event[]
  spotLists:   SpotList[]
}

// ── Identity card ─────────────────────────────────────────────────────────────

function IdentityCard({ identity }: { identity: ExplorerIdentity }) {
  return (
    <div style={{
      background:   'var(--wimc-bg-elevated)',
      border:       '1px solid var(--wimc-border-default)',
      borderRadius: 16,
      padding:      '20px 20px 18px',
      marginBottom: 20,
    }}>
      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        {/* Avatar */}
        {identity.avatarUrl ? (
          <img
            src={identity.avatarUrl}
            alt={identity.displayName}
            width={56}
            height={56}
            style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(155,143,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#9B8FFF',
            fontFamily: 'var(--font-syne)',
          }}>
            {initials(identity.displayName)}
          </div>
        )}

        {/* Name + city */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 20, fontWeight: 800, color: 'var(--wimc-text-primary)',
            fontFamily: 'var(--font-syne)', lineHeight: 1.15,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {identity.displayName}
          </div>
          {identity.city && (
            <div style={{
              fontSize: 12, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-dm-sans)', marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {identity.city}
            </div>
          )}
        </div>

        {/* Edit link */}
        <Link
          href="/explore/dashboard/settings"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 7,
            border: '1px solid var(--wimc-border-default)',
            color: 'var(--wimc-text-secondary)', textDecoration: 'none',
            fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-dm-sans)',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
          Edit
        </Link>
      </div>

      {/* Interest tags */}
      {identity.interestTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {identity.interestTags.map(tag => (
            <span
              key={tag}
              style={{
                padding: '3px 10px', borderRadius: 9999,
                background: 'rgba(155,143,255,0.12)',
                border: '1px solid rgba(155,143,255,0.22)',
                color: '#9B8FFF',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-dm-sans)',
              }}
            >
              {formatTag(tag)}
            </span>
          ))}
        </div>
      )}

      {/* Bio */}
      {identity.bio && (
        <p style={{
          fontSize: 13, color: 'var(--wimc-text-secondary)',
          fontFamily: 'var(--font-dm-sans)', lineHeight: 1.6,
          margin: '0 0 12px',
        }}>
          {identity.bio}
        </p>
      )}

      {/* Instagram handle */}
      {identity.instagramHandle && (
        <a
          href={`https://instagram.com/${identity.instagramHandle.replace(/^@/, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--wimc-text-secondary)',
            textDecoration: 'none', fontFamily: 'var(--font-dm-sans)',
          }}
        >
          <span style={{ fontSize: 14 }}>📸</span>
          @{identity.instagramHandle.replace(/^@/, '')}
          <span style={{ fontSize: 11, opacity: 0.6 }}>↗</span>
        </a>
      )}
    </div>
  )
}

// ── Ticket card ───────────────────────────────────────────────────────────────

const LAVENDER = '#9B8FFF'

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const now  = new Date().toISOString()
  const past = ticket.eventStartsAt <= now

  return (
    <div style={{
      background:  '#FAF7F0',
      border:      '1.5px dashed rgba(26,39,68,0.22)',
      borderLeft:  `3px solid ${past ? 'rgba(152,150,176,0.5)' : LAVENDER}`,
      padding:     '13px 16px',
    }}>
      <div style={{
        fontFamily:    'var(--font-jetbrains-mono)',
        fontSize:      8, color: 'rgba(26,39,68,0.38)',
        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 7,
      }}>
        WHEN IN MY CITY · {past ? 'ATTENDED' : 'UPCOMING'}
      </div>

      <div style={{ borderTop: '1px dashed rgba(26,39,68,0.13)', marginBottom: 8 }} />

      <Link href={`/events/${ticket.eventSlug}`} style={{ textDecoration: 'none' }}>
        <div style={{
          fontFamily: 'var(--font-outfit)', fontSize: 15, fontWeight: 700,
          color: '#1A1711', marginBottom: 3,
        }}>
          {ticket.eventTitle}
        </div>
      </Link>
      <div style={{
        fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
        color: 'rgba(26,39,68,0.50)', marginBottom: 10,
      }}>
        {ticket.venueName} · {fmtDate(ticket.eventStartsAt)}
      </div>

      <div style={{
        borderTop:   '1px dashed rgba(26,39,68,0.13)',
        paddingTop:  8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {!past && (
          <Link
            href="/explore/tickets"
            style={{
              display:     'inline-flex', alignItems: 'center', gap: 4,
              padding:     '4px 11px', background: LAVENDER, color: '#07070A',
              fontFamily:  'var(--font-jetbrains-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>qr_code</span>
            Show QR
          </Link>
        )}
        {past && (
          <Link
            href={`/events/${ticket.eventSlug}#rate`}
            style={{
              display:     'inline-flex', alignItems: 'center', gap: 4,
              padding:     '4px 11px',
              border:      '1px solid rgba(245,168,0,0.4)', color: '#F5A800',
              fontFamily:  'var(--font-jetbrains-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>star</span>
            Rate event
          </Link>
        )}
        <span style={{
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
          color: 'rgba(26,39,68,0.45)',
        }}>
          ₹{Math.round(ticket.amountPaid / 100).toLocaleString('en-IN')}
        </span>
        {ticket.checkedIn && (
          <span style={{
            fontFamily:    'var(--font-jetbrains-mono)', fontSize: 9,
            color:         '#22C55E',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            ✓ Checked in
          </span>
        )}
      </div>
    </div>
  )
}

// ── Saved event row ───────────────────────────────────────────────────────────

function SavedEventRow({
  event,
  onRemove,
  removing,
}: {
  event:    Event
  onRemove: () => void
  removing: boolean
}) {
  return (
    <div style={{
      background:  'var(--wimc-bg-elevated)',
      border:      '1px solid var(--wimc-border-default)',
      borderLeft:  `3px solid ${LAVENDER}`,
      padding:     '12px 14px',
      display:     'flex', alignItems: 'center', gap: 12,
      opacity:     removing ? 0.5 : 1,
      transition:  'opacity 200ms',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
          <div style={{
            fontSize:      13, fontWeight: 600, color: 'var(--wimc-text-primary)',
            fontFamily:    'var(--font-dm-sans)',
            overflow:      'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom:  3,
          }}>
            {event.title}
          </div>
        </Link>
        <div style={{
          fontSize:  11, color: 'var(--wimc-text-secondary)',
          fontFamily: 'var(--font-jetbrains-mono)',
          overflow:  'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.venue_name} · {fmtDateShort(event.starts_at)} · {fmtPrice(event.ticket_price)}
        </div>
      </div>
      <button
        onClick={onRemove}
        disabled={removing}
        style={{
          flexShrink:    0,
          background:    'transparent',
          border:        '1px solid rgba(244,114,182,0.30)',
          color:         '#F472B6',
          cursor:        removing ? 'default' : 'pointer',
          padding:       '3px 9px', borderRadius: 4,
          fontFamily:    'var(--font-jetbrains-mono)',
          fontSize:      9, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
      >
        Remove
      </button>
    </div>
  )
}

// ── Tickets panel ─────────────────────────────────────────────────────────────

function TicketsPanel({ tickets }: { tickets: MyTicket[] }) {
  const now      = new Date().toISOString()
  const upcoming = tickets.filter(t => t.eventStartsAt > now)
  const past     = tickets.filter(t => t.eventStartsAt <= now)

  if (tickets.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 24px',
        color: 'var(--wimc-text-secondary)', fontSize: 14,
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 32, display: 'block', marginBottom: 10,
          color: 'var(--wimc-text-muted)',
        }}>
          confirmation_number
        </span>
        No tickets yet.{' '}
        <Link href="/explore" style={{ color: LAVENDER, textDecoration: 'none' }}>
          Browse events →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {upcoming.length > 0 && (
        <div>
          <SectionLabel label="Upcoming" count={upcoming.length} color={LAVENDER} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(t => <TicketCard key={t.rsvpId} ticket={t} />)}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <SectionLabel label="Past" count={past.length} color="var(--wimc-text-muted)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {past.map(t => <TicketCard key={t.rsvpId} ticket={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Saved panel ───────────────────────────────────────────────────────────────

function SavedPanel({ initialEvents }: { initialEvents: Event[] }) {
  const [events,     setEvents]     = useState(initialEvents)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [,           startTransition] = useTransition()

  function handleRemove(id: string) {
    setRemovingId(id)
    startTransition(async () => {
      await unsaveEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
      setRemovingId(null)
    })
  }

  if (events.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 24px',
        color: 'var(--wimc-text-secondary)', fontSize: 14,
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 32, display: 'block', marginBottom: 10,
          color: 'var(--wimc-text-muted)',
        }}>
          bookmark
        </span>
        No saved events.{' '}
        <Link href="/explore" style={{ color: LAVENDER, textDecoration: 'none' }}>
          Browse events →
        </Link>
        {/* Extension point: saved City Guide places will appear here in Phase C
            when explorer_profiles.saved_place_ids is wired to the guide module. */}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map(ev => (
        <SavedEventRow
          key={ev.id}
          event={ev}
          onRemove={() => handleRemove(ev.id)}
          removing={removingId === ev.id}
        />
      ))}
      {/* Extension point: saved City Guide places row goes here (Phase C) */}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <div style={{
      fontFamily:    'var(--font-jetbrains-mono)',
      fontSize:      9, fontWeight: 700,
      color, letterSpacing: '0.2em', textTransform: 'uppercase',
      marginBottom:  10,
    }}>
      {label} · {count}
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function ExplorerProfileClient({
  identity,
  tickets,
  savedEvents,
  spotLists,
}: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('tickets')

  const now             = new Date().toISOString()
  const upcomingCount   = tickets.filter(t => t.eventStartsAt > now).length

  // ── No Explorer profile yet ──────────────────────────────────────────────────
  if (!identity) {
    return (
      <div style={{
        maxWidth: 480, margin: '0 auto', padding: '48px 24px',
        textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 40, color: 'var(--wimc-text-muted)', display: 'block', marginBottom: 16,
        }}>
          person
        </span>
        <div style={{
          fontSize: 16, fontWeight: 700, color: 'var(--wimc-text-primary)',
          fontFamily: 'var(--font-syne)', marginBottom: 8,
        }}>
          Complete your Explorer profile
        </div>
        <div style={{
          fontSize: 13, color: 'var(--wimc-text-secondary)',
          fontFamily: 'var(--font-dm-sans)', marginBottom: 20, lineHeight: 1.6,
        }}>
          Tell us a bit about yourself to get personalised event recommendations.
        </div>
        <Link
          href="/onboarding/explorer"
          style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 9,
            background: '#9B8FFF', color: '#07070A',
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', textDecoration: 'none',
          }}
        >
          Set up profile →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Identity card ─────────────────────────────────────────────────── */}
      <IdentityCard identity={identity} />

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--wimc-border-subtle)',
        marginBottom: 20,
      }}>
        {([
          {
            key:   'tickets' as ProfileTab,
            label: 'Tickets',
            icon:  'confirmation_number',
            badge: upcomingCount > 0 ? upcomingCount : null,
          },
          {
            key:   'saved' as ProfileTab,
            label: 'Saved',
            icon:  'bookmark',
            badge: savedEvents.length > 0 ? savedEvents.length : null,
          },
          {
            key:   'spots' as ProfileTab,
            label: 'Spots',
            icon:  'pin_drop',
            badge: spotLists.filter(l => l.status === 'published').length > 0
                     ? spotLists.filter(l => l.status === 'published').length
                     : null,
          },
        ] as const).map(({ key, label, icon, badge }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display:      'flex', alignItems: 'center', gap: 6,
                padding:      '10px 16px',
                fontSize:     13, fontWeight: active ? 600 : 400,
                color:        active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                background:   'transparent', border: 'none', cursor: 'pointer',
                borderBottom: active ? '2px solid var(--wimc-coral)' : '2px solid transparent',
                fontFamily:   'var(--font-dm-sans)',
                transition:   'color 180ms, border-color 180ms',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 17,
                  fontVariationSettings: active
                    ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
                    : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                }}
              >
                {icon}
              </span>
              {label}
              {badge !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? 'var(--wimc-coral)' : 'var(--wimc-text-muted)',
                  color: '#fff', borderRadius: 9999, padding: '1px 5px',
                  lineHeight: 1.4,
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab panels ────────────────────────────────────────────────────── */}
      {activeTab === 'tickets' && <TicketsPanel tickets={tickets} />}
      {activeTab === 'saved'   && <SavedPanel initialEvents={savedEvents} />}
      {activeTab === 'spots'   && <SpotListsPanel initialLists={spotLists} />}

    </div>
  )
}
