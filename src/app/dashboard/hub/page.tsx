import { requireProfile } from '@/lib/auth/requireAuth'
import { getDiscoverCreators, getConnections } from '@/app/actions/hub'
import { HubClient } from '@/components/dashboard/HubClient'
import { HubLocked } from '@/components/dashboard/HubLocked'

export const metadata = {
  title: 'Hub — WIMC',
  description: 'Connect and message creators, venues, and brands in your city.',
}

export default async function HubPage() {
  const { profile } = await requireProfile()

  if (profile.user_tier === 'wanderer') {
    return <HubLocked profile={profile} />
  }

  const [discover, connections] = await Promise.all([
    getDiscoverCreators(20),
    getConnections(),
  ])

  return (
    <HubClient
      currentUserId={profile.id}
      discover={discover}
      connections={connections}
    />
  )
}
