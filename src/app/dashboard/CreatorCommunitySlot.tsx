'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDiscoverCreators, getConnections } from '@/app/actions/hub'
import type { DiscoverCreator, HubConnection } from '@/app/actions/hub'
import { getSupportedCreators } from '@/app/actions/analytics'
import type { SupportedCreator } from '@/app/actions/analytics'
import { getCommunitiesForUser } from '@/app/actions/communities'
import type { Community } from '@/app/actions/communities'
import { HubClient } from '@/components/dashboard/HubClient'
import { HubLocked } from '@/components/dashboard/HubLocked'
import CommunityClient from '@/app/dashboard/community/CommunityClient'
import { isLocalPlus } from '@/lib/tier'
import type { UserProfile } from '@/types/database'
import { SOFT_UI, softUICssVars } from '@/lib/softUI'

// Community carousel page — Creator Hub / Communities / Common Circles,
// behind a segmented toggle rather than stacked sections. Hub is a
// substantial, interactive messaging surface (its own discover/requests/
// messages tabs, connection requests, live message threads) — stacking it
// above the other two would bury one under a long scroll. A tap-toggle (not
// a horizontal-scroll strip — no gesture surface to conflict with the outer
// carousel's own drag) keeps each at full height and lets Hub's own internal
// Tab state work exactly as it already does standalone at /dashboard/hub.
//
// Three distinct, previously-colliding features live here:
//   - "Creator Hub"    → /dashboard/hub content, Local+ gated — this slot
//     used to be the gate (the whole page didn't mount below Local); now the
//     PAGE is reachable at every tier and this ONE tab enforces the gate
//     itself, rendering the same HubLocked component /dashboard/hub uses
//     standalone.
//   - "Communities"    → joined/pending Communities (getCommunitiesForUser),
//     deliberately NOT tier-gated — Communities has no tier gate anywhere
//     else in the system. Default tab for a below-Local creator, since
//     landing on a locked Hub by default would be a dead end.
//   - "Common Circles" → the old "My Circles" supporter-ring analytics
//     (CommunityClient.tsx), unchanged functionally and never tier-gated on
//     its own — renamed only to disambiguate from the new Communities
//     feature (which is publicly branded "Circles").
//
// Practical note: below-Local creators are effectively rare today — new
// creators start at 'local' tier directly (onboarding.ts), and
// dashboard/layout.tsx immediately upgrades any wanderer-tier creator to
// local the moment they load ANY /dashboard/* page (skipped only when
// profile.user_role === 'explorer', so a below-Local Hub-tab view is mainly
// reachable for an explorer-primary user who also holds a creator persona).
// This tab-level gate matters for that case and for whenever that auto-
// upgrade logic changes — not touched here either way.

type View = 'hub' | 'communities' | 'circles'

interface Props {
  currentUserId: string
  profile:       UserProfile
  accentColor:   string
}

export default function CreatorCommunitySlot({ currentUserId, profile, accentColor }: Props) {
  const hubAllowed = isLocalPlus(profile.user_tier)
  const userTier = profile.user_tier ?? 'wanderer'

  const [view, setView] = useState<View>(hubAllowed ? 'hub' : 'communities')
  const [loading, setLoading] = useState(true)
  const [discover, setDiscover]         = useState<DiscoverCreator[]>([])
  const [connections, setConnections]   = useState<HubConnection[]>([])
  const [supported, setSupported]       = useState<SupportedCreator[]>([])
  const [communities, setCommunities]   = useState<Community[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [d, c, s, comm] = await Promise.all([
          hubAllowed ? getDiscoverCreators(20) : Promise.resolve([]),
          hubAllowed ? getConnections() : Promise.resolve([]),
          getSupportedCreators(),
          getCommunitiesForUser(currentUserId),
        ])
        if (cancelled) return
        setDiscover(d)
        setConnections(c)
        setSupported(s)
        setCommunities(comm)
      } catch (err) {
        // Without this, a rejection from any single call (e.g. a thrown
        // server-action error) left Promise.all rejected and setLoading(false)
        // unreached below — the tab hung on "Loading…" forever with no
        // console signal beyond an unhandled rejection.
        console.error('[CreatorCommunitySlot] failed to load', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentUserId, hubAllowed])

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', gap: 6, padding: '16px 16px 0',
        background: 'var(--wimc-bg-base)',
      }}>
        {([
          { key: 'hub' as const,        label: 'Creator Hub' },
          { key: 'communities' as const, label: 'Communities' },
          { key: 'circles' as const,    label: 'Common Circles' },
        ]).map(t => {
          const active = view === t.key
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="soft-ui-toggle-option"
              data-active={active}
              style={{
                flex: 1, padding: '10px 0',
                background: active ? accentColor : 'transparent',
                border: `1px solid ${active ? accentColor : 'var(--wimc-border-default)'}`,
                // '#fff' on --wimc-accent (coral) is 3.05:1, below WCAG AA — '#000' clears 6.9:1
                color: active ? '#000' : 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer',
                ...softUICssVars(SOFT_UI.creator, { accent: accentColor, focusRing: `${accentColor}59` }),
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Loading…
            </p>
          </div>
        ) : view === 'hub' ? (
          hubAllowed ? (
            <HubClient currentUserId={currentUserId} discover={discover} connections={connections} />
          ) : (
            <HubLocked profile={profile} />
          )
        ) : view === 'communities' ? (
          <CreatorCommunitiesTab communities={communities} accentColor={accentColor} />
        ) : (
          <CommunityClient supported={supported} userTier={userTier} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreatorCommunitiesTab — joined/pending Communities list
// ---------------------------------------------------------------------------

function CreatorCommunitiesTab({ communities, accentColor }: { communities: Community[]; accentColor: string }) {
  if (communities.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 30, color: 'var(--wimc-text-muted)', display: 'block', marginBottom: 12 }}>groups</span>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--wimc-text-primary)', marginBottom: 6, fontFamily: 'var(--font-dm-sans)' }}>
          You haven&apos;t joined a Community yet
        </div>
        <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 20, fontFamily: 'var(--font-dm-sans)' }}>
          Browse Circles across the city, or start your own.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/circles"
            style={{
              display: 'inline-block', padding: '10px 18px', borderRadius: 999, border: `1.5px solid ${accentColor}`,
              color: accentColor, textDecoration: 'none', fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 13,
            }}
          >
            Browse Circles
          </Link>
          <Link
            href="/circles/new"
            style={{
              display: 'inline-block', padding: '10px 18px', borderRadius: 999, background: accentColor,
              color: '#fff', textDecoration: 'none', fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 13,
            }}
          >
            Start a Circle
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {communities.map((c) => (
        <Link
          key={c.id}
          href={`/circles/${c.slug}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            background: 'var(--wimc-bg-raised)', border: '1px solid var(--wimc-border-subtle)', textDecoration: 'none',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 999, flexShrink: 0,
            backgroundImage: c.cover_image_url ? `url(${c.cover_image_url})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            background: c.cover_image_url ? undefined : 'rgba(26,39,68,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!c.cover_image_url && <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-muted)' }}>groups</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>{c.name}</div>
            {c.city && (
              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9.5, color: 'var(--wimc-text-muted)', textTransform: 'uppercase', marginTop: 2 }}>
                {c.city}
              </div>
            )}
          </div>
        </Link>
      ))}
      <Link
        href="/circles"
        style={{
          textAlign: 'center', padding: '10px 0', border: '1px dashed var(--wimc-border-default)',
          color: accentColor, textDecoration: 'none',
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
        }}
      >
        Browse more Circles
      </Link>
    </div>
  )
}
