import { createClient } from '@/lib/supabase/server'
import AddaSidebarClient from './AddaSidebarClient'

interface Props {
  addaId: string
  venueName: string
  ownerName: string
  initials: string
  avatarUrl?: string
}

// Server Component — fetches live badge counts, delegates interactivity to client.
export default async function AddaSidebar({
  addaId,
  venueName,
  ownerName,
  initials,
  avatarUrl,
}: Props) {
  const supabase = await createClient()

  // Pending booking requests — the number that appears on the Bookings badge.
  const { count: pendingCount } = await supabase
    .from('maker_adda_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('adda_id', addaId)
    .eq('status', 'pending')

  return (
    <AddaSidebarClient
      venueName={venueName}
      ownerName={ownerName}
      initials={initials}
      avatarUrl={avatarUrl}
      pendingCount={pendingCount ?? 0}
      unreadCount={0}
    />
  )
}
