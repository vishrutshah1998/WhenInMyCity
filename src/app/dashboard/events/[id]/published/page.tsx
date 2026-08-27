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

  // Count confirmed RSVPs — excludes casual "Maybe"/"Can't go" responses.
  const [{ count }, { count: maybeCount }] = await Promise.all([
    admin.from('rsvps').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('payment_status', 'captured').or('casual_intent.is.null,casual_intent.eq.going'),
    admin.from('rsvps').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('payment_status', 'captured').eq('casual_intent', 'maybe'),
  ])

  return (
    <PublishedView
      event={event}
      rsvpCount={count ?? 0}
      maybeCount={maybeCount ?? 0}
    />
  )
}
