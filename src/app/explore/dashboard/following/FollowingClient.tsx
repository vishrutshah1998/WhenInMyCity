'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { unfollowMaker, saveEvent, unsaveEvent } from '@/app/actions/explorer'
import { profileUrl } from '@/lib/profile-url'
import type { Event } from '@/types/database'

const LAVENDER = '#9B8FFF'

interface Creator {
  id: string
  display_name: string
  username: string
  creator_type: string
  city: string
  avatar_url: string | null
}

// ── Upcoming-events section ──────────────────────────────────────────────────

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
  const dateStr = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const priceStr = event.ticket_price === 0 ? 'Free' : `₹${(event.ticket_price / 100).toFixed(0)}`

  const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const urgency = daysUntil <= 3 ? 'var(--wimc-coral)' : daysUntil <= 7 ? 'var(--wimc-amber)' : 'var(--wimc-text-muted)'

  return (
    <div style={{
      display: 'flex', gap: 16,
      background: '#131317',
      borderRadius: 10,
      border: '1px solid rgba(155,143,255,0.15)',
      overflow: 'hidden',
    }}>
      {event.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
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
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3, color: '#F0EFF8' }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: '#9896B0', marginBottom: 6 }}>
          {dateStr} · {timeStr} · {event.venue_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-coral)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            {priceStr}
          </span>
          <span style={{ fontSize: 11, color: urgency, fontFamily: 'var(--font-jetbrains-mono)' }}>
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
            color: isSaved ? 'var(--wimc-coral)' : '#9896B0',
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

function UpcomingFromFollowed({ events }: { events: Event[] }) {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)

  async function toggleSave(eventId: string) {
    if (saving) return
    setSaving(eventId)
    const isSaved = saved.has(eventId)
    setSaved(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(eventId) : next.add(eventId)
      return next
    })
    const result = isSaved ? await unsaveEvent(eventId) : await saveEvent(eventId)
    if (result.error) {
      setSaved(prev => {
        const next = new Set(prev)
        isSaved ? next.add(eventId) : next.delete(eventId)
        return next
      })
    }
    setSaving(null)
  }

  if (events.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 0 }}>
        Nothing upcoming from the creators you follow — check back soon.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map(event => (
        <FeedEventCard
          key={event.id}
          event={event}
          isSaved={saved.has(event.id)}
          isSaving={saving === event.id}
          onToggleSave={() => toggleSave(event.id)}
        />
      ))}
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function FollowingClient({ creators, events }: { creators: Creator[]; events: Event[] }) {
  const [localCreators, setLocalCreators] = useState(creators)
  const [isPending, startTransition] = useTransition()

  function handleUnfollow(creatorId: string) {
    setLocalCreators(prev => prev.filter(c => c.id !== creatorId))
    startTransition(async () => {
      await unfollowMaker(creatorId)
    })
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 8 }}>
        Following
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 28 }}>
        Creators you follow — their new events show up first.
      </p>

      {localCreators.length === 0 ? (
        <div style={{
          background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
          padding: '40px 24px', textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#9896B0', display: 'block', marginBottom: 10 }}>
            group
          </span>
          <p style={{ fontSize: 13, color: '#9896B0', margin: '0 0 16px' }}>
            You&apos;re not following anyone yet.
          </p>
          <Link
            href="/explore"
            style={{
              display: 'inline-block',
              padding: '9px 20px',
              background: LAVENDER,
              color: '#07070A',
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Discover creators →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700,
              color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Upcoming
            </div>
            <UpcomingFromFollowed events={events} />
          </div>

          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700,
            color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Creators you follow
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {localCreators.map(c => {
              const initials = c.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              const url = profileUrl(c.city, c.username)
              return (
                <div
                  key={c.id}
                  style={{
                    background: '#131317',
                    border: '1px solid rgba(155,143,255,0.15)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <Link href={url} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.avatar_url}
                        alt={c.display_name}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${LAVENDER}, rgba(155,143,255,0.4))`,
                        display: 'grid', placeItems: 'center',
                        fontFamily: 'var(--font-outfit)', fontSize: 15, fontWeight: 700, color: '#fff',
                      }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 14, fontWeight: 600, color: '#F0EFF8',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.display_name}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-jetbrains-mono)',
                        fontSize: 9, color: '#9896B0',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                      }}>
                        {c.creator_type?.replace(/_/g, ' ')} · {c.city}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleUnfollow(c.id)}
                    disabled={isPending}
                    style={{
                      background: 'transparent', border: '1px solid rgba(244,114,182,0.3)',
                      color: '#F472B6', cursor: 'pointer', padding: '4px 10px',
                      fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
                      letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 4,
                      transition: 'all 150ms', flexShrink: 0,
                    }}
                  >
                    Unfollow
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
