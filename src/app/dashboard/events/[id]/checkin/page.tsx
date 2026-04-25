import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventAttendees } from '@/app/actions/rsvp'
import CheckInClient from './CheckInClient'

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, starts_at, status')
    .eq('id', id)
    .eq('creator_id', user.id)
    .maybeSingle()

  if (!event) notFound()

  const { data: attendees, error } = await getEventAttendees(id)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: 40 }}>
        {error}
      </div>
    )
  }

  return (
    <CheckInClient
      eventId={event.id}
      eventTitle={event.title}
      attendees={attendees ?? []}
    />
  )
}
