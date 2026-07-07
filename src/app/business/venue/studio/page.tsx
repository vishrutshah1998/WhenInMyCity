import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTheme } from '@/types/theme'
import { seedPersonaDefaultBlocks } from '@/app/actions/blocks'
import VenueStudioClient from './VenueStudioClient'

export default async function AddaStudioPage() {
  const { user } = await requireAuth('/business/venue/studio')
  const admin = createAdminClient()

  const [addaRes, blocksRes, eventsRes, profileRes] = await Promise.all([
    admin.from('adda_profiles').select('*').eq('auth_user_id', user.id).maybeSingle(),
    admin.from('page_blocks').select('*').eq('profile_id', user.id).order('position', { ascending: true }),
    admin.from('events').select('id, title, starts_at, cover_image_url, status').eq('creator_id', user.id).eq('status', 'published').order('starts_at', { ascending: true }).limit(10),
    admin.from('user_profiles').select('page_theme').eq('id', user.id).maybeSingle(),
  ])

  if (!addaRes.data) redirect('/business/venue/onboard')

  let initialBlocks = blocksRes.data ?? []
  if (initialBlocks.length === 0) {
    await seedPersonaDefaultBlocks('adda', user.id)
    const { data: seeded } = await admin
      .from('page_blocks')
      .select('*')
      .eq('profile_id', user.id)
      .order('position', { ascending: true })
    initialBlocks = seeded ?? []
  }

  const theme = resolveTheme(profileRes.data?.page_theme, { venueTypes: addaRes.data.adda_type ?? [] })

  return (
    <VenueStudioClient
      adda={addaRes.data}
      initialBlocks={initialBlocks}
      upcomingEvents={eventsRes.data ?? []}
      theme={theme}
    />
  )
}
