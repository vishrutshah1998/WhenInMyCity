'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types/database'
import { NOTIFICATION_META } from '@/lib/notifications/types'
import { markVenueNotificationRead, markAllVenueNotificationsRead } from '@/app/actions/venue-notifications'

const TEAL = '#5DD9D0'

const FILTER_TABS = [
  { key: 'all',       label: 'All'       },
  { key: 'unread',    label: 'Unread'    },
  { key: 'proposals', label: 'Proposals' },
  { key: 'events',    label: 'Events'    },
  { key: 'ratings',   label: 'Ratings'   },
] as const

type FilterKey = (typeof FILTER_TABS)[number]['key']

const FILTER_TYPES: Record<FilterKey, string[] | null> = {
  all:       null,
  unread:    null,
  proposals: ['venue_new_proposal', 'venue_proposal_accepted', 'venue_proposal_counter', 'new_proposal', 'proposal_accepted', 'proposal_counter'],
  events:    ['venue_event_confirmed', 'venue_booking_reminder', 'event_confirmed'],
  ratings:   ['venue_new_rating', 'venue_new_review'],
}

interface Props {
  notifications: Notification[]
  unreadCount: number
}

export function VenueNotificationsClient({ notifications: initial, unreadCount: initialUnread }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [items, setItems]             = useState(initial)
  const [unreadCount, setUnreadCount] = useState(initialUnread)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const filtered = items.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read
    const types = FILTER_TYPES[activeFilter]
    if (types) return types.includes(n.type)
    return true
  })

  async function handleClick(n: Notification) {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      setUnreadCount((c) => Math.max(0, c - 1))
      await markVenueNotificationRead(n.id)
    }
    if (n.action_url) {
      router.push(n.action_url)
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await markAllVenueNotificationsRead()
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 760 }}>
      {/* Section header — title is in the sticky topbar; this row shows unread count + bulk action */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 22, fontWeight: 800,
            color: 'var(--venue-text-primary)',
            margin: '0 0 4px',
          }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 11, color: TEAL,
              margin: 0, letterSpacing: '0.05em',
            }}>
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'none',
              border: `1px solid ${TEAL}`,
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-jetbrains-mono)',
              fontWeight: 600,
              color: TEAL,
              letterSpacing: '0.05em',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: isActive ? 'none' : '1px solid var(--venue-border-subtle)',
                background: isActive ? TEAL : 'transparent',
                color: isActive ? '#07070A' : 'var(--venue-text-secondary)',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      <div style={{
        border: '1px solid var(--venue-border-subtle)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--venue-text-muted)', opacity: 0.4 }}>
              notifications_off
            </span>
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 11,
              color: 'var(--venue-text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              No notifications here
            </span>
          </div>
        ) : (
          filtered.map((n, i) => {
            const meta  = NOTIFICATION_META[n.type]
            const icon  = meta?.icon  ?? 'circle_notifications'
            const color = meta?.color ?? TEAL

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                role={n.action_url ? 'button' : undefined}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '16px 20px',
                  background: n.is_read ? 'transparent' : `${TEAL}08`,
                  borderLeft: `3px solid ${n.is_read ? 'transparent' : TEAL}`,
                  borderBottom: i < filtered.length - 1 ? '1px dashed var(--venue-border-subtle)' : 'none',
                  cursor: n.action_url ? 'pointer' : 'default',
                  transition: 'background 150ms',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, flexShrink: 0,
                  background: `${color}18`,
                  border: `1px solid ${color}35`,
                  borderRadius: 8,
                  display: 'grid', placeItems: 'center',
                  marginTop: 2,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>
                    {icon}
                  </span>
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: n.is_read ? 500 : 700,
                    color: 'var(--venue-text-primary)',
                    lineHeight: 1.35,
                    marginBottom: 3,
                  }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{
                      fontSize: 13,
                      color: 'var(--venue-text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: 5,
                    }}>
                      {n.body}
                    </div>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 10,
                    color: 'var(--venue-text-muted)',
                    letterSpacing: '0.05em',
                  }}>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {n.action_url && (
                    <span style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: 10,
                      color: TEAL,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}>
                      View →
                    </span>
                  )}
                  {!n.is_read && (
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: TEAL,
                    }} />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
