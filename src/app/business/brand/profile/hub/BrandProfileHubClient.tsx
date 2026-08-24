'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import type { WorkspaceLink } from '@/lib/constants/bottomNavConfigs'
import WorkspaceSwitcherList from '@/components/nav/WorkspaceSwitcherList'
import { SOFT_UI } from '@/lib/softUI'

const PANEL  = 'var(--venue-bg-elevated)'
const BORDER = 'var(--venue-border-default)'
const MUTED  = 'var(--venue-text-secondary)'
const TEXT   = 'var(--venue-text-primary)'
const DANGER = 'var(--venue-danger)'

interface Props {
  brandName:   string
  username:    string
  initials:    string
  avatarUrl:   string | null
  bio:         string | null
  workspaces:  WorkspaceLink[]
  accentColor: string
}

// Modeled on VenueProfileHubClient.tsx, with two differences: bio (not a
// venue description) sits under the header, and there is no Activity
// section — Brand has no activity-tracking equivalent (Enquiries has no
// backend, confirmed in the audit), so it's omitted entirely rather than
// fabricating content. signOut() is the same existing action every other
// persona's hub already calls — no new auth logic here.
export default function BrandProfileHubClient({
  brandName, username, initials, avatarUrl, bio, workspaces, accentColor,
}: Props) {
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: bio ? 12 : 28 }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={brandName}
            style={{
              width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              border: SOFT_UI.brand.dash, boxShadow: SOFT_UI.brand.inset,
            }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 22, color: '#000',
            flexShrink: 0,
            border: SOFT_UI.brand.dash, boxShadow: SOFT_UI.brand.inset,
          }}>
            {initials}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 22, fontWeight: 900, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {brandName}
          </h1>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: MUTED, marginTop: 2 }}>
            @{username}
          </div>
        </div>
      </div>

      {bio && (
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: '0 0 28px' }}>
          {bio}
        </p>
      )}

      {/* ── Switch workspace — only shown for multi-persona users ────────────── */}
      <WorkspaceSwitcherList workspaces={workspaces} accentColor={accentColor} mutedColor={MUTED} />

      {/* ── Settings ───────────────────────────────────────────────────────── */}
      <Link
        href="/business/brand/profile"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 16px', marginBottom: 32,
          background: PANEL, border: `1px solid ${BORDER}`,
          textDecoration: 'none',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: accentColor, flexShrink: 0 }}>
          settings
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: 'var(--font-dm-sans)' }}>
          Settings
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED, flexShrink: 0 }}>
          chevron_right
        </span>
      </Link>

      {/* ── Log out — deliberately de-emphasized, plain text + confirm step ──── */}
      <div style={{ textAlign: 'center' }}>
        {!confirmingLogout ? (
          <button
            onClick={() => setConfirmingLogout(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: MUTED,
              fontFamily: 'var(--font-dm-sans)',
              textDecoration: 'underline', textDecorationStyle: 'dashed',
              padding: '8px 0',
            }}
          >
            Log out
          </button>
        ) : (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: MUTED }}>Log out of When In My City?</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmingLogout(false)}
                disabled={loggingOut}
                style={{
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  color: MUTED, cursor: 'pointer', padding: '7px 16px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  background: `color-mix(in srgb, ${DANGER} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${DANGER} 40%, transparent)`,
                  color: DANGER, cursor: 'pointer', padding: '7px 16px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  opacity: loggingOut ? 0.6 : 1,
                }}
              >
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
