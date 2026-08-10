import { getMySpotLists } from '@/app/actions/spotLists'
import SpotListsPanel from './SpotListsPanel'

export default async function ExplorerDashboardSpotsPage() {
  const lists = await getMySpotLists()

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 8 }}>
        Places
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 28 }}>
        Curated lists of places to share with other explorers.
      </p>

      <SpotListsPanel initialLists={lists} />
    </div>
  )
}
