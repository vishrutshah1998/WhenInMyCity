import Link from 'next/link'

// Business carousel page — Bookings/Calendar/Inbox ("Operations") and
// Analytics/Payouts ("Growth"), mirroring VenueSidebarClient.tsx's existing
// desktop grouping labels (NAV_SECTIONS_VENUE) rather than inventing new
// ones. All 5 destinations are independently-routed pages with their own
// data fetches (BookingsPageClient/VenueCalendarClient/
// VenueNotificationsClient/AnalyticsClient/VenuePayoutsClient) — same
// card-list-not-inline reasoning as Creator's Business page.
// No 'use client' — purely static links, no interactivity of its own.

interface CardDef {
  href:     string
  icon:     string
  label:    string
  desc:     string
  /** Shown only when unlocked is false — explains, doesn't hide (card stays clickable either way). */
  lockedSublabel?: string
}

const OPERATIONS: CardDef[] = [
  { href: '/business/venue/bookings',      icon: 'event_available', label: 'Bookings', desc: 'Requests from creators wanting to book your space' },
  { href: '/business/venue/calendar',      icon: 'calendar_today',  label: 'Calendar', desc: 'Confirmed events and blocked-off dates' },
  { href: '/business/venue/notifications', icon: 'inbox',           label: 'Inbox',    desc: 'Messages and booking updates' },
]

const GROWTH: CardDef[] = [
  { href: '/business/venue/analytics', icon: 'bar_chart_4_bars', label: 'Analytics', desc: 'Page views, occupancy, revenue trends', lockedSublabel: 'Unlocks after first booking' },
  { href: '/business/venue/payouts',   icon: 'payments',         label: 'Payouts',   desc: 'Request and track your payouts',        lockedSublabel: 'Unlocks after first booking' },
]

interface Props {
  /** Same maker_venue_proposals(status='accepted') computation as VenueSidebar.tsx's hasAnyConfirmedBooking — reused, not reimplemented. */
  hasAnyConfirmedBooking: boolean
}

function CardGroup({ title, cards, hasAnyConfirmedBooking }: { title: string; cards: CardDef[]; hasAnyConfirmedBooking: boolean }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--venue-accent)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
        fontFamily: 'var(--font-jetbrains-mono)',
        marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map(card => {
          const showLocked = !!card.lockedSublabel && !hasAnyConfirmedBooking
          return (
            <Link
              key={card.href}
              href={card.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: 'var(--venue-bg-elevated)',
                border: '1px solid var(--venue-border-default)',
                textDecoration: 'none',
              }}
            >
              <div style={{
                width: 40, height: 40, flexShrink: 0,
                background: 'var(--venue-accent-tint)', color: 'var(--venue-accent)',
                display: 'grid', placeItems: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{card.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--venue-text-primary)', fontFamily: 'var(--font-dm-sans)', margin: '0 0 2px' }}>
                  {card.label}
                </p>
                <p style={{
                  fontSize: 12,
                  color: showLocked ? 'var(--venue-amber)' : 'var(--venue-text-secondary)',
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {showLocked ? card.lockedSublabel : card.desc}
                </p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-text-muted)', flexShrink: 0 }}>
                chevron_right
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function VenueOperationsSlot({ hasAnyConfirmedBooking }: Props) {
  return (
    <div style={{ padding: '24px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--venue-text-primary)', margin: '0 0 4px' }}>
        Business
      </h1>
      <p style={{ fontSize: 13, color: 'var(--venue-text-secondary)', margin: '0 0 24px' }}>
        Bookings, day-to-day operations, and how your venue earns.
      </p>

      <CardGroup title="Operations" cards={OPERATIONS} hasAnyConfirmedBooking={hasAnyConfirmedBooking} />
      <CardGroup title="Growth" cards={GROWTH} hasAnyConfirmedBooking={hasAnyConfirmedBooking} />
    </div>
  )
}
