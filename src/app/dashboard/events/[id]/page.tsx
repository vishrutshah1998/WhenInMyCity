import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import EventManageClient from './EventManageClient'

export default async function EventManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const [{ data: event }, { data: profile }] = await Promise.all([
    admin.from('events').select('*').eq('id', id).eq('creator_id', user.id).maybeSingle(),
    admin.from('user_profiles').select('user_tier').eq('id', user.id).single(),
  ])

  if (!event) notFound()

  // Count confirmed RSVPs for capacity + cancel UI
  const { count: rsvpCount } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('payment_status', 'captured')

  return (
    <EventManageClient
      event={event}
      rsvpCount={rsvpCount ?? 0}
      creatorTier={(profile?.user_tier ?? 'wanderer') as string}
    />
  )
}
