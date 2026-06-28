import React from 'react'
import Link from 'next/link'
import type { UserProfile } from '@/types/database'
import { cityToSlug, profileUrl } from '@/lib/profile-url'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExplorerData {
  interest_tags: string[]
  preferred_formats: string[]
  total_events_attended: number
  followed_maker_ids: string[]
  explorer_score: number
}

interface AttendedEvent {
  id: string
  title: string
  venue_name: string
  starts_at: string
  slug: string
  rating: number | null
}

interface FollowedCreator {
  id: string
  display_name: string
  username: string
  creator_type: string
  city: string
  avatar_url: string | null
}

export interface ExplorerPublicProfileProps {
  profile: UserProfile
  explorerData: ExplorerData
  attendedEvents: AttendedEvent[]
  followedCreators: FollowedCreator[]
  isOwner: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAVENDER = '#9B8FFF'
const BG_BASE  = '#07070A'
const BG_CARD  = '#131317'
const TEXT_PRI = '#F0EFF8'
const TEXT_SEC = '#9896B0'
const BORDER   = 'rgba(155,143,255,0.15)'

const TIER_CONFIG = {
  wanderer: { label: 'Wanderer', color: '#9896B0', bg: 'rgba(152,150,176,0.12)' },
  local:    { label: 'Local',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  lantern:  { label: 'Lantern',  color: '#F5A800', bg: 'rgba(245,168,0,0.12)'   },
  beacon:   { label: 'Beacon',   color: '#E8705A', bg: 'rgba(232,112,90,0.12)'  },
} as const

const FORMAT_LABELS: Record<string, string> = {
  small_group:  'Small Groups',
  workshop:     'Workshops',
  performance:  'Performances',
  networking:   'Networking',
  outdoor:      'Outdoor',
  dining:       'Dining',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(iso))
}

function fmtMemberSince(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ label, icon, count }: { label: string; icon: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 18, color: LAVENDER, fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <span style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: TEXT_SEC,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        {label}
        {count !== undefined && ` ${count}`}
      </span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  )
}

function TagChip({ label, accent }: { label: string; accent?: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 9999,
      background: accent ? `${accent}18` : 'rgba(155,143,255,0.10)',
      border: `1px solid ${accent ? `${accent}30` : 'rgba(155,143,255,0.25)'}`,
      fontFamily: 'var(--font-dm-sans)',
      fontSize: 11,
      fontWeight: 500,
      color: accent ?? LAVENDER,
      whiteSpace: 'nowrap' as const,
    }}>
      {label}
    </span>
  )
}

function AttendedEventCard({ event }: { event: AttendedEvent }) {
  return (
    <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#FAF7F0',
        border: '1.5px dashed rgba(26,39,68,0.25)',
        borderLeft: `3px solid ${LAVENDER}`,
        padding: '10px 12px',
        position: 'relative',
        transition: 'opacity 200ms',
      }}>
        {/* Ticket type label */}
        <div style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 8,
          color: 'rgba(26,39,68,0.40)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          CULTURE PASS · ATTENDED
        </div>

        {/* Perforation line */}
        <div style={{ borderTop: '1px dashed rgba(26,39,68,0.15)', marginBottom: 6 }} />

        <div style={{
          fontFamily: 'var(--font-outfit)',
          fontSize: 13,
          fontWeight: 700,
          color: '#1A1711',
          lineHeight: 1.2,
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }}>
          {event.title}
        </div>
        <div style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 9,
          color: 'rgba(26,39,68,0.50)',
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }}>
          {event.venue_name} · {fmtShortDate(event.starts_at)}
        </div>

        {/* Barcode stub + rating */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
            {[6, 10, 8, 12, 6, 14, 8, 10, 6, 12, 8, 10, 6].map((h, i) => (
              <div key={i} style={{ width: 1.5, height: h, background: 'rgba(26,39,68,0.18)' }} />
            ))}
          </div>
          {event.rating !== null && (
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 9,
              color: '#F5A800',
              fontWeight: 700,
            }}>
              {'★'.repeat(event.rating)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function CreatorCard({ creator }: { creator: FollowedCreator }) {
  const initials = creator.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const url = profileUrl(creator.city, creator.username)

  return (
    <Link href={url} style={{ textDecoration: 'none' }}>
      <div style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 8,
        transition: 'border-color 200ms',
      }}>
        {creator.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.avatar_url}
            alt={creator.display_name}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `linear-gradient(135deg, ${LAVENDER}, rgba(155,143,255,0.5))`,
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-outfit)',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
        )}
        <div style={{ textAlign: 'center' as const, minWidth: 0, width: '100%' }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 12, fontWeight: 600, color: TEXT_PRI,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {creator.display_name}
          </div>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 9, color: TEXT_SEC,
            textTransform: 'uppercase' as const, letterSpacing: '0.1em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {creator.creator_type?.replace(/_/g, ' ')} · {creator.city}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ExplorerPublicProfile({
  profile,
  explorerData,
  attendedEvents,
  followedCreators,
  isOwner,
}: ExplorerPublicProfileProps) {
  const tier = (profile.user_tier ?? 'wanderer') as keyof typeof TIER_CONFIG
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.wanderer
  const eventsCount = explorerData.total_events_attended ?? 0

  // ── Conversion prompt logic (owner-only)
  let conversionMessage: { headline: string; body: string } | null = null
  if (isOwner) {
    if (eventsCount >= 5) {
      conversionMessage = {
        headline: `You've been to ${eventsCount} events. Ready to host one?`,
        body: "You clearly know what makes a great scene. Turn that into your own page — host your first event in minutes.",
      }
    } else if (eventsCount >= 1) {
      conversionMessage = {
        headline: "Loving the scene? Start your own.",
        body: "Every creator started as an explorer. When you're ready, your page is one tap away.",
      }
    }
  }

  const citySlug = cityToSlug(profile.city)
  const tags = explorerData.interest_tags ?? []
  const formats = explorerData.preferred_formats ?? []

  return (
    <div style={{
      minHeight: '100vh',
      background: BG_BASE,
      color: TEXT_PRI,
      fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      {/* Grain overlay */}
      <div className="wimc-grain" aria-hidden />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ── HERO — Boarding pass card ───────────────────────────────────── */}
        <div style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderLeft: `3px solid ${LAVENDER}`,
          padding: '24px 24px 20px',
          marginBottom: 32,
          position: 'relative',
        }}>
          {/* Ticket type strip */}
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 8,
            color: TEXT_SEC,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            WHEN IN MY CITY · EXPLORER PASSPORT
          </div>

          {/* Dashed perforation */}
          <div style={{ borderTop: `1px dashed ${BORDER}`, marginBottom: 20 }} />

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Avatar */}
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? 'Explorer'}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${LAVENDER}33` }}
              />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${LAVENDER}, rgba(155,143,255,0.4))`,
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-outfit)',
                fontSize: 28, fontWeight: 900, color: '#fff',
              }}>
                {(profile.display_name ?? profile.username ?? 'E').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: 26, fontWeight: 900,
                color: TEXT_PRI, margin: 0, lineHeight: 1.1,
              }}>
                {profile.display_name ?? profile.username}
              </h1>

              <div style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 11, color: TEXT_SEC,
                letterSpacing: '0.08em', marginTop: 4,
              }}>
                @{profile.username} · {profile.city ?? 'India'} · EXPLORER
              </div>

              {/* Tier badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' as const }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 9999,
                  background: tierCfg.bg,
                  border: `1px solid ${tierCfg.color}30`,
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 9, fontWeight: 700,
                  color: tierCfg.color,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>
                    workspace_premium
                  </span>
                  {tierCfg.label}
                </span>

                {/* Interest tags — max 5 */}
                {tags.slice(0, 5).map(tag => (
                  <TagChip key={tag} label={tag.replace(/_/g, ' ')} />
                ))}
              </div>
            </div>
          </div>

          {/* Member since */}
          <div style={{
            marginTop: 20,
            borderTop: `1px dashed ${BORDER}`,
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 9, color: TEXT_SEC,
              textTransform: 'uppercase' as const, letterSpacing: '0.1em',
            }}>
              Member since {fmtMemberSince(profile.created_at)}
            </span>
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 9, color: TEXT_SEC,
              textTransform: 'uppercase' as const, letterSpacing: '0.1em',
            }}>
              {citySlug.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── CULTURAL PASSPORT ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader
            label={`Cultural Passport · ${eventsCount} events attended`}
            icon="confirmation_number"
          />

          {attendedEvents.length === 0 ? (
            <div style={{
              background: BG_CARD, border: `1px solid ${BORDER}`,
              padding: '28px 24px', textAlign: 'center' as const,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: TEXT_SEC, display: 'block', marginBottom: 10 }}>
                explore
              </span>
              <p style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 13, color: TEXT_SEC, margin: 0,
              }}>
                Just getting started — explore events near you
              </p>
              <Link
                href="/explore"
                style={{
                  display: 'inline-block', marginTop: 14,
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 10, fontWeight: 700,
                  color: LAVENDER, letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                  textDecoration: 'none',
                }}
              >
                Browse events →
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}>
              {attendedEvents.map(ev => (
                <AttendedEventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </div>

        {/* ── BECOME A CREATOR — owner only ──────────────────────────────── */}
        {isOwner && conversionMessage && (
          <div
            style={{
              background: '#131317',
              border: '1px solid #57423e',
              borderLeft: '3px solid #E8705A',
              padding: '24px',
              marginBottom: 32,
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 12,
            }}
          >
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 9,
              color: '#E8705A',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
            }}>
              — ONLY YOU CAN SEE THIS
            </span>
            <h3 style={{
              fontFamily: 'var(--font-outfit)',
              fontSize: 20,
              fontWeight: 900,
              color: '#F0EFF8',
              margin: 0,
            }}>
              {conversionMessage.headline}
            </h3>
            <p style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 13,
              color: '#9896B0',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {conversionMessage.body}
            </p>
            <Link
              href="/onboarding?persona=creator"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
                background: '#E8705A',
                color: '#07070A',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                padding: '10px 20px',
                textDecoration: 'none',
                width: 'fit-content',
              }}
            >
              Start hosting →
            </Link>
          </div>
        )}

        {/* ── FOLLOWING ──────────────────────────────────────────────────── */}
        {followedCreators.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <SectionHeader
              label="Following"
              icon="group"
              count={followedCreators.length}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 10,
            }}>
              {followedCreators.map(c => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
          </div>
        )}

        {/* ── THEIR SCENE ────────────────────────────────────────────────── */}
        {(tags.length > 0 || formats.length > 0) && (
          <div style={{ marginBottom: 32 }}>
            <SectionHeader label="Their Scene" icon="auto_awesome" />
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {tags.map(tag => (
                <TagChip key={tag} label={tag.replace(/_/g, ' ')} />
              ))}
              {formats.map(fmt => (
                <TagChip
                  key={fmt}
                  label={FORMAT_LABELS[fmt] ?? fmt.replace(/_/g, ' ')}
                  accent="#5DD9D0"
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
