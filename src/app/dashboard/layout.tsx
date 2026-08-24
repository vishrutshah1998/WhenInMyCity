import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import NotificationBell from '@/components/dashboard/NotificationBell'
import CreatorAuthenticatedTopBar from '@/components/dashboard/CreatorAuthenticatedTopBar'
import PersonaNavGate from '@/components/shared/PersonaNavGate'
import { getCreatorNavPages, NAV_HEIGHT, CREATOR_SECTION_ROUTES } from '@/lib/constants/personaNavPages'
import { getNotificationsForUser } from '@/app/actions/notifications'
import { getUnreadMessageCount } from '@/app/actions/hub'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import { isLocalPlus } from '@/lib/tier'

// Canonical persona brand colors — matches PATH_COLOURS in
// src/lib/onboarding/design-tokens.ts (Explorer lavender, Venue teal, Brand
// gold, Creator coral), the same flat one-color-per-persona scheme Venue and
// Brand's dashboards already use unconditionally.
const EXPLORER_ACCENT = '#9B8FFF'
const CREATOR_ACCENT  = '#E8705A'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const personas: string[] = profile.personas ?? []

  // Persona-based routing — send users to the dashboard that owns their primary role.
  // creator_type is the most reliable signal for legacy users whose personas[] was
  // never populated (pre-fix). personas[] is the canonical field going forward.
  const isCreator = profile.user_role === 'maker' || personas.includes('creator')
  const isBrand   = profile.creator_type === 'business_brand' || personas.includes('brand')
  const isVenue   = personas.includes('venue') || personas.includes('business')

  if (isBrand && !isCreator)  redirect('/business/brand/dashboard')
  if (isVenue && !isCreator)  redirect('/business/venue/dashboard')

  // Creators (non-explorers) get at least the local tier — upgrade wanderers immediately
  if (profile.user_role !== 'explorer' && profile.user_tier === 'wanderer') {
    const admin = createAdminClient()
    await admin.from('user_profiles').update({ user_tier: 'local' }).eq('id', profile.id)
    ;(profile as { user_tier: string }).user_tier = 'local'
  }

  const isHubEnabled = isLocalPlus(profile.user_tier)

  // Dashboard chrome (sidebar/top bar/nav) always uses the flat persona
  // color, not the creator's chosen category color — that per-category color
  // (getCategoryColors(creator_type), set in onboarding step C3) is for the
  // creator's PUBLIC-facing page/profile theming ("shapes your page colour
  // and who discovers your work", per C3's own copy), not internal dashboard
  // chrome. Was previously falling through to getCategoryColors() here too,
  // which meant two categories (dance, literature_poetry) rendered the whole
  // dashboard pink instead of Creator's actual coral brand color.
  const accentColor = profile.user_role === 'explorer'
    ? EXPLORER_ACCENT
    : CREATOR_ACCENT

  const [eventsRes, publishedRes, rsvpsRes, notifications, unreadHub, pendingConnRes] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', profile.id),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', profile.id).eq('status', 'published'),
    supabase.from('rsvps').select('id', { count: 'exact', head: true }).eq('attendee_user_id', profile.id),
    getNotificationsForUser(),
    isHubEnabled ? getUnreadMessageCount() : Promise.resolve(0),
    isHubEnabled
      ? supabase.from('creator_connections').select('id', { count: 'exact', head: true }).eq('recipient_id', profile.id).eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
  ])

  const pendingHubRequests = pendingConnRes.count ?? 0

  const hasAnyEvent      = (eventsRes.count   ?? 0) > 0
  const hasPublishedEvent = (publishedRes.count ?? 0) > 0
  const hasAnyRsvp       = (rsvpsRes.count    ?? 0) > 0

  // Augment personas for the workspace switcher — fills in entries that
  // creator_type implies but personas[] may not yet contain (legacy users).
  const sidebarPersonas = [
    ...personas,
    ...(isBrand && !personas.includes('brand') ? ['brand'] : []),
    ...(isVenue && !personas.includes('venue')  ? ['venue'] : []),
  ]

  const initials = (profile.display_name ?? profile.username ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: 'var(--wimc-bg-base)',
        color: 'var(--wimc-text-primary)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        // Inject accent as a dashboard-scoped CSS variable so any child can use it
        ['--wimc-accent' as string]: accentColor,
      }}
    >
      {/* Grain texture — editorial aesthetic */}
      <div className="wimc-grain" aria-hidden />

      {/* Persistent circular nav on every sub-route below /dashboard — the
          index route's own SwipeCarousel already renders a live version of
          this; PersonaNavGate no-ops there to avoid a double nav. Deliberately
          a sibling of .dash-content, NOT nested inside it: .dash-content has a
          mount entrance animation (globals.css, transform: translateY(28px)
          in its keyframes) — a transform anywhere in an ancestor's keyframes
          establishes a new containing block for position:fixed descendants,
          so this nav was anchoring to .dash-content's own scrolling box
          instead of the viewport, only scrolling into view near the bottom
          of a long page. */}
      <PersonaNavGate
        pages={getCreatorNavPages()}
        homeKey="home"
        indexHref="/dashboard"
        sectionRoutes={CREATOR_SECTION_ROUTES}
        accentColor={accentColor}
        mutedColor="var(--wimc-text-secondary)"
        elevatedBgColor="var(--wimc-bg-elevated)"
        borderColor="var(--wimc-border-default)"
      />

      <div className="hidden md:block">
        <Sidebar
          username={profile.username ?? ''}
          displayName={profile.display_name ?? profile.username ?? ''}
          tier={profile.user_tier ?? 'wanderer'}
          initials={initials}
          hasAnyEvent={hasAnyEvent}
          hasPublishedEvent={hasPublishedEvent}
          hasAnyRsvp={hasAnyRsvp}
          eventsHostedCount={profile.cumulative_events_hosted ?? 0}
          unreadHubMessages={unreadHub}
          pendingHubRequests={pendingHubRequests}
          accentColor={accentColor}
          personas={sidebarPersonas}
        />
      </div>
      <div className="dash-content ml-0 md:ml-[var(--wimc-sidebar-w)]" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', transition: 'margin-left 250ms cubic-bezier(.4,0,.2,1)' }}>
        {/* New top bar is mobile-only this session (Part 1 of 3) — lg:hidden
            matches the gate already proven for Explorer's equivalent swap.
            Desktop keeps the original bar unchanged below. CreatorTabStrip is
            gone — the Home page's swipe carousel (dashboard/page.tsx) now owns
            mobile nav for /dashboard itself, same as Explorer's carousel; other
            /dashboard/* sub-routes rely on the top bar + in-page links, matching
            the precedent already shipped for Explorer's sub-routes. */}
        <div className="lg:hidden">
          <CreatorAuthenticatedTopBar
            city={profile.city ?? ''}
            avatarUrl={profile.avatar_url ?? null}
            initials={initials}
            displayName={profile.display_name ?? profile.username ?? ''}
            profileHref="/dashboard/profile/hub"
            accentColor={accentColor}
            notifications={notifications}
          />
        </div>

        {/* Desktop — restored unchanged from before this session */}
        <div className="hidden lg:flex" style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(242,237,227,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--wimc-coral-glow)',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <Link href="/dashboard" className="dash-logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <WimcWordmark color="#1A2744" height={28} />
          </Link>
          <NotificationBell initialNotifications={notifications} />
        </div>
        {/* No fixed bottom nav left to clear (MobileBottomNav removed for Creator) —
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
