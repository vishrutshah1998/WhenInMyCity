import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AvailabilityClient from './AvailabilityClient'
import { getAvailabilityRules } from '@/app/actions/venue-availability'

export const metadata = { title: 'Availability Rules — Venue' }

export default async function AvailabilityPage() {
  const { user } = await requireAuth('/business/venue/availability')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { rules } = await getAvailabilityRules(venue.id)

  return <AvailabilityClient venueId={venue.id} initialRules={rules} />
}
