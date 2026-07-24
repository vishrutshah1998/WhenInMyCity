'use client'

import React from 'react'
import Link from 'next/link'
import type { UserTier } from '@/types/database'
import { TIER_THRESHOLDS } from '@/lib/constants/interests'

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_ORDER: UserTier[] = ['wanderer', 'local', 'lantern', 'beacon']

const TIER_META: Record<UserTier, { emoji: string; label: string; story: string; sub: string }> = {
  wanderer: { emoji: '🕯️', label: 'Wanderer', story: 'I\'m exploring my city.',  sub: 'Default' },
  local:    { emoji: '🏠', label: 'Local',    story: 'I belong to this scene.',  sub: 'Regular' },
  lantern:  { emoji: '🏮', label: 'Lantern',  story: 'I bring people together.', sub: 'Host' },
  beacon:   { emoji: '🗼', label: 'Beacon',   story: 'My passion is my livelihood.', sub: 'Pro creator' },
}

const BENEFITS: {
  label: string
  desc: React.ReactNode
  tier: UserTier
  dotColor: string
  tierColor: string
  tierBg: string
}[] = [
  {
    label: 'Creator Page & Public Profile',
    desc: 'Your public link-in-bio page at wheninmycity.com/@handle. Customisable blocks for events, links, social media embeds and more.',
    tier: 'wanderer', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Paid Event Ticketing',
    desc: 'Sell tickets directly through WIMC with UPI, card and wallet support. Instant payout within 7 working days after event.',
    tier: 'wanderer', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Lead Capture & CRM',
    desc: 'Collect emails from anyone who visits your page. Export CSV or connect to email providers for drip campaigns.',
    tier: 'wanderer', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Curated Weekly Digest',
    desc: 'Personalised event digest based on your taste tags — delivered weekly so you never miss something worth attending.',
    tier: 'wanderer', dotColor: '#4ADE80', tierColor: '#4ADE80', tierBg: 'rgba(74,222,128,0.1)',
  },
  {
    label: 'Early Access to Popular Events',
    desc: 'Locals get first access to ticket releases before they open to the public — no more missing out on sold-out shows.',
    tier: 'local', dotColor: '#F5A800', tierColor: '#F5A800', tierBg: 'rgba(245,168,0,0.12)',
  },
  {
    label: 'Local-Only Ticket Prices',
    desc: 'Participating Venues offer Local members a modest but real discount — cash savings as you keep showing up.',
    tier: 'local', dotColor: '#F5A800', tierColor: '#F5A800', tierBg: 'rgba(245,168,0,0.12)',
  },
  {
    label: 'Priority Discovery Placement',
    desc: 'Your events appear at the top of city Explorer feeds when you open ticket sales. More organic sign-ups without paid promotion.',
    tier: 'lantern', dotColor: '#3B6BCC', tierColor: '#3B6BCC', tierBg: 'rgba(59,107,204,0.15)',
  },
  {
    label: 'Reduced Platform Fee (8%)',
    desc: 'Lanterns pay 8% instead of 10%. Every event you host earns you more — your community investment compounds.',
    tier: 'lantern', dotColor: '#3B6BCC', tierColor: '#3B6BCC', tierBg: 'rgba(59,107,204,0.15)',
  },
  {
    label: 'Marketing Toolkit & Lantern Badge',
    desc: 'Auto-generated event posters, push-notification credits to past attendees, basic analytics, and a Lantern trust badge on every event page.',
    tier: 'lantern', dotColor: '#3B6BCC', tierColor: '#3B6BCC', tierBg: 'rgba(59,107,204,0.15)',
  },
  {
    label: 'Lowest Platform Fee (5%)',
    desc: 'Beacons keep 85% of every ticket — the lowest fee on the platform, matching what legacy creator platforms charge at their top tier.',
    tier: 'beacon', dotColor: '#E8342A', tierColor: '#E8342A', tierBg: 'rgba(232,52,42,0.1)',
  },
  {
    label: 'Beacon Fund Grants',
    desc: 'Small platform-funded grants (₹40K–₹1.6L) for ambitious or experimental events. Epic meaning, not just transactional reward.',
    tier: 'beacon', dotColor: '#E8342A', tierColor: '#E8342A', tierBg: 'rgba(232,52,42,0.1)',
  },
  {
    label: 'Beacon Mentorship & Hall of Lights',
    desc: <>Beacons are matched with Lanterns to coach. After 3 years: Lantern Mentor distinction. After 5 years: permanent <Link href="/dashboard/hall-of-lights" className="underline hover:text-[#F5A800]">Hall of Lights</Link> city listing.</>,
    tier: 'beacon', dotColor: '#E8342A', tierColor: '#E8342A', tierBg: 'rgba(232,52,42,0.1)',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(current: number, target: number): number {
  return Math.min(100, Math.round((current / target) * 100))
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
      background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)',
      borderRadius: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 0, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: `${barColor}20`, color: barColor,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1, color: barColor }}>
            {displayCurrent}
          </div>
          <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            / {displayTarget} required
          </div>
        </div>
        <div style={{ height: 8, background: 'rgba(26,39,68,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg, ${barColor}, ${barColorLight})`,
            width: `${fill}%`,
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{ fontSize: 12, color: fill >= 100 ? 'var(--wimc-success)' : 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
          {helperText}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Metrics {
  user_tier: string
  // Creator metrics
  cumulative_events_hosted: number
  cumulative_unique_attendees: number
  cumulative_gmv_paise: number
  average_event_rating: number
  repeat_attendee_rate: number
  monthly_page_visitors: number
  is_founding_maker: boolean
  // Explorer metrics
  events_attended_count: number
  rsvps_total_count: number
  no_shows_count: number
  reviews_posted_count: number
  whatsapp_subscriber_count: number
  tier_recovery_until: string | null
}

interface TierClientProps {
  tier: UserTier
  metrics: Metrics
  // Rolling-window counts fetched server-side
  eventsAttendedIn90d: number
  eventsHostedIn180d: number
  eventsHostedIn365d: number
}

export default function TierClient({ tier, metrics, eventsAttendedIn90d, eventsHostedIn180d, eventsHostedIn365d }: TierClientProps) {
  const currentIdx = TIER_ORDER.indexOf(tier)
  const nextTier   = currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null
  const nextMeta   = nextTier ? TIER_META[nextTier] : null
  const currentMeta = TIER_META[tier]

  const inRecovery = Boolean(
    tier === 'beacon' &&
    metrics.tier_recovery_until &&
    new Date(metrics.tier_recovery_until) > new Date()
  )

  // Overall progress percent to next tier
  let overallPct = 0
  if (nextTier === 'local') {
    const t = TIER_THRESHOLDS.local
    overallPct = Math.round((
      pct(eventsAttendedIn90d, t.eventsAttendedIn90d) +
      pct(metrics.reviews_posted_count, Math.ceil(eventsAttendedIn90d * t.reviewsPerEventsRatio + 0.1))
    ) / 2)
  } else if (nextTier === 'lantern') {
    const t = TIER_THRESHOLDS.lantern
    overallPct = Math.round((
      pct(eventsHostedIn180d, t.eventsHostedIn180d) +
      pct(metrics.average_event_rating * 10, t.minAverageRating * 10)
    ) / 2)
  } else if (nextTier === 'beacon') {
    const t = TIER_THRESHOLDS.beacon
    overallPct = Math.round((
      pct(eventsHostedIn365d, t.eventsHostedIn365d) +
      pct(metrics.average_event_rating * 10, t.minAverageRating * 10) +
      pct(metrics.repeat_attendee_rate * 100, t.minRepeatAttendanceRate * 100) +
      pct(metrics.whatsapp_subscriber_count, t.minActiveSubscribers)
    ) / 4)
  } else if (!nextTier) {
    overallPct = 100
  }

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 2 }}>
            Creator Studio
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Tier Progress</div>
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 0, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', border: 'none', background: 'transparent',
          color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help_outline</span>
          How tiers work
        </button>
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px', display: 'grid', gap: 28 }}>

        {/* Beacon Recovery banner — visible only to the creator */}
        {inRecovery && (
          <div style={{
            background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.25)',
            borderRadius: 0, padding: '16px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--wimc-amber)', fontSize: 24 }}>
              brightness_alert
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 14, fontWeight: 700, color: 'var(--wimc-amber)' }}>
                Beacon Recovery active
              </div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>
                Your badge is dimmed and perks are frozen while you recover.
                Meet all Beacon gates again before{' '}
                <strong style={{ color: '#FFD166' }}>
                  {new Date(metrics.tier_recovery_until!).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                </strong>{' '}
                to stay at Beacon.
              </div>
            </div>
          </div>
        )}

        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1A2744 0%, #0F1A35 100%)',
          border: '1px solid rgba(26,39,68,0.20)', borderRadius: 0,
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
            width: 80, height: 80, borderRadius: 0, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--wimc-amber), var(--wimc-coral))',
            display: 'grid', placeItems: 'center', fontSize: 36,
            boxShadow: '0 0 40px rgba(245,168,0,0.3)',
            opacity: inRecovery ? 0.5 : 1,
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
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginTop: 6, fontStyle: 'italic' }}>
              &ldquo;{currentMeta.story}&rdquo;
            </div>
            {nextMeta && (
              <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginTop: 8 }}>
                You&apos;re <strong style={{ color: '#FFD166' }}>{overallPct}%</strong> of the way to <strong style={{ color: '#FFD166' }}>{nextMeta.label}</strong>
              </div>
            )}
            {nextMeta && (
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 10, background: 'rgba(26,39,68,0.08)', borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
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
              borderRadius: 0, padding: '16px 20px', textAlign: 'center', flexShrink: 0, minWidth: 130,
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
            border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0,
            overflowX: 'auto',
          }}>
            {TIER_ORDER.map((t, i) => {
              const done    = currentIdx > i
              const current = currentIdx === i
              const meta    = TIER_META[t]
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 100 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      fontSize: done ? 16 : 15, position: 'relative', zIndex: 1,
                      border: `2px solid ${done ? 'var(--wimc-amber)' : current ? 'var(--wimc-amber)' : 'rgba(26,39,68,0.20)'}`,
                      background: done ? 'var(--wimc-amber)' : current ? 'rgba(245,168,0,0.08)' : 'transparent',
                      boxShadow: current ? '0 0 16px rgba(245,168,0,0.3)' : 'none',
                    }}>
                      {done ? '✓' : meta.emoji}
                    </div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontSize: 13, fontWeight: 700, textAlign: 'center', color: done || current ? (current ? '#D97706' : 'var(--wimc-text-primary)') : 'var(--wimc-text-muted)' }}>
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

        {/* Progress metric cards — vary by next tier */}
        {nextTier === 'local' && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 16 }}>
              Progress to Local — rolling 90-day window
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <MetricCard
                icon="local_activity" title="Events Attended" sub="In the last 90 days"
                current={eventsAttendedIn90d} target={TIER_THRESHOLDS.local.eventsAttendedIn90d}
                displayCurrent={String(eventsAttendedIn90d)} displayTarget={String(TIER_THRESHOLDS.local.eventsAttendedIn90d)}
                barColor="var(--wimc-coral)" barColorLight="var(--wimc-coral-light)"
                helperText={eventsAttendedIn90d >= TIER_THRESHOLDS.local.eventsAttendedIn90d ? '✓ Requirement met!' : `${TIER_THRESHOLDS.local.eventsAttendedIn90d - eventsAttendedIn90d} more events to go`}
              />
              <MetricCard
                icon="rate_review" title="Reviews Posted" sub="At least 1 per 3 events"
                current={metrics.reviews_posted_count}
                target={Math.max(1, Math.ceil(eventsAttendedIn90d * TIER_THRESHOLDS.local.reviewsPerEventsRatio))}
                displayCurrent={String(metrics.reviews_posted_count)}
                displayTarget={String(Math.max(1, Math.ceil(eventsAttendedIn90d * TIER_THRESHOLDS.local.reviewsPerEventsRatio)))}
                barColor="var(--wimc-teal)" barColorLight="#A8F0EC"
                helperText="Leave a review after each event you attend"
              />
            </div>
          </div>
        )}

        {nextTier === 'lantern' && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 16 }}>
              Progress to Lantern — rolling 180-day window
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <MetricCard
                icon="event" title="Events Hosted" sub="In the last 180 days"
                current={eventsHostedIn180d} target={TIER_THRESHOLDS.lantern.eventsHostedIn180d}
                displayCurrent={String(eventsHostedIn180d)} displayTarget={String(TIER_THRESHOLDS.lantern.eventsHostedIn180d)}
                barColor="var(--wimc-coral)" barColorLight="var(--wimc-coral-light)"
                helperText={eventsHostedIn180d >= TIER_THRESHOLDS.lantern.eventsHostedIn180d ? '✓ Requirement met!' : `${TIER_THRESHOLDS.lantern.eventsHostedIn180d - eventsHostedIn180d} more to host`}
              />
              <MetricCard
                icon="star" title="Average Rating" sub="From attendee reviews"
                current={metrics.average_event_rating * 10} target={TIER_THRESHOLDS.lantern.minAverageRating * 10}
                displayCurrent={metrics.average_event_rating > 0 ? metrics.average_event_rating.toFixed(1) : '—'}
                displayTarget={TIER_THRESHOLDS.lantern.minAverageRating.toFixed(1)}
                barColor="#4ADE80" barColorLight="#A7F3D0"
                helperText={metrics.average_event_rating >= TIER_THRESHOLDS.lantern.minAverageRating ? '✓ Requirement met!' : `Improve by ${(TIER_THRESHOLDS.lantern.minAverageRating - metrics.average_event_rating).toFixed(1)} — keep collecting reviews`}
              />
            </div>
          </div>
        )}

        {nextTier === 'beacon' && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 16 }}>
              Progress to Beacon — rolling 365-day window
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <MetricCard
                icon="event" title="Events Hosted" sub="In the last 12 months (or 1,200 tickets)"
                current={eventsHostedIn365d} target={TIER_THRESHOLDS.beacon.eventsHostedIn365d}
                displayCurrent={String(eventsHostedIn365d)} displayTarget={String(TIER_THRESHOLDS.beacon.eventsHostedIn365d)}
                barColor="var(--wimc-coral)" barColorLight="var(--wimc-coral-light)"
                helperText={eventsHostedIn365d >= TIER_THRESHOLDS.beacon.eventsHostedIn365d ? '✓ Requirement met!' : `${TIER_THRESHOLDS.beacon.eventsHostedIn365d - eventsHostedIn365d} more events to host`}
              />
              <MetricCard
                icon="star" title="Average Rating" sub="≥4.7★ across all events"
                current={metrics.average_event_rating * 10} target={TIER_THRESHOLDS.beacon.minAverageRating * 10}
                displayCurrent={metrics.average_event_rating > 0 ? metrics.average_event_rating.toFixed(1) : '—'}
                displayTarget={TIER_THRESHOLDS.beacon.minAverageRating.toFixed(1)}
                barColor="#4ADE80" barColorLight="#A7F3D0"
                helperText={metrics.average_event_rating >= TIER_THRESHOLDS.beacon.minAverageRating ? '✓ Requirement met!' : `Improve by ${(TIER_THRESHOLDS.beacon.minAverageRating - metrics.average_event_rating).toFixed(1)} — keep collecting reviews`}
              />
              <MetricCard
                icon="groups" title="Repeat Attendance" sub="≥30% of attendees return"
                current={Math.round(metrics.repeat_attendee_rate * 100)} target={Math.round(TIER_THRESHOLDS.beacon.minRepeatAttendanceRate * 100)}
                displayCurrent={`${Math.round(metrics.repeat_attendee_rate * 100)}%`}
                displayTarget={`${Math.round(TIER_THRESHOLDS.beacon.minRepeatAttendanceRate * 100)}%`}
                barColor="var(--wimc-amber)" barColorLight="#FFD166"
                helperText={metrics.repeat_attendee_rate >= TIER_THRESHOLDS.beacon.minRepeatAttendanceRate ? '✓ Requirement met!' : 'Build regulars — the single best signal of true-fan formation'}
              />
              <MetricCard
                icon="notifications_active" title="Active Subscribers" sub="≥50 WhatsApp subscribers"
                current={metrics.whatsapp_subscriber_count} target={TIER_THRESHOLDS.beacon.minActiveSubscribers}
                displayCurrent={String(metrics.whatsapp_subscriber_count)} displayTarget={String(TIER_THRESHOLDS.beacon.minActiveSubscribers)}
                barColor="#3B6BCC" barColorLight="#7BA4F0"
                helperText={metrics.whatsapp_subscriber_count >= TIER_THRESHOLDS.beacon.minActiveSubscribers ? '✓ Requirement met!' : `${TIER_THRESHOLDS.beacon.minActiveSubscribers - metrics.whatsapp_subscriber_count} more subscribers needed`}
              />
            </div>
          </div>
        )}

        {/* Benefits accordion */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22 }}>Benefits by Tier</div>
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
