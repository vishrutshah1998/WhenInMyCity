'use client'

import Link from 'next/link'
import type { UserTier } from '@/types/database'

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_ORDER: Record<UserTier, number> = {
  wanderer: 0,
  local:    1,
  lantern:  2,
  beacon:   3,
}

const TIER_LABELS: Record<UserTier, string> = {
  wanderer: 'Wanderer',
  local:    'Local',
  lantern:  'Lantern',
  beacon:   'Beacon',
}

function meetsMin(current: UserTier, required: UserTier) {
  return TIER_ORDER[current] >= TIER_ORDER[required]
}

// ── Tier unlock progress bar ──────────────────────────────────────────────────

function TierGate({ current, required, eventsHosted }: {
  current: UserTier
  required: UserTier
  eventsHosted: number
}) {
  const THRESHOLDS: Record<UserTier, { events: number; label: string }> = {
    wanderer: { events: 0,  label: 'Everyone' },
    local:    { events: 3,  label: '3 events hosted' },
    lantern:  { events: 12, label: '12 events hosted' },
    beacon:   { events: 50, label: '50 events hosted' },
  }

  const threshold = THRESHOLDS[required]
  const pct = Math.min(100, Math.round((eventsHosted / threshold.events) * 100))

  return (
    <div style={{
      background: 'var(--wimc-bg-overlay)',
      border: '1px solid var(--wimc-border-subtle)',
      borderRadius: 10, padding: '14px 16px', marginTop: 16,
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

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  icon, iconColor, iconBg, title, description,
  requiredTier, currentTier, eventsHosted,
  isActive, activeHref, activeLabel,
  setupHref, setupLabel,
  comingSoon,
}: {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  description: string
  requiredTier: UserTier
  currentTier: UserTier
  eventsHosted: number
  isActive?: boolean
  activeHref?: string
  activeLabel?: string
  setupHref?: string
  setupLabel?: string
  comingSoon?: boolean
}) {
  const unlocked = meetsMin(currentTier, requiredTier)
  const isWanderer = requiredTier === 'wanderer'

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: `1px solid ${unlocked || isWanderer ? 'var(--wimc-border-default)' : 'var(--wimc-border-subtle)'}`,
      borderRadius: 18, overflow: 'hidden',
      opacity: unlocked || isWanderer ? 1 : 0.75,
      position: 'relative',
    }}>
      {/* Lock overlay badge */}
      {!unlocked && !isWanderer && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--wimc-bg-overlay)',
          border: '1px solid var(--wimc-border-default)',
          borderRadius: 9999, padding: '4px 10px',
          fontSize: 11, fontWeight: 600,
          color: 'var(--wimc-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>lock</span>
          {TIER_LABELS[requiredTier]}+
        </div>
      )}

      <div style={{ padding: '24px 24px 20px' }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            display: 'grid', placeItems: 'center', background: iconBg, color: iconColor,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.5 }}>
              {description}
            </div>
          </div>
        </div>

        {/* Status + actions */}
        {(unlocked || isWanderer) ? (
          comingSoon ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
              background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
              Coming soon
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {isActive && activeHref && (
                <Link
                  href={activeHref}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: iconBg, color: iconColor, textDecoration: 'none',
                    border: `1px solid ${iconColor}30`,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                  {activeLabel ?? 'Manage'}
                </Link>
              )}
              {setupHref && (
                <Link
                  href={setupHref}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: isActive ? 'transparent' : iconBg,
                    color: isActive ? 'var(--wimc-text-secondary)' : iconColor,
                    textDecoration: 'none',
                    border: isActive ? '1px solid var(--wimc-border-default)' : `1px solid ${iconColor}30`,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                    {isActive ? 'settings' : 'add'}
                  </span>
                  {setupLabel ?? 'Set up'}
                </Link>
              )}
            </div>
          )
        ) : (
          /* Locked: show tier gate progress */
          <TierGate current={currentTier} required={requiredTier} eventsHosted={eventsHosted} />
        )}
      </div>

      {/* Active indicator strip */}
      {(isActive && (unlocked || isWanderer)) && (
        <div style={{ height: 3, background: `linear-gradient(90deg, ${iconColor}, ${iconColor}60)` }} />
      )}
    </div>
  )
}

// ── Tier comparison table ─────────────────────────────────────────────────────

const EARN_MATRIX = [
  { feature: 'Booking Requests',  wanderer: true,  local: true,  lantern: true,  beacon: true  },
  { feature: 'Digital Downloads', wanderer: false, local: false, lantern: true,  beacon: true  },
  { feature: 'Online Courses',    wanderer: false, local: false, lantern: false, beacon: true  },
]

function TierMatrix() {
  const tiers: UserTier[] = ['wanderer', 'local', 'lantern', 'beacon']
  const COLORS: Record<UserTier, string> = {
    wanderer: 'var(--wimc-text-muted)',
    local:    'var(--wimc-success)',
    lantern:  'var(--wimc-amber)',
    beacon:   'var(--wimc-coral)',
  }

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      borderRadius: 18, overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>
          What you unlock at each tier
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
              <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--wimc-text-muted)', fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Product
              </th>
              {tiers.map((t) => (
                <th key={t} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: COLORS[t], fontFamily: 'var(--font-syne)', fontSize: 13 }}>
                  {TIER_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EARN_MATRIX.map((row, i) => (
              <tr key={row.feature} style={{ borderBottom: i < EARN_MATRIX.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none' }}>
                <td style={{ padding: '14px 24px', fontWeight: 600 }}>{row.feature}</td>
                {tiers.map((t) => (
                  <td key={t} style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {row[t] ? (
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--wimc-success)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--wimc-border-strong)' }}>remove</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface EarnClientProps {
  tier: UserTier
  eventsHosted: number
  hasBookingBlock: boolean
}

export default function EarnClient({ tier, eventsHosted, hasBookingBlock }: EarnClientProps) {
  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Earn</div>
        <Link
          href="/dashboard/tier"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11,
            color: 'var(--wimc-amber)', background: 'var(--wimc-amber-dim)',
            padding: '4px 10px', borderRadius: 9999,
            border: '1px solid rgba(255,196,0,0.2)', textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          {TIER_LABELS[tier]}
        </Link>
      </header>

      <div style={{ padding: 32, display: 'grid', gap: 24, maxWidth: 820 }}>

        {/* Intro */}
        <div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
            Monetise your audience
          </div>
          <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)' }}>
            Turn your WIMC page into a revenue source — bookings, downloads, and courses.
          </div>
        </div>

        {/* Product cards */}
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Booking Requests — available to all */}
          <ProductCard
            icon="calendar_month"
            iconColor="var(--wimc-teal)"
            iconBg="var(--wimc-teal-dim)"
            title="Booking Requests"
            description="Let fans and event organisers send you booking inquiries directly from your page. You choose which to accept."
            requiredTier="wanderer"
            currentTier={tier}
            eventsHosted={eventsHosted}
            isActive={hasBookingBlock}
            activeHref="/dashboard/bookings?tab=inquiries"
            activeLabel="View inquiries"
            setupHref="/dashboard/studio"
            setupLabel={hasBookingBlock ? 'Edit on page' : 'Add to my page'}
          />

          {/* Digital Downloads — Lantern+ */}
          <ProductCard
            icon="download"
            iconColor="var(--wimc-amber)"
            iconBg="var(--wimc-amber-dim)"
            title="Digital Downloads"
            description="Sell music packs, PDF zines, presets, templates, or any digital file — straight from your profile. You set the price."
            requiredTier="lantern"
            currentTier={tier}
            eventsHosted={eventsHosted}
            comingSoon={meetsMin(tier, 'lantern')}
          />

          {/* Online Courses — Beacon */}
          <ProductCard
            icon="school"
            iconColor="var(--wimc-coral)"
            iconBg="var(--wimc-coral-dim)"
            title="Online Courses"
            description="Package your knowledge into a multi-module course. Share exclusive content with your most dedicated fans."
            requiredTier="beacon"
            currentTier={tier}
            eventsHosted={eventsHosted}
            comingSoon={meetsMin(tier, 'beacon')}
          />
        </div>

        {/* Tier matrix */}
        <TierMatrix />

      </div>
    </>
  )
}
