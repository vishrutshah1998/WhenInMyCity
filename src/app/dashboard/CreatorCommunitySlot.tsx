'use client'

import { useEffect, useState } from 'react'
import { getDiscoverCreators, getConnections } from '@/app/actions/hub'
import type { DiscoverCreator, HubConnection } from '@/app/actions/hub'
import { getSupportedCreators } from '@/app/actions/analytics'
import type { SupportedCreator } from '@/app/actions/analytics'
import { HubClient } from '@/components/dashboard/HubClient'
import CommunityClient from '@/app/dashboard/community/CommunityClient'

// Community carousel page — Creator Hub + My Circles, behind a segmented
// toggle rather than stacked sections. Hub is a substantial, interactive
// messaging surface (its own discover/requests/messages tabs, connection
// requests, live message threads) — stacking it above My Circles' supporter
// list would either bury the list under a long inbox scroll, or bury the
// inbox under it. A tap-toggle (not a horizontal-scroll strip — no gesture
// surface to conflict with the outer carousel's own drag) keeps each at full
// height and lets Hub's own internal Tab state work exactly as it already does
// standalone at /dashboard/hub.

type View = 'hub' | 'circles'

interface Props {
  currentUserId: string
  userTier:      string
  accentColor:   string
}

export default function CreatorCommunitySlot({ currentUserId, userTier, accentColor }: Props) {
  const [view, setView] = useState<View>('hub')
  const [loading, setLoading] = useState(true)
  const [discover, setDiscover]       = useState<DiscoverCreator[]>([])
  const [connections, setConnections] = useState<HubConnection[]>([])
  const [supported, setSupported]     = useState<SupportedCreator[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [d, c, s] = await Promise.all([
        getDiscoverCreators(20),
        getConnections(),
        getSupportedCreators(),
      ])
      if (cancelled) return
      setDiscover(d)
      setConnections(c)
      setSupported(s)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', gap: 6, padding: '16px 16px 0',
        background: 'var(--wimc-bg-base)',
      }}>
        {([
          { key: 'hub' as const,     label: 'Creator Hub' },
          { key: 'circles' as const, label: 'My Circles' },
        ]).map(t => {
          const active = view === t.key
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              style={{
                flex: 1, padding: '10px 0',
                background: active ? accentColor : 'transparent',
                border: `1px solid ${active ? accentColor : 'var(--wimc-border-default)'}`,
                color: active ? '#fff' : 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer',
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
          <HubClient currentUserId={currentUserId} discover={discover} connections={connections} />
        ) : (
          <CommunityClient supported={supported} userTier={userTier} />
        )}
      </div>
    </div>
  )
}
