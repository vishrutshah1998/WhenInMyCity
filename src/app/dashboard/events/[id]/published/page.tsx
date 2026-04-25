import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import PublishedView from './published-view'

export default async function EventPublishedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('creator_id', user.id)
    .maybeSingle()

  if (!event) notFound()

  // Count confirmed RSVPs
  const { count } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('payment_status', 'captured')

  return (
    <PublishedView
      event={event}
      rsvpCount={count ?? 0}
    />
  )
}
