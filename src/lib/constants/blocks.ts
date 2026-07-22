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

  // ── All blocks accessible to all users ───────────────────────────────────
  newsletter_signup:  'wanderer',
  event_calendar:     'wanderer',
  community_stats:    'wanderer',
  venue_partnership:  'wanderer',
  instagram_post:     'wanderer',
  instagram_embed:    'wanderer',
  spotify_now_playing:'wanderer',
  past_events_gallery:'wanderer',
  testimonial:        'wanderer',

  podcast_episode:    'wanderer',
  substack_preview:   'wanderer',
  event_series:       'wanderer',
  collab_invite:      'wanderer',

  white_label_event:  'wanderer',

  // ── Wave 2 — India-first engagement blocks ────────────────────────────────
  whatsapp_community: 'wanderer',
  music_player:       'wanderer',
  booking_request:    'wanderer',

  // ── Wave 3 — Social proof & embeds ────────────────────────────────────────
  press_feature:  'wanderer',
  twitter_embed:  'wanderer',
  awards_badges:  'wanderer',

  // ── Wave 4 — Direct monetisation blocks ───────────────────────────────────
  digital_product: 'wanderer',
  waitlist:        'wanderer',
  fan_membership:  'wanderer',
  shop_the_look:   'wanderer',
  instagram_feed:  'wanderer',
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

  // Wave 2
  whatsapp_community: 'community',
  music_player:       'content',
  booking_request:    'community',

  // Wave 3
  press_feature: 'community',
  twitter_embed: 'social',
  awards_badges: 'community',

  // Wave 4
  digital_product: 'community',
  waitlist:        'community',
  fan_membership:  'community',
  shop_the_look:   'community',
  instagram_feed:  'social',
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
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  instagram_post: {
    displayName:  'Instagram Post',
    description:  'Embed an Instagram post with live preview',
    icon:         'Instagram',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  spotify_now_playing: {
    displayName:  'Spotify Now Playing',
    description:  "Show what you're currently listening to on Spotify",
    icon:         'Music',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
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
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  past_events_gallery: {
    displayName:  'Past Events Gallery',
    description:  'Grid or list showcase of your completed events',
    icon:         'Images',
    family:       'events',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  event_series: {
    displayName:  'Event Series',
    description:  'Group recurring events under a named series',
    icon:         'CalendarRange',
    family:       'events',
    minimumTier:  'wanderer',
    isPremium:    false,
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
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  podcast_episode: {
    displayName:  'Podcast Episode',
    description:  'Embed or link a podcast episode from any platform',
    icon:         'Mic',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  substack_preview: {
    displayName:  'Substack Preview',
    description:  'Show your latest Substack posts with a subscribe button',
    icon:         'Mail',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
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
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  community_stats: {
    displayName:  'Community Stats',
    description:  'Show your community impact: events hosted, attendees, rating',
    icon:         'TrendingUp',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  venue_partnership: {
    displayName:  'Venue Partnerships',
    description:  'Showcase your Venue venue partners',
    icon:         'Building2',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  collab_invite: {
    displayName:  'Collab Invite',
    description:  'Open invitation for creative collaborations and partnerships',
    icon:         'Users',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  white_label_event: {
    displayName:  'White Label Event',
    description:  'Host events under a partner or sponsor brand',
    icon:         'Star',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },

  // ── Wave 2 — India-first engagement blocks ─────────────────────────────────
  whatsapp_community: {
    displayName:  'WhatsApp Community',
    description:  'Green CTA card to invite visitors into your WhatsApp group',
    icon:         'MessageCircle',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  music_player: {
    displayName:  'Music Player',
    description:  'Embed a SoundCloud or Bandcamp track directly on your page',
    icon:         'Music2',
    family:       'content',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  booking_request: {
    displayName:  'Booking Request',
    description:  '"Book me for your event" form — collect corporate and private inquiries',
    icon:         'CalendarCheck',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },

  // ── Wave 3 — Social proof & embeds ─────────────────────────────────────────
  press_feature: {
    displayName:  'Press Feature',
    description:  '"As seen in" media logo row — show where you\'ve been featured',
    icon:         'Newspaper',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  twitter_embed: {
    displayName:  'X / Twitter Post',
    description:  'Embed a tweet or X post link on your page',
    icon:         'Twitter',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  awards_badges: {
    displayName:  'Awards & Badges',
    description:  'Showcase certifications, awards, or "Featured by" badges as a pill grid',
    icon:         'Award',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },

  // ── Wave 4 — Direct monetisation blocks ────────────────────────────────────
  digital_product: {
    displayName:  'Digital Product',
    description:  'Sell a download (music pack, PDF, template) directly from your page',
    icon:         'Download',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  waitlist: {
    displayName:  'Waitlist',
    description:  'Collect email sign-ups for sold-out or upcoming events',
    icon:         'ListOrdered',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  fan_membership: {
    displayName:  'Fan Membership',
    description:  'Showcase your fan membership tiers and their benefits',
    icon:         'Crown',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  shop_the_look: {
    displayName:  'Shop the Look',
    description:  'Tag products in a photo — link out or sell directly from your page',
    icon:         'ShoppingBag',
    family:       'community',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
  instagram_feed: {
    displayName:  'Instagram Feed',
    description:  'Show your recent Instagram posts automatically — connect your account once',
    icon:         'Instagram',
    family:       'social',
    minimumTier:  'wanderer',
    isPremium:    false,
  },
}

// ---------------------------------------------------------------------------
// Persona-specific block sets
// Controls which block types appear in the picker for each persona.
// ---------------------------------------------------------------------------

export type PersonaKey = 'creator' | 'brand' | 'venue' | 'explorer'

export const PERSONA_BLOCK_SETS: Record<PersonaKey, BlockType[]> = {
  creator: [
    'text_bio', 'social_link', 'social_links_row', 'creator_type_badge', 'city_community',
    'announcement', 'event_listing', 'rsvp_link', 'youtube_embed', 'image_gallery',
    'custom_link', 'support_tip', 'quote_block', 'marquee_text', 'stats_grid',
    'newsletter_signup', 'event_calendar', 'community_stats', 'venue_partnership',
    'instagram_post', 'instagram_embed', 'spotify_now_playing', 'past_events_gallery',
    'testimonial', 'podcast_episode', 'substack_preview', 'event_series', 'collab_invite',
    'white_label_event', 'whatsapp_community', 'music_player', 'booking_request',
    'press_feature', 'twitter_embed', 'awards_badges', 'digital_product', 'waitlist',
    'fan_membership', 'shop_the_look', 'instagram_feed',
  ],
  brand: [
    'announcement', 'marquee_text', 'stats_grid', 'image_gallery', 'text_bio',
    'custom_link', 'social_links_row', 'event_listing', 'press_feature', 'collab_invite',
    'white_label_event', 'community_stats', 'testimonial', 'quote_block', 'youtube_embed',
    'instagram_embed', 'newsletter_signup', 'whatsapp_community', 'awards_badges',
  ],
  venue: [
    'image_gallery', 'text_bio', 'announcement', 'booking_request', 'testimonial',
    'stats_grid', 'community_stats', 'event_listing', 'custom_link', 'whatsapp_community',
    'social_links_row', 'quote_block', 'marquee_text', 'rsvp_link', 'youtube_embed',
    'press_feature', 'instagram_embed', 'newsletter_signup',
  ],
  explorer: [
    'text_bio', 'image_gallery', 'social_links_row', 'custom_link',
    'quote_block', 'stats_grid', 'instagram_embed',
  ],
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

