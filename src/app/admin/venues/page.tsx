import { getAdminVenues } from '@/app/actions/admin'
import VenuesClient from './VenuesClient'

export default async function AdminVenuesPage() {
  const { data: venues, error } = await getAdminVenues()

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return <VenuesClient venues={venues ?? []} />
}
