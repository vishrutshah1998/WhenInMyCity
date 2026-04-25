import { getAdminEvents } from '@/app/actions/admin'
import EventsClient from './EventsClient'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminEventsPage({ searchParams }: Props) {
  const { status = 'all' } = await searchParams
  const { data: events, error } = await getAdminEvents(status)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return <EventsClient events={events ?? []} currentStatus={status} />
}
