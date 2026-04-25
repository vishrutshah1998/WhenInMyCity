'use client'

import Link from 'next/link'
import type { MakerTier } from '@/types/database'
import { TIER_THRESHOLDS } from '@/lib/constants/interests'

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_ORDER: MakerTier[] = ['mohalla', 'nukkad', 'chowk', 'maidan']

const TIER_META: Record<MakerTier, { emoji: string; label: string; sub: string }> = {
  mohalla: { emoji: '🏘️', label: 'Mohalla', sub: 'Starter' },
  nukkad:  { emoji: '🏙️', label: 'Nukkad',  sub: 'Growing' },
  chowk:   { emoji: '🏛️', label: 'Chowk',   sub: 'Established' },
  maidan:  { emoji: '🌆', label: 'Maidan',   sub: 'Top tier' },
}

const BENEFITS: {
  label: string
  desc: string
  tier: MakerTier
  dotColor: string
  tierColor: string
  tierBg: string
}[] = [
  {
    label: 'Creator Page & Public Profile',
    desc: 'Your public link-in-bio page at wheninmycity.com/@handle. Customisable blocks for events, links, social media embeds and more.',
    tier: 'mohalla', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Paid Event Ticketing',
    desc: 'Sell tickets directly through WIMC with UPI, card and wallet support. Instant payout within 3 working days after event.',
    tier: 'mohalla', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Lead Capture & CRM',
    desc: 'Collect emails from anyone who visits your page. Export CSV or connect to email providers for drip campaigns.',
    tier: 'mohalla', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Priority Discovery Placement',
    desc: 'Your events appear at the top of city Explorer feeds. Higher visibility = more organic sign-ups without paid promotion.',
    tier: 'nukkad', dotColor: '#F5A800', tierColor: '#F5A800', tierBg: 'rgba(245,168,0,0.12)',
  },
  {
    label: 'Premium Venue Access (Adda)',
    desc: 'Request bookings at curated Adda-partner spaces — cafés, studios, rooftops. Pre-negotiated rates, no broker needed.',
    tier: 'nukkad', dotColor: '#F5A800', tierColor: '#F5A800', tierBg: 'rgba(245,168,0,0.12)',
  },
  {
    label: 'Bulk Ticket Tools & Promo Codes',
    desc: 'Issue discount codes, group bookings, and referral incentives. Manage multiple ticket tiers for a single event.',
    tier: 'chowk', dotColor: '#3B6BCC', tierColor: '#3B6BCC', tierBg: 'rgba(59,107,204,0.15)',
  },
  {
    label: 'WIMC Verified Badge + PR Features',
    desc: 'Top-tier creators get a Verified badge, featured city newsletter placement, and introductions to brand partnership opportunities.',
    tier: 'maidan', dotColor: '#E8342A', tierColor: '#E8342A', tierBg: 'rgba(232,52,42,0.1)',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(current: number, target: number): number {
  return Math.min(100, Math.round((current / target) * 100))
}

function formatGMV(paise: number): string {
  const rs = paise / 100
  if (rs >= 100000) return `₹${(rs / 100000).toFixed(1)}L`
  if (rs >= 1000) return `₹${Math.round(rs / 1000)}K`
  return `₹${rs.toLocaleString('en-IN')}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  icon, title, sub, current, target, displayCurrent, displayTarget,
  barColor, barColorLight, helperText,
}: {
  icon: string; title: string; sub: string
  current: number; target: number
  displayCurrent: string; displayTarget: string
  barColor: string; barColorLight: string; helperText: string
}) {
  const fill = pct(current, target)
  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
      borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 6, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: `${barColor}20`, color: barColor,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 40, fontWeight: 800, lineHeight: 1, color: barColor }}>
            {displayCurrent}
          </div>
          <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            / {displayTarget} required
          </div>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg, ${barColor}, ${barColorLight})`,
            width: `${fill}%`,
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{ fontSize: 12, color: fill >= 90 ? 'var(--wimc-success)' : 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
          {helperText}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Metrics {
  maker_tier: string
  cumulative_events_hosted: number
  cumulative_unique_attendees: number
  cumulative_gmv_paise: number
  average_event_rating: number
  repeat_attendee_rate: number
  monthly_page_visitors: number
  is_founding_maker: boolean
}

interface TierClientProps {
  tier: MakerTier
  metrics: Metrics
}

export default function TierClient({ tier, metrics }: TierClientProps) {
  const currentIdx = TIER_ORDER.indexOf(tier)
  const nextTier = currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null
  const nextMeta = nextTier ? TIER_META[nextTier] : null
  const currentMeta = TIER_META[tier]

  // Calculate overall progress to next tier (average of all metric percents)
  let overallPct = 0
  if (nextTier === 'nukkad') {
    const t = TIER_THRESHOLDS.nukkad
    overallPct = Math.round((
      pct(metrics.cumulative_events_hosted, t.events) +
      pct(metrics.cumulative_unique_attendees, t.uniqueAttendees) +
      pct(metrics.cumulative_gmv_paise, t.gmvPaise) +
      pct(metrics.average_event_rating, t.averageRating)
    ) / 4)
  } else if (nextTier === 'chowk') {
    const t = TIER_THRESHOLDS.chowk
    overallPct = Math.round((
      pct(metrics.cumulative_events_hosted, t.events) +
      pct(metrics.cumulative_unique_attendees, t.uniqueAttendees) +
      pct(metrics.cumulative_gmv_paise, t.gmvPaise) +
      pct(metrics.average_event_rating, t.averageRating)
    ) / 4)
  } else if (!nextTier) {
    overallPct = 100
  }

  // Next tier metric requirements
  const nextThresholds = nextTier === 'nukkad' ? TIER_THRESHOLDS.nukkad
    : nextTier === 'chowk' ? TIER_THRESHOLDS.chowk
    : nextTier === 'maidan' ? TIER_THRESHOLDS.maidan
    : null

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Tier Progress</div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', border: 'none', background: 'transparent',
          color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help_outline</span>
          How tiers work
        </button>
      </header>

      <div style={{ padding: 32, display: 'grid', gap: 28, maxWidth: 960 }}>

        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1A1208 0%, #0A0A0B 100%)',
          border: '1px solid rgba(245,168,0,0.2)', borderRadius: 24,
          padding: 36, display: 'flex', alignItems: 'center', gap: 32,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -80, top: -80,
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(245,168,0,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            width: 80, height: 80, borderRadius: 18, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--wimc-amber), var(--wimc-coral))',
            display: 'grid', placeItems: 'center', fontSize: 36,
            boxShadow: '0 0 40px rgba(245,168,0,0.3)',
          }}>
            {currentMeta.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--wimc-amber)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 6 }}>
              Current Tier
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
              {currentMeta.label}
            </div>
            {nextMeta && (
              <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginTop: 8 }}>
                You&apos;re <strong style={{ color: '#FFD166' }}>{overallPct}%</strong> of the way to <strong style={{ color: '#FFD166' }}>{nextMeta.label}</strong>
              </div>
            )}
            {nextMeta && (
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', background: 'linear-gradient(90deg, var(--wimc-amber), var(--wimc-coral))',
                    borderRadius: 5, width: `${overallPct}%`,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)' }}>
                  <span>{currentMeta.label}</span>
                  <span style={{ color: 'var(--wimc-amber)' }}>{overallPct}% · {nextMeta.label} ahead</span>
                </div>
              </div>
            )}
          </div>
          {nextMeta && (
            <div style={{
              background: 'rgba(245,168,0,0.1)', border: '1px solid rgba(245,168,0,0.2)',
              borderRadius: 12, padding: '16px 20px', textAlign: 'center', flexShrink: 0, minWidth: 130,
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>→</div>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-amber)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 6 }}>
                Next Tier
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 22, fontWeight: 800, color: '#FFD166' }}>{nextMeta.label}</div>
            </div>
          )}
        </div>

        {/* Tier roadmap */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 16 }}>
            Tier Roadmap
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '28px 32px', background: 'var(--wimc-bg-elevated)',
            border: '1px solid var(--wimc-border-default)', borderRadius: 18,
            overflowX: 'auto',
          }}>
            {TIER_ORDER.map((t, i) => {
              const done = currentIdx > i
              const current = currentIdx === i
              const meta = TIER_META[t]
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 100 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      fontSize: done ? 16 : 15, position: 'relative', zIndex: 1,
                      border: `2px solid ${done ? 'var(--wimc-amber)' : current ? 'var(--wimc-amber)' : 'var(--wimc-border-subtle)'}`,
                      background: done ? 'var(--wimc-amber)' : current ? 'var(--wimc-bg-overlay)' : 'var(--wimc-bg-overlay)',
                      boxShadow: current ? '0 0 16px rgba(245,168,0,0.3)' : 'none',
                    }}>
                      {done ? '✓' : meta.emoji}
                    </div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700, textAlign: 'center', color: done || current ? (current ? '#FFD166' : 'var(--wimc-text-primary)') : 'var(--wimc-text-muted)' }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 10, color: current ? 'var(--wimc-amber)' : 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', textAlign: 'center' }}>
                      {current ? 'You are here' : meta.sub}
                    </div>
                  </div>
                  {i < TIER_ORDER.length - 1 && (
                    <div style={{
                      flex: 1, height: 2,
                      background: done ? 'var(--wimc-amber)'
                        : current ? 'linear-gradient(90deg, var(--wimc-amber), var(--wimc-border-default))'
                        : 'var(--wimc-border-default)',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Metric cards */}
        {nextThresholds && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 16 }}>
              Progress to {nextMeta?.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <MetricCard
                icon="event" title="Events Hosted" sub="Minimum quality rating ≥ 4.0"
                current={metrics.cumulative_events_hosted} target={nextThresholds.events}
                displayCurrent={String(metrics.cumulative_events_hosted)} displayTarget={String(nextThresholds.events)}
                barColor="var(--wimc-coral)" barColorLight="var(--wimc-coral-light)"
                helperText={metrics.cumulative_events_hosted >= nextThresholds.events ? '✓ Requirement met!' : `${nextThresholds.events - metrics.cumulative_events_hosted} more events to go`}
              />
              <MetricCard
                icon="groups" title="Total Attendees" sub="Across all paid events"
                current={metrics.cumulative_unique_attendees} target={nextThresholds.uniqueAttendees}
                displayCurrent={String(metrics.cumulative_unique_attendees)} displayTarget={String(nextThresholds.uniqueAttendees)}
                barColor="var(--wimc-teal)" barColorLight="#A8F0EC"
                helperText={metrics.cumulative_unique_attendees >= nextThresholds.uniqueAttendees ? '✓ Almost there!' : `${nextThresholds.uniqueAttendees - metrics.cumulative_unique_attendees} more attendees needed`}
              />
              <MetricCard
                icon="payments" title="Gross Revenue (GMV)" sub="Lifetime paid ticket revenue"
                current={metrics.cumulative_gmv_paise} target={nextThresholds.gmvPaise}
                displayCurrent={formatGMV(metrics.cumulative_gmv_paise)} displayTarget={formatGMV(nextThresholds.gmvPaise)}
                barColor="var(--wimc-amber)" barColorLight="#FFD166"
                helperText={metrics.cumulative_gmv_paise >= nextThresholds.gmvPaise ? '✓ Requirement met!' : `${formatGMV(nextThresholds.gmvPaise - metrics.cumulative_gmv_paise)} remaining`}
              />
              <MetricCard
                icon="star" title="Average Rating" sub="From attendee reviews"
                current={metrics.average_event_rating * 10} target={nextThresholds.averageRating * 10}
                displayCurrent={metrics.average_event_rating > 0 ? metrics.average_event_rating.toFixed(1) : '—'}
                displayTarget={nextThresholds.averageRating.toFixed(1)}
                barColor="#4ADE80" barColorLight="#A7F3D0"
                helperText={metrics.average_event_rating >= nextThresholds.averageRating ? '✓ Requirement met!' : `Improve by ${(nextThresholds.averageRating - metrics.average_event_rating).toFixed(1)} — collect more reviews`}
              />
            </div>
          </div>
        )}

        {/* Benefits accordion */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700 }}>Benefits by Tier</div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginTop: 4 }}>What you unlock as you grow</div>
          </div>
          {BENEFITS.map((b, i) => {
            const unlocked = TIER_ORDER.indexOf(b.tier) <= currentIdx
            return (
              <div key={b.label} style={{ borderBottom: i < BENEFITS.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none' }}>
                <div style={{
                  padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'pointer', transition: 'background 220ms ease',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-overlay)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: b.dotColor }} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{b.label}</div>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                    padding: '2px 8px', borderRadius: 9999,
                    background: unlocked ? b.tierBg : 'var(--wimc-amber-dim)',
                    color: unlocked ? b.tierColor : 'var(--wimc-amber)',
                  }}>
                    {TIER_META[b.tier].label}+
                  </span>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                    background: unlocked ? b.tierBg : 'var(--wimc-bg-overlay)',
                    color: unlocked ? b.tierColor : 'var(--wimc-text-muted)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: unlocked ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>
                      {unlocked ? 'check_circle' : 'lock'}
                    </span>
                  </div>
                </div>
                {unlocked && (
                  <div style={{ padding: '0 24px 18px 50px', fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
                    {b.desc}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </>
  )
}
