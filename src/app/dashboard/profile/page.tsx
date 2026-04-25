import Link from 'next/link'
import ProfileForm from './profile-client'
import { requireProfile } from '@/lib/auth/requireAuth'
import { CREATOR_DEFAULT_THEMES, DEFAULT_PROFILE_THEME, schemeToStyle } from '@/types/theme'

export const metadata = { title: 'Profile — WIMC' }

export default async function ProfilePage() {
  const { profile } = await requireProfile()
  const categoryStyle = schemeToStyle((CREATOR_DEFAULT_THEMES[profile.creator_type] ?? DEFAULT_PROFILE_THEME).colorScheme)

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased" style={categoryStyle}>
      <header className="bg-surface border-b border-outline-variant/30 shadow-sm flex items-center gap-4 px-4 sm:px-6 h-16 sticky top-0 z-50">
        <Link
          href="/dashboard"
          className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors"
          aria-label="Back to dashboard"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-headline font-bold text-lg text-on-surface">Profile</h1>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
        <ProfileForm />
      </div>

      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
