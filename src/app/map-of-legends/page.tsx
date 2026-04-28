import { getLegendaryAddas } from '@/app/actions/mapOfLegends'
import MapClient from './MapClient'

export const metadata = {
  title: 'Map of Legends — WIMC',
  description: 'The legendary venues that define offline culture in India\'s Tier-2 cities.',
}

export default async function MapOfLegendsPage() {
  const addas = await getLegendaryAddas()
  return <MapClient addas={addas} />
}
