'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { SupportedCreator } from '@/app/actions/analytics'

const SUPPORT_LEVEL_COLOR: Record<string, string> = {
  'First Timer':  'var(--wimc-text-muted)',
  'Regular':      'var(--wimc-teal)',
  'Fan':          'var(--wimc-amber)',
  'Devoted Fan':  '#f97316',
  'Superfan':     'var(--wimc-coral)',
}

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  wanderer: { label: 'Wanderer', color: 'var(--wimc-text-muted)' },
  local:    { label: 'Local',    color: 'var(--wimc-teal)'       },
  lantern:  { label: 'Lantern',  color: 'var(--wimc-amber)'      },
  beacon:   { label: 'Beacon',   color: '#a855f7'                },
}

// Concentric ring radii (SVG coords, centre 80 80, max radius 72)
const RING_RADII = [72, 55, 40, 27, 16]
const RING_COLORS = [
  'rgba(232,87,42,0.10)',
  'rgba(232,87,42,0.16)',
  'rgba(232,87,42,0.24)',
  'rgba(232,87,42,0.34)',
  'rgba(232,87,42,0.50)',
]

interface Props {
  supported: SupportedCreator[]
  userTier:  string
}

export default function CommunityClient({ supported }: Props) {
  const card: React.CSSProperties = {
    background: 'var(--wimc-bg-elevated)',
    border: '1px solid var(--wimc-border-default)',
    borderRadius: 0,
    overflow: 'hidden',
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 26, margin: 0 }}>
          Your Circles
        </h1>
        <p style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, marginTop: 6 }}>
          The creators you&apos;ve supported most — your personal 1,000 true fans, in reverse.
        </p>
      </div>

      {supported.length === 0 ? (
        <div style={{
          ...card,
          padding: '48px 32px',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--wimc-text-muted)' }}>
            diversity_3
          </span>
          <div style={{ fontWeight: 600, fontSize: 16 }}>No circles yet</div>
          <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, maxWidth: 320 }}>
            Attend events to see the creators you support most appear here.
          </div>
          <Link
            href="/explore"
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 9999,
              background: 'var(--wimc-coral)', color: '#fff',
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}
          >
            Discover Events
          </Link>
        </div>
      ) : (
        <>
          {/* Concentric circles diagram */}
          <div style={{ ...card, padding: '28px 24px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <svg
              viewBox="0 0 160 160"
              width={160}
              height={160}
              style={{ flexShrink: 0 }}
              aria-hidden
            >
              {RING_RADII.map((r, i) => (
                <circle
                  key={r}
                  cx={80} cy={80} r={r}
                  fill={RING_COLORS[i]}
                  stroke="rgba(232,87,42,0.18)"
                  strokeWidth={0.8}
                />
              ))}
              {/* Rank labels on rings */}
              {supported.map((_, i) => (
                <text
                  key={i}
                  x={80}
                  y={80 - RING_RADII[i] + 11}
                  textAnchor="middle"
                  fontSize={8}
                  fill="rgba(232,87,42,0.7)"
                  fontFamily="var(--font-jetbrains-mono)"
                  fontWeight={700}
                >
                  #{i + 1}
                </text>
              ))}
              {/* You dot */}
              <circle cx={80} cy={80} r={6} fill="var(--wimc-coral)" />
              <text x={80} y={83} textAnchor="middle" fontSize={6} fill="#fff" fontWeight={700}>
                YOU
              </text>
            </svg>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                Your Support Circles
              </div>
              <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                The inner rings are the creators you&apos;ve attended most.
                Your loyalty shapes their livelihood — every ticket is a vote.
              </div>
            </div>
          </div>

          {/* Creator list */}
          <div style={card}>
            <div style={{
              padding: '14px 24px',
              borderBottom: '1px solid var(--wimc-border-subtle)',
              fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15,
            }}>
              Top {supported.length} Creator{supported.length !== 1 ? 's' : ''} You&apos;ve Supported
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {supported.map((creator, i, arr) => {
                const tierMeta = TIER_BADGE[creator.userTier] ?? TIER_BADGE.wanderer
                const levelColor = SUPPORT_LEVEL_COLOR[creator.supportLevel] ?? 'var(--wimc-text-secondary)'

                return (
                  <Link
                    key={creator.creatorId}
                    href={`/${creator.username}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 48px 1fr auto',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 24px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 150ms',
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: i < 3 ? 20 : 13,
                      fontWeight: 700,
                      textAlign: 'center',
                      color: i === 0 ? '#F5A800'
                           : i === 1 ? '#94a3b8'
                           : i === 2 ? '#cd7c4a'
                           : 'var(--wimc-text-secondary)',
                    }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      overflow: 'hidden', position: 'relative', flexShrink: 0,
                      background: 'var(--wimc-bg-overlay)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: i === 0 ? '2px solid #F5A800' : '2px solid var(--wimc-border-subtle)',
                    }}>
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--wimc-text-secondary)' }}>
                          {creator.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name + tier */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {creator.displayName}
                      </span>
                      <span style={{
                        fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                        fontWeight: 700, color: tierMeta.color,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {tierMeta.label}
                      </span>
                    </div>

                    {/* Support stats */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-jetbrains-mono)',
                        fontSize: 18, fontWeight: 800,
                        color: 'var(--wimc-text-primary)',
                        lineHeight: 1,
                      }}>
                        {creator.rsvpCount}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>
                        event{creator.rsvpCount !== 1 ? 's' : ''}
                      </div>
                      <div style={{
                        marginTop: 4,
                        fontSize: 10, fontWeight: 700,
                        color: levelColor,
                        fontFamily: 'var(--font-jetbrains-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {creator.supportLevel}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

    </div>
  )
}
