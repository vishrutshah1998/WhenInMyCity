'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import type { WorkspaceLink } from '@/lib/constants/bottomNavConfigs'
import WorkspaceSwitcherList from '@/components/nav/WorkspaceSwitcherList'
import { SOFT_UI, softUICssVars } from '@/lib/softUI'

const ACCENT = 'var(--venue-accent)'
const PANEL  = 'var(--venue-bg-elevated)'
const BORDER = 'var(--venue-border-default)'
const MUTED  = 'var(--venue-text-secondary)'
const TEXT   = 'var(--venue-text-primary)'
const DANGER = 'var(--venue-danger)'

function fmtDate(dateOnly: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(dateOnly))
}

const STATUS_LABEL: Record<string, string> = {
  pending:         'Pending',
  counter_offered: 'Countered',
  accepted:        'Confirmed',
}

// proposed_date already lives on maker_venue_proposals (see getVenueBookings), so
// bucketing by date needs no join against events.starts_at — unlike Creator/Explorer's
// hosting/attending split, this is derived entirely from what getVenueBookings already
// returns. Only pending/counter_offered/accepted are fetched (declined/expired/withdrawn/
// cancelled are noise the venue owner doesn't need front-and-center here); a past-dated
// 'accepted' row surfaces in the Past tab as the confirmed booking having happened.
export interface HubBookingItem {
  key:       string
  title:     string
  date:      string
  makerName: string
  status:    string
}

interface Props {
  venueName:   string
  slug:        string
  initials:    string
  description: string | null
  bookings:    HubBookingItem[]
  workspaces:  WorkspaceLink[]
  accentColor: string
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains-mono)',
  fontSize: 10, fontWeight: 700,
  color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase',
  marginBottom: 14,
}

export default function VenueProfileHubClient({
  venueName, slug, initials, description, bookings, workspaces, accentColor,
}: Props) {
  const [activityTab, setActivityTab] = useState<'upcoming' | 'past'>('upcoming')
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = bookings.filter(b => b.date >= today)
  const past = bookings.filter(b => b.date < today)
  const activeList = activityTab === 'upcoming' ? upcoming : past

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: description ? 12 : 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 22, color: '#000',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 22, fontWeight: 900, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {venueName}
          </h1>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: MUTED, marginTop: 2 }}>
            @{slug}
          </div>
        </div>
      </div>

      {description && (
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: '0 0 28px' }}>
          {description}
        </p>
      )}

      {/* ── Activity ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabelStyle}>Activity</div>

        <div style={{ display: 'flex', border: `1px solid ${BORDER}`, marginBottom: 12 }}>
          {(['upcoming', 'past'] as const).map(tab => {
            const active = activityTab === tab
            const count = tab === 'upcoming' ? upcoming.length : past.length
            return (
              <button
                key={tab}
                onClick={() => setActivityTab(tab)}
                className="soft-ui-toggle-option"
                data-active={active}
                style={{
                  flex: 1, padding: '9px 0',
                  background: active ? accentColor : 'transparent',
                  color: active ? '#000' : MUTED,
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  ...softUICssVars(SOFT_UI.venue, { accent: accentColor, focusRing: `${accentColor}59` }),
                }}
              >
                {tab === 'upcoming' ? 'Upcoming' : 'Past'} · {count}
              </button>
            )
          })}
        </div>

        {activeList.length === 0 ? (
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
              {activityTab === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeList.slice(0, 4).map(item => (
              <Link
                key={item.key}
                href="/business/venue/bookings"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  background: PANEL, border: `1px solid ${BORDER}`,
                  padding: '12px 16px', textDecoration: 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <span style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 9999, padding: '1px 6px',
                      fontFamily: 'var(--font-jetbrains-mono)',
                    }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {fmtDate(item.date)} · {item.makerName}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED, flexShrink: 0 }}>
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/business/venue/bookings"
          style={{
            display: 'block', marginTop: 10, fontSize: 11, color: accentColor,
            fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.05em',
            textDecoration: 'none',
          }}
        >
          View all bookings →
        </Link>
      </div>

      {/* ── Switch workspace — only shown for multi-persona users ────────────── */}
      <WorkspaceSwitcherList workspaces={workspaces} accentColor={accentColor} mutedColor={MUTED} />

      {/* ── Settings ───────────────────────────────────────────────────────── */}
      <Link
        href="/business/venue/profile"
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
