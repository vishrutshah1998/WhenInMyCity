import { requireAuth } from '@/lib/auth/requireAuth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import BrandSidebarServer from '@/components/business/BrandSidebarServer'
import BrandAuthenticatedTopBar from '@/components/business/BrandAuthenticatedTopBar'
import PersonaNavGate from '@/components/shared/PersonaNavGate'
import { BRAND_NAV_PAGES, NAV_HEIGHT, BRAND_SECTION_ROUTES } from '@/lib/constants/personaNavPages'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import NotificationBell from '@/components/dashboard/NotificationBell'
import { getNotificationsForUser } from '@/app/actions/notifications'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth('/business/brand/dashboard')
  const admin = createAdminClient()

  const [{ data: profile }, notifications] = await Promise.all([
    admin
      .from('user_profiles')
      .select('personas, creator_type, display_name, username, avatar_url, city')
      .eq('id', user.id)
      .maybeSingle(),
    getNotificationsForUser(),
  ])

  const personas = (profile?.personas ?? []) as string[]
  const isBrandUser =
    personas.includes('brand') ||
    personas.includes('business') ||
    profile?.creator_type === 'business_brand'

  if (!isBrandUser) redirect('/dashboard')

  const displayName = profile?.display_name ?? profile?.username ?? user.email?.split('@')[0] ?? 'Brand'

  return (
    <div
      className="venue-theme brand-variant"
      style={{ minHeight: '100vh', background: 'var(--venue-bg-base)', position: 'relative' }}
    >
      {/* Grain texture — matches creator dashboard aesthetic */}
      <div className="wimc-grain" aria-hidden />

      {/* Persistent circular nav on every sub-route below /business/brand/dashboard —
          the index route's own SwipeCarousel already renders a live version
          of this; PersonaNavGate no-ops there to avoid a double nav. Deliberately
          a sibling of .dash-content, NOT nested inside it: .dash-content has a
          mount entrance animation (globals.css, transform: translateY(28px) in
          its keyframes) — a transform anywhere in an ancestor's keyframes
          establishes a new containing block for position:fixed descendants, so
          this nav was anchoring to .dash-content's own scrolling box instead of
          the viewport, only scrolling into view near the bottom of a long page. */}
      <PersonaNavGate
        pages={BRAND_NAV_PAGES}
        homeKey="home"
        indexHref="/business/brand/dashboard"
        sectionRoutes={BRAND_SECTION_ROUTES}
        accentColor="var(--venue-accent)"
        mutedColor="var(--venue-text-secondary)"
        elevatedBgColor="var(--venue-bg-elevated)"
        borderColor="var(--venue-border-default)"
      />

      <div className="hidden md:block">
        <BrandSidebarServer />
      </div>

      <div
        className="dash-content md:ml-[var(--venue-sidebar-w)]"
        style={{
          transition: 'margin-left 220ms cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column', minHeight: '100vh',
        }}
      >
        {/* New top bar is mobile-only (net-new gating — this layout previously had
            no breakpoint split at all). Desktop keeps the original header unchanged
            below. lg:hidden matches the gate already proven for Explorer's/Creator's/
            Venue's equivalent swap. */}
        <div className="lg:hidden">
          <BrandAuthenticatedTopBar
            city={profile?.city ?? ''}
            avatarUrl={profile?.avatar_url ?? null}
            initials={getInitials(displayName)}
            displayName={displayName}
            profileHref="/business/brand/profile/hub"
            notifications={notifications}
          />
        </div>

        {/* Desktop — unchanged from before this session */}
        <div className="hidden lg:flex" style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(12,10,6,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <Link href="/business/brand/dashboard" className="dash-logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <WimcWordmark color="white" height={26} />
          </Link>
          <NotificationBell initialNotifications={notifications} />
        </div>

        {/* No fixed bottom nav left to clear (MobileBottomNav removed for Brand,
            replaced by the Home page's swipe carousel) — just the iOS
            home-indicator safe area, which mob-nav-pb used to cover too. */}
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
