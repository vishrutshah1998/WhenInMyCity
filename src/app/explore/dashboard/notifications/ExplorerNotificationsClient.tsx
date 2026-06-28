'use client'

import type { Notification } from '@/types/database'
import { NotificationsPageClient } from '@/components/dashboard/NotificationsPageClient'

interface Props {
  notifications: Notification[]
  unreadCount: number
}

export default function ExplorerNotificationsClient({ notifications, unreadCount }: Props) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 24 }}>
        Notifications
      </h1>
      <NotificationsPageClient notifications={notifications} unreadCount={unreadCount} />
    </div>
  )
}
