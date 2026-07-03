import { getCityAttractions, getTransitRoutes } from '@/app/actions/cityGuide'
import GuideClient from './GuideClient'

export const metadata = {
  title: 'City Guide · Ahmedabad–Gandhinagar | WIMC',
  description: 'Curated attractions, civic services, and transit information for Ahmedabad and Gandhinagar.',
}

// Edition key matches city_attractions.city_id; hardcoded until a multi-city
// config system exists.
const EDITION_KEY = 'ahmedabad-gandhinagar'

export default async function GuidePage() {
  const [attractions, transitRoutes] = await Promise.all([
    getCityAttractions(EDITION_KEY),
    getTransitRoutes(),
  ])

  return <GuideClient attractions={attractions} transitRoutes={transitRoutes} />
}
