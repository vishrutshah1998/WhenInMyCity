import { getAdminAddaPayouts } from '@/app/actions/admin'
import AddaPayoutsAdminClient from './AddaPayoutsAdminClient'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminAddaPayoutsPage({ searchParams }: Props) {
  const { status = 'pending' } = await searchParams
  const { data: payouts, error } = await getAdminAddaPayouts(status)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return (
    <AddaPayoutsAdminClient
      payouts={payouts ?? []}
      currentStatus={status}
    />
  )
}
