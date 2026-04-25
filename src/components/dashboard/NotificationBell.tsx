'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/types/database'
import { markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications'

// ---------------------------------------------------------------------------
// Type → icon + colour mapping
// ---------------------------------------------------------------------------

const TYPE_META: Record<string, { icon: string; color: string }> = {
  followed_maker_new_event:  { icon: 'event',              color: 'var(--wimc-coral)' },
  recommended_event_nearby:  { icon: 'location_on',        color: '#3b82f6' },
  event_reminder:            { icon: 'alarm',              color: 'var(--wimc-amber)' },
  rating_prompt:             { icon: 'star',               color: 'var(--wimc-amber)' },
  new_follower:              { icon: 'person_add',         color: '#a855f7' },
  event_rsvp:                { icon: 'confirmation_number',color: '#22c55e' },
  tier_upgrade:              { icon: 'workspace_premium',  color: 'var(--wimc-coral)' },
  proposal_response:         { icon: 'apartment',          color: '#3b82f6' },
  new_rating:                { icon: 'reviews',            color: 'var(--wimc-amber)' },
  new_proposal:              { icon: 'send',               color: '#a855f7' },
  event_confirmed:           { icon: 'check_circle',       color: '#22c55e' },
  payment_settled:           { icon: 'payments',           color: '#22c55e' },
}

function getMeta(type: string) {
  return TYPE_META[type] ?? { icon: 'notifications', color: 'var(--wimc-text-muted)' }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  initialNotifications: Notification[]
}

export default function NotificationBell({ initialNotifications }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [notifications, setNotifications] = useState(initialNotifications)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x),
      )
      await markNotificationRead(n.id)
    }
    if (n.action_url) {
      setOpen(false)
      router.push(n.action_url)
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await markAllNotificationsRead()
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          background: open ? 'var(--wimc-bg-overlay)' : 'none',
          border: '1px solid var(--wimc-border-subtle)',
          borderRadius: 8, width: 36, height: 36,
          display: 'grid', placeItems: 'center',
          cursor: 'pointer', color: 'var(--wimc-text-secondary)',
          transition: 'background 150ms',
        }}
        title="Notifications"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 9999,
            background: 'var(--wimc-coral)', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            padding: '0 3px',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360, maxHeight: 480,
            background: 'var(--wimc-bg-raised)',
            border: '1px solid var(--wimc-border-subtle)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--wimc-border-subtle)',
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14 }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 600,
                  color: 'var(--wimc-coral)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--wimc-coral)', fontWeight: 600,
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
                color: 'var(--wimc-text-muted)', fontSize: 13,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8, opacity: 0.4 }}>
                  notifications_off
                </span>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const meta = getMeta(n.type)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    style={{
                      width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 16px', border: 'none', textAlign: 'left',
                      background: n.is_read ? 'transparent' : 'rgba(232,87,42,0.04)',
                      cursor: n.action_url ? 'pointer' : 'default',
                      borderBottom: '1px solid var(--wimc-border-subtle)',
                      transition: 'background 150ms',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: `${meta.color}18`,
                      display: 'grid', placeItems: 'center',
                      marginTop: 1,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 17, color: meta.color }}>
                        {meta.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: n.is_read ? 500 : 700,
                        color: 'var(--wimc-text-primary)',
                        lineHeight: 1.35, marginBottom: 2,
                      }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: 12, color: 'var(--wimc-text-secondary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 4,
                        fontFamily: 'var(--font-jetbrains-mono)',
                      }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--wimc-coral)', flexShrink: 0, marginTop: 6,
                      }} />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
