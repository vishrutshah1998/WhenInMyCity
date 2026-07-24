export interface BottomNavItem {
  href: string
  icon: string       // Material Symbol name
  label: string
  badgeKey?: string  // key in the badges prop passed to MobileBottomNav
  exact?: boolean
}

export interface MoreItem {
  href?: string      // undefined for "soon" items that are not yet navigable
  icon: string
  label: string
  soon?: boolean
}

export interface WorkspaceLink {
  icon: string
  label: string
  color: string
  href: string
}

export interface BottomNavConfig {
  items: [BottomNavItem, BottomNavItem, BottomNavItem, BottomNavItem]
  more: MoreItem[]
  accent:  string  // CSS value, e.g. 'var(--wimc-accent)' or 'var(--venue-amber)'
  bg:      string  // nav background
  border:  string  // top border color
  muted:   string  // inactive icon/label color
  badgeFg: string  // badge text color — light accent needs dark text, dark accent needs light
}

const WORKSPACE_META: Record<string, WorkspaceLink> = {
  creator:  { icon: 'palette',    label: 'Creator',  color: '#E8705A', href: '/dashboard' },
  venue:    { icon: 'storefront', label: 'Venue',    color: '#5DD9D0', href: '/business/venue/dashboard' },
  // 'business' is an older alias for venue in some user_profiles rows
  business: { icon: 'storefront', label: 'Venue',    color: '#5DD9D0', href: '/business/venue/dashboard' },
  explorer: { icon: 'explore',    label: 'Explorer', color: '#9B8FFF', href: '/explore/dashboard' },
  brand:    { icon: 'campaign',   label: 'Brand',    color: '#F5A800', href: '/business/brand/dashboard' },
}

/**
 * Returns workspace links for all of the user's personas except the current one.
 * Deduplicates venue/business aliases so only one Venue link is ever shown.
 */
export function resolveWorkspaces(personas: string[], currentPersona: string): WorkspaceLink[] {
  const seen = new Set<string>()
  const result: WorkspaceLink[] = []
  for (const p of personas) {
    if (p === currentPersona) continue
    // Normalise the business alias so it doesn't produce a duplicate Venue entry
    const key = p === 'business' ? 'venue' : p
    if (seen.has(key)) continue
    seen.add(key)
    const meta = WORKSPACE_META[p]
    if (meta) result.push(meta)
  }
  return result
}

// ── Creator ──────────────────────────────────────────────────────────────────

export const creatorBottomNavConfig: BottomNavConfig = {
  items: [
    { href: '/dashboard',          icon: 'dashboard',      label: 'Home',     exact: true },
    { href: '/dashboard/events',   icon: 'event',          label: 'Events' },
    { href: '/dashboard/studio',   icon: 'web',            label: 'My Page' },
    { href: '/dashboard/bookings', icon: 'calendar_today', label: 'Bookings' },
  ],
  more: [
    { href: '/dashboard/earn',      icon: 'sell',              label: 'Earn' },
    { href: '/dashboard/explore',   icon: 'explore',           label: 'Explore' },
    { href: '/dashboard/leads',     icon: 'group',             label: 'Leads' },
    { href: '/dashboard/analytics', icon: 'bar_chart',         label: 'Analytics' },
    { href: '/dashboard/payouts',   icon: 'payments',          label: 'Payouts' },
    { href: '/dashboard/venues',    icon: 'apartment',         label: 'Venues' },
    { href: '/dashboard/hub',       icon: 'hub',               label: 'Creator Hub' },
    { href: '/dashboard/community', icon: 'diversity_3',       label: 'My Circles' },
    { href: '/dashboard/hall-of-lights', icon: 'auto_awesome', label: 'Hall of Lights' },
    { href: '/dashboard/tier',      icon: 'workspace_premium', label: 'Tier Progress' },
  ],
  accent:  'var(--wimc-accent)',
  bg:      'var(--wimc-navy)',
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.40)',
  badgeFg: '#fff',
}

// ── Venue ────────────────────────────────────────────────────────────────────

export const venueBottomNavConfig: BottomNavConfig = {
  items: [
    { href: '/business/venue/dashboard',     icon: 'dashboard',       label: 'Home',     exact: true },
    { href: '/business/venue/creators',      icon: 'person_search',   label: 'Proposals' },
    { href: '/business/venue/bookings',      icon: 'event_available', label: 'Bookings' },
    { href: '/business/venue/notifications', icon: 'inbox',           label: 'Inbox',    badgeKey: 'inbox' },
  ],
  more: [
    { href: '/business/venue/calendar',     icon: 'calendar_today',   label: 'Calendar' },
    { href: '/business/venue/analytics',    icon: 'bar_chart_4_bars', label: 'Analytics' },
    { href: '/business/venue/payouts',      icon: 'payments',         label: 'Payouts' },
    { href: '/business/venue/venue',        icon: 'apartment',        label: 'My Venue' },
    { href: '/business/venue/studio',       icon: 'web',              label: 'My Page' },
    { href: '/business/venue/pricing',      icon: 'price_change',     label: 'Pricing' },
    { href: '/business/venue/availability', icon: 'tune',             label: 'Availability' },
    { href: '/map-of-legends',              icon: 'location_city',    label: 'Map of Legends' },
  ],
  accent:  'var(--venue-amber)',
  bg:      'var(--venue-bg-surface)',
  border:  'var(--venue-border-subtle)',
  muted:   'var(--venue-text-muted)',
  badgeFg: '#000',
}

// ── Brand ────────────────────────────────────────────────────────────────────
// Brand enquiries unread count has no existing server-side query path (BrandSidebarServer
// hardcodes 0). The badge architecture is wired; a future query can supply the count.

export const brandBottomNavConfig: BottomNavConfig = {
  items: [
    { href: '/business/brand/dashboard', icon: 'dashboard',     label: 'Home',      exact: true },
    { href: '/business/brand/enquiries', icon: 'inbox',         label: 'Enquiries', badgeKey: 'inbox' },
    { href: '/business/brand/creators',  icon: 'person_search', label: 'Creators' },
    { href: '/business/brand/studio',    icon: 'web',           label: 'My Page' },
  ],
  more: [
    { icon: 'campaign',         label: 'Campaigns', soon: true },
    { icon: 'bar_chart_4_bars', label: 'Analytics', soon: true },
  ],
  accent:  'var(--venue-amber)',
  bg:      'var(--venue-bg-surface)',
  border:  'var(--venue-border-subtle)',
  muted:   'var(--venue-text-muted)',
  badgeFg: '#000',
}

// ── Explorer ──────────────────────────────────────────────────────────────────

export const explorerBottomNavConfig: BottomNavConfig = {
  items: [
    { href: '/explore',                         icon: 'explore',             label: 'Explore', exact: true },
    { href: '/explore/dashboard/tickets',       icon: 'confirmation_number', label: 'Tickets' },
    { href: '/explore/dashboard/saved',         icon: 'bookmark',            label: 'Saved' },
    { href: '/explore/dashboard/notifications', icon: 'notifications',       label: 'Alerts' },
  ],
  more: [
    { href: '/explore/dashboard',           icon: 'person',   label: 'My Profile' },
    { href: '/explore/dashboard/studio',    icon: 'web',      label: 'My Page' },
    { href: '/explore/dashboard/following', icon: 'group',    label: 'Following' },
    { href: '/explore/dashboard/settings',  icon: 'settings', label: 'Settings' },
  ],
  accent:  'var(--wimc-accent)',
  bg:      'var(--wimc-navy)',
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.40)',
  badgeFg: '#fff',
}
