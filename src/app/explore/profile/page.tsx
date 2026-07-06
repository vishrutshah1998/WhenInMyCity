import { getExplorerIdentity, getSavedEvents } from '@/app/actions/explorer'
import { getMyTickets } from '@/app/actions/rsvp'
import { getMySpotLists } from '@/app/actions/spotLists'
import ExplorerProfileClient from './ExplorerProfileClient'

export const metadata = { title: 'Profile | WIMC' }

export default async function ProfilePage() {
  const [identity, { tickets }, { events: savedEvents }, spotLists] = await Promise.all([
    getExplorerIdentity(),
    getMyTickets(),
    getSavedEvents(),
    getMySpotLists(),
  ])

  return (
    <ExplorerProfileClient
      identity={identity}
      tickets={tickets}
      savedEvents={savedEvents}
      spotLists={spotLists}
    />
  )
}
