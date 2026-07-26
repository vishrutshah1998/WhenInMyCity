import { getCityAttractions, getTransitRoutes } from '@/app/actions/cityGuide'
import GuideClient from '@/app/explore/guide/GuideClient'

export const metadata = {
  title: 'City Guide · Ahmedabad–Gandhinagar | WIMC',
  description: 'Curated attractions, civic services, and transit information for Ahmedabad and Gandhinagar.',
}

// Edition key matches city_attractions.city_id; hardcoded until a multi-city
// config system exists. Kept in sync with src/app/explore/guide/page.tsx.
const EDITION_KEY = 'ahmedabad-gandhinagar'

// Sidebar-wrapped entry point for the same City Guide content that lives
// publicly (no login required) at /explore/guide — that route stays as-is
// for anonymous visitors and the public ExploreNav tab. This one is reached
// from ExplorerSidebar so logged-in explorers get it inside the persistent
// dashboard shell instead of being dropped into the public top-nav layout.
export default async function DashboardGuidePage() {
  const [attractions, transitRoutes] = await Promise.all([
    getCityAttractions(EDITION_KEY),
    getTransitRoutes(),
  ])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 96px' }}>
      <GuideClient attractions={attractions} transitRoutes={transitRoutes} />
    </div>
  )
}
