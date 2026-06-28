import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AddaCalendarClient from '@/components/adda/calendar/AddaCalendarClient'

export const metadata = { title: 'Calendar — Adda' }

export default async function AddaCalendarPage() {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, google_calendar_connected')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <AddaCalendarClient
        venueName={adda.name}
        addaId={adda.id}
        googleCalendarConnected={adda.google_calendar_connected ?? false}
      />
    </div>
  )
}
