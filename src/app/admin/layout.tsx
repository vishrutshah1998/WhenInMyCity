import { requireAdmin } from '@/lib/auth/requireAuth'
import AdminNav from './AdminNav'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--wimc-bg-raised)',
        borderBottom: '1px solid var(--wimc-border-subtle)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Brand */}
          <Link href="/admin/payouts" style={{
            display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
          }}>
            <div style={{
              width: 28, height: 28, background: 'var(--wimc-coral)',
              borderRadius: 6, display: 'grid', placeItems: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-syne)' }}>W</span>
            </div>
            <span style={{
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 15,
              color: 'var(--wimc-text-primary)',
            }}>
              Admin
            </span>
          </Link>

          <div style={{ width: 1, height: 20, background: 'var(--wimc-border-subtle)' }} />

          <AdminNav />
        </div>

        {/* User pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--wimc-text-secondary)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>admin_panel_settings</span>
          {profile.display_name}
          <Link
            href="/dashboard"
            style={{
              marginLeft: 8, fontSize: 12, color: 'var(--wimc-text-muted)',
              textDecoration: 'none',
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid var(--wimc-border-subtle)',
            }}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>
        {children}
      </main>
    </div>
  )
}
