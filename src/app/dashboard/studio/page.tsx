import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import StudioClient from './StudioClient'
import { resolveTheme } from '@/types/theme'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ reveal?: string }>
}) {
  const { profile } = await requireProfile()
  const supabase = await createClient()
  const sp = await searchParams

  const [{ data: blocks }, { data: events }] = await Promise.all([
    supabase
      .from('page_blocks')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position', { ascending: true }),
    supabase
      .from('events')
      .select('*')
      .eq('creator_id', profile.id)
      .eq('status', 'published')
      .order('starts_at', { ascending: true }),
  ])

  const theme = resolveTheme(profile.page_theme, profile.creator_type ?? undefined)
  const safeProfile = { ...profile, social_links: profile.social_links ?? null }

  return (
    <Suspense>
      <StudioClient
        profile={safeProfile}
        initialBlocks={blocks ?? []}
        upcomingEvents={events ?? []}
        theme={theme}
        showRevealBanner={sp.reveal === 'true'}
      />
    </Suspense>
  )
}
