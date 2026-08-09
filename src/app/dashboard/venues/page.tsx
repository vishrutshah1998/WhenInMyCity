import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import VenuesClient from './VenuesClient'

export default async function VenuesPage() {
  const { profile } = await requireProfile()

  return (
    <Suspense>
      <VenuesClient
        profileId={profile.id}
        defaultCity={profile.city ?? ''}
        makerTier={profile.user_tier ?? 'wanderer'}
      />
    </Suspense>
  )
}
