import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getAddaNotifications } from '@/app/actions/venue-notifications'
import VenueSidebarClient from './VenueSidebarClient'

interface Props {
  addaId: string
  venueName: string
  ownerName: string
  initials: string
  avatarUrl?: string
  businessType?: 'venue' | 'brand'
}

// Server Component — fetches live badge counts, delegates interactivity to client.
export default async function VenueSidebar({
  addaId,
  venueName,
  ownerName,
  initials,
  avatarUrl,
  businessType = 'venue',
}: Props) {
  const supabase = await createClient()
  const { user } = await requireAuth()

  const [{ count: pendingCount }, { totalUnreadCount }, { data: profile }] = await Promise.all([
    supabase
      .from('maker_adda_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('adda_id', addaId)
      .eq('status', 'pending'),
    getAddaNotifications(addaId, 1),
    supabase
      .from('user_profiles')
      .select('personas, user_role')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const personas = (profile?.personas ?? []) as string[]
  const hasCreatorProfile = personas.includes('creator') || profile?.user_role === 'maker'

  return (
    <VenueSidebarClient
      businessName={venueName}
      ownerName={ownerName}
      initials={initials}
      avatarUrl={avatarUrl}
      pendingCount={pendingCount ?? 0}
      unreadCount={totalUnreadCount}
      hasCreatorProfile={hasCreatorProfile}
      businessType={businessType}
      personas={personas}
    />
  )
}
