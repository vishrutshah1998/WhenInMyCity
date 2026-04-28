import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { getProposalHistory } from '@/app/actions/adda'
import VenuesClient from './VenuesClient'

export default async function VenuesPage() {
  const { profile } = await requireProfile()

  const proposals = await getProposalHistory(profile.id)

  return (
    <Suspense>
      <VenuesClient
        profileId={profile.id}
        defaultCity={profile.city ?? ''}
        makerTier={profile.user_tier ?? 'wanderer'}
        proposals={proposals}
      />
    </Suspense>
  )
}
