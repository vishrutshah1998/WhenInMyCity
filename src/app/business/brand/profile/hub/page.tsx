import { requireProfile } from '@/lib/auth/requireAuth'
import { resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import BrandProfileHubClient from './BrandProfileHubClient'

const BRAND_ACCENT = '#F5A800'

export default async function BrandProfileHubPage() {
  const { profile } = await requireProfile()

  const displayName = profile.display_name ?? profile.username ?? 'Brand'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const personas = (profile.personas ?? []) as string[]
  const workspaces = resolveWorkspaces(personas, 'brand')

  return (
    <BrandProfileHubClient
      brandName={displayName}
      username={profile.username ?? ''}
      initials={initials}
      bio={profile.bio ?? null}
      workspaces={workspaces}
      accentColor={BRAND_ACCENT}
    />
  )
}
