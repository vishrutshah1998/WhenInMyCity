'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/types/database'
import {
  getAddaNotifications,
  markAddaNotificationRead,
  markAllAddaNotificationsRead,
} from '@/app/actions/venue-notifications'
import { NOTIFICATION_META } from '@/lib/notifications/types'

const TEAL = '#5DD9D0'

function getMeta(type: string) {
  const m = NOTIFICATION_META[type]
  return { icon: m?.icon ?? 'notifications', color: m?.color ?? TEAL }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

interface Props {
  addaId: string
  initialNotifications?: Notification[]
  initialUnreadCount?: number
}

export default function VenueNotificationBell({
  addaId,
  initialNotifications = [],
  initialUnreadCount = 0,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount]     = useState(initialUnreadCount)
  const [open, setOpen]                   = useState(false)
  const panelRef  = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Refresh notifications on open
  useEffect(() => {
    if (!open) return
    getAddaNotifications(addaId, 10).then(({ notifications: fresh, unreadCount: count }) => {
      setNotifications(fresh)
      setUnreadCount(count)
    }).catch(() => {})
  }, [open, addaId])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
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
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      setUnreadCount((c) => Math.max(0, c - 1))
      await markAddaNotificationRead(n.id)
    }
    if (n.action_url) {
      setOpen(false)
      router.push(n.action_url)
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await markAllAddaNotificationsRead()
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
          background: open ? 'rgba(93,217,208,0.08)' : 'none',
          border: '1px solid var(--venue-border-subtle)',
          borderRadius: 8, width: 34, height: 34,
          display: 'grid', placeItems: 'center',
          cursor: 'pointer', color: 'var(--venue-text-muted)',
          transition: 'background 150ms',
        }}
        title="Notifications"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 9999,
            background: TEAL, color: '#07070A',
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
            background: 'var(--venue-bg-surface)',
            border: '1px solid var(--venue-border-subtle)',
            borderTop: `2px solid ${TEAL}`,
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
            borderBottom: '1px solid var(--venue-border-subtle)',
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontWeight: 700, fontSize: 14,
              color: 'var(--venue-text-primary)',
            }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 600,
                  color: TEAL,
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: TEAL, fontWeight: 600, padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setOpen(false); router.push('/business/venue/notifications') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--venue-text-muted)', fontWeight: 500,
                  padding: 0,
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}
              >
                See all →
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
                color: 'var(--venue-text-muted)', fontSize: 13,
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
                      background: n.is_read ? 'transparent' : `${TEAL}08`,
                      cursor: n.action_url ? 'pointer' : 'default',
                      borderBottom: '1px solid var(--venue-border-subtle)',
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
                        color: 'var(--venue-text-primary)',
                        lineHeight: 1.35, marginBottom: 2,
                      }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: 12, color: 'var(--venue-text-secondary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, color: 'var(--venue-text-muted)', marginTop: 4,
                        fontFamily: 'var(--font-jetbrains-mono)',
                      }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: TEAL, flexShrink: 0, marginTop: 6,
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
