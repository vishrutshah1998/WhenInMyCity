import { getMySpotLists } from '@/app/actions/spotLists'
import SpotListsPanel from './SpotListsPanel'
import SectionTabs from '@/components/dashboard/SectionTabs'

const LAVENDER = '#9B8FFF'

export default async function ExplorerDashboardSpotsPage() {
  const lists = await getMySpotLists()

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 24px 80px' }}>
      <SectionTabs
        tabs={[
          { label: 'Events', href: '/explore/dashboard/saved' },
          { label: 'People', href: '/explore/dashboard/following' },
          { label: 'Places', href: '/explore/dashboard/spots' },
        ]}
        textColor="#F0EFF8"
        mutedColor="#9896B0"
        accentColor={LAVENDER}
        borderColor="rgba(155,143,255,0.15)"
      />

      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', margin: '24px 0 8px' }}>
        Places
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 28 }}>
        Curated lists of places to share with other explorers.
      </p>

      <SpotListsPanel initialLists={lists} />
    </div>
  )
}
