import Link from 'next/link'

// Venue carousel page — My Venue / Pricing / Availability / My Page, a
// single ungrouped card list (unlike Business's Operations/Growth split —
// this set doesn't have an existing desktop-sidebar grouping to mirror, and
// four items reads fine flat). Each card links OUT to its existing,
// independently-routed page (VenueEditorClient/PricingClient/
// AvailabilityClient/VenueStudioClient all fetch their own data) — same
// card-list-not-inline-tabs reasoning as Business, confirmed in the audit:
// these are heavy, independently-routed pages, not lightweight forms.
// No 'use client' — purely static links, no interactivity of its own.

interface CardDef {
  href:  string
  icon:  string
  label: string
  desc:  string
}

const CARDS: CardDef[] = [
  { href: '/business/venue/venue',        icon: 'apartment',    label: 'My Venue',     desc: 'Name, address, capacity, amenities' },
  { href: '/business/venue/pricing',      icon: 'price_change', label: 'Pricing',      desc: 'How creators book and pay for your space' },
  { href: '/business/venue/availability', icon: 'tune',         label: 'Availability', desc: 'Open dates, blocked dates, booking rules' },
  { href: '/business/venue/studio',       icon: 'web',          label: 'My Page',      desc: 'Your public venue page — blocks, theme, events' },
]

export default function VenueSettingsSlot() {
  return (
    <div style={{ padding: '24px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--venue-text-primary)', margin: '0 0 4px' }}>
        Venue
      </h1>
      <p style={{ fontSize: 13, color: 'var(--venue-text-secondary)', margin: '0 0 24px' }}>
        How your space is set up and presented to creators.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CARDS.map(card => (
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
              <p style={{ fontSize: 12, color: 'var(--venue-text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.desc}
              </p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-text-muted)', flexShrink: 0 }}>
              chevron_right
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
