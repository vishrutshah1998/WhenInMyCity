import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AddaSidebar from '@/components/adda/AddaSidebar'
import AddaCalendarClient from '@/components/adda/calendar/AddaCalendarClient'

export const metadata = { title: 'Calendar — Adda' }

export default async function AddaCalendarPage() {
  const { user } = await requireAuth('/adda/calendar')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/adda/onboarding')

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Owner'

  const initials = ownerName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="adda-theme" style={{ minHeight: '100vh', background: 'var(--adda-bg-base)', display: 'flex' }}>
      <AddaSidebar
        addaId={adda.id}
        venueName={adda.name}
        ownerName={ownerName}
        initials={initials}
      />

      {/* Content area — offset by sidebar, fills viewport height */}
      <div style={{
        marginLeft: 240,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Calendar topbar integrated inside AddaCalendarClient via CalendarToolbar */}
        <AddaCalendarClient venueName={adda.name} />
      </div>
    </div>
  )
}
