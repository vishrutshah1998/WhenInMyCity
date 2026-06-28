import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getSavedEvents } from '@/app/actions/explorer'
import { createAdminClient } from '@/lib/supabase/admin'
import SavedEventsClient from './SavedEventsClient'

export default async function ExplorerDashboardSavedPage() {
  const { user } = await requireAuth('/explore/dashboard/saved')
  const admin = createAdminClient()

  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  const { events, error } = await getSavedEvents()

  if (error) {
    return (
      <div style={{ padding: '40px 24px', color: 'var(--wimc-text-secondary)', fontSize: 14 }}>
        {error}
      </div>
    )
  }

  return <SavedEventsClient events={events} />
}
