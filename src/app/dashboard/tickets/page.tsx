import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import TicketsClient from './TicketsClient'

export default async function TicketsPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  // Fetch all creator events
  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, status, slug, capacity, ticket_price')
    .eq('creator_id', profile.id)
    .order('starts_at', { ascending: false })

  const eventIds = (events ?? []).map((e) => e.id)

  // Fetch all RSVPs for creator's events
  const { data: rsvps } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('id, event_id, attendee_name, attendee_phone, payment_status, amount_paid, checked_in, checked_in_at, created_at, qr_code_token')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <TicketsClient
      events={events ?? []}
      rsvps={rsvps ?? []}
    />
  )
}
