import type { Viewport } from 'next'
import { requireAuth } from '@/lib/auth/requireAuth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVenueNotifications } from '@/app/actions/venue-notifications'
import VenueSidebar from '@/components/venue/VenueSidebar'
import VenueNotificationBell from '@/components/venue/VenueNotificationBell'
import VenueAuthenticatedTopBar from '@/components/venue/VenueAuthenticatedTopBar'
import PersonaNavGate from '@/components/shared/PersonaNavGate'
import { VENUE_NAV_PAGES, NAV_HEIGHT, VENUE_SECTION_ROUTES } from '@/lib/constants/personaNavPages'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import { VenueCarouselProvider } from './dashboard/VenueCarouselContext'
import VenueCarouselSlot from './dashboard/VenueCarouselSlot'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Matches --venue-bg-elevated under .venue-theme.venue-variant
// (venue-tokens.css) — the actual background PersonaNavBar renders under
// Venue's bottom nav / carousel nav bar. Without an explicit theme-color,
// Safari's bottom toolbar tint is inferred automatically and unreliably;
// setting this makes the toolbar-blend consistent instead of leaving it to
// chance. Merges with the root layout's viewport (width/initialScale/
// viewportFit) — Next.js resolves nested viewport exports field-by-field,
// root to leaf.
export const viewport: Viewport = {
  themeColor: '#122636',
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
    <VenueCarouselProvider>
    <div
      className="venue-theme venue-variant"
      style={{ minHeight: '100vh', background: 'var(--venue-bg-base)', position: 'relative' }}
    >
      <div className="wimc-grain" aria-hidden />

      {/* Persistent circular nav on every sub-route below /business/venue/dashboard —
          the index route's own PersonaTabSwitcher already renders a live version
          of this; PersonaNavGate no-ops there to avoid a double nav. Deliberately
          a sibling of .dash-content, NOT nested inside it: .dash-content has a
          mount entrance animation (globals.css, transform: translateY(28px) in
          its keyframes) — a transform anywhere in an ancestor's keyframes
          establishes a new containing block for position:fixed descendants, so
          this nav was anchoring to .dash-content's own scrolling box instead of
          the viewport, only scrolling into view near the bottom of a long page. */}
      <PersonaNavGate
        pages={VENUE_NAV_PAGES}
        homeKey="home"
        indexHref="/business/venue/dashboard"
        sectionRoutes={VENUE_SECTION_ROUTES}
        accentColor="var(--venue-accent)"
        mutedColor="var(--venue-text-secondary)"
        elevatedBgColor="var(--venue-bg-elevated)"
        borderColor="var(--venue-border-default)"
        invertIconImage
      />

      {/* Layout-level sibling of .dash-content for the index route's own
          VenueCarousel (PersonaTabSwitcher) — same containing-block
          rationale as PersonaNavGate above, and the same fix already applied
          to Creator's CreatorCarouselSlot (dashboard/layout.tsx). page.tsx
          (a Server Component) still owns the actual Supabase fetch and
          publishes its computed slot content up through VenueCarouselContext
          for this to render — see VenueCarouselContext.tsx / VenueCarouselSlot.tsx. */}
      <VenueCarouselSlot />

      <div className="hidden lg:block">
        <VenueSidebar
          venueId={venue.id}
          venueName={venue.name}
          ownerName={ownerName}
          initials={getInitials(ownerName)}
        />
      </div>

      <div
        className="dash-content lg:ml-[var(--venue-sidebar-w)]"
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
        {/* lg:!pb-0 cancels the mobile-only reserve below at desktop, where
            PersonaNavGate never renders (it's lg:hidden) — without this,
            sub-route content's last bit scrolls in behind the fixed
            standalone nav and can never be fully brought into view. */}
        <main className="lg:!pb-0" style={{ flex: 1, paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}>
          {children}
        </main>
      </div>
    </div>
    </VenueCarouselProvider>
  )
}
