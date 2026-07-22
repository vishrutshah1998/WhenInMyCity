import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { getCreatorEventsWithBookings } from '@/app/actions/events'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const { profile } = await requireProfile()
  const { events, bookings } = await getCreatorEventsWithBookings(profile.id)

  return (
    <Suspense>
      <EventsClient
        events={events}
        bookings={bookings}
        username={profile.username ?? ''}
      />
    </Suspense>
  )
}
