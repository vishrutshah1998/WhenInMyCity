import { requireAuth } from '@/lib/auth/requireAuth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import BrandSidebarServer from '@/components/business/BrandSidebarServer'
import MobileBottomNav from '@/components/ui/MobileBottomNav'
import { brandBottomNavConfig, resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import NotificationBell from '@/components/dashboard/NotificationBell'
import { getNotificationsForUser } from '@/app/actions/notifications'

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth('/business/brand/dashboard')
  const admin = createAdminClient()

  const [{ data: profile }, notifications] = await Promise.all([
    admin
      .from('user_profiles')
      .select('personas, creator_type')
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

  return (
    <div
      className="adda-theme brand-variant"
      style={{ minHeight: '100vh', background: 'var(--adda-bg-base)', position: 'relative' }}
    >
      {/* Grain texture — matches creator dashboard aesthetic */}
      <div className="wimc-grain" aria-hidden />

      <div className="hidden md:block">
        <BrandSidebarServer />
      </div>

      <div
        className="dash-content md:ml-[var(--adda-sidebar-w)]"
        style={{
          transition: 'margin-left 220ms cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column', minHeight: '100vh',
        }}
      >
        {/* Clean top bar — matches creator dashboard layout */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: 48,
          background: 'rgba(12,10,6,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <Link href="/business/brand/dashboard" className="dash-logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <WimcWordmark color="white" height={26} />
          </Link>
          <NotificationBell initialNotifications={notifications} />
        </div>

        <main className="mob-nav-pb" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
      <MobileBottomNav config={brandBottomNavConfig} workspaces={resolveWorkspaces(personas, 'brand')} />
    </div>
  )
}
