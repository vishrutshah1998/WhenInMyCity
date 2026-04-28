import { requireProfile } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import CreateEventForm from './create-event-form'

export default async function CreateEventPage() {
  const { profile } = await requireProfile()

  const admin = createAdminClient()
  const { data: venues } = await admin
    .from('venue_directory')
    .select('id, name, address, city, lat, lng, photos, category, capacity_max, google_maps_url')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <CreateEventForm
      venues={venues ?? []}
      profile={{
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        user_tier: profile.user_tier,
      }}
    />
  )
}
