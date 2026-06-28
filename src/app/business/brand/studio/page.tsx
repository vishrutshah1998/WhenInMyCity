import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { cityToSlug } from '@/lib/profile-url'
import { resolveTheme } from '@/types/theme'
import { seedPersonaDefaultBlocks } from '@/app/actions/blocks'
import BrandPageEditorClient from './BrandPageEditorClient'

export default async function BrandStudioPage() {
  const { profile } = await requireProfile()
  const supabase    = await createClient()

  const [{ data: rawBlocks }, { data: events }] = await Promise.all([
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

  let initialBlocks = rawBlocks ?? []
  if (initialBlocks.length === 0) {
    await seedPersonaDefaultBlocks('brand', profile.id)
    const { data: seeded } = await supabase
      .from('page_blocks')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position', { ascending: true })
    initialBlocks = seeded ?? []
  }

  const theme        = resolveTheme(profile.page_theme, {
    creatorType:        profile.creator_type ?? undefined,
    businessCategories: (profile.business_categories as string[] | null) ?? [],
  })
  const citySlug     = cityToSlug(profile.city)
  const brandPageUrl = `/${citySlug}/${profile.username}`

  return (
    <Suspense>
      <BrandPageEditorClient
        profile={profile}
        initialBlocks={initialBlocks}
        upcomingEvents={events ?? []}
        theme={theme}
        brandPageUrl={brandPageUrl}
      />
    </Suspense>
  )
}
