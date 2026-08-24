import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import ExplorerSidebar from '@/components/explore/ExplorerSidebar'
import ExplorerAuthenticatedTopBar from '@/components/explore/ExplorerAuthenticatedTopBar'
import PersonaNavGate from '@/components/shared/PersonaNavGate'
import { EXPLORER_NAV_PAGES, NAV_HEIGHT, EXPLORER_SECTION_ROUTES } from '@/lib/constants/personaNavPages'
import { getNotificationsForUser } from '@/app/actions/notifications'

export default async function ExplorerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireAuth('/explore/dashboard')
  const admin = createAdminClient()

  // Must have an explorer profile
  const { data: ep } = await admin
    .from('explorer_profiles')
    .select('display_name, avatar_url, city')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  // Get username + initials from user_profiles
  const { data: up } = await admin
    .from('user_profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const notifications = await getNotificationsForUser()

  const displayName      = ep.display_name ?? up?.display_name ?? 'Explorer'
  const username         = up?.username ?? 'explorer'
  const avatarUrl        = ep.avatar_url ?? up?.avatar_url ?? null
  const initials         = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  // LocationPill only covers the Phase 0 launch cities — fall back to the same
  // default /explore itself uses for any other stored city.
  const pillCity          = ep.city === 'Gandhinagar' ? 'Gandhinagar' : 'Ahmedabad'

  return (
    <div
      className="venue-theme explorer-variant"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--venue-bg-base)',
        color: 'var(--venue-text-primary)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
    >
      <div className="wimc-grain" aria-hidden />

      {/* Persistent circular nav on every sub-route below /explore/dashboard —
          the index route's own SwipeCarousel already renders a live version
          of this; PersonaNavGate no-ops there to avoid a double nav. A sibling
          of the inner content wrapper, NOT nested inside it — Creator/Venue/
          Brand's equivalent wrapper (.dash-content) has a mount entrance
          animation with a transform in its keyframes, and any transform on an
          ancestor establishes a new containing block for position:fixed
          descendants, breaking their viewport anchoring. Explorer's wrapper
          doesn't carry that class today, but keeping this nav shallow avoids
          the same class of bug if one is ever added here too. */}
      <PersonaNavGate
        pages={EXPLORER_NAV_PAGES}
        homeKey="home"
        indexHref="/explore/dashboard"
        sectionRoutes={EXPLORER_SECTION_ROUTES}
        accentColor="var(--venue-accent)"
        mutedColor="var(--venue-text-secondary)"
        elevatedBgColor="var(--venue-bg-elevated)"
        borderColor="var(--venue-border-default)"
      />

      <div className="hidden md:block">
        <ExplorerSidebar
          displayName={displayName}
          username={username}
          initials={initials}
          avatarUrl={avatarUrl}
        />
      </div>

      <div
        className="md:ml-[var(--wimc-sidebar-w)]"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 250ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* New top bar is mobile-only this session — lg:hidden matches the gate
            already used for ExploreClient.tsx's equivalent swap. Desktop keeps
            the original static label unchanged below. ExplorerTabStrip (the old
            mobile nav strip) is gone — the swipe carousel's own labeled dot
            indicator is now the primary mobile nav surface for /explore/dashboard. */}
        <div className="lg:hidden">
          <ExplorerAuthenticatedTopBar
            city={pillCity}
            avatarUrl={avatarUrl}
            initials={initials}
            displayName={displayName}
            profileHref="/explore/dashboard/profile"
            notifications={notifications}
          />
        </div>

        {/* Desktop — restored unchanged from before this session */}
        <div className="hidden lg:flex" style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(242,237,227,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(26,39,68,0.10)',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 10, fontWeight: 700,
            color: '#9B8FFF',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Explorer Dashboard
          </span>
        </div>

        {/* No fixed bottom nav left to clear (MobileBottomNav removed for Explorer) —
            just the iOS home-indicator safe area, which mob-nav-pb used to cover too. */}
        {/* lg:!pb-0 cancels the mobile-only reserve below at desktop, where
            PersonaNavGate never renders (it's lg:hidden) — without this,
            sub-route content's last bit scrolls in behind the fixed
            standalone nav and can never be fully brought into view. */}
        <main className="lg:!pb-0" style={{ flex: 1, minWidth: 0, paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}>
          {children}
        </main>
      </div>
    </div>
  )
}
