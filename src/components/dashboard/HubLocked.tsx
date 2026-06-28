'use client'

import { useRouter } from 'next/navigation'
import { TIER_THRESHOLDS } from '@/lib/constants/interests'
import type { UserProfile } from '@/types/database'

interface Props {
  profile: UserProfile | null
}

export function HubLocked({ profile }: Props) {
  const router = useRouter()
  const t = TIER_THRESHOLDS.local

  const eventsAttended = profile?.events_attended_count ?? 0
  const reviewsPosted  = profile?.reviews_posted_count  ?? 0
  const noShows        = profile?.no_shows_count         ?? 0
  const rsvpsTotal     = profile?.rsvps_total_count      ?? 0

  const eventsThreshold = t.eventsAttendedIn90d        // 6
  const reviewThreshold = t.reviewsPerEventsRatio      // 0.333…

  const reviewRate  = eventsAttended > 0 ? reviewsPosted / eventsAttended : 0
  const noShowRate  = rsvpsTotal > 0 ? noShows / rsvpsTotal : 0

  const eventsProgress = Math.min(100, (eventsAttended / eventsThreshold) * 100)
  const reviewProgress = Math.min(100, (reviewRate / reviewThreshold) * 100)

  const reviewMet  = reviewRate >= reviewThreshold
  const noShowMet  = noShowRate < t.maxNoShowRate

  void noShowMet // used for future display; no-show rate not shown as bar

  return (
    <div style={{
      minHeight: '100vh', background: '#07070A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        background: '#131317', border: '1px solid #57423e',
        padding: 32, display: 'flex', flexDirection: 'column', gap: 24,
      }}>

        {/* ── Icon + title ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ position: 'relative', display: 'inline-flex', width: 56, height: 56 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#353438' }}>
              hub
            </span>
            <div style={{
              position: 'absolute', top: -2, right: -2,
              width: 22, height: 22, borderRadius: '50%',
              background: '#131317', border: '1px solid #57423e',
              display: 'grid', placeItems: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#5DD9D0' }}>
                lock
              </span>
            </div>
          </div>

          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
            color: '#5DD9D0', letterSpacing: '0.15em',
            textTransform: 'uppercase', marginTop: 16,
          }}>
            HUB
          </div>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 28,
            color: '#F0EFF8', margin: '4px 0 0', lineHeight: 1.2,
          }}>
            Unlocks at Local
          </h2>
          <p style={{
            fontFamily: 'var(--font-dm-sans)', fontSize: 14,
            color: '#9896B0', lineHeight: 1.6, margin: '10px 0 0',
          }}>
            The Hub is where creators connect, collaborate, and DM each other.
            Reach Local tier to unlock it.
          </p>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px dashed #57423e' }} />

        {/* ── Progress ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
            color: '#9896B0', textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            YOUR PROGRESS TO LOCAL
          </div>

          {/* Events attended */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#F0EFF8' }}>
                Events attended (90 days)
              </span>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: '#5DD9D0' }}>
                {eventsAttended} / {eventsThreshold}
              </span>
            </div>
            <div style={{ marginTop: 6, height: 6, background: '#1b1b1f', width: '100%' }}>
              <div style={{
                height: '100%', background: '#5DD9D0',
                width: `${eventsProgress}%`,
                transition: 'width 700ms ease',
              }} />
            </div>
          </div>

          {/* Review rate */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#F0EFF8' }}>
                Review rate
              </span>
              <span style={{
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12,
                color: reviewMet ? '#5DD9D0' : '#9896B0',
              }}>
                {Math.round(reviewRate * 100)}% / {Math.round(reviewThreshold * 100)}%
              </span>
            </div>
            <div style={{ marginTop: 6, height: 6, background: '#1b1b1f', width: '100%' }}>
              <div style={{
                height: '100%', background: '#5DD9D0',
                width: `${reviewProgress}%`,
                transition: 'width 700ms ease',
              }} />
            </div>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px dashed #57423e' }} />

        {/* ── What unlocks ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
            color: '#9896B0', textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            WHAT UNLOCKS WITH HUB
          </div>
          {[
            { icon: 'hub',         label: 'Discover creators in your city' },
            { icon: 'handshake',   label: 'Send and accept connection requests' },
            { icon: 'chat_bubble', label: 'Direct message connected creators' },
          ].map(({ icon, label }) => (
            <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#5DD9D0', flexShrink: 0 }}>
                {icon}
              </span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#9896B0' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <button
          onClick={() => router.push('/explore')}
          style={{
            width: '100%', padding: '12px 0',
            background: '#5DD9D0', color: '#07070A',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
          }}
        >
          Find events near you →
        </button>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
          color: '#57423e', textAlign: 'center',
        }}>
          Tier is evaluated monthly. Events you attend now count toward Local.
        </div>
      </div>
    </div>
  )
}
