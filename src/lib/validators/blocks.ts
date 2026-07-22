// =============================================================================
// WIMC — Block Config Validators
// Zod schemas for every block type's `config` JSONB field.
// Used in Server Actions before writing to page_blocks.config.
// =============================================================================

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Belt-and-suspenders on top of Zod's .url() — rejects javascript: and
// other non-HTTP schemes even if a future Zod version loosens validation.
const httpsUrl = (optional = false) => {
  const base = z.string().url().refine(
    (u) => /^https?:\/\//i.test(u),
    { message: 'URL must start with http:// or https://' },
  )
  return optional ? base.optional().or(z.literal('')) : base
}

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const SocialPlatformSchema = z.enum([
  'instagram', 'youtube', 'twitter', 'linkedin', 'whatsapp',
  'spotify', 'apple_music', 'youtube_music', 'substack', 'patreon', 'pinterest', 'threads', 'website',
])

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>

const CreatorTypeSchema = z.enum([
  'music_performance',
  'comedy_open_mic',
  'art_design',
  'workshops_teaching',
  'food_lifestyle',
  'content_creation',
])

// ---------------------------------------------------------------------------
// IDENTITY FAMILY
// ---------------------------------------------------------------------------

/**
 * creator_type_badge — shows the creator's category with a styled badge.
 */
export const CreatorTypeBadgeConfigSchema = z.object({
  creator_type:         CreatorTypeSchema,
  custom_label:         z.string().max(50).optional(),
  show_link_to_city_feed: z.boolean().default(true),
})

export type CreatorTypeBadgeConfig = z.infer<typeof CreatorTypeBadgeConfigSchema>

/**
 * city_community — links to the creator's city WIMC feed.
 */
export const CityCommunityConfigSchema = z.object({
  city:                 z.string().min(1, 'City is required'),
  neighbourhood:        z.string().max(100).optional(),
  show_city_feed_link:  z.boolean().default(true),
})

export type CityCommunityConfig = z.infer<typeof CityCommunityConfigSchema>

/**
 * announcement — prominent banner for events, news, or countdowns.
 */
export const AnnouncementConfigSchema = z.object({
  text:             z.string().min(1).max(120, 'Announcement text must be ≤ 120 characters'),
  cta_label:        z.string().max(30).optional(),
  cta_url:          httpsUrl(true),
  show_countdown:   z.boolean().default(false),
  countdown_target: z.string().datetime({ offset: true }).optional(),
  // ISO 8601 timestamp with timezone, e.g. "2025-06-15T19:00:00+05:30"
  background_style: z.enum(['primary', 'dark', 'accent']).default('primary'),
})

export type AnnouncementConfig = z.infer<typeof AnnouncementConfigSchema>

// ---------------------------------------------------------------------------
// SOCIAL FAMILY
// ---------------------------------------------------------------------------

/**
 * social_link — single social platform link (legacy, pre-008).
 */
export const SocialLinkConfigSchema = z.object({
  url:      httpsUrl(),
  title:    z.string().min(1).max(60),
  platform: SocialPlatformSchema.optional(),
  icon_url: httpsUrl(true),
})

export type SocialLinkConfigV = z.infer<typeof SocialLinkConfigSchema>

/**
 * social_links_row — up to 8 social links shown in a compact row.
 * Additional links are hidden behind a "more" affordance.
 */
export const SocialLinksRowConfigSchema = z.object({
  links: z
    .array(
      z.object({
        platform: SocialPlatformSchema,
        url:      httpsUrl(),
        label:    z.string().max(30).optional(),
      }),
    )
    .min(1, 'Add at least one link')
    .max(12, 'Maximum 12 links'),
})

export type SocialLinksRowConfig = z.infer<typeof SocialLinksRowConfigSchema>

/**
 * spotify_now_playing — live "now playing" widget with a fallback track.
 */
export const SpotifyNowPlayingConfigSchema = z.object({
  spotify_user_id:       z.string().min(1, 'Spotify user ID is required'),
  fallback_track_url:    httpsUrl(true),
  fallback_track_title:  z.string().max(100).optional(),
  fallback_track_artist: z.string().max(100).optional(),
})

export type SpotifyNowPlayingConfig = z.infer<typeof SpotifyNowPlayingConfigSchema>

/**
 * newsletter_signup — email collection with customisable copy.
 */
export const NewsletterSignupConfigSchema = z.object({
  label:           z.string().min(1).max(60, 'Label must be ≤ 60 characters'),
  placeholder:     z.string().min(1).max(60).default('your@email.com'),
  button_label:    z.string().min(1).max(25, 'Button label must be ≤ 25 characters'),
  success_message: z.string().min(1).max(80, 'Success message must be ≤ 80 characters'),
})

export type NewsletterSignupConfig = z.infer<typeof NewsletterSignupConfigSchema>

// ---------------------------------------------------------------------------
// EVENTS FAMILY
// ---------------------------------------------------------------------------

/**
 * event_calendar — calendar view of upcoming events.
 */
export const EventCalendarConfigSchema = z.object({
  show_past_events: z.boolean().default(false),
  months_ahead:     z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
})

export type EventCalendarConfig = z.infer<typeof EventCalendarConfigSchema>

/**
 * event_series — groups recurring events under a named series.
 */
export const EventSeriesConfigSchema = z.object({
  series_name:      z.string().min(1).max(60, 'Series name must be ≤ 60 characters'),
  description:      z.string().max(200).optional(),
  frequency:        z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'irregular']),
  episode_count:    z.number().int().min(1),
  cover_image_url:  httpsUrl(true),
  linked_event_ids: z
    .array(z.string().uuid())
    .max(12, 'Maximum 12 events per series'),
})

export type EventSeriesConfig = z.infer<typeof EventSeriesConfigSchema>

/**
 * past_events_gallery — grid or list of completed events.
 */
export const PastEventsGalleryConfigSchema = z.object({
  layout:              z.enum(['grid', 'list']).default('grid'),
  show_attendee_count: z.boolean().default(true),
  show_recap:          z.boolean().default(false),
  max_events:          z.number().int().min(4).max(20).default(6),
})

export type PastEventsGalleryConfig = z.infer<typeof PastEventsGalleryConfigSchema>

/**
 * rsvp_link — external event registration link.
 */
export const RsvpLinkConfigSchema = z.object({
  url:         httpsUrl(),
  label:       z.string().min(1).max(60, 'Label must be ≤ 60 characters'),
  description: z.string().max(100).optional(),
  icon_emoji:  z.string().max(4).optional(),
  platform:    z.enum(['townscript', 'luma', 'google_forms', 'other']).optional(),
})

export type RsvpLinkConfig = z.infer<typeof RsvpLinkConfigSchema>

// ---------------------------------------------------------------------------
// CONTENT FAMILY (legacy + new)
// ---------------------------------------------------------------------------

/**
 * text_bio — markdown or plain-text bio.
 */
export const TextBioConfigSchema = z.object({
  body: z.string().max(2000, 'Bio must be ≤ 2000 characters'),
})

export type TextBioConfigV = z.infer<typeof TextBioConfigSchema>

/**
 * youtube_embed — embed a YouTube video by ID.
 */
export const YoutubeEmbedConfigSchema = z.object({
  video_id: z.string().min(1, 'Video ID is required').max(20),
  title:    z.string().max(200).optional(),
})

export type YoutubeEmbedConfigV = z.infer<typeof YoutubeEmbedConfigSchema>

/**
 * instagram_embed (legacy) / instagram_post — embed an Instagram post.
 */
export const InstagramEmbedConfigSchema = z.object({
  post_url: z.string().url().refine(
    (u) => /^https?:\/\//i.test(u),
    { message: 'URL must start with http:// or https://' },
  ).refine(
    (url) => url.includes('instagram.com'),
    { message: 'Must be an instagram.com URL' },
  ),
})

export type InstagramEmbedConfigV = z.infer<typeof InstagramEmbedConfigSchema>

/**
 * instagram_feed — no per-instance config; entirely derived from the
 * creator's profile-level Instagram Connect state.
 */
export const InstagramFeedConfigSchema = z.object({})

export type InstagramFeedConfigV = z.infer<typeof InstagramFeedConfigSchema>

/**
 * image_gallery — grid or carousel of images.
 */
export const ImageGalleryConfigSchema = z.object({
  images: z.array(
    z.object({
      url:     httpsUrl(),
      caption: z.string().max(150).optional(),
    }),
  ).max(20, 'Maximum 20 images'),
  layout: z.enum(['grid', 'carousel']).default('grid'),
})

export type ImageGalleryConfigV = z.infer<typeof ImageGalleryConfigSchema>

/**
 * custom_link — rich link card with title, thumbnail, and CTA label.
 */
export const CustomLinkConfigSchema = z.object({
  url:           httpsUrl(),
  title:         z.string().min(1).max(100),
  description:   z.string().max(200).optional(),
  thumbnail_url: httpsUrl(true),
  cta_label:     z.string().max(30).optional(),
})

export type CustomLinkConfigV = z.infer<typeof CustomLinkConfigSchema>

/**
 * quote_block — styled pull quote.
 */
export const QuoteBlockConfigSchema = z.object({
  text:   z.string().min(1).max(300),
  author: z.string().max(80).optional(),
})

export type QuoteBlockConfigV = z.infer<typeof QuoteBlockConfigSchema>

/**
 * marquee_text — scrolling text banner.
 */
export const MarqueeTextConfigSchema = z.object({
  text:  z.string().min(1).max(200),
  speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
  bg:    z.enum(['primary', 'ink', 'chalk']).default('primary'),
})

export type MarqueeTextConfigV = z.infer<typeof MarqueeTextConfigSchema>

/**
 * stats_grid — key numbers displayed in a grid.
 */
export const StatsGridConfigSchema = z.object({
  stats: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .min(1, 'Add at least one stat')
    .max(6, 'Maximum 6 stats'),
})

export type StatsGridConfigV = z.infer<typeof StatsGridConfigSchema>

/**
 * podcast_episode — embed or link a podcast episode.
 */
export const PodcastEpisodeConfigSchema = z.object({
  platform:         z.enum(['spotify', 'apple_podcasts', 'anchor', 'direct']),
  episode_url:      httpsUrl(),
  episode_title:    z.string().max(200).optional(),
  episode_duration: z.string().max(20).optional(),   // e.g. "45:30"
  artwork_url:      httpsUrl(true),
  description:      z.string().max(500).optional(),
})

export type PodcastEpisodeConfig = z.infer<typeof PodcastEpisodeConfigSchema>

/**
 * substack_preview — shows recent posts from a Substack publication.
 */
export const SubstackPreviewConfigSchema = z.object({
  publication_url:      z
    .string()
    .min(1, 'Publication URL is required')
    .refine(
      (v) => {
        const clean = v.replace(/^https?:\/\//, '')
        return clean.includes('substack.com') || /^[a-z0-9-]+\.substack\.com/.test(clean)
      },
      { message: 'Must be a Substack publication URL (e.g. priya.substack.com)' },
    ),
  posts_count:          z.union([z.literal(2), z.literal(3)]).default(3),
  show_subscribe_button: z.boolean().default(true),
})

export type SubstackPreviewConfig = z.infer<typeof SubstackPreviewConfigSchema>

// ---------------------------------------------------------------------------
// COMMUNITY FAMILY
// ---------------------------------------------------------------------------

const TestimonialItemSchema = z.object({
  id:            z.string().uuid(),
  attendee_name: z.string().min(1).max(50),
  event_name:    z.string().min(1).max(100),
  event_date:    z.string(),
  text:          z.string().min(1).max(200, 'Testimonial must be ≤ 200 characters'),
  is_verified:   z.boolean().default(false),
  rsvp_id:       z.string().uuid().optional(),
})

/**
 * testimonial — carousel or stack of attendee reviews.
 */
export const TestimonialConfigSchema = z.object({
  testimonials:  z.array(TestimonialItemSchema).min(1).max(10),
  display_style: z.enum(['carousel', 'stack']).default('carousel'),
})

export type TestimonialConfig = z.infer<typeof TestimonialConfigSchema>

/**
 * community_stats — shows aggregated community impact numbers.
 */
export const CommunityStatsConfigSchema = z.object({
  show_events_hosted:   z.boolean().default(true),
  show_total_attendees: z.boolean().default(true),
  show_average_rating:  z.boolean().default(true),
  custom_label:         z.string().max(60).optional(),
})

export type CommunityStatsConfig = z.infer<typeof CommunityStatsConfigSchema>

/**
 * venue_partnership — showcases Venue partners (up to 3).
 */
export const VenuePartnershipConfigSchema = z.object({
  venue_ids:     z
    .array(z.string().uuid())
    .min(1, 'Select at least one venue')
    .max(3, 'Maximum 3 venues'),
  display_style: z.enum(['cards', 'row']).default('cards'),
})

export type VenuePartnershipConfig = z.infer<typeof VenuePartnershipConfigSchema>

/**
 * support_tip — UPI tip jar. The UPI VPA is encrypted on the server before
 * writing to the database; the schema accepts the plaintext value for validation.
 *
 * NOTE: Never store the plaintext `upi_vpa` in the database config.
 *       The server action must call encrypt_upi_vpa() and store `upi_vpa_encrypted` instead.
 */
export const SupportTipConfigSchema = z.object({
  message:              z.string().min(1).max(120, 'Message must be ≤ 120 characters'),
  upi_vpa:             z
    .string()
    .min(1, 'UPI VPA is required')
    .regex(
      /^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/,
      'Invalid UPI VPA format (e.g. creator@upi)',
    ),
  preset_amounts_paise: z
    .array(z.number().int().positive())
    .min(1, 'Add at least one preset amount')
    .max(5, 'Maximum 5 preset amounts'),
  thank_you_message:   z.string().min(1).max(80, 'Thank you message must be ≤ 80 characters'),
})

export type SupportTipConfigInput = z.infer<typeof SupportTipConfigSchema>

/**
 * The shape stored in the database (upi_vpa replaced with encrypted value).
 */
export interface SupportTipConfigStored {
  message:              string
  upi_vpa_encrypted:    string   // base64 pgp_sym_encrypt output
  preset_amounts_paise: number[]
  thank_you_message:    string
}

/**
 * collab_invite — open invitation for creative collaborations.
 */
export const CollabInviteConfigSchema = z.object({
  collab_types:      z
    .array(z.enum(['co_host', 'workshop_partner', 'venue_takeover', 'brand_collab']))
    .min(1, 'Select at least one collaboration type'),
  availability_note: z.string().max(150, 'Availability note must be ≤ 150 characters'),
  message:           z.string().min(1).max(200, 'Message must be ≤ 200 characters'),
})

export type CollabInviteConfig = z.infer<typeof CollabInviteConfigSchema>

/**
 * white_label_event — host an event under a partner brand (Maidan only).
 */
export const WhiteLabelEventConfigSchema = z.object({
  partner_name:      z.string().min(1).max(100),
  partner_logo_url:  httpsUrl(true),
  event_title:       z.string().min(1).max(150),
  event_description: z.string().max(500).optional(),
  event_date:        z.string().datetime({ offset: true }).optional(),
  ticket_url:        httpsUrl(true),
})

export type WhiteLabelEventConfig = z.infer<typeof WhiteLabelEventConfigSchema>

// ---------------------------------------------------------------------------
// Union — one schema per BlockType
// ---------------------------------------------------------------------------

import type { BlockType } from '@/types/database'

export const BLOCK_CONFIG_SCHEMAS: Partial<Record<BlockType, z.ZodTypeAny>> = {
  // Identity
  creator_type_badge:  CreatorTypeBadgeConfigSchema,
  city_community:      CityCommunityConfigSchema,
  announcement:        AnnouncementConfigSchema,
  // Social
  social_link:         SocialLinkConfigSchema,
  social_links_row:    SocialLinksRowConfigSchema,
  youtube_embed:       YoutubeEmbedConfigSchema,
  instagram_embed:     InstagramEmbedConfigSchema,
  instagram_post:      InstagramEmbedConfigSchema,
  instagram_feed:      InstagramFeedConfigSchema,
  spotify_now_playing: SpotifyNowPlayingConfigSchema,
  newsletter_signup:   NewsletterSignupConfigSchema,
  // Events
  event_listing:       z.object({ event_ids: z.array(z.string().uuid()).optional(), max_items: z.number().int().min(1).max(20).optional() }),
  event_calendar:      EventCalendarConfigSchema,
  event_series:        EventSeriesConfigSchema,
  past_events_gallery: PastEventsGalleryConfigSchema,
  rsvp_link:           RsvpLinkConfigSchema,
  // Content
  text_bio:            TextBioConfigSchema,
  image_gallery:       ImageGalleryConfigSchema,
  custom_link:         CustomLinkConfigSchema,
  quote_block:         QuoteBlockConfigSchema,
  marquee_text:        MarqueeTextConfigSchema,
  stats_grid:          StatsGridConfigSchema,
  podcast_episode:     PodcastEpisodeConfigSchema,
  substack_preview:    SubstackPreviewConfigSchema,
  // Community
  testimonial:         TestimonialConfigSchema,
  community_stats:     CommunityStatsConfigSchema,
  venue_partnership:   VenuePartnershipConfigSchema,
  support_tip:         SupportTipConfigSchema,
  collab_invite:       CollabInviteConfigSchema,
  white_label_event:   WhiteLabelEventConfigSchema,
}

/**
 * Validates a block config object against the schema for its block type.
 * Returns `{ success: true, data }` or `{ success: false, error: string }`.
 */
export function validateBlockConfig(
  blockType: BlockType,
  config: unknown,
): { success: true; data: unknown } | { success: false; error: string } {
  const schema = BLOCK_CONFIG_SCHEMAS[blockType]
  if (!schema) {
    // Unknown block type — pass through without validation.
    return { success: true, data: config }
  }

  const result = schema.safeParse(config)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  return { success: true, data: result.data }
}

// ---------------------------------------------------------------------------
// Substack post shape (returned by getSubstackPosts action)
// ---------------------------------------------------------------------------

export interface SubstackPost {
  title:   string
  url:     string
  date:    string
  excerpt: string
}
