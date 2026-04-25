import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import ExplorerOnboardingClient from './ExplorerOnboardingClient'

export default async function ExplorerOnboardingPage() {
  const { user, profile } = await requireAuth('/onboarding/explorer')

  const admin = createAdminClient()

  // Already has an explorer profile — skip onboarding
  const { data: existing } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/explore')

  return (
    <ExplorerOnboardingClient
      defaultDisplayName={profile?.display_name ?? ''}
      defaultCity={profile?.city ?? ''}
    />
  )
}
