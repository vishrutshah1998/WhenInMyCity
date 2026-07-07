import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import CreateEventForm from './create-event-form'

export default async function DashboardCreateEventPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const { data: venueRows } = await supabase
    .from('venue_profiles')
    .select('id, name, city, address, lat, lng, capacity_max')
    .ilike('city', `%${profile.city ?? ''}%`)
    .eq('is_active', true)
    .limit(20)

  const venues = (venueRows ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address ?? '',
    city: v.city ?? '',
    lat: v.lat ?? null,
    lng: v.lng ?? null,
    photos: null,
    category: null,
    capacity_max: v.capacity_max ?? null,
    google_maps_url: null,
  }))

  return (
    <CreateEventForm
      venues={venues}
      profile={{
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        user_tier: profile.user_tier,
      }}
    />
  )
}
