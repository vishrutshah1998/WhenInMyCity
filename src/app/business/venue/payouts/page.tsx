import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import VenuePayoutsClient from './VenuePayoutsClient'
import { getVenuePayoutData } from '@/app/actions/venue-payouts'

export const metadata = { title: 'Payouts — Venue' }

export default async function VenuePayoutsPage() {
  const { user } = await requireAuth('/business/venue/payouts')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { summary, payableBookings, payoutHistory, error } = await getVenuePayoutData(venue.id)

  return (
    <VenuePayoutsClient
      venueId={venue.id}
      summary={summary}
      initialPayableBookings={payableBookings}
      initialPayoutHistory={payoutHistory}
      serverError={error}
    />
  )
}
