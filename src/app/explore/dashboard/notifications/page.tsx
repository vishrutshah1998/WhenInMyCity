import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNotificationsForUser } from '@/app/actions/notifications'
import ExplorerNotificationsClient from './ExplorerNotificationsClient'

export default async function ExplorerDashboardNotificationsPage() {
  const { user } = await requireAuth('/explore/dashboard/notifications')
  const admin = createAdminClient()

  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  const notifications = await getNotificationsForUser()
  const unreadCount = notifications.filter(n => !n.is_read).length

  return <ExplorerNotificationsClient notifications={notifications} unreadCount={unreadCount} />
}
