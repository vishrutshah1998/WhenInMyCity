import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AddaSidebarClient from '@/components/adda/AddaSidebarClient'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Server Component — fetches brand profile data and renders the business sidebar.
export default async function BrandSidebarServer() {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, user_role, personas, creator_type')
    .eq('id', user.id)
    .maybeSingle()

  const brandName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Brand'
  const ownerName = brandName
  const initials  = getInitials(ownerName)

  const personas = (profile?.personas ?? []) as string[]

  // Show Creator workspace if the user has the creator persona OR is a maker.
  // personas[] is the canonical check, but we fall back to user_role === 'maker'
  // for users whose personas weren't backfilled yet (brand onboarding ran before
  // migration 039 could add 'creator' to their array).
  const hasCreatorProfile =
    personas.includes('creator') || profile?.user_role === 'maker'

  return (
    <AddaSidebarClient
      businessName={brandName}
      ownerName={ownerName}
      initials={initials}
      avatarUrl={profile?.avatar_url ?? undefined}
      pendingCount={0}
      unreadCount={0}
      hasCreatorProfile={hasCreatorProfile}
      businessType="brand"
      personas={personas}
    />
  )
}
