import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVenueBookings } from '@/app/actions/venue-bookings'
import BookingsPageClient from '@/components/venue/bookings/BookingsPageClient'

export default async function VenueBookingsPage() {
  const { user } = await requireAuth('/business/venue/bookings')

  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { proposals, error } = await getVenueBookings(venue.id, [
    'pending',
    'counter_offered',
    'accepted',
    'declined',
    'expired',
    'withdrawn',
  ])

  return (
    <BookingsPageClient
      venueId={venue.id}
      initialProposals={proposals}
      fetchError={error}
    />
  )
}
