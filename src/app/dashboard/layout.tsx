import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileBottomNav from '@/components/ui/MobileBottomNav'
import { creatorBottomNavConfig, resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import NotificationBell from '@/components/dashboard/NotificationBell'
import { getNotificationsForUser } from '@/app/actions/notifications'
import { getUnreadMessageCount } from '@/app/actions/hub'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import { getCategoryColors } from '@/lib/constants/categories'
import { isLocalPlus } from '@/lib/tier'
import type { CreatorType } from '@/types/database'

// Map journey persona to a default accent when no creator_type is set
const EXPLORER_ACCENT = '#9B8FFF'
const DEFAULT_ACCENT  = '#E8705A'

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

  // Compute the per-category accent color for sidebar + CSS variable
  const accentColor = profile.user_role === 'explorer'
    ? EXPLORER_ACCENT
    : getCategoryColors(profile.creator_type as CreatorType | null).primary || DEFAULT_ACCENT

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
        {/* Slim top bar — notification bell lives here */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(242,237,227,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--wimc-coral-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <Link href="/dashboard" className="dash-logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <WimcWordmark color="#1A2744" height={28} />
          </Link>
          <NotificationBell initialNotifications={notifications} />
        </div>
        <main className="mob-nav-pb" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
      <MobileBottomNav config={creatorBottomNavConfig} workspaces={resolveWorkspaces(sidebarPersonas, 'creator')} />
    </div>
  )
}
