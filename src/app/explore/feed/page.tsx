import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFollowedFeed } from '@/app/actions/explorer'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const { user } = await requireAuth('/explore/feed')
  const admin = createAdminClient()
  const { data: ep } = await admin.from('explorer_profiles').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!ep) redirect('/onboarding/explorer')

  const { events, followedCount, error } = await getFollowedFeed()

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return <FeedClient events={events} followedCount={followedCount} />
}
