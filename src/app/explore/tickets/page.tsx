import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyTickets } from '@/app/actions/rsvp'
import TicketsClient from './TicketsClient'

export default async function MyTicketsPage() {
  const { user } = await requireAuth('/explore/tickets')
  const admin = createAdminClient()

  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding/explorer')

  const { tickets, error } = await getMyTickets()

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return <TicketsClient tickets={tickets} />
}
