import Link from 'next/link'
import type { UserTier } from '@/types/database'

const TIER_LABELS: Record<UserTier, string> = {
  wanderer: 'Wanderer',
  local:    'Local',
  lantern:  'Lantern',
  beacon:   'Beacon',
}

const THRESHOLDS: Record<UserTier, { events: number }> = {
  wanderer: { events: 0 },
  local:    { events: 3 },
  lantern:  { events: 12 },
  beacon:   { events: 50 },
}

export function TierGate({ current, required, eventsHosted }: {
  current: UserTier
  required: UserTier
  eventsHosted: number
}) {
  const threshold = THRESHOLDS[required]
  const pct = Math.min(100, Math.round((eventsHosted / threshold.events) * 100))

  return (
    <div style={{
      background: 'var(--wimc-bg-overlay)',
      border: '1px solid var(--wimc-border-subtle)',
      borderRadius: 0, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)' }}>
          Your progress to {TIER_LABELS[required]}
        </div>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)' }}>
          {eventsHosted} / {threshold.events} events
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--wimc-bg-elevated)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%', borderRadius: 2, width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--wimc-coral), var(--wimc-amber))',
          transition: 'width 400ms ease',
        }} />
      </div>
      <Link
        href="/dashboard/tier"
        style={{ fontSize: 12, color: 'var(--wimc-coral)', fontWeight: 600, textDecoration: 'none' }}
      >
        View full tier progress →
      </Link>
    </div>
  )
}
