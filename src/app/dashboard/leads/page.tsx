import { requireProfile } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const { profile } = await requireProfile()
  const admin = createAdminClient()

  const { data: subscribers, count } = await admin
    .from('maker_subscribers')
    .select('id, email, subscribed_at, source, is_active', { count: 'exact' })
    .eq('maker_id', profile.id)
    .order('subscribed_at', { ascending: false })

  return (
    <LeadsClient
      subscribers={subscribers ?? []}
      total={count ?? 0}
      tier={profile.user_tier ?? 'wanderer'}
      eventsHosted={profile.cumulative_events_hosted ?? 0}
    />
  )
}
