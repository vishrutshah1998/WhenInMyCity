import { getLegendaryVenues } from '@/app/actions/mapOfLegends'
import MapClient from './MapClient'

export const metadata = {
  title: "Map of Legends — WIMC's Legendary Venues",
  description: 'The legendary Venues that define offline culture in India\'s Tier-2 cities.',
}

export default async function MapOfLegendsPage() {
  const venues = await getLegendaryVenues()
  return <MapClient venues={venues} />
}
