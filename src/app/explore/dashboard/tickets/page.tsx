import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTickets } from '@/app/actions/rsvp'
import TicketsDashboardClient from './TicketsDashboardClient'

export default async function ExplorerDashboardTicketsPage() {
  const { user } = await requireAuth('/explore/dashboard/tickets')
  const admin = createAdminClient()

  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  const { tickets, error } = await getMyTickets()

  if (error) {
    return (
      <div style={{ padding: '40px 24px', color: 'var(--wimc-text-secondary)', fontSize: 14 }}>
        {error}
      </div>
    )
  }

  return <TicketsDashboardClient tickets={tickets} />
}
