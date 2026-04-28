// =============================================================================
// WIMC — Block Taxonomy Constants
// Tier gates, family assignments, and display metadata for every block type.
// =============================================================================

import type { BlockType, BlockFamily, UserTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Block meta entry shape
// ---------------------------------------------------------------------------

export interface BlockMetaEntry {
  /** Human-readable name shown in the block picker. */
  displayName: string
  /** One-line description shown under the name in the picker. */
  description: string
  /** Lucide icon component name (import from 'lucide-react'). */
  icon: string
  /** Which family this block belongs to. */
  family: BlockFamily
  /** Minimum maker tier required to add this block. */
  minimumTier: UserTier
  /** True for all Local+ blocks — used to show lock state in the picker. */
  isPremium: boolean
}

// ---------------------------------------------------------------------------
// BLOCK_TIER_GATES
// Maps every BlockType to the minimum UserTier required to add it.
// Enforced server-side in validateBlockTierAccess.
// ---------------------------------------------------------------------------

export const BLOCK_TIER_GATES: Record<BlockType, UserTier> = {
  // ── Wanderer — available to all users ────────────────────────────────────
  text_bio:           'wanderer',
  social_link:        'wanderer',
  social_links_row:   'wanderer',
  creator_type_badge: 'wanderer',
  city_community:     'wanderer',
  announcement:       'wanderer',
  event_listing:      'wanderer',
  rsvp_link:          'wanderer',
  youtube_embed:      'wanderer',
  image_gallery:      'wanderer',
  custom_link:        'wanderer',
  support_tip:        'wanderer',
  quote_block:        'wanderer',
  marquee_text:       'wanderer',
  stats_grid:         'wanderer',

  // ── Local — 6+ events attended in 90d ────────────────────────────────────
  newsletter_signup:  'local',
  event_calendar:     'local',
  community_stats:    'local',
  venue_partnership:  'local',
  instagram_post:     'local',
  instagram_embed:    'local',    // legacy block — same gate as instagram_post
  spotify_now_playing:'local',
  past_events_gallery:'local',
  testimonial:        'local',

  // ── Lantern — 3+ events hosted in 180d ───────────────────────────────────
  podcast_episode:    'lantern',
  substack_preview:   'lantern',
  event_series:       'lantern',
  collab_invite:      'lantern',

  // ── Beacon — 36+ events/yr, ≥4.7★, ≥30% repeat ─────────────────────────
  white_label_event:  'beacon',
}

// ---------------------------------------------------------------------------
// BLOCK_FAMILIES
// Maps every BlockType to its display family.
// ---------------------------------------------------------------------------

export const BLOCK_FAMILIES: Record<BlockType, BlockFamily> = {
  // Identity
  creator_type_badge: 'identity',
  city_community:     'identity',
  announcement:       'identity',
  marquee_text:       'identity',

  // Social
  social_link:        'social',
  social_links_row:   'social',
  youtube_embed:      'social',
  instagram_embed:    'social',
  instagram_post:     'social',
  spotify_now_playing:'social',

  // Events
  event_listing:      'events',
  event_calendar:     'events',
  event_series:       'events',
  past_events_gallery:'events',
  rsvp_link:          'events',

  // Content
  text_bio:           'content',
  image_gallery:      'content',
  custom_link:        'content',
  quote_block:        'content',
  stats_grid:         'content',
  newsletter_signup:  'content',
  podcast_episode:    'content',
  substack_preview:   'content',

  // Community
  testimonial:        'community',
  community_stats:    'community',
  venue_partnership:  'community',
  support_tip:        'community',
  collab_invite:      'community',
  white_label_event:  'community',
}

// ---------------------------------------------------------------------------
// BLOCK_META
// Full display metadata for every block type — used in the dashboard picker.
// ---------------------------------------------------------------------------

export const BLOCK_META: Record<BlockType, BlockMetaEntry> = {
  // ── Identity ───────────────────────────────────────────────────────────────
  creator_type_badge: {
    displayName:  'Creator Badge',
    description:  'Show your creator category with a styled badge',
    icon:         'BadgeCheck',
    family:       'identity',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  city_community: {
    displayName:  'City Community',
    description:  "Link visitors to your city's WIMC community feed",
    icon:         'MapPin',
    family:       'identity',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  announcement: {
    displayName:  'Announcement',
    description:  'Prominent banner for upcoming events, news, or countdowns',
    icon:         'Megaphone',
    family:       'identity',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  marquee_text: {
    displayName:  'Marquee Text',
    description:  'Eye-catching scrolling text banner',
    icon:         'AlignLeft',
    family:       'identity',
    minimumTier:  'wanderer',
    isPremium:    false,
  },

  // ── Social ─────────────────────────────────────────────────────────────────
  social_link: {
    displayName:  'Social Link',
    description:  'A single social media profile link',
    icon:         'Link',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  social_links_row: {
    displayName:  'Social Links Row',
    description:  'All your social profiles in one compact row',
    icon:         'Share2',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  youtube_embed: {
    displayName:  'YouTube Video',
    description:  'Embed a YouTube video directly on your page',
    icon:         'Youtube',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  instagram_embed: {
    displayName:  'Instagram Embed',
    description:  'Embed an Instagram post',
    icon:         'Instagram',
    family:       'social',
    minimumTier:  'local',
    isPremium:    true,
  },
  instagram_post: {
    displayName:  'Instagram Post',
    description:  'Embed an Instagram post with live preview',
    icon:         'Instagram',
    family:       'social',
    minimumTier:  'local',
    isPremium:    true,
  },
  spotify_now_playing: {
    displayName:  'Spotify Now Playing',
    description:  "Show what you're currently listening to on Spotify",
    icon:         'Music',
    family:       'social',
    minimumTier:  'local',
    isPremium:    true,
  },

  // ── Events ─────────────────────────────────────────────────────────────────
  event_listing: {
    displayName:  'Event Listing',
    description:  'Show your upcoming events on your profile page',
    icon:         'Calendar',
    family:       'events',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  rsvp_link: {
    displayName:  'RSVP Link',
    description:  'Link to an external event registration page',
    icon:         'Ticket',
    family:       'events',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  event_calendar: {
    displayName:  'Event Calendar',
    description:  'Full calendar view of your upcoming events',
    icon:         'CalendarDays',
    family:       'events',
    minimumTier:  'local',
    isPremium:    true,
  },
  past_events_gallery: {
    displayName:  'Past Events Gallery',
    description:  'Grid or list showcase of your completed events',
    icon:         'Images',
    family:       'events',
    minimumTier:  'local',
    isPremium:    true,
  },
  event_series: {
    displayName:  'Event Series',
    description:  'Group recurring events under a named series',
    icon:         'CalendarRange',
    family:       'events',
    minimumTier:  'lantern',
    isPremium:    true,
  },

  // ── Content ────────────────────────────────────────────────────────────────
  text_bio: {
    displayName:  'Bio',
    description:  'Your creator bio in markdown or plain text',
    icon:         'FileText',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  image_gallery: {
    displayName:  'Image Gallery',
    description:  'Grid or carousel of photos',
    icon:         'Image',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  custom_link: {
    displayName:  'Custom Link',
    description:  'Rich link card with title, thumbnail, and call-to-action',
    icon:         'ExternalLink',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  quote_block: {
    displayName:  'Quote',
    description:  'A stylised pull quote or testimonial excerpt',
    icon:         'Quote',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  stats_grid: {
    displayName:  'Stats Grid',
    description:  'Key numbers displayed in a visual grid',
    icon:         'BarChart2',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  newsletter_signup: {
    displayName:  'Newsletter Signup',
    description:  'Collect email subscribers directly from your page',
    icon:         'MailPlus',
    family:       'content',
    minimumTier:  'local',
    isPremium:    true,
  },
  podcast_episode: {
    displayName:  'Podcast Episode',
    description:  'Embed or link a podcast episode from any platform',
    icon:         'Mic',
    family:       'content',
    minimumTier:  'lantern',
    isPremium:    true,
  },
  substack_preview: {
    displayName:  'Substack Preview',
    description:  'Show your latest Substack posts with a subscribe button',
    icon:         'Mail',
    family:       'content',
    minimumTier:  'lantern',
    isPremium:    true,
  },

  // ── Community ──────────────────────────────────────────────────────────────
  support_tip: {
    displayName:  'Support / Tip',
    description:  'Let your community support you with a UPI tip jar',
    icon:         'Heart',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  testimonial: {
    displayName:  'Testimonials',
    description:  'Display verified attendee reviews in a carousel or stack',
    icon:         'MessageSquare',
    family:       'community',
    minimumTier:  'local',
    isPremium:    true,
  },
  community_stats: {
    displayName:  'Community Stats',
    description:  'Show your community impact: events hosted, attendees, rating',
    icon:         'TrendingUp',
    family:       'community',
    minimumTier:  'local',
    isPremium:    true,
  },
  venue_partnership: {
    displayName:  'Venue Partnerships',
    description:  'Showcase your Adda venue partners',
    icon:         'Building2',
    family:       'community',
    minimumTier:  'local',
    isPremium:    true,
  },
  collab_invite: {
    displayName:  'Collab Invite',
    description:  'Open invitation for creative collaborations and partnerships',
    icon:         'Users',
    family:       'community',
    minimumTier:  'lantern',
    isPremium:    true,
  },
  white_label_event: {
    displayName:  'White Label Event',
    description:  'Host events under a partner or sponsor brand',
    icon:         'Star',
    family:       'community',
    minimumTier:  'beacon',
    isPremium:    true,
  },
}

// ---------------------------------------------------------------------------
// Tier ordering helper
// ---------------------------------------------------------------------------

export const TIER_ORDER: Record<UserTier, number> = {
  wanderer: 0,
  local:    1,
  lantern:  2,
  beacon:   3,
}

/**
 * Returns true if `currentTier` meets the `requiredTier` threshold.
 *
 * @example
 * meetsMinimumTier('local', 'local') // true
 * meetsMinimumTier('wanderer', 'local') // false
 */
export function meetsMinimumTier(currentTier: UserTier, requiredTier: UserTier): boolean {
  return TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier]
}

// ---------------------------------------------------------------------------
// Block picker grouping helpers
// ---------------------------------------------------------------------------

/** Returns all blocks belonging to a given family, sorted by tier then name. */
export function getBlocksByFamily(family: BlockFamily): BlockMetaEntry[] {
  return (Object.entries(BLOCK_META) as [BlockType, BlockMetaEntry][])
    .filter(([, meta]) => meta.family === family)
    .sort((a, b) => {
      const tierDiff = TIER_ORDER[a[1].minimumTier] - TIER_ORDER[b[1].minimumTier]
      return tierDiff !== 0 ? tierDiff : a[1].displayName.localeCompare(b[1].displayName)
    })
    .map(([, meta]) => meta)
}

/** All families in display order. */
export const BLOCK_FAMILY_ORDER: BlockFamily[] = [
  'identity',
  'social',
  'events',
  'content',
  'community',
]
