import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import ExplorerSidebar from '@/components/explore/ExplorerSidebar'
import MobileBottomNav from '@/components/ui/MobileBottomNav'
import { explorerBottomNavConfig, resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'

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
    .select('display_name, avatar_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!ep) redirect('/onboarding')

  // Get username + initials from user_profiles
  const { data: up } = await admin
    .from('user_profiles')
    .select('username, display_name, avatar_url, personas')
    .eq('id', user.id)
    .maybeSingle()

  const displayName      = ep.display_name ?? up?.display_name ?? 'Explorer'
  const username         = up?.username ?? 'explorer'
  const avatarUrl        = ep.avatar_url ?? up?.avatar_url ?? null
  const initials         = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const explorerPersonas = (up?.personas ?? []) as string[]
  const mobileWorkspaces = resolveWorkspaces(explorerPersonas, 'explorer')

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--wimc-bg-base)',
        color: 'var(--wimc-text-primary)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        '--wimc-accent': '#9B8FFF',
      } as React.CSSProperties}
    >
      <div className="wimc-grain" aria-hidden />

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
        {/* Slim top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(242,237,227,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(26,39,68,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

        <main className="mob-nav-pb" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
      <MobileBottomNav config={explorerBottomNavConfig} workspaces={mobileWorkspaces} />
    </div>
  )
}
