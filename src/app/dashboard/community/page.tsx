import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/requireAuth'
import { getSupportedCreators } from '@/app/actions/analytics'
import CommunityClient from './CommunityClient'

export default async function CommunityPage() {
  const { profile } = await requireProfile()

  const isLocalPlus = profile.user_tier === 'local'
    || profile.user_tier === 'lantern'
    || profile.user_tier === 'beacon'

  if (!isLocalPlus) redirect('/dashboard')

  const supported = await getSupportedCreators()

  return (
    <CommunityClient
      supported={supported}
      userTier={profile.user_tier ?? 'wanderer'}
    />
  )
}
