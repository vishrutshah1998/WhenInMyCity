import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import ExplorerSettingsClient from './ExplorerSettingsClient'

export default async function ExplorerDashboardSettingsPage() {
  const { user } = await requireAuth('/explore/dashboard/settings')
  const admin = createAdminClient()

  const [epRes, upRes] = await Promise.all([
    admin
      .from('explorer_profiles')
      .select('display_name, city, interest_tags, preferred_formats, neighbourhood_preference, price_range_max_paise, notification_preferences')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!epRes.data) redirect('/onboarding')

  type NotifPrefs = { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  const notifPrefs = (epRes.data.notification_preferences ?? { whatsapp: false, digest_frequency: 'weekly' }) as NotifPrefs

  return (
    <ExplorerSettingsClient
      profile={{ ...epRes.data, notification_preferences: notifPrefs }}
      username={upRes.data?.username ?? ''}
      authEmail={user.email ?? ''}
    />
  )
}
