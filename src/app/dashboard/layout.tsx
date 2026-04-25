import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import NotificationBell from '@/components/dashboard/NotificationBell'
import { getNotificationsForUser } from '@/app/actions/notifications'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const [eventsRes, publishedRes, rsvpsRes, notifications] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', profile.id),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', profile.id).eq('status', 'published'),
    supabase.from('rsvps').select('id', { count: 'exact', head: true }).eq('attendee_user_id', profile.id),
    getNotificationsForUser(),
  ])

  const hasAnyEvent      = (eventsRes.count   ?? 0) > 0
  const hasPublishedEvent = (publishedRes.count ?? 0) > 0
  const hasAnyRsvp       = (rsvpsRes.count    ?? 0) > 0

  const initials = (profile.display_name ?? profile.username ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <Sidebar
        username={profile.username ?? ''}
        displayName={profile.display_name ?? profile.username ?? ''}
        tier={profile.maker_tier ?? 'mohalla'}
        initials={initials}
        hasAnyEvent={hasAnyEvent}
        hasPublishedEvent={hasPublishedEvent}
        hasAnyRsvp={hasAnyRsvp}
      />
      <div style={{ marginLeft: 'var(--wimc-sidebar-w)', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Slim top bar — notification bell lives here */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 20px',
        }}>
          <NotificationBell initialNotifications={notifications} />
        </div>
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
