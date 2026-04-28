import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSavedEvents } from '@/app/actions/explorer'
import SavedClient from './SavedClient'

export default async function SavedEventsPage() {
  const { user } = await requireAuth('/explore/saved')
  const admin = createAdminClient()
  const { data: ep } = await admin.from('explorer_profiles').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!ep) redirect('/onboarding')

  const { events, error } = await getSavedEvents()

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return <SavedClient events={events} />
}
