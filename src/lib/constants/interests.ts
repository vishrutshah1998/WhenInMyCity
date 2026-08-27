// =============================================================================
// WIMC — Onboarding constants: interest tags and supported cities
// =============================================================================

// ---------------------------------------------------------------------------
// Interest Tags
// ---------------------------------------------------------------------------

export type InterestCategory = 'performance' | 'arts' | 'education' | 'lifestyle' | 'tech' | 'food_culture' | 'outdoors'

// Canonical display order for the 7 interest categories — shared by every
// tag-picker surface (Creator + Explorer onboarding, dashboard settings/studio).
export const INTEREST_CATEGORY_ORDER: InterestCategory[] = [
  'performance', 'arts', 'education', 'lifestyle', 'tech', 'food_culture', 'outdoors',
]

// HSV Value axis cluster — encodes the typical photonic conditions of the activity.
// dark: night venues, cinema, clubs, candlelit rooms (Value 5–25%)
// warm: stage light, kitchens, studios with artificial warm light (Value 35–55%)
// natural: outdoor daylight, bright airy studios, morning (Value 70–95%)
// vivid: screen-lit, conference rooms, high-energy offices (Value 25–45%)
export type ValueCluster = 'dark' | 'warm' | 'natural' | 'vivid'

export interface InterestTag {
  id: string
  label: string
  emoji: string
  category: InterestCategory
  valueCluster: ValueCluster
}

// One accent per interest category — shared by the C7/E5 accordion picker
// and its right-panel bubble field so a tag's chip and its bubble always
// match colour.
export const INTEREST_CATEGORY_COLORS: Record<InterestCategory, string> = {
  performance:  '#E8705A',
  arts:         '#5DD9D0',
  education:    '#9B8FFF',
  lifestyle:    '#F5A800',
  tech:         '#845EF7',
  food_culture: '#FF9F1C',
  outdoors:     '#06D6A0',
}

/**
 * Curated interest tags shown across onboarding and profile settings.
 * Users select at least 3 (no upper bound) to describe the kinds of events
 * they host or attend. Tag count is `INTEREST_TAGS.length` — don't hardcode it.
 */
export const INTEREST_TAGS: InterestTag[] = [
  // --- Performance -----------------------------------------------------------
  { id: 'acoustic-sets',        label: 'Acoustic Sets',         emoji: '🎸', category: 'performance', valueCluster: 'warm'    },
  { id: 'stand-up-comedy',      label: 'Stand-Up Comedy',       emoji: '🎤', category: 'performance', valueCluster: 'warm'    },
  { id: 'dj-nights',            label: 'DJ Nights',             emoji: '🎧', category: 'performance', valueCluster: 'dark'    },
  { id: 'open-mics',            label: 'Open Mics',             emoji: '🎙️', category: 'performance', valueCluster: 'warm'    },
  { id: 'poetry-slams',         label: 'Poetry Slams',          emoji: '📜', category: 'performance', valueCluster: 'warm'    },
  { id: 'improv-comedy',        label: 'Improv Comedy',         emoji: '🃏', category: 'performance', valueCluster: 'warm'    },
  { id: 'music-jams',           label: 'Music Jams',            emoji: '🥁', category: 'performance', valueCluster: 'dark'    },
  { id: 'live-theatre',         label: 'Live Theatre',          emoji: '🎭', category: 'performance', valueCluster: 'dark'    },
  { id: 'classical-concerts',   label: 'Classical Concerts',    emoji: '🎻', category: 'performance', valueCluster: 'dark'    },
  { id: 'sufi-ghazal-nights',   label: 'Sufi & Ghazal Nights',  emoji: '🌙', category: 'performance', valueCluster: 'dark'    },
  { id: 'storytelling-nights',  label: 'Storytelling Nights',   emoji: '📖', category: 'performance', valueCluster: 'dark'    },
  { id: 'spoken-word',          label: 'Spoken Word',           emoji: '🗣️', category: 'performance', valueCluster: 'dark'    },

  // --- Arts ------------------------------------------------------------------
  { id: 'painting-workshops',   label: 'Painting Workshops',    emoji: '🎨', category: 'arts',        valueCluster: 'warm'    },
  { id: 'street-art',           label: 'Street Art',            emoji: '🖌️', category: 'arts',        valueCluster: 'vivid'   },
  { id: 'craft-sessions',       label: 'Craft Sessions',        emoji: '✂️', category: 'arts',        valueCluster: 'warm'    },
  { id: 'photography-walks',    label: 'Photography Walks',     emoji: '📷', category: 'arts',        valueCluster: 'natural' },
  { id: 'film-screenings',      label: 'Film Screenings',       emoji: '🎬', category: 'arts',        valueCluster: 'dark'    },
  { id: 'pottery',              label: 'Pottery',               emoji: '🏺', category: 'arts',        valueCluster: 'natural' },
  { id: 'life-drawing',         label: 'Life Drawing',          emoji: '✏️', category: 'arts',        valueCluster: 'natural' },
  { id: 'printmaking',          label: 'Printmaking',           emoji: '🖨️', category: 'arts',        valueCluster: 'vivid'   },
  { id: 'textile-fiber-arts',   label: 'Textile & Fiber Arts',  emoji: '🧵', category: 'arts',        valueCluster: 'vivid'   },
  { id: 'digital-art',          label: 'Digital Art',           emoji: '🖥️', category: 'arts',        valueCluster: 'vivid'   },
  { id: 'sculpture',            label: 'Sculpture',             emoji: '🗿', category: 'arts',        valueCluster: 'vivid'   },
  { id: 'calligraphy',          label: 'Calligraphy',           emoji: '✒️', category: 'arts',        valueCluster: 'vivid'   },

  // --- Education -------------------------------------------------------------
  { id: 'cooking-classes',      label: 'Cooking Classes',       emoji: '👨‍🍳', category: 'education',  valueCluster: 'warm'    },
  { id: 'dance-workshops',      label: 'Dance Workshops',       emoji: '💃', category: 'education',   valueCluster: 'warm'    },
  { id: 'yoga-classes',         label: 'Yoga Classes',          emoji: '🧘', category: 'education',   valueCluster: 'natural' },
  { id: 'language-exchange',    label: 'Language Exchange',     emoji: '🌐', category: 'education',   valueCluster: 'vivid'   },
  { id: 'book-clubs',           label: 'Book Clubs',            emoji: '📚', category: 'education',   valueCluster: 'natural' },
  { id: 'creative-writing',     label: 'Creative Writing',      emoji: '🖊️', category: 'education',   valueCluster: 'vivid'   },
  { id: 'coding-workshops',     label: 'Coding Workshops',      emoji: '💻', category: 'education',   valueCluster: 'vivid'   },
  { id: 'finance-investing',    label: 'Finance & Investing',   emoji: '💰', category: 'education',   valueCluster: 'vivid'   },
  { id: 'public-speaking',      label: 'Public Speaking',       emoji: '🎯', category: 'education',   valueCluster: 'vivid'   },
  { id: 'history-walks',        label: 'History Walks',         emoji: '🏛️', category: 'education',   valueCluster: 'natural' },
  { id: 'debate-clubs',         label: 'Debate Clubs',          emoji: '💬', category: 'education',   valueCluster: 'vivid'   },
  { id: 'mindfulness-wellness', label: 'Mindfulness & Wellness', emoji: '🌸', category: 'education',  valueCluster: 'natural' },

  // --- Lifestyle -------------------------------------------------------------
  { id: 'fitness-bootcamp',     label: 'Fitness Bootcamp',      emoji: '🏋️', category: 'lifestyle',   valueCluster: 'warm'    },
  { id: 'nature-walks',         label: 'Nature Walks',          emoji: '🌿', category: 'lifestyle',   valueCluster: 'natural' },
  { id: 'mixology',             label: 'Mixology',              emoji: '🍹', category: 'lifestyle',   valueCluster: 'warm'    },
  { id: 'meditation-sessions',  label: 'Meditation Sessions',   emoji: '🧠', category: 'lifestyle',   valueCluster: 'dark'    },
  { id: 'cycling-tours',        label: 'Cycling Tours',         emoji: '🚴', category: 'lifestyle',   valueCluster: 'natural' },
  { id: 'board-games',          label: 'Board Games',           emoji: '🎲', category: 'lifestyle',   valueCluster: 'warm'    },
  { id: 'sound-healing',        label: 'Sound Healing',         emoji: '🔔', category: 'lifestyle',   valueCluster: 'dark'    },
  { id: 'running-clubs',        label: 'Running Clubs',         emoji: '🏃', category: 'lifestyle',   valueCluster: 'natural' },
  { id: 'tarot-astrology',      label: 'Tarot & Astrology',     emoji: '🔮', category: 'lifestyle',   valueCluster: 'dark'    },
  { id: 'journaling-circles',   label: 'Journaling Circles',    emoji: '📓', category: 'lifestyle',   valueCluster: 'natural' },
  { id: 'sustainable-living',   label: 'Sustainable Living',    emoji: '♻️', category: 'lifestyle',   valueCluster: 'natural' },

  // --- Tech ------------------------------------------------------------------
  { id: 'tech-talks',           label: 'Tech Talks',            emoji: '💡', category: 'tech',        valueCluster: 'vivid'   },
  { id: 'startup-meetups',      label: 'Startup Meetups',       emoji: '🚀', category: 'tech',        valueCluster: 'vivid'   },
  { id: 'design-sprints',       label: 'Design Sprints',        emoji: '🎨', category: 'tech',        valueCluster: 'vivid'   },
  { id: 'hackathons',           label: 'Hackathons',            emoji: '⌨️', category: 'tech',        valueCluster: 'vivid'   },
  { id: 'ai-ml-workshops',      label: 'AI & ML Workshops',     emoji: '🤖', category: 'tech',        valueCluster: 'vivid'   },
  { id: 'gaming-sessions',      label: 'Gaming Sessions',       emoji: '🎮', category: 'tech',        valueCluster: 'dark'    },
  { id: 'product-ux',           label: 'Product & UX Meetups',  emoji: '📐', category: 'tech',        valueCluster: 'vivid'   },
  { id: 'web3-crypto',          label: 'Web3 & Crypto',         emoji: '⛓️', category: 'tech',        valueCluster: 'vivid'   },

  // --- Food & Culture --------------------------------------------------------
  { id: 'food-tasting',         label: 'Food Tasting Events',   emoji: '🍽️', category: 'food_culture', valueCluster: 'warm'   },
  { id: 'cocktail-tasting',     label: 'Cocktail & Wine Tasting', emoji: '🍷', category: 'food_culture', valueCluster: 'dark' },
  { id: 'street-food-tours',    label: 'Street Food Tours',     emoji: '🍜', category: 'food_culture', valueCluster: 'warm'   },
  { id: 'pop-up-dining',        label: 'Pop-Up Dining',         emoji: '🌮', category: 'food_culture', valueCluster: 'warm'   },
  { id: 'coffee-culture',       label: 'Coffee Culture',        emoji: '☕', category: 'food_culture', valueCluster: 'natural'},
  { id: 'cultural-festivals',   label: 'Cultural Festivals',    emoji: '🎊', category: 'food_culture', valueCluster: 'warm'   },

  // --- Outdoors & Adventure --------------------------------------------------
  { id: 'trekking',             label: 'Trekking',              emoji: '⛰️', category: 'outdoors',    valueCluster: 'natural' },
  { id: 'camping',              label: 'Camping',               emoji: '🏕️', category: 'outdoors',    valueCluster: 'natural' },
  { id: 'birdwatching',         label: 'Birdwatching',          emoji: '🦅', category: 'outdoors',    valueCluster: 'natural' },
  { id: 'rock-climbing',        label: 'Rock Climbing',         emoji: '🧗', category: 'outdoors',    valueCluster: 'natural' },
  { id: 'water-sports',         label: 'Water Sports',          emoji: '🏄', category: 'outdoors',    valueCluster: 'natural' },
  { id: 'sports-meetups',       label: 'Sports & Cricket',      emoji: '🏏', category: 'outdoors',    valueCluster: 'natural' },
]

// ---------------------------------------------------------------------------
// Explorer Formats (preferred event formats for audience members)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// User Tier Thresholds (Wanderer → Local → Lantern → Beacon)
// ---------------------------------------------------------------------------

export interface LocalThresholds {
  // Rolling 90-day window
  eventsAttendedIn90d: number          // ≥6 (≥2/month avg)
  reviewsPerEventsRatio: number        // ≥1 review per 3 events attended
  maxNoShowRate: number                // <0.15 (15%)
}

export interface LanternThresholds {
  // Rolling 180-day window
  eventsHostedIn180d: number           // ≥3 events hosted
  minAverageRating: number             // ≥4.5★
  maxCancellationRate: number          // <0.05 (5%)
  minOnTimeRate: number                // ≥0.80 (80%) — tracked Phase 2
}

export interface BeaconThresholds {
  // Rolling 365-day window
  eventsHostedIn365d: number           // ≥36 events hosted
  altPaidTickets: number               // OR ≥1,200 paid tickets sold
  minAverageRating: number             // ≥4.7★
  minRepeatAttendanceRate: number      // ≥0.30 (30%)
  minActiveSubscribers: number         // ≥50 active subscribers
  maxCancellationRate: number          // <0.01 (1%)
  // minSubTipRevenuePercent: 0.20     // ≥20% — tracked Phase 2
}

export const TIER_THRESHOLDS: {
  local: LocalThresholds
  lantern: LanternThresholds
  beacon: BeaconThresholds
} = {
  local: {
    eventsAttendedIn90d:      6,
    reviewsPerEventsRatio:    1 / 3,   // 1 review per 3 events
    maxNoShowRate:            0.15,
  },
  lantern: {
    eventsHostedIn180d:       3,
    minAverageRating:         4.5,
    maxCancellationRate:      0.05,
    minOnTimeRate:            0.80,
  },
  beacon: {
    eventsHostedIn365d:       36,
    altPaidTickets:           1200,
    minAverageRating:         4.7,
    minRepeatAttendanceRate:  0.30,
    minActiveSubscribers:     50,
    maxCancellationRate:      0.01,
  },
}

// ---------------------------------------------------------------------------
// Revenue Splits by Maker Tier
// ---------------------------------------------------------------------------

export interface RevenueSplit {
  maker: number     // fraction 0–1
  venue: number     // fraction 0–1
  platform: number  // fraction 0–1
  payoutDays: number
}

export const REVENUE_SPLITS: Record<string, RevenueSplit> = {
  wanderer: { maker: 0.75, venue: 0.15, platform: 0.10, payoutDays: 7 },
  local:    { maker: 0.75, venue: 0.15, platform: 0.10, payoutDays: 7 },
  lantern:  { maker: 0.80, venue: 0.12, platform: 0.08, payoutDays: 3 },
  beacon:   { maker: 0.85, venue: 0.10, platform: 0.05, payoutDays: 1 },
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export interface City {
  id: string
  name: string
  state: string
  emoji: string
}

/**
 * Curated Indian Tier-2 and Tier-3 cities shown during onboarding.
 * Sorted alphabetically within state groups for easy browsing.
 */
export const CITIES: City[] = [
  // --- Gujarat ---------------------------------------------------------------
  { id: 'ahmedabad',        name: 'Ahmedabad',        state: 'Gujarat',           emoji: '🏙️' },
  { id: 'gandhinagar',      name: 'Gandhinagar',      state: 'Gujarat',           emoji: '🌿' },
]
