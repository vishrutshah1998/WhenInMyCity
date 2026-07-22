import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/requireAuth'
import { getSupportedCreators } from '@/app/actions/analytics'
import { isLocalPlus } from '@/lib/tier'
import CommunityClient from './CommunityClient'

export default async function CommunityPage() {
  const { profile } = await requireProfile()

  if (!isLocalPlus(profile.user_tier)) redirect('/dashboard')

  const supported = await getSupportedCreators()

  return (
    <CommunityClient
      supported={supported}
      userTier={profile.user_tier ?? 'wanderer'}
    />
  )
}
