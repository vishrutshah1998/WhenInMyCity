import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompleteView from './complete-view'

export default async function CompletePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, display_name, city, avatar_url, creator_type, bio, page_theme, interest_tags')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <Suspense>
      <CompleteView
        username={profile.username}
        displayName={profile.display_name}
        city={profile.city}
        avatarUrl={profile.avatar_url}
        creatorType={profile.creator_type}
        bio={profile.bio}
        pageTheme={profile.page_theme as { colorScheme?: string } | null}
        interestTags={(profile.interest_tags as string[] | null) ?? []}
      />
    </Suspense>
  )
}
