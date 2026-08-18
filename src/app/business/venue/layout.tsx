import { requireAuth } from '@/lib/auth/requireAuth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVenueNotifications } from '@/app/actions/venue-notifications'
import VenueSidebar from '@/components/venue/VenueSidebar'
import VenueNotificationBell from '@/components/venue/VenueNotificationBell'
import VenueAuthenticatedTopBar from '@/components/venue/VenueAuthenticatedTopBar'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth('/business/venue/dashboard')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name, slug, city')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { notifications, unreadCount } = await getVenueNotifications(venue.id, 10)

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
        {/* New top bar is mobile-only this session (Part 1 of 3) — lg:hidden matches the
            gate already proven for Explorer's and Creator's equivalent swap. Desktop keeps
            the original header unchanged below. */}
        <div className="lg:hidden">
          <VenueAuthenticatedTopBar
            city={venue.city ?? ''}
            initials={getInitials(ownerName)}
            displayName={ownerName}
            profileHref="/business/venue/profile/hub"
            venueId={venue.id}
            notifications={notifications}
            unreadCount={unreadCount}
          />
        </div>

        {/* Desktop — restored unchanged from before this session */}
        <header
          className="venue-page-topbar hidden lg:flex"
          style={{
            position: 'sticky', top: 0, height: 48, zIndex: 40,
            background: 'rgba(6,13,17,0.92)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--venue-border-subtle)',
            alignItems: 'center', justifyContent: 'space-between',
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

        {/* No fixed bottom nav left to clear (MobileBottomNav removed for Venue,
            replaced by the Home page's swipe carousel) — just the iOS
            home-indicator safe area, which mob-nav-pb used to cover too. */}
        <main style={{ flex: 1, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
