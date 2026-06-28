'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ── Design tokens (mirrors brand dashboard palette) ────────────────────────────
const D = {
  bg:       '#0C0A06',
  surface:  '#171310',
  elevated: '#1E1A12',
  border:   'rgba(245,168,0,0.15)',
  text:     '#F7F3EB',
  muted:    '#9E8D6B',
  amber:    '#F5A800',
  coral:    '#E8705A',
  teal:     '#5DD9D0',
} as const

const MONO   = "'JetBrains Mono', monospace"
const OUTFIT = "'Outfit', sans-serif"
const DM     = "'DM Sans', sans-serif"

// ── Category filter config ─────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { id: 'all',       label: 'All Creators', icon: 'people' },
  { id: 'music',     label: 'Music',        icon: 'music_note' },
  { id: 'comedy',    label: 'Comedy',       icon: 'sentiment_very_satisfied' },
  { id: 'art',       label: 'Art & Design', icon: 'palette' },
  { id: 'education', label: 'Education',    icon: 'school' },
  { id: 'food',      label: 'Food',         icon: 'restaurant' },
  { id: 'lifestyle', label: 'Lifestyle',    icon: 'spa' },
  { id: 'video',     label: 'Video',        icon: 'videocam' },
  { id: 'dance',     label: 'Dance',        icon: 'nightlife' },
] as const

type CategoryId = typeof CATEGORY_FILTERS[number]['id']

const CREATOR_TYPE_TO_CATEGORY: Record<string, CategoryId> = {
  music:                 'music',
  music_performance:     'music',
  comedy_theatre:        'comedy',
  comedy_open_mic:       'comedy',
  art_design:            'art',
  crafts_making:         'art',
  teaching_coaching:     'education',
  workshops_teaching:    'education',
  food_culinary:         'food',
  food_lifestyle:        'food',
  lifestyle_wellness:    'lifestyle',
  fitness_wellness:      'lifestyle',
  spirituality:          'lifestyle',
  travel_adventure:      'lifestyle',
  video_content:         'video',
  content_creation:      'video',
  dance:                 'dance',
  literature_poetry:     'art',
  community_impact:      'lifestyle',
  professional_portfolio:'education',
}

// ── Tier config ────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  wanderer: '#6B7280',
  local:    '#10B981',
  lantern:  '#F59E0B',
  beacon:   '#8B5CF6',
}

const TIER_ICONS: Record<string, string> = {
  wanderer: 'radio_button_unchecked',
  local:    'local_fire_department',
  lantern:  'flashlight_on',
  beacon:   'workspace_premium',
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CreatorCard {
  username: string
  display_name: string
  creator_type: string
  interest_tags: string[]
  city: string
  avatar_url: string | null
  bio: string | null
  user_tier: string
  is_verified: boolean
  cumulative_events_hosted: number
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CategoryChip({
  filter,
  active,
  onClick,
}: {
  filter: typeof CATEGORY_FILTERS[number]
  active: boolean
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        background: active ? D.amber : hov ? 'rgba(245,168,0,0.08)' : D.surface,
        border: `1px solid ${active ? D.amber : D.border}`,
        color: active ? D.bg : D.muted,
        fontFamily: MONO, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all 140ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{filter.icon}</span>
      {filter.label}
    </button>
  )
}

function CreatorCardItem({ c }: { c: CreatorCard }) {
  const initials = c.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const tierColor = TIER_COLORS[c.user_tier] ?? '#6B7280'
  const tierIcon  = TIER_ICONS[c.user_tier]  ?? 'radio_button_unchecked'

  const prettyType = c.creator_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())

  return (
    <Link
      href={`/${c.username}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          background: D.surface,
          border: `1px solid ${D.border}`,
          padding: '20px',
          transition: 'border-color 150ms ease, background 150ms ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,168,0,0.40)'
          ;(e.currentTarget as HTMLElement).style.background = D.elevated
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = D.border
          ;(e.currentTarget as HTMLElement).style.background = D.surface
        }}
      >
        {/* Header row: avatar + name + tier */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: D.elevated, border: `2px solid ${D.border}`,
            display: 'grid', placeItems: 'center',
            fontFamily: OUTFIT, fontWeight: 700, fontSize: 16,
            color: D.muted, flexShrink: 0, overflow: 'hidden',
          }}>
            {c.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.avatar_url} alt={c.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: OUTFIT, fontWeight: 800, fontSize: 15,
                color: D.text, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.display_name}
              </span>
              {c.is_verified && (
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: D.amber, flexShrink: 0 }}>verified</span>
              )}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9, color: D.muted,
              textTransform: 'uppercase', letterSpacing: '0.10em', marginTop: 3,
            }}>
              @{c.username} · {c.city}
            </div>
          </div>

          {/* Tier badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px',
            background: `${tierColor}18`,
            border: `1px solid ${tierColor}40`,
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: tierColor }}>{tierIcon}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: tierColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {c.user_tier}
            </span>
          </div>
        </div>

        {/* Creator type */}
        <div style={{
          padding: '4px 10px',
          background: 'rgba(245,168,0,0.08)',
          border: `1px solid rgba(245,168,0,0.20)`,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          alignSelf: 'flex-start',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12, color: D.amber }}>category</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: D.amber, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            {prettyType}
          </span>
        </div>

        {/* Bio */}
        {c.bio && (
          <p style={{
            fontFamily: DM, fontSize: 12, color: D.muted, lineHeight: 1.6,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {c.bio}
          </p>
        )}

        {/* Tags */}
        {c.interest_tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {c.interest_tags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                fontFamily: MONO, fontSize: 9, color: D.muted,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.08)`,
                padding: '2px 7px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Footer: events count + CTA */}
        <div style={{
          marginTop: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, borderTop: `1px solid ${D.border}`,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: D.muted }}>
            {c.cumulative_events_hosted > 0
              ? `${c.cumulative_events_hosted} event${c.cumulative_events_hosted !== 1 ? 's' : ''} hosted`
              : 'New creator'}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 9, color: D.amber,
            textTransform: 'uppercase', letterSpacing: '0.10em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            View Profile
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Main client component ──────────────────────────────────────────────────────

export default function BrowseCreatorsClient({ creators }: { creators: CreatorCard[] }) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    let list = creators
    if (activeCategory !== 'all') {
      list = list.filter(c => {
        const mapped = CREATOR_TYPE_TO_CATEGORY[c.creator_type]
        return mapped === activeCategory
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.display_name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.interest_tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [creators, activeCategory, searchQuery])

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: OUTFIT, fontWeight: 900, fontSize: 28,
          color: D.text, margin: '0 0 4px',
        }}>
          Browse Creators
        </h1>
        <p style={{ fontFamily: MONO, fontSize: 10, color: D.muted, margin: 0, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          {creators.length} creators on the platform
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <span
          className="material-symbols-outlined"
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: D.muted, pointerEvents: 'none',
          }}
        >
          search
        </span>
        <input
          type="text"
          placeholder="Search by name, city, or tag…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 14px 10px 38px',
            background: D.surface, border: `1px solid ${D.border}`,
            color: D.text, fontFamily: DM, fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Category filters */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
        marginBottom: 24,
      }}>
        {CATEGORY_FILTERS.map(f => (
          <CategoryChip
            key={f.id}
            filter={f}
            active={activeCategory === f.id}
            onClick={() => setActiveCategory(f.id)}
          />
        ))}
      </div>

      {/* Results count */}
      <div style={{
        fontFamily: MONO, fontSize: 9, color: D.muted, textTransform: 'uppercase',
        letterSpacing: '0.12em', marginBottom: 16,
      }}>
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(c => (
            <CreatorCardItem key={c.username} c={c} />
          ))}
        </div>
      ) : (
        <div style={{
          background: D.surface, border: `1px dashed ${D.border}`,
          padding: '60px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: D.muted, opacity: 0.4 }}>
            search_off
          </span>
          <p style={{ fontFamily: DM, fontSize: 13, color: D.muted, margin: 0 }}>
            No creators match your filters.
          </p>
        </div>
      )}
    </div>
  )
}
