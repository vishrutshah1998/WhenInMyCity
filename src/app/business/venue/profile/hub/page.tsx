import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVenueBookings } from '@/app/actions/venue-bookings'
import { resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import VenueProfileHubClient, { type HubBookingItem } from './VenueProfileHubClient'

const VENUE_ACCENT = '#5DD9D0'

export default async function VenueProfileHubPage() {
  const { user } = await requireAuth('/business/venue/profile/hub')
  const admin = createAdminClient()

  const [{ data: venue }, { data: userProfile }] = await Promise.all([
    admin.from('venue_profiles').select('id, name, slug, description').eq('auth_user_id', user.id).maybeSingle(),
    admin.from('user_profiles').select('personas').eq('id', user.id).maybeSingle(),
  ])

  if (!venue) redirect('/business/venue/onboard')

  const { proposals } = await getVenueBookings(venue.id, ['pending', 'counter_offered', 'accepted'])

  const bookings: HubBookingItem[] = proposals.map(p => ({
    key:       p.id,
    title:     p.event_title,
    date:      p.proposed_date,
    makerName: p.maker.display_name,
    status:    p.status,
  }))

  const initials = venue.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const workspaces = resolveWorkspaces((userProfile?.personas ?? []) as string[], 'venue')

  return (
    <VenueProfileHubClient
      venueName={venue.name}
      slug={venue.slug}
      initials={initials}
      description={venue.description}
      bookings={bookings}
      workspaces={workspaces}
      accentColor={VENUE_ACCENT}
    />
  )
}
