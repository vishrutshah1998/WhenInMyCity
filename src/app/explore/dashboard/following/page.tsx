import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import FollowingClient from './FollowingClient'

export default async function ExplorerDashboardFollowingPage() {
  const { user } = await requireAuth('/explore/dashboard/following')
  const admin = createAdminClient()

  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('id, followed_maker_ids')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  const followedIds = ep.followed_maker_ids ?? []

  type FollowedCreator = {
    id: string
    display_name: string
    username: string
    creator_type: string
    city: string
    avatar_url: string | null
  }

  let creators: FollowedCreator[] = []
  if (followedIds.length > 0) {
    const { data } = await admin
      .from('user_profiles')
      .select('id, display_name, username, creator_type, city, avatar_url')
      .in('id', followedIds)
    creators = (data ?? []) as FollowedCreator[]
  }

  return <FollowingClient creators={creators} />
}
