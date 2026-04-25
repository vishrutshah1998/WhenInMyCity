'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { unsaveEvent } from '@/app/actions/explorer'
import type { Event } from '@/types/database'

export default function SavedClient({ events: initial }: { events: Event[] }) {
  const [events, setEvents] = useState(initial)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleUnsave(eventId: string) {
    if (removing) return
    setRemoving(eventId)
    const { error } = await unsaveEvent(eventId)
    if (!error) setEvents((prev) => prev.filter((e) => e.id !== eventId))
    setRemoving(null)
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No saved events</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>
          Bookmark events on the Discover tab to find them here.
        </div>
        <Link
          href="/explore"
          style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--wimc-coral)', color: '#fff', textDecoration: 'none',
          }}
        >
          Browse events
        </Link>
      </div>
    )
  }

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.starts_at) > now)
  const past     = events.filter((e) => new Date(e.starts_at) <= now)

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 20, fontFamily: 'var(--font-jetbrains-mono)' }}>
        {events.length} saved event{events.length !== 1 ? 's' : ''}
      </div>

      {upcoming.length > 0 && (
        <Section label="Upcoming">
          {upcoming.map((event) => (
            <SavedEventRow
              key={event.id}
              event={event}
              isRemoving={removing === event.id}
              onUnsave={() => handleUnsave(event.id)}
            />
          ))}
        </Section>
      )}

      {past.length > 0 && (
        <Section label="Past">
          {past.map((event) => (
            <SavedEventRow
              key={event.id}
              event={event}
              isRemoving={removing === event.id}
              onUnsave={() => handleUnsave(event.id)}
              dimmed
            />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
        color: 'var(--wimc-text-muted)', marginBottom: 10,
        fontFamily: 'var(--font-jetbrains-mono)',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function SavedEventRow({
  event,
  isRemoving,
  onUnsave,
  dimmed,
}: {
  event: Event
  isRemoving: boolean
  onUnsave: () => void
  dimmed?: boolean
}) {
  const date = new Date(event.starts_at)
  const dateStr = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const priceStr = event.ticket_price === 0 ? 'Free' : `₹${(event.ticket_price / 100).toFixed(0)}`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: 'var(--wimc-bg-raised)',
      borderRadius: 10,
      border: '1px solid var(--wimc-border-subtle)',
      opacity: dimmed ? 0.65 : 1,
    }}>
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt={event.title}
          style={{ width: 60, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 60, height: 50, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--wimc-coral-dim), var(--wimc-amber))',
          display: 'grid', placeItems: 'center', fontSize: 22,
        }}>
          🎭
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{event.title}</div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
          {dateStr} · {timeStr} · {priceStr}
        </div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginTop: 2 }}>
          {event.venue_name}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={onUnsave}
          disabled={isRemoving}
          title="Remove from saved"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--wimc-coral)',
            opacity: isRemoving ? 0.4 : 1, padding: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            bookmark_remove
          </span>
        </button>
        <Link
          href={`/events/${event.slug}`}
          style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: 'var(--wimc-coral)', color: '#fff', textDecoration: 'none',
          }}
        >
          View
        </Link>
      </div>
    </div>
  )
}
