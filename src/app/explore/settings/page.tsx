import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getExplorerProfile } from '@/app/actions/explorer'
import SettingsClient from './SettingsClient'

export default async function ExplorerSettingsPage() {
  const { user } = await requireAuth('/explore/settings')
  const admin = createAdminClient()

  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  const { profile } = await getExplorerProfile()
  if (!profile) redirect('/onboarding')

  return <SettingsClient profile={profile} />
}
