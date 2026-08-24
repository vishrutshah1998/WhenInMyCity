import { getAdminCommunityQueue } from '@/app/actions/communities'
import CommunitiesClient from './CommunitiesClient'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminCommunitiesPage({ searchParams }: Props) {
  const { status = 'pending' } = await searchParams
  const { data: communities, error } = await getAdminCommunityQueue(status)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return (
    <CommunitiesClient
      communities={communities ?? []}
      currentStatus={status}
    />
  )
}
