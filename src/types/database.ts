// =============================================================================
// WIMC — Supabase Database Types
// Auto-maintained by hand; regenerate with:
//   npx supabase gen types typescript --local > src/types/database.ts
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = 'maker' | 'explorer'

export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export type UserTier = 'wanderer' | 'local' | 'lantern' | 'beacon'
/** @deprecated Use UserTier */
export type MakerTier = UserTier
export type AddaTier  = 'open' | 'verified' | 'beloved' | 'legendary'

export type PricingModel = 'fixed_rental' | 'door_split' | 'hybrid' | 'f_and_b_minimum'

export type ProposalStatus = 'pending' | 'counter_offered' | 'accepted' | 'declined' | 'expired' | 'withdrawn'

export type AvailabilitySlotType = 'morning' | 'afternoon' | 'evening' | 'full_day'

export type AvailabilityStatus = 'available' | 'blocked' | 'pending' | 'confirmed'

export type ConnectionStatus = 'pending' | 'accepted' | 'declined'

export type CreatorType =
  // Legacy values (pre-v2 onboarding) — kept for existing profiles
  | 'music_performance'
  | 'comedy_open_mic'
  | 'art_design'
  | 'workshops_teaching'
  | 'food_lifestyle'
  | 'content_creation'
  // v2 categories
  | 'music'
  | 'comedy_theatre'
  | 'video_content'
  | 'teaching_coaching'
  | 'lifestyle_wellness'
  | 'business_brand'
  | 'professional_portfolio'
  | 'community_impact'
  | 'exploring'

export type BlockFamily = 'identity' | 'social' | 'events' | 'content' | 'community'

export type BlockType =
  // ── Legacy (pre-008) ───────────────────────────────────────────────────────
  | 'social_link'
  | 'youtube_embed'
  | 'instagram_embed'
  | 'text_bio'
  | 'image_gallery'
  | 'event_listing'
  | 'custom_link'
  | 'quote_block'
  | 'marquee_text'
  | 'stats_grid'
  // ── Identity family ────────────────────────────────────────────────────────
  | 'creator_type_badge'
  | 'city_community'
  | 'announcement'
  // ── Social family ──────────────────────────────────────────────────────────
  | 'social_links_row'
  | 'instagram_post'
  | 'spotify_now_playing'
  // ── Events family ──────────────────────────────────────────────────────────
  | 'event_calendar'
  | 'event_series'
  | 'past_events_gallery'
  | 'rsvp_link'
  // ── Content family ─────────────────────────────────────────────────────────
  | 'podcast_episode'
  | 'substack_preview'
  | 'newsletter_signup'
  // ── Community family ───────────────────────────────────────────────────────
  | 'testimonial'
  | 'community_stats'
  | 'venue_partnership'
  | 'support_tip'
  | 'collab_invite'
  | 'white_label_event'

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded' | 'refund_failed'

// ---------------------------------------------------------------------------
// Page-theme shape (stored as jsonb in user_profiles.page_theme)
// ---------------------------------------------------------------------------

export interface PageTheme {
  color_primary?: string   // hex e.g. "#FF5A5F"
  color_bg?: string        // hex or CSS colour
  font_family?: string     // e.g. "Inter" | "Playfair Display"
  background_type?: 'solid' | 'gradient' | 'image'
  background_image_url?: string
  [key: string]: Json | undefined
}

// ---------------------------------------------------------------------------
// Block config shapes (stored as jsonb in page_blocks.config)
// ---------------------------------------------------------------------------

export type SocialPlatform =
  | 'instagram' | 'youtube' | 'spotify' | 'soundcloud' | 'jiosaavn'
  | 'twitter' | 'x' | 'tiktok' | 'twitch' | 'podcast'
  | 'linkedin' | 'behance' | 'dribbble' | 'github'
  | 'website' | 'whatsapp' | 'googlemaps' | 'zomato' | 'shopify'
  | 'telegram' | 'meetup' | 'substack'
  | 'other'

export interface SocialLinkConfig {
  url: string
  title: string
  platform?: SocialPlatform
  icon_url?: string
}

export interface YoutubeEmbedConfig {
  video_id: string           // 11-char YouTube video ID
  title?: string
}

export interface InstagramEmbedConfig {
  post_url: string           // full instagram.com post URL
}

export interface TextBioConfig {
  body: string               // markdown or plain text
}

export interface ImageGalleryConfig {
  images: Array<{
    url: string
    caption?: string
  }>
  layout?: 'grid' | 'carousel'
}

export interface EventListingConfig {
  event_ids?: string[]       // explicit list; if empty, shows latest creator events
  max_items?: number
}

export interface CustomLinkConfig {
  url: string
  title: string
  description?: string
  thumbnail_url?: string
  cta_label?: string         // e.g. "Book Now", "Learn More"
}

export interface QuoteBlockConfig {
  text: string
  author?: string
}

export interface MarqueeTextConfig {
  text: string
  speed?: 'slow' | 'normal' | 'fast'
  bg?: 'primary' | 'ink' | 'chalk'
}

export interface StatsGridConfig {
  stats: Array<{ value: string; label: string }>
}

export interface TestimonialConfig {
  max_items?:      number   // default 3
  show_event_name?: boolean
}

export type BlockConfig =
  | SocialLinkConfig
  | YoutubeEmbedConfig
  | InstagramEmbedConfig
  | TextBioConfig
  | ImageGalleryConfig
  | EventListingConfig
  | CustomLinkConfig
  | QuoteBlockConfig
  | MarqueeTextConfig
  | StatsGridConfig
  | TestimonialConfig

// ---------------------------------------------------------------------------
// Database interface — mirrors Supabase generated output conventions
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          city: string
          creator_type: CreatorType
          interest_tags: string[]
          phone: string | null
          instagram_handle: string | null
          social_links: Json | null
          is_verified: boolean
          page_theme: Json
          // Marketplace extension (migration 007)
          user_role: UserRole
          user_tier: UserTier
          tier_evaluated_at: string | null
          cumulative_events_hosted: number
          cumulative_unique_attendees: number
          cumulative_gmv_paise: number
          average_event_rating: number
          repeat_attendee_rate: number
          monthly_page_visitors: number
          last_event_hosted_at: string | null
          tier_locked_until: string | null
          is_founding_maker: boolean
          whatsapp_subscriber_count: number
          collab_invite_active: boolean
          collab_invite_config: Json
          // Explorer-side tier metrics (migration 015)
          events_attended_count: number
          events_saved_count: number
          creators_followed_count: number
          reviews_posted_count: number
          rsvps_total_count: number
          no_shows_count: number
          tier_recovery_until: string | null
          // Onboarding v2 (migration 014)
          sub_types: string[]
          offline_activities: string[]
          // Admin flag (migration 012)
          is_admin: boolean
          // Attendance streak (migration 020)
          attendance_streak: number
          streak_freeze_tokens: number
          last_streak_week: string | null   // ISO date "YYYY-MM-DD" of that week's Monday
          // Long-tenure recognition (migration 023)
          lantern_since: string | null
          beacon_since: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string                    // must match auth.users.id
          username: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          city: string
          creator_type: CreatorType
          interest_tags?: string[]
          sub_types?: string[]
          offline_activities?: string[]
          phone?: string | null
          instagram_handle?: string | null
          social_links?: Json
          is_verified?: boolean
          page_theme?: Json
          user_role?: UserRole
          user_tier?: UserTier
          tier_evaluated_at?: string | null
          cumulative_events_hosted?: number
          cumulative_unique_attendees?: number
          cumulative_gmv_paise?: number
          average_event_rating?: number
          repeat_attendee_rate?: number
          monthly_page_visitors?: number
          last_event_hosted_at?: string | null
          tier_locked_until?: string | null
          is_founding_maker?: boolean
          whatsapp_subscriber_count?: number
          collab_invite_active?: boolean
          collab_invite_config?: Json
          events_attended_count?: number
          events_saved_count?: number
          creators_followed_count?: number
          reviews_posted_count?: number
          rsvps_total_count?: number
          no_shows_count?: number
          tier_recovery_until?: string | null
          is_admin?: boolean
          attendance_streak?: number
          streak_freeze_tokens?: number
          last_streak_week?: string | null
          lantern_since?: string | null
          beacon_since?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          city?: string
          creator_type?: CreatorType
          interest_tags?: string[]
          sub_types?: string[]
          offline_activities?: string[]
          phone?: string | null
          instagram_handle?: string | null
          social_links?: Json
          is_verified?: boolean
          page_theme?: Json
          user_role?: UserRole
          user_tier?: UserTier
          tier_evaluated_at?: string | null
          cumulative_events_hosted?: number
          cumulative_unique_attendees?: number
          cumulative_gmv_paise?: number
          average_event_rating?: number
          repeat_attendee_rate?: number
          monthly_page_visitors?: number
          last_event_hosted_at?: string | null
          tier_locked_until?: string | null
          is_founding_maker?: boolean
          whatsapp_subscriber_count?: number
          collab_invite_active?: boolean
          collab_invite_config?: Json
          events_attended_count?: number
          events_saved_count?: number
          creators_followed_count?: number
          reviews_posted_count?: number
          rsvps_total_count?: number
          no_shows_count?: number
          tier_recovery_until?: string | null
          is_admin?: boolean
          attendance_streak?: number
          streak_freeze_tokens?: number
          last_streak_week?: string | null
          lantern_since?: string | null
          beacon_since?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      page_blocks: {
        Row: {
          id: string
          profile_id: string
          block_type: BlockType
          position: number
          is_visible: boolean
          config: Json
          // Extended in migration 008
          block_family: BlockFamily
          minimum_tier: UserTier
          analytics_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          block_type: BlockType
          position: number
          is_visible?: boolean
          config?: Json
          block_family?: BlockFamily
          minimum_tier?: UserTier
          analytics_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          block_type?: BlockType
          position?: number
          is_visible?: boolean
          config?: Json
          block_family?: BlockFamily
          minimum_tier?: UserTier
          analytics_config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'page_blocks_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      events: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          venue_name: string
          venue_address: string
          venue_lat: number | null
          venue_lng: number | null
          starts_at: string
          ends_at: string | null
          ticket_price: number           // paise
          capacity: number | null
          status: EventStatus
          razorpay_event_id: string | null
          whatsapp_group_url: string | null
          google_maps_url: string | null
          slug: string
          /** Linked Adda venue (null for self-organised events). Added in migration 009. */
          venue_adda_id: string | null
          /** Rolling average of Explorer ratings (1–5). Added in migration 009. */
          average_rating: number
          /** Number of Explorer ratings submitted. Added in migration 009. */
          rating_count: number
          /** If set, Wanderers cannot RSVP until this timestamp passes. Added in migration 019. */
          early_access_at: string | null
          /** Patreon-style ticket tiers. NULL = flat ticket_price. Added in migration 022. */
          ticket_tiers: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          venue_name: string
          venue_address: string
          venue_lat?: number | null
          venue_lng?: number | null
          starts_at: string
          ends_at?: string | null
          ticket_price?: number
          capacity?: number | null
          status?: EventStatus
          razorpay_event_id?: string | null
          whatsapp_group_url?: string | null
          google_maps_url?: string | null
          slug: string
          venue_adda_id?: string | null
          average_rating?: number
          rating_count?: number
          early_access_at?: string | null
          ticket_tiers?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          venue_name?: string
          venue_address?: string
          venue_lat?: number | null
          venue_lng?: number | null
          starts_at?: string
          ends_at?: string | null
          ticket_price?: number
          capacity?: number | null
          status?: EventStatus
          razorpay_event_id?: string | null
          whatsapp_group_url?: string | null
          google_maps_url?: string | null
          slug?: string
          venue_adda_id?: string | null
          average_rating?: number
          rating_count?: number
          early_access_at?: string | null
          ticket_tiers?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      rsvps: {
        Row: {
          id: string
          event_id: string
          attendee_name: string
          attendee_phone: string
          attendee_user_id: string | null
          payment_status: PaymentStatus
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          amount_paid: number | null      // paise
          qr_code_token: string
          checked_in: boolean
          checked_in_at: string | null
          platform_fee_paise: number | null
          maker_payout_paise: number | null
          venue_fee_paise: number | null
          split_tier: string | null
          /** Fan tier ID from event.ticket_tiers. NULL for flat-price events. */
          ticket_tier_id: string | null
          ticket_tier_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          attendee_name: string
          attendee_phone: string
          attendee_user_id?: string | null
          payment_status?: PaymentStatus
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount_paid?: number | null
          qr_code_token?: string
          checked_in?: boolean
          checked_in_at?: string | null
          platform_fee_paise?: number | null
          maker_payout_paise?: number | null
          venue_fee_paise?: number | null
          split_tier?: string | null
          ticket_tier_id?: string | null
          ticket_tier_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          attendee_name?: string
          attendee_phone?: string
          attendee_user_id?: string | null
          payment_status?: PaymentStatus
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount_paid?: number | null
          qr_code_token?: string
          checked_in?: boolean
          checked_in_at?: string | null
          platform_fee_paise?: number | null
          maker_payout_paise?: number | null
          venue_fee_paise?: number | null
          split_tier?: string | null
          ticket_tier_id?: string | null
          ticket_tier_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rsvps_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rsvps_attendee_user_id_fkey'
            columns: ['attendee_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      webhook_events: {
        Row: {
          id: string           // x-razorpay-event-id header value
          event_type: string
          processed_at: string
          payload: Json
        }
        Insert: {
          id: string
          event_type: string
          processed_at?: string
          payload?: Json
        }
        Update: {
          id?: string
          event_type?: string
          processed_at?: string
          payload?: Json
        }
        Relationships: []
      }

      link_clicks: {
        Row: {
          id:         string
          block_id:   string
          creator_id: string
          clicked_at: string
          referrer:   string | null
          device:     'mobile' | 'tablet' | 'desktop' | null
        }
        Insert: {
          id?:        string
          block_id:   string
          creator_id: string
          clicked_at?: string
          referrer?:  string | null
          device?:    'mobile' | 'tablet' | 'desktop' | null
        }
        Update: {
          id?:        string
          block_id?:  string
          creator_id?: string
          clicked_at?: string
          referrer?:  string | null
          device?:    'mobile' | 'tablet' | 'desktop' | null
        }
        Relationships: [
          {
            foreignKeyName: 'link_clicks_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'page_blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'link_clicks_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      venue_directory: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          lat: number | null
          lng: number | null
          category: 'cafe' | 'coworking' | 'gallery' | 'community_hall' | 'other' | null
          capacity_min: number | null
          capacity_max: number | null
          photos: string[] | null
          contact_whatsapp: string | null
          google_maps_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          lat?: number | null
          lng?: number | null
          category?: 'cafe' | 'coworking' | 'gallery' | 'community_hall' | 'other' | null
          capacity_min?: number | null
          capacity_max?: number | null
          photos?: string[] | null
          contact_whatsapp?: string | null
          google_maps_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          lat?: number | null
          lng?: number | null
          category?: 'cafe' | 'coworking' | 'gallery' | 'community_hall' | 'other' | null
          capacity_min?: number | null
          capacity_max?: number | null
          photos?: string[] | null
          contact_whatsapp?: string | null
          google_maps_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      // ----- Extended block analytics tables (migration 008) -----

      block_analytics: {
        Row: {
          id: string
          block_id: string
          profile_id: string
          event_type: 'view' | 'click' | 'expand' | 'subscribe' | 'tip_initiated'
          explorer_id: string | null
          referer: string | null
          country: string | null
          city: string | null
          device_type: 'mobile' | 'desktop' | 'tablet' | null
          occurred_at: string
        }
        Insert: {
          id?: string
          block_id: string
          profile_id: string
          event_type: 'view' | 'click' | 'expand' | 'subscribe' | 'tip_initiated'
          explorer_id?: string | null
          referer?: string | null
          country?: string | null
          city?: string | null
          device_type?: 'mobile' | 'desktop' | 'tablet' | null
          occurred_at?: string
        }
        Update: {
          id?: string
          block_id?: string
          profile_id?: string
          event_type?: 'view' | 'click' | 'expand' | 'subscribe' | 'tip_initiated'
          explorer_id?: string | null
          referer?: string | null
          country?: string | null
          city?: string | null
          device_type?: 'mobile' | 'desktop' | 'tablet' | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'block_analytics_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'page_blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'block_analytics_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      maker_subscribers: {
        Row: {
          id: string
          maker_id: string
          email: string
          subscribed_at: string
          is_active: boolean
          source: 'newsletter_block' | 'rsvp_confirmation'
        }
        Insert: {
          id?: string
          maker_id: string
          email: string
          subscribed_at?: string
          is_active?: boolean
          source?: 'newsletter_block' | 'rsvp_confirmation'
        }
        Update: {
          id?: string
          maker_id?: string
          email?: string
          subscribed_at?: string
          is_active?: boolean
          source?: 'newsletter_block' | 'rsvp_confirmation'
        }
        Relationships: [
          {
            foreignKeyName: 'maker_subscribers_maker_id_fkey'
            columns: ['maker_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      substack_cache: {
        Row: {
          id: string
          publication_url: string
          posts: Json   // SubstackPost[]
          cached_at: string
        }
        Insert: {
          id?: string
          publication_url: string
          posts?: Json
          cached_at?: string
        }
        Update: {
          id?: string
          publication_url?: string
          posts?: Json
          cached_at?: string
        }
        Relationships: []
      }

      // ----- Three-sided marketplace tables (migration 007) -----

      adda_profiles: {
        Row: {
          id: string
          auth_user_id: string
          name: string
          slug: string
          description: string | null
          adda_type: string[]
          city: string
          neighbourhood: string | null
          address: string
          lat: number | null
          lng: number | null
          cover_image_url: string | null
          gallery_images: string[]
          capacity_min: number | null
          capacity_max: number | null
          capacity_configurations: Json
          amenities: string[]
          pricing_model: PricingModel
          pricing_config: Json
          contact_whatsapp: string | null
          contact_email: string | null
          instagram_handle: string | null
          is_verified: boolean
          is_active: boolean
          total_events_hosted: number
          total_revenue_earned_paise: number
          average_maker_rating: number
          adda_tier: AddaTier
          trending_until: string | null
          on_time_rate: number
          complaint_rate: number
          repeat_attendee_rate: number
          unique_lantern_beacon_hosts: number
          beloved_since: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          name: string
          slug: string
          description?: string | null
          adda_type?: string[]
          city?: string
          neighbourhood?: string | null
          address: string
          lat?: number | null
          lng?: number | null
          cover_image_url?: string | null
          gallery_images?: string[]
          capacity_min?: number | null
          capacity_max?: number | null
          capacity_configurations?: Json
          amenities?: string[]
          pricing_model?: PricingModel
          pricing_config?: Json
          contact_whatsapp?: string | null
          contact_email?: string | null
          instagram_handle?: string | null
          is_verified?: boolean
          is_active?: boolean
          total_events_hosted?: number
          total_revenue_earned_paise?: number
          average_maker_rating?: number
          adda_tier?: AddaTier
          trending_until?: string | null
          on_time_rate?: number
          complaint_rate?: number
          repeat_attendee_rate?: number
          unique_lantern_beacon_hosts?: number
          beloved_since?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          name?: string
          slug?: string
          description?: string | null
          adda_type?: string[]
          city?: string
          neighbourhood?: string | null
          address?: string
          lat?: number | null
          lng?: number | null
          cover_image_url?: string | null
          gallery_images?: string[]
          capacity_min?: number | null
          capacity_max?: number | null
          capacity_configurations?: Json
          amenities?: string[]
          pricing_model?: PricingModel
          pricing_config?: Json
          contact_whatsapp?: string | null
          contact_email?: string | null
          instagram_handle?: string | null
          is_verified?: boolean
          is_active?: boolean
          total_events_hosted?: number
          total_revenue_earned_paise?: number
          average_maker_rating?: number
          adda_tier?: AddaTier
          trending_until?: string | null
          on_time_rate?: number
          complaint_rate?: number
          repeat_attendee_rate?: number
          unique_lantern_beacon_hosts?: number
          beloved_since?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'adda_profiles_auth_user_id_fkey'
            columns: ['auth_user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      explorer_profiles: {
        Row: {
          id: string
          auth_user_id: string
          display_name: string
          avatar_url: string | null
          city: string
          interest_tags: string[]
          preferred_formats: string[]
          price_range_max_paise: number
          neighbourhood_preference: string | null
          explorer_score: number
          total_events_attended: number
          followed_maker_ids: string[]
          saved_event_ids: string[]
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          display_name: string
          avatar_url?: string | null
          city?: string
          interest_tags?: string[]
          preferred_formats?: string[]
          price_range_max_paise?: number
          neighbourhood_preference?: string | null
          explorer_score?: number
          total_events_attended?: number
          followed_maker_ids?: string[]
          saved_event_ids?: string[]
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          display_name?: string
          avatar_url?: string | null
          city?: string
          interest_tags?: string[]
          preferred_formats?: string[]
          price_range_max_paise?: number
          neighbourhood_preference?: string | null
          explorer_score?: number
          total_events_attended?: number
          followed_maker_ids?: string[]
          saved_event_ids?: string[]
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'explorer_profiles_auth_user_id_fkey'
            columns: ['auth_user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      adda_availability: {
        Row: {
          id: string
          adda_id: string
          date: string
          slot_type: AvailabilitySlotType
          status: AvailabilityStatus
          event_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          adda_id: string
          date: string
          slot_type?: AvailabilitySlotType
          status?: AvailabilityStatus
          event_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          adda_id?: string
          date?: string
          slot_type?: AvailabilitySlotType
          status?: AvailabilityStatus
          event_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'adda_availability_adda_id_fkey'
            columns: ['adda_id']
            isOneToOne: false
            referencedRelation: 'adda_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'adda_availability_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }

      maker_adda_proposals: {
        Row: {
          id: string
          maker_id: string
          adda_id: string
          event_id: string | null
          proposed_date: string
          proposed_slot: string
          event_title: string
          expected_attendees: number | null
          expected_revenue_paise: number | null
          proposed_pricing_model: string | null
          proposed_split_config: Json
          message: string | null
          status: ProposalStatus
          counter_offer: Json
          adda_response_note: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          maker_id: string
          adda_id: string
          event_id?: string | null
          proposed_date: string
          proposed_slot: string
          event_title: string
          expected_attendees?: number | null
          expected_revenue_paise?: number | null
          proposed_pricing_model?: string | null
          proposed_split_config?: Json
          message?: string | null
          status?: ProposalStatus
          counter_offer?: Json
          adda_response_note?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          maker_id?: string
          adda_id?: string
          event_id?: string | null
          proposed_date?: string
          proposed_slot?: string
          event_title?: string
          expected_attendees?: number | null
          expected_revenue_paise?: number | null
          proposed_pricing_model?: string | null
          proposed_split_config?: Json
          message?: string | null
          status?: ProposalStatus
          counter_offer?: Json
          adda_response_note?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maker_adda_proposals_maker_id_fkey'
            columns: ['maker_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maker_adda_proposals_adda_id_fkey'
            columns: ['adda_id']
            isOneToOne: false
            referencedRelation: 'adda_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maker_adda_proposals_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }

      user_tier_history: {
        Row: {
          id: string
          user_id: string
          previous_tier: string | null
          new_tier: string
          triggered_at: string
          snapshot: Json
        }
        Insert: {
          id?: string
          user_id: string
          previous_tier?: string | null
          new_tier: string
          triggered_at?: string
          snapshot?: Json
        }
        Update: {
          id?: string
          user_id?: string
          previous_tier?: string | null
          new_tier?: string
          triggered_at?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'user_tier_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      explorer_event_history: {
        Row: {
          id: string
          explorer_id: string
          event_id: string
          rsvp_id: string | null
          attended: boolean
          rating: number | null
          review: string | null
          rated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          explorer_id: string
          event_id: string
          rsvp_id?: string | null
          attended?: boolean
          rating?: number | null
          review?: string | null
          rated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          explorer_id?: string
          event_id?: string
          rsvp_id?: string | null
          attended?: boolean
          rating?: number | null
          review?: string | null
          rated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'explorer_event_history_explorer_id_fkey'
            columns: ['explorer_id']
            isOneToOne: false
            referencedRelation: 'explorer_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'explorer_event_history_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'explorer_event_history_rsvp_id_fkey'
            columns: ['rsvp_id']
            isOneToOne: false
            referencedRelation: 'rsvps'
            referencedColumns: ['id']
          }
        ]
      }
      // ----- Explorer personalisation: notifications (migration 009) -----

      notifications: {
        Row: {
          id: string
          recipient_id: string
          type: string
          title: string
          body: string | null
          action_url: string | null
          is_read: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          type: string
          title: string
          body?: string | null
          action_url?: string | null
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          type?: string
          title?: string
          body?: string | null
          action_url?: string | null
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }

      // ----- Revenue tracking per event × adda (migration 009) -----

      adda_event_revenue: {
        Row: {
          id: string
          adda_id: string
          event_id: string
          total_revenue_paise: number
          adda_share_paise: number
          maker_share_paise: number
          platform_share_paise: number
          razorpay_fee_paise: number
          gst_on_platform_paise: number
          split_config: Json   // RevenueSplitConfig
          status: 'pending' | 'paid'
          settled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          adda_id: string
          event_id: string
          total_revenue_paise?: number
          adda_share_paise?: number
          maker_share_paise?: number
          platform_share_paise?: number
          razorpay_fee_paise?: number
          gst_on_platform_paise?: number
          split_config?: Json
          status?: 'pending' | 'paid'
          settled_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          adda_id?: string
          event_id?: string
          total_revenue_paise?: number
          adda_share_paise?: number
          maker_share_paise?: number
          platform_share_paise?: number
          razorpay_fee_paise?: number
          gst_on_platform_paise?: number
          split_config?: Json
          status?: 'pending' | 'paid'
          settled_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'adda_event_revenue_adda_id_fkey'
            columns: ['adda_id']
            isOneToOne: false
            referencedRelation: 'adda_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'adda_event_revenue_event_id_fkey'
            columns: ['event_id']
            isOneToOne: true
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }

      // ----- Payout requests (migration 011) -----

      payout_requests: {
        Row: {
          id:              string
          creator_id:      string
          event_ids:       string[]
          gross_paise:     number
          maker_paise:     number
          platform_paise:  number
          bank_name:       string | null
          bank_account:    string | null
          bank_ifsc:       string | null
          upi_id:          string | null
          status:          PayoutStatus
          notes:           string | null
          requested_at:    string
          processed_at:    string | null
        }
        Insert: {
          id?:             string
          creator_id:      string
          event_ids:       string[]
          gross_paise:     number
          maker_paise:     number
          platform_paise:  number
          bank_name?:      string | null
          bank_account?:   string | null
          bank_ifsc?:      string | null
          upi_id?:         string | null
          status?:         PayoutStatus
          notes?:          string | null
          requested_at?:   string
          processed_at?:   string | null
        }
        Update: {
          id?:             string
          creator_id?:     string
          event_ids?:      string[]
          gross_paise?:    number
          maker_paise?:    number
          platform_paise?: number
          bank_name?:      string | null
          bank_account?:   string | null
          bank_ifsc?:      string | null
          upi_id?:         string | null
          status?:         PayoutStatus
          notes?:          string | null
          requested_at?:   string
          processed_at?:   string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payout_requests_creator_id_fkey'
            columns: ['creator_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      // ----- Creator Hub (migration 021) -----

      creator_connections: {
        Row: {
          id:           string
          requester_id: string
          recipient_id: string
          status:       ConnectionStatus
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:          string
          requester_id: string
          recipient_id: string
          status?:      ConnectionStatus
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          id?:           string
          requester_id?: string
          recipient_id?: string
          status?:       ConnectionStatus
          created_at?:   string
          updated_at?:   string
        }
        Relationships: [
          {
            foreignKeyName: 'creator_connections_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'creator_connections_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }

      creator_messages: {
        Row: {
          id:            string
          connection_id: string
          sender_id:     string
          body:          string
          sent_at:       string
          read_at:       string | null
        }
        Insert: {
          id?:           string
          connection_id: string
          sender_id:     string
          body:          string
          sent_at?:      string
          read_at?:      string | null
        }
        Update: {
          id?:            string
          connection_id?: string
          sender_id?:     string
          body?:          string
          sent_at?:       string
          read_at?:       string | null
        }
        Relationships: [
          {
            foreignKeyName: 'creator_messages_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: false
            referencedRelation: 'creator_connections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'creator_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }
      // ----- Referral codes (migration 024) -----

      referral_codes: {
        Row: {
          id:               string
          code:             string
          issuer_id:        string
          event_id:         string
          redeemed_at:      string | null
          redeemed_rsvp_id: string | null
          issued_at:        string
          expires_at:       string
        }
        Insert: {
          id?:              string
          code:             string
          issuer_id:        string
          event_id:         string
          redeemed_at?:     string | null
          redeemed_rsvp_id?: string | null
          issued_at?:       string
          expires_at:       string
        }
        Update: {
          id?:              string
          code?:            string
          issuer_id?:       string
          event_id?:        string
          redeemed_at?:     string | null
          redeemed_rsvp_id?: string | null
          issued_at?:       string
          expires_at?:      string
        }
        Relationships: [
          {
            foreignKeyName: 'referral_codes_issuer_id_fkey'
            columns: ['issuer_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'referral_codes_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      get_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_creator_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      encrypt_upi_vpa: {
        Args: { p_upi_vpa: string }
        Returns: string
      }
      get_decrypted_upi_vpa: {
        Args: { p_profile_id: string }
        Returns: string | null
      }
      update_event_rating_aggregate: {
        Args: { event_id_param: string }
        Returns: undefined
      }
      increment_user_metric: {
        Args: { p_user_id: string; p_column: string; p_delta?: number }
        Returns: undefined
      }
    }

    Enums: {
      creator_type: CreatorType
      block_type: BlockType
      block_family: BlockFamily
      event_status: EventStatus
      payment_status: PaymentStatus
      user_role: UserRole
      user_tier: UserTier
      adda_tier: AddaTier
      pricing_model: PricingModel
      proposal_status: ProposalStatus
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience aliases — use these in application code
// ---------------------------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Shorthand row types
export type UserProfile        = Tables<'user_profiles'>
export type PageBlock          = Tables<'page_blocks'>
export type Event              = Tables<'events'>
export type Rsvp               = Tables<'rsvps'>
export type LinkClick          = Tables<'link_clicks'>
export type VenueDirectory     = Tables<'venue_directory'>
export type AddaProfile          = Tables<'adda_profiles'>
export type ExplorerProfile      = Tables<'explorer_profiles'>
export type AddaAvailability     = Tables<'adda_availability'>
export type MakerAddaProposal    = Tables<'maker_adda_proposals'>
export type UserTierHistory       = Tables<'user_tier_history'>
/** @deprecated Use UserTierHistory */
export type MakerTierHistory      = UserTierHistory
export type ExplorerEventHistory = Tables<'explorer_event_history'>
export type BlockAnalytic        = Tables<'block_analytics'>
export type MakerSubscriber      = Tables<'maker_subscribers'>
export type SubstackCache        = Tables<'substack_cache'>
export type AddaEventRevenue     = Tables<'adda_event_revenue'>
export type Notification         = Tables<'notifications'>
export type PayoutRequest        = Tables<'payout_requests'>

// RSVP joined with its parent event — used in the attendee Tickets panel
export interface RsvpWithEvent {
  id: string
  event_id: string
  attendee_name: string
  payment_status: PaymentStatus
  amount_paid: number | null    // paise
  qr_code_token: string
  checked_in: boolean
  created_at: string
  events: {
    id: string
    title: string
    starts_at: string
    ends_at: string | null
    venue_name: string
    venue_address: string
    cover_image_url: string | null
    slug: string
    ticket_price: number
    status: EventStatus
  } | null
}

// Booking from a creator's perspective — an RSVP made by another user for the creator's event
export interface BookingRow {
  id: string
  event_id: string
  attendee_name: string
  attendee_phone: string
  payment_status: PaymentStatus
  amount_paid: number | null    // paise
  qr_code_token: string
  checked_in: boolean
  created_at: string
  events: {
    id: string
    title: string
    starts_at: string
    ends_at: string | null
    venue_name: string
    venue_address: string
    cover_image_url: string | null
    slug: string
    ticket_price: number
    status: EventStatus
  } | null
}
