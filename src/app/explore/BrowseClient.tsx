'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState } from 'react'
import Link from 'next/link'
import type { BrowseEvent } from '@/app/actions/explorer'
import { saveEvent, unsaveEvent } from '@/app/actions/explorer'
import { CITIES } from '@/lib/constants/interests'
import { INTEREST_TAGS } from '@/lib/constants/interests'

interface Props {
  events: BrowseEvent[]
  savedEventIds: string[]
  currentFilters: { city: string; interest_tag: string; date: string }
}

export default function BrowseClient({ events, savedEventIds, currentFilters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [saved, setSaved] = useState<Set<string>>(new Set(savedEventIds))
  const [saving, setSaving] = useState<string | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/explore?${params.toString()}`)
  }

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
      // revert
      setSaved((prev) => {
        const next = new Set(prev)
        isSaved ? next.add(eventId) : next.delete(eventId)
        return next
      })
    }
    setSaving(null)
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24,
        padding: '16px 18px',
        background: 'var(--wimc-bg-raised)',
        borderRadius: 10,
        border: '1px solid var(--wimc-border-subtle)',
      }}>
        {/* City filter */}
        <select
          value={currentFilters.city}
          onChange={(e) => updateFilter('city', e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 7, fontSize: 13,
            border: '1px solid var(--wimc-border-subtle)',
            background: 'var(--wimc-bg-base)',
            color: 'var(--wimc-text-primary)',
            cursor: 'pointer',
          }}
        >
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={currentFilters.interest_tag}
          onChange={(e) => updateFilter('interest_tag', e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 7, fontSize: 13,
            border: '1px solid var(--wimc-border-subtle)',
            background: 'var(--wimc-bg-base)',
            color: 'var(--wimc-text-primary)',
            cursor: 'pointer',
          }}
        >
          <option value="">All categories</option>
          {INTEREST_TAGS.map((t) => (
            <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
          ))}
        </select>

        {/* Date filter */}
        <input
          type="date"
          value={currentFilters.date}
          onChange={(e) => updateFilter('date', e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 7, fontSize: 13,
            border: '1px solid var(--wimc-border-subtle)',
            background: 'var(--wimc-bg-base)',
            color: 'var(--wimc-text-primary)',
            cursor: 'pointer',
          }}
        />

        {(currentFilters.city || currentFilters.interest_tag || currentFilters.date) && (
          <button
            onClick={() => router.push('/explore')}
            style={{
              padding: '7px 12px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--wimc-border-subtle)',
              background: 'transparent',
              color: 'var(--wimc-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {events.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          color: 'var(--wimc-text-secondary)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No events found</div>
          <div style={{ fontSize: 13 }}>Try adjusting your filters or check back soon.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 14, fontFamily: 'var(--font-jetbrains-mono)' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSaved={saved.has(event.id)}
                isSaving={saving === event.id}
                onToggleSave={() => toggleSave(event.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EventCard({
  event,
  isSaved,
  isSaving,
  onToggleSave,
}: {
  event: BrowseEvent
  isSaved: boolean
  isSaving: boolean
  onToggleSave: () => void
}) {
  const date = new Date(event.starts_at)
  const dateStr = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const priceStr = event.ticket_price === 0 ? 'Free' : `₹${(event.ticket_price / 100).toFixed(0)}`

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      background: 'var(--wimc-bg-raised)',
      borderRadius: 10,
      border: '1px solid var(--wimc-border-subtle)',
      overflow: 'hidden',
      transition: 'border-color 200ms',
    }}>
      {/* Cover */}
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
          display: 'grid', placeItems: 'center',
          fontSize: 32,
        }}>
          🎭
        </div>
      )}

      {/* Details */}
      <div style={{ flex: 1, padding: '14px 0', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 6 }}>
          {dateStr} · {timeStr} · {event.venue_name}
        </div>
        {event.description && (
          <div style={{
            fontSize: 12, color: 'var(--wimc-text-secondary)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            marginBottom: 8,
          }}>
            {event.description}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--wimc-coral)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {priceStr}
          </span>
          {event.creator_city && (
            <span style={{
              fontSize: 11, color: 'var(--wimc-text-muted)',
              background: 'var(--wimc-bg-overlay)', padding: '2px 7px', borderRadius: 9999,
            }}>
              {CITIES.find((c) => c.id === event.creator_city)?.name ?? event.creator_city}
            </span>
          )}
          {event.rating_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)' }}>
              ★ {event.average_rating.toFixed(1)} ({event.rating_count})
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
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
            style={{
              fontSize: 22,
              fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0",
            }}
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
