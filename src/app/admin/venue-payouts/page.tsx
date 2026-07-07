import { getAdminVenuePayouts } from '@/app/actions/admin'
import VenuePayoutsAdminClient from './VenuePayoutsAdminClient'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminVenuePayoutsPage({ searchParams }: Props) {
  const { status = 'pending' } = await searchParams
  const { data: payouts, error } = await getAdminVenuePayouts(status)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return (
    <VenuePayoutsAdminClient
      payouts={payouts ?? []}
      currentStatus={status}
    />
  )
}
