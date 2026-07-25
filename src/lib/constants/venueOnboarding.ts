// Shared amenity/pricing/event-type option lists for venue onboarding.
// Single source of truth for the exact display strings V6/V7 save into
// sessionStorage (and later Supabase) — imported by both the onboarding
// pages (V6/page.tsx, V7/page.tsx) and the right-panel previews
// (SplitRightPanel.Venues.tsx) so the two can't drift out of sync.

export interface AmenityCategory {
  id:    string
  icon:  string
  label: string
  items: string[]
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  { id: 'connectivity', icon: 'wifi',              label: 'Connectivity & Tech',
    items: ['WiFi (Fibre)', 'AV System', 'Projector', 'PA System', 'Power Backup', 'Smart TV', 'Ethernet Ports', 'DMX Lighting'] },
  { id: 'food_drink',   icon: 'restaurant',         label: 'Food & Drink',
    items: ['In-House Café', 'Bar & Alcohol', 'Coffee & Tea', 'Outside Catering OK', 'Kitchen Access', 'Vending Machine'] },
  { id: 'space',        icon: 'deck',               label: 'Space & Outdoors',
    items: ['Outdoor Terrace', 'Rooftop Access', 'Garden / Lawn', 'Dedicated Stage', 'Private Booth', 'Basement Access'] },
  { id: 'access',       icon: 'accessible',         label: 'Access & Parking',
    items: ['Wheelchair Ramp', 'Elevator Access', 'Near Metro', 'Free Parking', 'Valet Parking', 'Accessible Toilets'] },
  { id: 'production',   icon: 'video_camera_front', label: 'Production & Media',
    items: ['Photography Friendly', 'Video Shoot Ready', 'Green Screen Wall', 'Studio Lighting', 'Live Stream Setup', 'Drone-Friendly'] },
  { id: 'ambiance',     icon: 'wb_sunny',           label: 'Ambiance & Light',
    items: ['Natural Light', 'Blackout Curtains', 'Skylight', 'Neon Signage', 'Art Walls', 'Industrial Look', 'Heritage / Vintage'] },
  { id: 'vibe',         icon: 'nightlife',          label: 'Vibe & Rules',
    items: ['DJ / Live Music OK', 'Late Night (12am+)', 'Pets Allowed', 'Smoking Zone', 'BYOB Allowed', 'Board Games'] },
  { id: 'work',         icon: 'laptop',             label: 'Work & Focus',
    items: ['Whiteboard', 'AC Throughout', 'Private Meeting Room', 'Silent Zone', 'Standing Desks', 'Phone Booth'] },
]

export const PRICING_MODELS = [
  { id: 'hourly', icon: 'schedule',   label: 'HOURLY',      desc: 'Creators pay a flat hourly rate for the space.' },
  { id: 'split',  icon: 'analytics',  label: 'DOOR SPLIT',  desc: 'Revenue sharing based on ticket sales.' },
  { id: 'hybrid', icon: 'layers',     label: 'HYBRID',      desc: 'Small booking fee + minor split on ticket sales.' },
  { id: 'fnb',    icon: 'restaurant', label: 'F&B MINIMUM', desc: 'No rent — just a guaranteed min food/drink spend.' },
] as const

export type PricingId = typeof PRICING_MODELS[number]['id']

// Map display IDs → valid Supabase enum values
export const PRICING_TO_VALID: Record<PricingId, 'fixed_rental'|'door_split'|'hybrid'|'f_and_b_minimum'> = {
  hourly: 'fixed_rental',
  split:  'door_split',
  hybrid: 'hybrid',
  fnb:    'f_and_b_minimum',
}

export const EVENT_TYPES = [
  'Gigs', 'Workshops', 'Screenings', 'Concerts', 'Art Shows',
  'Open Mic', 'Networking', 'Pop-ups', 'Stand-up', 'Dance',
  'Yoga', 'Gaming', 'Parties', 'Meetups', 'Talks',
  'Rehearsals', 'Podcasts', 'Book Launch', 'DJ Night', 'Poetry Slam',
  'Photography Shoot', 'Film Shoot', 'Theatre',
] as const
