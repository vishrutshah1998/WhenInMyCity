import { requireAuth } from '@/lib/auth/requireAuth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVenueNotifications } from '@/app/actions/venue-notifications'
import VenueSidebar from '@/components/venue/VenueSidebar'
import MobileBottomNav from '@/components/ui/MobileBottomNav'
import { venueBottomNavConfig, resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import VenueNotificationBell from '@/components/venue/VenueNotificationBell'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth('/business/venue/dashboard')
  const admin = createAdminClient()

  const [{ data: venue }, { data: userProfile }] = await Promise.all([
    admin.from('venue_profiles').select('id, name, slug').eq('auth_user_id', user.id).maybeSingle(),
    admin.from('user_profiles').select('personas').eq('id', user.id).maybeSingle(),
  ])

  if (!venue) redirect('/business/venue/onboard')

  const { notifications, unreadCount, totalUnreadCount } = await getVenueNotifications(venue.id, 10)
  const venuePersonas = (userProfile?.personas ?? []) as string[]
  const mobileWorkspaces = resolveWorkspaces(venuePersonas, 'venue')

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Owner'

  return (
    <div
      className="venue-theme venue-variant"
      style={{ minHeight: '100vh', background: 'var(--venue-bg-base)', position: 'relative' }}
    >
      <div className="wimc-grain" aria-hidden />

      <div className="hidden md:block">
        <VenueSidebar
          venueId={venue.id}
          venueName={venue.name}
          ownerName={ownerName}
          initials={getInitials(ownerName)}
        />
      </div>

      <div
        className="dash-content md:ml-[var(--venue-sidebar-w)]"
        style={{
          transition: 'margin-left 220ms cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Sticky topbar */}
        <header
          className="venue-page-topbar"
          style={{
            position: 'sticky', top: 0, height: 48, zIndex: 40,
            background: 'rgba(6,13,17,0.92)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--venue-border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', flexShrink: 0,
          }}
        >
          <Link
            href="/business/venue/dashboard"
            className="dash-logo"
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <WimcWordmark color="white" height={26} />
          </Link>
          <VenueNotificationBell
            venueId={venue.id}
            initialNotifications={notifications}
            initialUnreadCount={unreadCount}
          />
        </header>

        <main className="mob-nav-pb" style={{ flex: 1 }}>
          {children}
        </main>
      </div>
      <MobileBottomNav config={venueBottomNavConfig} badges={{ inbox: totalUnreadCount }} workspaces={mobileWorkspaces} />
    </div>
  )
}
