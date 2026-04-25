import { getAdminPayouts } from '@/app/actions/admin'
import PayoutsClient from './PayoutsClient'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminPayoutsPage({ searchParams }: Props) {
  const { status = 'pending' } = await searchParams
  const { data: payouts, error } = await getAdminPayouts(status)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return (
    <PayoutsClient
      payouts={payouts ?? []}
      currentStatus={status}
    />
  )
}
