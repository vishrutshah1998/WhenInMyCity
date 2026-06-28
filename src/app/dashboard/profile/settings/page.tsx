import Link from 'next/link'
import ProfileForm from '../profile-client'
import { requireProfile } from '@/lib/auth/requireAuth'

export const metadata = { title: 'Profile Settings — WIMC' }

export default async function ProfileSettingsPage() {
  await requireProfile()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)' }}>
      <header style={{
        height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)',
      }}>
        <Link
          href="/dashboard/studio"
          aria-label="Back to studio"
          style={{
            display: 'grid', placeItems: 'center', width: 32, height: 32,
            color: 'var(--wimc-text-secondary)', textDecoration: 'none',
            transition: 'color 180ms ease',
          }}
          onMouseEnter={undefined}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </Link>
        <div>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Creator Studio
          </p>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, color: 'var(--wimc-text-primary)', lineHeight: 1 }}>
            Profile Settings
          </h1>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <ProfileForm />
        </div>
      </div>
    </div>
  )
}
