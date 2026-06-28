'use server'

import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/app/actions/notifications'

type FollowResult = { success: boolean; following: boolean; error?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function followsTable(supabase: any) {
  // follows table not yet in generated types; cast to any for raw access
  return supabase.from('follows') as ReturnType<typeof supabase.from>
}

export async function toggleFollow(creatorId: string): Promise<FollowResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, following: false, error: 'Not authenticated' }

  // Resolve follower's profile id (= auth user id by schema convention)
  const followerId = user.id

  const tb = followsTable(supabase)

  // Check current state
  const { data: existing } = await tb
    .select('id')
    .eq('follower_id', followerId)
    .eq('creator_id', creatorId)
    .maybeSingle()

  if (existing) {
    const { error } = await tb
      .delete()
      .eq('follower_id', followerId)
      .eq('creator_id', creatorId)
    if (error) return { success: false, following: true, error: error.message }
    return { success: true, following: false }
  } else {
    const { error } = await tb
      .insert({ follower_id: followerId, creator_id: creatorId })
    if (error) return { success: false, following: false, error: error.message }

    // Notify the creator about the new follower (fire-and-forget).
    void (async () => {
      try {
        const { data: follower } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('id', followerId)
          .maybeSingle()
        await createNotification({
          recipientId: creatorId,
          type: 'new_follower',
          title: 'New follower',
          body: `${follower?.display_name ?? 'Someone'} is now following your page.`,
        })
      } catch {}
    })()

    return { success: true, following: true }
  }
}
