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
      .select('display_name, avatar_url, city, interest_tags, preferred_formats, neighbourhood_preference, price_range_max_paise, notification_preferences')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('username, explorer_scene, explorer_creator_intent')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!epRes.data) redirect('/onboarding')

  type NotifPrefs = { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  const notifPrefs = (epRes.data.notification_preferences ?? { whatsapp: false, digest_frequency: 'weekly' }) as NotifPrefs

  const ep = epRes.data

  return (
    <ExplorerSettingsClient
      profile={{
        display_name:             ep.display_name,
        avatar_url:               ep.avatar_url ?? null,
        city:                     ep.city,
        interest_tags:            (ep.interest_tags as string[] | null) ?? [],
        preferred_formats:        (ep.preferred_formats as string[] | null) ?? [],
        neighbourhood_preference: ep.neighbourhood_preference ?? null,
        price_range_max_paise:    ep.price_range_max_paise ?? 0,
        notification_preferences: notifPrefs,
      }}
      explorerScene={(upRes.data as { explorer_scene?: string | null } | null)?.explorer_scene ?? ''}
      explorerCreatorIntent={((upRes.data as { explorer_creator_intent?: string[] | null } | null)?.explorer_creator_intent ?? [])[0] ?? ''}
      username={upRes.data?.username ?? ''}
      authEmail={user.email ?? ''}
    />
  )
}
