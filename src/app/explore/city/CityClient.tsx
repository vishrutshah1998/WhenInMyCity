'use client'

import type { CityPulseEntry, CityLeaderboard } from '@/app/actions/gamification'
import type { UserTier } from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_META: Record<UserTier, { label: string; color: string; bg: string }> = {
  wanderer: { label: 'Wanderer', color: 'var(--wimc-text-secondary)', bg: 'var(--wimc-bg-overlay)' },
  local:    { label: 'Local',    color: 'var(--wimc-teal)',           bg: 'rgba(77,210,177,0.12)' },
  lantern:  { label: 'Lantern',  color: 'var(--wimc-amber)',          bg: 'rgba(245,168,0,0.12)'  },
  beacon:   { label: 'Beacon',   color: '#a855f7',                    bg: 'rgba(168,85,247,0.12)' },
}

function TierBadge({ tier }: { tier: UserTier }) {
  const { label, color, bg } = TIER_META[tier]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
      color, background: bg, letterSpacing: '0.04em',
      fontFamily: 'var(--font-jetbrains-mono)',
    }}>
      {label}
    </span>
  )
}

function flameIntensity(count: number, max: number): number {
  if (max === 0) return 1
  const ratio = count / max
  if (ratio >= 0.8) return 5
  if (ratio >= 0.6) return 4
  if (ratio >= 0.4) return 3
  if (ratio >= 0.2) return 2
  return 1
}

function FlameBar({ intensity }: { intensity: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20 }}>
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          style={{
            width: 5,
            height: 4 + level * 3,
            borderRadius: 3,
            background: level <= intensity
              ? `hsl(${30 + (intensity - level) * 8}, 95%, ${55 - level * 3}%)`
              : 'var(--wimc-bg-overlay)',
            transition: 'background 200ms',
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  pulse:              CityPulseEntry[]
  leaderboard:        CityLeaderboard
  userCity:           string
  attendanceStreak:   number
  streakFreezeTokens: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CityClient({
  pulse, leaderboard, userCity, attendanceStreak, streakFreezeTokens,
}: Props) {
  const maxRecent = Math.max(...pulse.map((c) => c.recentCount), 1)

  const card: React.CSSProperties = {
    background: 'var(--wimc-bg-elevated)',
    border: '1px solid var(--wimc-border-default)',
    borderRadius: 18,
    overflow: 'hidden',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Personal streak banner ─────────────────────────────────────────── */}
      {attendanceStreak > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(245,168,0,0.1) 0%, rgba(232,87,42,0.08) 100%)',
          border: '1px solid rgba(245,168,0,0.3)',
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 32 }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>
              {attendanceStreak} weeks
            </div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginTop: 3 }}>
              Your current attendance streak
            </div>
          </div>
          {streakFreezeTokens > 0 && (
            <div style={{
              textAlign: 'center', padding: '8px 14px', borderRadius: 10,
              background: 'rgba(77,210,177,0.1)', border: '1px solid rgba(77,210,177,0.25)',
            }}>
              <div style={{ fontSize: 16 }}>❄️</div>
              <div style={{ fontSize: 11, color: 'var(--wimc-teal)', fontWeight: 700, marginTop: 2 }}>
                {streakFreezeTokens} freeze{streakFreezeTokens !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── City Pulse ─────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'baseline', gap: 10,
        }}>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>City Pulse</span>
          <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            events in the last 30 days
          </span>
        </div>

        {pulse.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 14 }}>
            No recent activity to show yet.
          </div>
        ) : (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {pulse.map((entry, i) => {
              const isHome = entry.cityId === userCity
              const intensity = flameIntensity(entry.recentCount, maxRecent)
              return (
                <div
                  key={entry.cityId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 0',
                    borderBottom: i < pulse.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                    background: isHome ? 'rgba(232,87,42,0.04)' : 'transparent',
                    borderRadius: isHome ? 8 : 0,
                    margin: isHome ? '0 -8px' : 0,
                    paddingLeft: isHome ? 8 : 0,
                    paddingRight: isHome ? 8 : 0,
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11,
                    color: 'var(--wimc-text-secondary)', textAlign: 'right',
                  }}>
                    #{i + 1}
                  </div>

                  {/* City name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{entry.emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: isHome ? 700 : 500 }}>
                        {entry.cityName}
                        {isHome && (
                          <span style={{
                            marginLeft: 7, fontSize: 10, fontWeight: 700,
                            color: 'var(--wimc-coral)', fontFamily: 'var(--font-jetbrains-mono)',
                          }}>
                            YOUR CITY
                          </span>
                        )}
                      </div>
                      {entry.upcomingCount > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--wimc-teal)', marginTop: 1 }}>
                          {entry.upcomingCount} upcoming
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flame bar */}
                  <FlameBar intensity={intensity} />

                  {/* Count */}
                  <div style={{
                    fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12,
                    fontWeight: 700, color: 'var(--wimc-text-primary)',
                    textAlign: 'right', minWidth: 28,
                  }}>
                    {entry.recentCount}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── City Leaderboard ──────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'baseline', gap: 10,
        }}>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
            Top Explorers · {leaderboard.cityName}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: 'var(--wimc-text-secondary)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {leaderboard.currentUserRank != null
              ? `You're #${leaderboard.currentUserRank}`
              : 'city only · no global ranking'}
          </span>
        </div>

        {leaderboard.entries.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 14 }}>
            No explorers in {leaderboard.cityName} yet — you'll be first!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {leaderboard.entries.map((entry, i, arr) => (
              <div
                key={entry.rank}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 24px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                  background: entry.isCurrentUser
                    ? 'linear-gradient(90deg, rgba(232,87,42,0.06) 0%, transparent 100%)'
                    : 'transparent',
                }}
              >
                {/* Rank */}
                <div style={{
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: entry.rank <= 3 ? 17 : 13,
                  fontWeight: 700,
                  textAlign: 'center',
                  color: entry.rank === 1 ? '#F5A800'
                       : entry.rank === 2 ? '#94a3b8'
                       : entry.rank === 3 ? '#cd7c4a'
                       : 'var(--wimc-text-secondary)',
                }}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </div>

                {/* Name + tier */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: entry.isCurrentUser ? 700 : 500,
                      color: entry.isCurrentUser ? 'var(--wimc-coral)' : 'var(--wimc-text-primary)',
                    }}>
                      {entry.displayName}
                      {entry.isCurrentUser && (
                        <span style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontWeight: 400, marginLeft: 5 }}>
                          (you)
                        </span>
                      )}
                    </span>
                    <TierBadge tier={entry.userTier} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
                    {entry.eventsAttendedCount} events attended
                  </div>
                </div>

                {/* Streak */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {entry.attendanceStreak > 0 && (
                    <>
                      <span style={{ fontSize: 14 }}>🔥</span>
                      <span style={{
                        fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 700,
                        color: 'var(--wimc-amber)',
                      }}>
                        {entry.attendanceStreak}w
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
