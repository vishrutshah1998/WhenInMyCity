'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { CityPulseEntry, CityLeaderboard, NeighbourhoodLeaderboard, FriendLeaderboardEntry } from '@/app/actions/gamification'
import type { UserTier } from '@/types/marketplace'

const HIDE_FRIENDS_KEY = 'wimc_hide_friend_leaderboard'

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
  neighbourhoods:     NeighbourhoodLeaderboard[]
  friends:            FriendLeaderboardEntry[]
  userCity:           string
  attendanceStreak:   number
  streakFreezeTokens: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CityClient({
  pulse, leaderboard, neighbourhoods, friends, userCity, attendanceStreak, streakFreezeTokens,
}: Props) {
  const [friendsHidden, setFriendsHidden] = useState(false)

  useEffect(() => {
    setFriendsHidden(localStorage.getItem(HIDE_FRIENDS_KEY) === '1')
  }, [])

  function toggleFriendsHidden() {
    const next = !friendsHidden
    setFriendsHidden(next)
    localStorage.setItem(HIDE_FRIENDS_KEY, next ? '1' : '0')
  }
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

      {/* ── Friend Leaderboard ───────────────────────────────────────────── */}
      {friends.length > 0 && (
        <div style={card}>
          {/* Header */}
          <div style={{
            padding: '14px 24px',
            borderBottom: friendsHidden ? 'none' : '1px solid var(--wimc-border-subtle)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, flex: 1 }}>
              Among Your Connections
            </span>
            <span style={{
              fontSize: 11, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-jetbrains-mono)', marginRight: 8,
            }}>
              {friends.length} followed in {leaderboard.cityName}
            </span>
            <button
              onClick={toggleFriendsHidden}
              style={{
                background: 'none', border: '1px solid var(--wimc-border-subtle)', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono)', padding: '2px 8px',
                borderRadius: 9999,
              }}
            >
              {friendsHidden ? 'show' : 'hide'}
            </button>
          </div>

          {!friendsHidden && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {friends.map((entry, i, arr) => (
                <Link
                  key={entry.username}
                  href={`/${entry.username}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 40px 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 24px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: entry.rank <= 3 ? 17 : 13,
                    fontWeight: 700, textAlign: 'center',
                    color: entry.rank === 1 ? '#F5A800'
                         : entry.rank === 2 ? '#94a3b8'
                         : entry.rank === 3 ? '#cd7c4a'
                         : 'var(--wimc-text-secondary)',
                  }}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                    flexShrink: 0, background: 'var(--wimc-bg-overlay)', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {entry.avatarUrl ? (
                      <Image src={entry.avatarUrl} alt={entry.displayName} fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wimc-text-secondary)' }}>
                        {entry.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name + tier */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.displayName}
                      </span>
                      <TierBadge tier={entry.userTier} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
                      {entry.eventsAttendedCount} events attended
                    </div>
                  </div>

                  {/* Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {entry.attendanceStreak > 0 ? (
                      <>
                        <span style={{ fontSize: 14 }}>🔥</span>
                        <span style={{
                          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13,
                          fontWeight: 700, color: 'var(--wimc-amber)',
                        }}>
                          {entry.attendanceStreak}w
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                        —
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Neighbourhood Leaderboards ───────────────────────────────────── */}
      {neighbourhoods.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10, paddingLeft: 2,
          }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
              Top Lanterns by Neighbourhood
            </span>
            <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {leaderboard.cityName}
            </span>
          </div>

          {neighbourhoods.map((nb) => (
            <div key={nb.neighbourhood} style={card}>
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--wimc-border-subtle)',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--wimc-text-secondary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {nb.neighbourhood}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {nb.creators.map((creator, i, arr) => (
                  <Link
                    key={creator.username}
                    href={`/${creator.username}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 40px 1fr auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 20px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 150ms',
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11,
                      fontWeight: 700, textAlign: 'center',
                      color: creator.rank === 1 ? '#F5A800'
                           : creator.rank === 2 ? '#94a3b8'
                           : creator.rank === 3 ? '#cd7c4a'
                           : 'var(--wimc-text-secondary)',
                    }}>
                      {creator.rank === 1 ? '🥇' : creator.rank === 2 ? '🥈' : creator.rank === 3 ? '🥉' : `#${creator.rank}`}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: 'var(--wimc-bg-overlay)', position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wimc-text-secondary)' }}>
                          {creator.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name + tier */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--wimc-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {creator.displayName}
                      </span>
                      <TierBadge tier={creator.userTier} />
                    </div>

                    {/* Events hosted */}
                    <div style={{
                      textAlign: 'right', flexShrink: 0,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13,
                        fontWeight: 700, color: 'var(--wimc-amber)',
                      }}>
                        {creator.eventsHosted}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', marginTop: 1 }}>
                        hosted
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
