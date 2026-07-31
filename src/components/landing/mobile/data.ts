// Shared copy/data for the mobile ticket-stack landing experience
// (src/components/landing/mobile/). Small marketing-copy arrays here intentionally mirror
// desktop's src/app/page.tsx (EVENT_TAGS, MAKER_FEATURES, VENUE_FEATURES, CITIES already
// match 1:1) — duplicated rather than cross-imported since this is trivial content that
// may reasonably diverge between the two experiences later; the actual tear-clip geometry
// (the part that must never drift) lives in the shared src/lib/ticketTear.ts instead.

export interface TicketMeta {
  serial: string
  type: string
  accent: string
  stubLabel: string
  bg: string
  tallStub?: boolean
}

// Accents follow the attached mobile design spec exactly (README.md "Card accent color"
// per card) — note this differs from desktop's current 3-card accent mapping; the design
// bundle states colors are final/high-fidelity, so the new mapping wins here.
export const TICKET_META: TicketMeta[] = [
  { serial: 'WIMC · 001', type: 'ENTRY PASS',   accent: '#2C4A8C', stubLabel: 'ADMIT ONE · GENERAL ADMISSION',         bg: '#FBF3E7' },
  { serial: 'WIMC · 002', type: 'CREATOR PASS', accent: '#D8432E', stubLabel: 'ADMIT ONE · CLAIM YOUR PAGE',           bg: '#FBF3E7' },
  { serial: 'WIMC · 003', type: 'ROLE SELECT',  accent: '#FF6B35', stubLabel: 'ADMIT ONE · YOUR STAGE AWAITS',         bg: '#FAF7F0' },
  { serial: 'WIMC · 004', type: 'ROLE SELECT',  accent: '#1F8A70', stubLabel: 'ADMIT ONE · CHOOSE YOUR PATH',          bg: '#FAF7F0', tallStub: true },
]

export const CITIES = ['Indore', 'Jaipur', 'Bhopal', 'Chandigarh', 'Kochi', 'Mysuru', 'Vadodara', 'Dehradun', 'Ranchi', 'Coimbatore', 'Agra', 'Vijayawada', 'Surat', 'Nagpur', 'Lucknow', 'Amritsar', 'Jodhpur', 'Udaipur']

export const EVENT_TAGS = [
  { label: 'Jazz Nights',  color: '#FF6B35' },
  { label: 'Stand-up',     color: '#D8432E' },
  { label: 'Workshops',    color: '#1F8A70' },
  { label: 'Art Pop-ups',  color: '#6B4EFF' },
  { label: 'Open Mics',    color: '#FF6B35' },
  { label: 'Poetry Slams', color: '#2C4A8C' },
  { label: 'Music Gigs',   color: '#D8432E' },
]

export const MAKER_FEATURES = ['Ticketed events with UPI checkout', 'Link-in-bio page at /{username}', 'Keep 75–90% of every rupee earned']
export const VENUE_FEATURES = ['Verified listing in creator search', 'Booking calendar & Venue proposals', 'Revenue from idle evening slots']

export const MAKER_CHIPS = [
  { emoji: '🎤', label: 'Musicians' },
  { emoji: '😂', label: 'Comedians' },
  { emoji: '🎨', label: 'Artists' },
  { emoji: '✍️', label: 'Poets' },
]
export const VENUE_CHIPS = [
  { emoji: '☕', label: 'Cafés' },
  { emoji: '🏙️', label: 'Rooftops' },
  { emoji: '🎨', label: 'Studios' },
  { emoji: '🖼️', label: 'Galleries' },
]

export const ROLE_MAKERS_PROPS = {
  eyebrow: 'For makers',
  price: '₹01',
  titleLines: ['Your', 'stage.'] as [string, string],
  watermarkNum: '01',
  accent: '#FF6B35',
  bodyText: 'Host ticketed events, build your link-in-bio, sell tickets with UPI — keep 75–90% of everything you earn.',
  features: MAKER_FEATURES,
  ctaLabel: 'Start for free',
  ctaHref: '/signin?next=/onboarding',
  ctaBg: '#FF6B35',
  ctaColor: '#FFFFFF',
  chipsLabel: 'Popular with',
  chips: MAKER_CHIPS,
}

export const ROLE_VENUES_PROPS = {
  eyebrow: 'For Venues',
  price: '₹02',
  titleLines: ['Open', 'your doors.'] as [string, string],
  watermarkNum: '02',
  accent: '#1F8A70',
  bodyText: 'List your café, rooftop, studio, or gallery. Let creators come to you with real bookings.',
  features: VENUE_FEATURES,
  ctaLabel: 'List your Venue',
  ctaHref: '/signin?next=%2Fonboarding%3Fpersona%3Dvenue',
  ctaBg: '#4FB8E8',
  ctaColor: '#201A12',
  chipsLabel: 'Perfect for',
  chips: VENUE_CHIPS,
}
