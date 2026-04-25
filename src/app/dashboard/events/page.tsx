import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import EventsClient from './EventsClient'
import type { BookingRow } from '@/types/database'

export default async function EventsPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('creator_id', profile.id)
    .order('starts_at', { ascending: false })

  const eventIds = (events ?? []).map((e) => e.id)
  const { data: bookingRows } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('id, event_id, attendee_name, payment_status, amount_paid, created_at')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
    : { data: [] }

  return (
    <Suspense>
      <EventsClient
        events={events ?? []}
        bookings={(bookingRows ?? []) as unknown as BookingRow[]}
        username={profile.username ?? ''}
      />
    </Suspense>
  )
}
