import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'

export default async function BookingsPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, status, ticket_price')
    .eq('creator_id', profile.id)
    .order('starts_at', { ascending: false })

  const eventIds = (events ?? []).map((e) => e.id)

  const { data: rsvps } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('id, event_id, attendee_name, payment_status, amount_paid, created_at')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
        .order('created_at', { ascending: false })
    : { data: [] }

  return <BookingsClient events={events ?? []} rsvps={rsvps ?? []} />
}
