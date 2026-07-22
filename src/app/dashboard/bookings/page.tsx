import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'

export default async function BookingsPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const [eventsResult, inquiriesResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, starts_at, status, ticket_price')
      .eq('creator_id', profile.id)
      .order('starts_at', { ascending: false }),
    supabase
      .from('booking_inquiries')
      .select('id, requester_name, requester_email, event_type, message, status, accepted_at, created_at')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false }),
  ])

  const events = eventsResult.data ?? []
  const eventIds = events.map((e) => e.id)

  const { data: rsvps } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('id, event_id, attendee_name, payment_status, amount_paid, created_at')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <BookingsClient
      events={events}
      rsvps={rsvps ?? []}
      inquiries={inquiriesResult.data ?? []}
    />
  )
}
