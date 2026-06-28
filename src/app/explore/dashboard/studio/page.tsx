import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTheme } from '@/types/theme'
import { seedPersonaDefaultBlocks } from '@/app/actions/blocks'
import ExplorerStudioClient from './ExplorerStudioClient'

export default async function ExplorerStudioPage() {
  const { user } = await requireAuth('/explore/dashboard/studio')
  const admin = createAdminClient()

  const [epRes, blocksRes, upRes] = await Promise.all([
    admin.from('explorer_profiles').select('display_name, avatar_url, city, interest_tags').eq('auth_user_id', user.id).maybeSingle(),
    admin.from('page_blocks').select('*').eq('profile_id', user.id).order('position', { ascending: true }),
    admin.from('user_profiles').select('page_theme, bio, instagram_handle, username').eq('id', user.id).maybeSingle(),
  ])

  if (!epRes.data) redirect('/onboarding')

  let initialBlocks = blocksRes.data ?? []
  if (initialBlocks.length === 0) {
    await seedPersonaDefaultBlocks('explorer', user.id)
    const { data: seeded } = await admin
      .from('page_blocks')
      .select('*')
      .eq('profile_id', user.id)
      .order('position', { ascending: true })
    initialBlocks = seeded ?? []
  }

  const interestTags = (epRes.data.interest_tags as string[] | null) ?? []
  const theme = resolveTheme(upRes.data?.page_theme, { explorerScene: interestTags[0] ?? undefined })

  return (
    <ExplorerStudioClient
      explorerProfile={epRes.data}
      userProfile={upRes.data ?? null}
      initialBlocks={initialBlocks}
      theme={theme}
    />
  )
}
