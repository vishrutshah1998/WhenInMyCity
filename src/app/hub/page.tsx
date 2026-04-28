import { requireProfile } from '@/lib/auth/requireAuth'
import { getHubDirectory, getConnections } from '@/app/actions/hub'
import HubClient from './HubClient'

export const metadata = {
  title: 'Creator Hub — WIMC',
  description: 'Connect and message fellow Lantern and Beacon creators.',
}

export default async function HubPage() {
  const { profile } = await requireProfile()

  const [creators, connections] = await Promise.all([
    getHubDirectory(),
    getConnections(),
  ])

  return (
    <HubClient
      currentUserId={profile.id}
      currentTier={profile.user_tier ?? 'wanderer'}
      currentCity={profile.city}
      creators={creators}
      connections={connections}
    />
  )
}
