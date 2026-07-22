import { requireProfile } from '@/lib/auth/requireAuth'
import { getDiscoverCreators, getConnections } from '@/app/actions/hub'
import { HubClient } from '@/components/dashboard/HubClient'
import { HubLocked } from '@/components/dashboard/HubLocked'
import { isLocalPlus } from '@/lib/tier'

export const metadata = {
  title: 'Hub — WIMC',
  description: 'Connect and message creators, venues, and brands in your city.',
}

export default async function HubPage() {
  const { profile } = await requireProfile()

  if (!isLocalPlus(profile.user_tier)) {
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
