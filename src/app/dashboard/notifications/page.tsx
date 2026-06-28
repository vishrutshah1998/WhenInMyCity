import { getNotificationsForUser } from '@/app/actions/notifications'
import { NotificationsPageClient } from '@/components/dashboard/NotificationsPageClient'

export default async function NotificationsPage() {
  const notifications = await getNotificationsForUser()
  const unreadCount = notifications.filter((n) => !n.is_read).length
  return <NotificationsPageClient notifications={notifications} unreadCount={unreadCount} />
}
