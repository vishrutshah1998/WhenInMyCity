import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import ExplorerProfileEditClient from './ExplorerProfileEditClient'

export default async function ExplorerDashboardProfilePage() {
  const { user } = await requireAuth('/explore/dashboard')
  const admin = createAdminClient()

  const [epRes, upRes] = await Promise.all([
    admin
      .from('explorer_profiles')
      .select('display_name, avatar_url, city, interest_tags, preferred_formats, neighbourhood_preference, price_range_max_paise, notification_preferences')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('username, city, show_city_mastery')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!epRes.data) redirect('/onboarding')

  type NotifPrefs = { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  const notifPrefs = (epRes.data.notification_preferences ?? { whatsapp: false, digest_frequency: 'weekly' }) as NotifPrefs

  return (
    <ExplorerProfileEditClient
      explorerProfile={{ ...epRes.data, notification_preferences: notifPrefs }}
      username={upRes.data?.username ?? ''}
      city={upRes.data?.city ?? epRes.data.city}
    />
  )
}
