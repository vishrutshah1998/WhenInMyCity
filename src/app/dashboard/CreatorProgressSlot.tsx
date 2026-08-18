'use client'

import { useEffect, useState } from 'react'
import { getShowcasedCreators } from '@/app/actions/hallOfLights'
import type { ShowcasedCreator } from '@/app/actions/hallOfLights'
import { getTierMetrics, type TierMetricsResult } from '@/app/actions/tier'
import HallClient from '@/app/hall-of-lights/HallClient'
import TierClient from '@/app/dashboard/tier/TierClient'

// Progress carousel page — Hall of Lights + Tier Progress, stacked in one
// continuous scroll (unlike Community's toggle). Both are read-only,
// showcase-style content with no live interaction of their own, so a single
// scroll reads naturally, the way a "profile achievements" page would —
// there's no heavy interactive surface here to bury, unlike Hub in Community.

interface Props {
  viewerCity: string | null
}

export default function CreatorProgressSlot({ viewerCity }: Props) {
  const [loading, setLoading]   = useState(true)
  const [creators, setCreators] = useState<ShowcasedCreator[]>([])
  const [tierData, setTierData] = useState<TierMetricsResult | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [c, t] = await Promise.all([
        getShowcasedCreators(),
        getTierMetrics(),
      ])
      if (cancelled) return
      setCreators(c)
      setTierData(t)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading || !tierData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <p style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Loading…
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--wimc-border-default)' }}>
        <TierClient
          tier={tierData.tier}
          metrics={tierData.metrics}
          eventsAttendedIn90d={tierData.eventsAttendedIn90d}
          eventsHostedIn180d={tierData.eventsHostedIn180d}
          eventsHostedIn365d={tierData.eventsHostedIn365d}
        />
      </div>
      <HallClient
        creators={creators}
        viewerCity={viewerCity}
        viewerTier={tierData.tier}
        inDashboard
      />
    </div>
  )
}
