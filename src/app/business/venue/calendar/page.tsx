import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import VenueCalendarClient from '@/components/venue/calendar/VenueCalendarClient'

export const metadata = { title: 'Calendar — Venue' }

export default async function VenueCalendarPage() {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name, google_calendar_connected')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <VenueCalendarClient
        venueName={venue.name}
        venueId={venue.id}
        googleCalendarConnected={venue.google_calendar_connected ?? false}
      />
    </div>
  )
}
