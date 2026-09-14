'use client'

import PaperCard from '@/components/ui/PaperCard'
import IconChip from '@/components/ui/IconChip'

// Business carousel page — a vertical list of nav cards, each linking OUT to
// an existing, independently-routed page (Analytics/Payouts/Leads/Bookings/
// Earn/Venues all have their own substantial server-fetched data — inlining
// them as carousel content or internal tabs would mean re-fetching 6 pages'
// worth of data in one slide, and a horizontal tab strip inside a
// horizontally-draggable carousel page would reintroduce the exact
// gesture-conflict class the Map page's gutter-only capture exists to solve.
// Icons/labels intentionally NOT re-declared here — sourced inline to match
// the icon set creatorBottomNavConfig / Sidebar.tsx already use for the same
// destinations, so this can't drift from wherever those live.

interface CardDef {
  href:  string
  icon:  string
  label: string
  desc:  string
}

// Bright, flat per-group icon-chip colors — the paper-cutout reference's
// yellow/blue/pink/purple category set. Not tied to --wimc-* tokens: none of
// the existing brand accents (coral/teal/amber) cover this range, and this
// grouping is local to the Business card list, not a site-wide palette.
const GROUP_COLORS: Record<string, string> = {
  Money:       '#FFD23F',
  Growth:      '#5B8DEF',
  Operations:  '#FF6FA0',
  Recognition: '#9B7EDE',
}

const GROUPS: { title: string; cards: CardDef[] }[] = [
  {
    title: 'Money',
    cards: [
      { href: '/dashboard/earn',    icon: 'sell',     label: 'Earn',    desc: 'Booking requests, proposals & offers' },
      { href: '/dashboard/payouts', icon: 'payments', label: 'Payouts', desc: 'Request and track your payouts' },
    ],
  },
  {
    title: 'Growth',
    cards: [
      { href: '/dashboard/analytics', icon: 'bar_chart', label: 'Analytics', desc: 'Page views, subscribers & reach' },
      { href: '/dashboard/leads',     icon: 'group',      label: 'Leads',     desc: 'Everyone who left their contact' },
    ],
  },
  {
    title: 'Operations',
    cards: [
      { href: '/dashboard/bookings', icon: 'calendar_today', label: 'Bookings', desc: 'Manage confirmed & pending bookings' },
      { href: '/dashboard/venues',   icon: 'apartment',      label: 'Venues',   desc: 'Venues you’ve worked with' },
    ],
  },
  {
    title: 'Recognition',
    cards: [
      { href: '/dashboard/progress', icon: 'workspace_premium', label: 'Progress', desc: 'Your tier progress & Hall of Lights' },
    ],
  },
]

interface Props {
  /** Bookings visibility must match desktop Sidebar's conditional: hasAnyEvent || hasAnyRsvp. */
  showBookings: boolean
  accentColor:  string
}

export default function CreatorBusinessSlot({ showBookings, accentColor }: Props) {
  const groups = GROUPS
    .map(g => ({ ...g, cards: g.cards.filter(c => c.href !== '/dashboard/bookings' || showBookings) }))
    .filter(g => g.cards.length > 0)

  return (
    <div style={{ padding: '24px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--wimc-text-primary)', margin: '0 0 4px' }}>
        Business
      </h1>
      <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', margin: '0 0 24px' }}>
        Everything that runs your creator business, in one place.
      </p>

      {groups.map(group => (
        <div key={group.title} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: accentColor,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            fontFamily: 'var(--font-jetbrains-mono)',
            marginBottom: 10,
          }}>
            {group.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {group.cards.map(card => (
              <PaperCard
                key={card.href}
                href={card.href}
                borderColor="var(--wimc-text-primary)"
                background="var(--wimc-bg-elevated)"
                padding="14px 16px"
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <IconChip color={GROUP_COLORS[group.title]}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{card.icon}</span>
                </IconChip>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)', margin: '0 0 2px' }}>
                    {card.label}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.desc}
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--wimc-text-muted)', flexShrink: 0 }}>
                  chevron_right
                </span>
              </PaperCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
