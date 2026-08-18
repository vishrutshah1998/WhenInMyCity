import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTickets } from '@/app/actions/rsvp'
import { resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import ExplorerProfileHubClient from './ExplorerProfileHubClient'

export default async function ExplorerProfileHubPage() {
  const { user } = await requireAuth('/explore/dashboard/profile')
  const admin = createAdminClient()

  const [{ data: ep }, { data: up }, { tickets }] = await Promise.all([
    admin.from('explorer_profiles').select('display_name, avatar_url').eq('auth_user_id', user.id).maybeSingle(),
    admin.from('user_profiles').select('username, display_name, avatar_url, bio, personas').eq('id', user.id).maybeSingle(),
    getMyTickets(),
  ])

  if (!ep) redirect('/onboarding')

  const displayName = ep.display_name ?? up?.display_name ?? 'Explorer'
  const avatarUrl    = ep.avatar_url ?? up?.avatar_url ?? null
  const initials     = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const username     = up?.username ?? null
  const bio          = up?.bio ?? null
  const personas     = (up?.personas ?? []) as string[]
  const workspaces   = resolveWorkspaces(personas, 'explorer')

  return (
    <ExplorerProfileHubClient
      displayName={displayName}
      avatarUrl={avatarUrl}
      initials={initials}
      username={username}
      bio={bio}
      tickets={tickets}
      workspaces={workspaces}
    />
  )
}
