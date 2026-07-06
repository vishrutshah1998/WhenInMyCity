'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveEvent, unsaveEvent } from '@/app/actions/explorer'
import type { Event } from '@/types/database'

interface Props {
  events: Event[]
  followedCount: number
}

export default function FeedClient({ events, followedCount }: Props) {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)

  async function toggleSave(eventId: string) {
    if (saving) return
    setSaving(eventId)
    const isSaved = saved.has(eventId)
    setSaved((prev) => {
      const next = new Set(prev)
      isSaved ? next.delete(eventId) : next.add(eventId)
      return next
    })
    const result = isSaved ? await unsaveEvent(eventId) : await saveEvent(eventId)
    if (result.error) {
      setSaved((prev) => {
        const next = new Set(prev)
        isSaved ? next.add(eventId) : next.delete(eventId)
        return next
      })
    }
    setSaving(null)
  }

  if (followedCount === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Follow some creators</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>
          Visit a creator&apos;s page and tap &quot;Follow&quot; to see their upcoming events here.
        </div>
        <Link
          href="/explore"
          style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--wimc-coral)', color: '#fff', textDecoration: 'none',
          }}
        >
          Discover creators
        </Link>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          Nothing upcoming from {followedCount} creator{followedCount !== 1 ? 's' : ''} you follow
        </div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>Check back soon — new events will appear here.</div>
        <Link
          href="/explore"
          style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--wimc-coral)', color: '#fff', textDecoration: 'none',
          }}
        >
          Discover events
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 20,
        fontFamily: 'var(--font-jetbrains-mono)',
      }}>
        {events.length} upcoming event{events.length !== 1 ? 's' : ''} from {followedCount} creator{followedCount !== 1 ? 's' : ''} you follow
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((event) => (
          <FeedEventCard
            key={event.id}
            event={event}
            isSaved={saved.has(event.id)}
            isSaving={saving === event.id}
            onToggleSave={() => toggleSave(event.id)}
          />
        ))}
      </div>
    </div>
  )
}

function FeedEventCard({
  event,
  isSaved,
  isSaving,
  onToggleSave,
}: {
  event: Event
  isSaved: boolean
  isSaving: boolean
  onToggleSave: () => void
}) {
  const date = new Date(event.starts_at)
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const priceStr = event.ticket_price === 0 ? 'Free' : `₹${(event.ticket_price / 100).toFixed(0)}`

  const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const urgency = daysUntil <= 3 ? 'var(--wimc-coral)' : daysUntil <= 7 ? 'var(--wimc-amber)' : 'var(--wimc-text-muted)'

  return (
    <div style={{
      display: 'flex', gap: 16,
      background: 'var(--wimc-bg-raised)',
      borderRadius: 10,
      border: '1px solid var(--wimc-border-subtle)',
      overflow: 'hidden',
    }}>
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt={event.title}
          style={{ width: 120, height: 100, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 120, height: 100, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--wimc-coral-dim), var(--wimc-amber))',
          display: 'grid', placeItems: 'center', fontSize: 32,
        }}>
          🎭
        </div>
      )}

      <div style={{ flex: 1, padding: '14px 0', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 6 }}>
          {dateStr} · {timeStr} · {event.venue_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--wimc-coral)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {priceStr}
          </span>
          <span style={{
            fontSize: 11, color: urgency,
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil}d`}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8, padding: '0 16px', flexShrink: 0,
      }}>
        <button
          onClick={onToggleSave}
          disabled={isSaving}
          title={isSaved ? 'Remove from saved' : 'Save event'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: isSaved ? 'var(--wimc-coral)' : 'var(--wimc-text-muted)',
            padding: 4, opacity: isSaving ? 0.5 : 1,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 22, fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
          >
            bookmark
          </span>
        </button>
        <Link
          href={`/events/${event.slug}`}
          style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: 'var(--wimc-coral)', color: '#fff', textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          View
        </Link>
      </div>
    </div>
  )
}
