'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/types/database'
import { markNotificationRead } from '@/app/actions/notifications'

// ---------------------------------------------------------------------------
// BookingConfirmedBanner
// Dismissible "your booking is confirmed" banner for the Venue and Creator
// dashboards. Driven directly by unread notification rows (not a separate
// dismiss-state store) — dismissing calls the existing markNotificationRead,
// the same action the notification bell already uses on click, so dismissal
// is consistent and persisted across devices/sessions rather than local-only.
// ---------------------------------------------------------------------------

interface Props {
  notifications: Notification[]
  theme: 'dark' | 'light'
}

const THEME = {
  dark: {
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.05) 100%)',
    border: 'rgba(16,185,129,0.3)',
    iconBg: 'rgba(16,185,129,0.16)',
    iconColor: 'var(--venue-success)',
    title: 'var(--venue-text-primary)',
    body: 'var(--venue-text-secondary)',
    titleFont: 'var(--font-syne), system-ui, sans-serif',
    bodyFont: 'var(--font-inter), system-ui, sans-serif',
    dismissColor: 'var(--venue-text-muted)',
  },
  light: {
    bg: 'linear-gradient(135deg, rgba(22,163,74,0.12) 0%, rgba(232,112,90,0.06) 100%)',
    border: 'rgba(22,163,74,0.28)',
    iconBg: 'rgba(22,163,74,0.14)',
    iconColor: '#16A34A',
    title: '#1A2744',
    body: '#5A6478',
    titleFont: 'var(--font-syne), system-ui, sans-serif',
    bodyFont: 'var(--font-dm-sans), sans-serif',
    dismissColor: '#8A93A6',
  },
} as const

export default function BookingConfirmedBanner({ notifications, theme }: Props) {
  const router = useRouter()
  const t = THEME[theme]
  const [visible, setVisible] = useState(notifications)

  function dismiss(id: string) {
    setVisible((prev) => prev.filter((n) => n.id !== id))
    void markNotificationRead(id)
  }

  function handleClick(n: Notification) {
    dismiss(n.id)
    if (n.action_url) router.push(n.action_url)
  }

  if (visible.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      {visible.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: t.iconBg, display: 'grid', placeItems: 'center', fontSize: 18,
          }}>
            🎉
          </div>

          <button
            onClick={() => handleClick(n)}
            style={{
              flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none',
              cursor: n.action_url ? 'pointer' : 'default', padding: 0,
            }}
          >
            <div style={{ fontFamily: t.titleFont, fontWeight: 700, fontSize: 14, color: t.title, marginBottom: 2 }}>
              {n.title}
            </div>
            {n.body && (
              <div style={{ fontFamily: t.bodyFont, fontSize: 12.5, color: t.body, lineHeight: 1.5 }}>
                {n.body}
              </div>
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
            aria-label="Dismiss"
            style={{
              display: 'grid', placeItems: 'center', flexShrink: 0,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.dismissColor, padding: 4, borderRadius: 6, fontSize: 16, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
