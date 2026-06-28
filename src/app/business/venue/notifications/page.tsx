import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAddaNotifications } from '@/app/actions/adda-notifications'
import { AddaNotificationsClient } from '@/components/adda/AddaNotificationsClient'

export const metadata = { title: 'Inbox — Adda' }

export default async function AddaNotificationsPage() {
  const { user } = await requireAuth('/business/venue/notifications')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const { notifications, unreadCount } = await getAddaNotifications(adda.id, 100)

  return <AddaNotificationsClient notifications={notifications} unreadCount={unreadCount} />
}
