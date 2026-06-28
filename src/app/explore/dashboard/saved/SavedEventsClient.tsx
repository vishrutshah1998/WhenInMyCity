'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { unsaveEvent } from '@/app/actions/explorer'
import type { Event } from '@/types/database'

const LAVENDER = '#9B8FFF'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
}

function fmtPrice(paise: number) {
  return paise === 0 ? 'FREE' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function SavedEventsClient({ events }: { events: Event[] }) {
  const [localEvents, setLocalEvents] = useState(events)
  const [isPending, startTransition] = useTransition()

  function handleRemove(eventId: string) {
    setLocalEvents(prev => prev.filter(e => e.id !== eventId))
    startTransition(async () => {
      await unsaveEvent(eventId)
    })
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 8 }}>
        Saved Events
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 28 }}>
        Events you&apos;ve bookmarked for later.
      </p>

      {localEvents.length === 0 ? (
        <div style={{
          background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
          padding: '40px 24px', textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#9896B0', display: 'block', marginBottom: 10 }}>
            bookmark
          </span>
          <p style={{ fontSize: 13, color: '#9896B0', margin: '0 0 16px' }}>
            No saved events yet. Browse and tap the bookmark icon.
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
            Browse events →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {localEvents.map(ev => (
            <div
              key={ev.id}
              style={{
                background: '#131317',
                border: '1px solid rgba(155,143,255,0.15)',
                borderLeft: `3px solid ${LAVENDER}`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/events/${ev.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    fontFamily: 'var(--font-outfit)',
                    fontSize: 15, fontWeight: 700, color: '#F0EFF8',
                    marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ev.title}
                  </div>
                </Link>
                <div style={{
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 10, color: '#9896B0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ev.venue_name} · {fmtDate(ev.starts_at)} · {fmtPrice(ev.ticket_price)}
                </div>
              </div>
              <button
                onClick={() => handleRemove(ev.id)}
                disabled={isPending}
                title="Remove from saved"
                style={{
                  background: 'transparent', border: '1px solid rgba(244,114,182,0.3)',
                  color: '#F472B6', cursor: 'pointer', padding: '4px 10px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
                  letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 4,
                  transition: 'all 150ms',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
