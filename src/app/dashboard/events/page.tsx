import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { getCreatorEventsWithBookings } from '@/app/actions/events'
import { getProposalHistory } from '@/app/actions/venue'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const { profile } = await requireProfile()
  const [{ events, bookings }, venueProposals] = await Promise.all([
    getCreatorEventsWithBookings(profile.id),
    getProposalHistory(profile.id),
  ])

  return (
    <Suspense>
      <EventsClient
        events={events}
        bookings={bookings}
        username={profile.username ?? ''}
        profileId={profile.id}
        venueProposals={venueProposals}
      />
    </Suspense>
  )
}
