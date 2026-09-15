'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import type { MyTicket } from '@/app/actions/rsvp'
import type { WorkspaceLink } from '@/lib/constants/bottomNavConfigs'
import WorkspaceSwitcherList from '@/components/nav/WorkspaceSwitcherList'
import PaperCard from '@/components/ui/PaperCard'
import IconChip from '@/components/ui/IconChip'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
}

interface Props {
  displayName: string
  avatarUrl:   string | null
  initials:    string
  username:    string | null
  bio:         string | null
  tickets:     MyTicket[]
  workspaces:  WorkspaceLink[]
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains-mono)',
  fontSize: 10, fontWeight: 700,
  color: 'var(--venue-accent)', letterSpacing: '0.2em', textTransform: 'uppercase',
  marginBottom: 14,
}

// Paper-cutout pass: swapped the old hardcoded LAVENDER/PANEL/BORDER/MUTED/
// TEXT hex constants for PaperCard/IconChip + the shared --venue-* tokens
// (this surface resolves them to lavender/violet via the .explorer-variant
// class applied in explore/dashboard/layout.tsx — see venue-tokens.css).
// CommunitiesComingSoon.tsx's content is inlined below (its only remaining
// call site) rather than kept as a separate restyled component.
export default function ExplorerProfileHubClient({
  displayName, avatarUrl, initials, username, bio, tickets, workspaces,
}: Props) {
  const [activityTab, setActivityTab] = useState<'upcoming' | 'completed'>('upcoming')
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const now = new Date().toISOString()
  const upcoming = tickets.filter(t => t.eventStartsAt > now)
  const completed = tickets.filter(t => t.eventStartsAt <= now)
  const activeList = activityTab === 'upcoming' ? upcoming : completed

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: bio ? 12 : 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--venue-accent), rgba(155,143,255,0.5))',
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 22, color: '#fff',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 22, fontWeight: 900, color: 'var(--venue-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </h1>
          {username && (
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--venue-text-secondary)', marginTop: 2 }}>
              @{username}
            </div>
          )}
        </div>
      </div>

      {bio && (
        <p style={{ fontSize: 13, color: 'var(--venue-text-secondary)', lineHeight: 1.6, margin: '0 0 28px' }}>
          {bio}
        </p>
      )}

      {/* ── Communities — coming soon (inlined from CommunitiesComingSoon.tsx,
          its only remaining call site) ────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabelStyle}>Communities</div>
        <PaperCard
          borderColor="var(--venue-text-primary)"
          background="var(--venue-bg-elevated)"
          padding="20px 20px"
          style={{ textAlign: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--venue-text-secondary)', display: 'block', marginBottom: 8 }}>
            groups
          </span>
          <p style={{ fontSize: 12, color: 'var(--venue-text-secondary)', margin: 0 }}>
            Coming soon — join scenes like Salsa In My City or Read In My City.
          </p>
        </PaperCard>
      </div>

      {/* ── Activity ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabelStyle}>Activity</div>

        <div style={{ display: 'flex', border: '1px solid var(--venue-border-default)', marginBottom: 12 }}>
          {(['upcoming', 'completed'] as const).map(tab => {
            const active = activityTab === tab
            const count = tab === 'upcoming' ? upcoming.length : completed.length
            return (
              <button
                key={tab}
                onClick={() => setActivityTab(tab)}
                style={{
                  flex: 1, padding: '9px 0',
                  background: active ? 'var(--venue-accent)' : 'transparent',
                  color: active ? 'var(--venue-bg-base)' : 'var(--venue-text-secondary)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}
              >
                {tab === 'upcoming' ? 'Upcoming' : 'Completed'} · {count}
              </button>
            )
          })}
        </div>

        {activeList.length === 0 ? (
          <PaperCard
            borderColor="var(--venue-text-primary)"
            background="var(--venue-bg-elevated)"
            padding="24px 20px"
            style={{ textAlign: 'center' }}
          >
            <p style={{ fontSize: 12, color: 'var(--venue-text-secondary)', margin: 0 }}>
              {activityTab === 'upcoming' ? 'No upcoming events booked yet.' : 'No completed events yet.'}
            </p>
          </PaperCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activeList.slice(0, 4).map(t => (
              <PaperCard
                key={t.rsvpId}
                href={`/events/${t.eventSlug}`}
                borderColor="var(--venue-text-primary)"
                background="var(--venue-bg-elevated)"
                padding="12px 16px"
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <IconChip color="var(--venue-accent-tint)" iconColor="var(--venue-accent)">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>confirmation_number</span>
                </IconChip>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--venue-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.eventTitle}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--venue-text-secondary)', marginTop: 2 }}>
                    {fmtDate(t.eventStartsAt)} · {t.venueName}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--venue-text-muted)', flexShrink: 0 }}>
                  chevron_right
                </span>
              </PaperCard>
            ))}
          </div>
        )}

        <Link
          href="/explore/dashboard/tickets"
          style={{
            display: 'block', marginTop: 10, fontSize: 11, color: 'var(--venue-accent)',
            fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.05em',
            textDecoration: 'none',
          }}
        >
          View all tickets →
        </Link>
      </div>

      {/* ── Switch workspace — only shown for multi-persona users ────────────── */}
      <WorkspaceSwitcherList workspaces={workspaces} accentColor="var(--venue-accent)" mutedColor="var(--venue-text-secondary)" />

      {/* ── Settings ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <PaperCard
          href="/explore/dashboard/settings"
          borderColor="var(--venue-text-primary)"
          background="var(--venue-bg-elevated)"
          padding="13px 16px"
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <IconChip color="var(--venue-accent-tint)" iconColor="var(--venue-accent)">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          </IconChip>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--venue-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
            Settings
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-text-muted)', flexShrink: 0 }}>
            chevron_right
          </span>
        </PaperCard>
      </div>

      {/* ── Log out — deliberately de-emphasized, plain text + confirm step ──── */}
      <div style={{ textAlign: 'center' }}>
        {!confirmingLogout ? (
          <button
            onClick={() => setConfirmingLogout(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--venue-text-secondary)',
              fontFamily: 'var(--font-dm-sans)',
              textDecoration: 'underline', textDecorationStyle: 'dashed',
              padding: '8px 0',
            }}
          >
            Log out
          </button>
        ) : (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--venue-text-secondary)' }}>Log out of When In My City?</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmingLogout(false)}
                disabled={loggingOut}
                style={{
                  background: 'transparent', border: '1px solid var(--venue-border-default)',
                  color: 'var(--venue-text-secondary)', cursor: 'pointer', padding: '7px 16px',
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
                  background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.5)',
                  color: '#F472B6', cursor: 'pointer', padding: '7px 16px',
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
