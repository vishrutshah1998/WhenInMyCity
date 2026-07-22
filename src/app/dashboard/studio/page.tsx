import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import StudioClient from './StudioClient'
import { resolveTheme } from '@/types/theme'
import { refreshInstagramTokenIfNeeded } from '@/app/actions/instagram'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ reveal?: string }>
}) {
  const { profile } = await requireProfile()
  const supabase = await createClient()
  const sp = await searchParams

  // Best-effort, backoff-guarded — only actually calls Meta when the token is
  // near expiry and hasn't been attempted recently. See refreshInstagramTokenIfNeeded.
  await refreshInstagramTokenIfNeeded(profile.id)

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
