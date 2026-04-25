import type { ReactNode } from 'react'
import Link from 'next/link'
import ExploreNav from './ExploreNav'

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      <div style={{
        background: 'var(--wimc-bg-raised)',
        borderBottom: '1px solid var(--wimc-border-subtle)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 0 8px',
          }}>
            <div style={{
              width: 28, height: 28, background: 'var(--wimc-coral)',
              borderRadius: 7, display: 'grid', placeItems: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-syne)' }}>W</span>
            </div>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 17 }}>WIMC</span>
            <span style={{
              marginLeft: 4, fontSize: 11, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              Explorer
            </span>
            <Link
              href="/explore/settings"
              title="Profile settings"
              style={{
                marginLeft: 'auto',
                display: 'grid', placeItems: 'center',
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--wimc-border-subtle)',
                color: 'var(--wimc-text-secondary)',
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
            </Link>
          </div>
          <ExploreNav />
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>
        {children}
      </main>
    </div>
  )
}
