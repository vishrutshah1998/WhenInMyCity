// =============================================================================
// WIMC — Three-Sided Marketplace Types
// Makers (creators), Venues, Explorers (audience members)
// =============================================================================

import { z } from 'zod'
import { INTEREST_TAGS } from '@/lib/constants/interests'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = 'maker' | 'explorer'

export type UserTier = 'wanderer' | 'local' | 'lantern' | 'beacon'

export type VenueType =
  | 'cafe'
  | 'coworking'
  | 'gallery'
  | 'community_hall'
  | 'rooftop'
  | 'garden'
  | 'studio'
  | 'library'
  | 'restaurant'

export type PricingModel =
  | 'fixed_rental'
  | 'door_split'
  | 'hybrid'
  | 'f_and_b_minimum'

export type ProposalStatus =
  | 'pending'
  | 'counter_offered'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn'

/** @deprecated LEGACY as of migration 069 — superseded by real start_time/end_time. Do not use in new code. */
export type { AvailabilitySlotType } from './database'

export type AvailabilityStatus = 'available' | 'blocked' | 'pending' | 'confirmed'

// ---------------------------------------------------------------------------
// Tier metrics + progress
// ---------------------------------------------------------------------------

export interface TierMetrics {
  // Creator-side metrics
  cumulative_events_hosted: number
  cumulative_unique_attendees: number
  cumulative_gmv_paise: number
  average_event_rating: number
  repeat_attendee_rate: number
  monthly_page_visitors: number
  last_event_hosted_at: string | null
  is_founding_maker: boolean
  // Explorer-side metrics (Phase 2: populated by tracking hooks)
  events_attended_count: number
  rsvps_total_count: number
  no_shows_count: number
  reviews_posted_count: number
  // Beacon gate proxy until Phase 2 subscriber infrastructure
  whatsapp_subscriber_count: number
}

export interface TierGap {
  // Explorer gates (Wanderer→Local)
  eventsAttended?: number
  noShowRate?: number
  reviewRate?: number
  // Creator gates (Local→Lantern, Lantern→Beacon)
  eventsHosted?: number
  rating?: number
  cancellationRate?: number
  repeatRate?: number
  paidTickets?: number
  activeSubscribers?: number
}

export interface NextTierProgress {
  currentTier: UserTier
  nextTier: UserTier | null
  gaps: TierGap
  meetsAll: boolean
}

export interface TierEvaluationResult {
  currentTier: UserTier
  newTier: UserTier
  tierChanged: boolean
  recoveryStarted: boolean
  metricsSnapshot: TierMetrics
  nextTierProgress: NextTierProgress
}

// ---------------------------------------------------------------------------
// Venue pricing config shapes
// ---------------------------------------------------------------------------

export interface PricingConfig {
  fixed_rental_paise?: number
  door_split_percent?: number
  hybrid_rental_paise?: number
  hybrid_split_percent?: number
  f_and_b_minimum_paise?: number
}

export interface CapacityConfiguration {
  type: string      // 'theatre', 'workshop', 'cabaret', 'boardroom', etc.
  capacity: number
}

// ---------------------------------------------------------------------------
// Collab invite config (stored in user_profiles.collab_invite_config)
// ---------------------------------------------------------------------------

export interface CollabInviteConfig {
  types: string[]
  availability: string
  note: string
}

// ---------------------------------------------------------------------------
// Counter-offer split config — pricing terms proposed in a venue's counter
// offer. Always branched on the venue's own pricing_model (never a free
// choice for either side) and always carries the real proposed time window.
// ---------------------------------------------------------------------------

export interface ProposedTimeRange {
  date: string        // 'YYYY-MM-DD'
  startTime: string   // 'HH:MM'
  endTime: string     // 'HH:MM'
}

type ProposedSplitConfigBase = ProposedTimeRange

export type ProposedSplitConfig =
  | (ProposedSplitConfigBase & {
      pricingModel: 'fixed_rental'
      rentalFeePaise: number
    })
  | (ProposedSplitConfigBase & {
      pricingModel: 'door_split'
      splitPercentage: number
    })
  | (ProposedSplitConfigBase & {
      pricingModel: 'f_and_b_minimum'
      minimumSpendPaise: number
    })
  | (ProposedSplitConfigBase & {
      pricingModel: 'hybrid'
      rentalFeePaise: number
      splitPercentage: number
    })

// ---------------------------------------------------------------------------
// Availability update (input to updateVenueAvailability)
// ---------------------------------------------------------------------------

export interface AvailabilityUpdate {
  date: string              // ISO date string 'YYYY-MM-DD'
  start_time: string        // 'HH:MM'
  end_time: string          // 'HH:MM'
  status: AvailabilityStatus
  notes?: string
}

// ---------------------------------------------------------------------------
// Venue search params
// ---------------------------------------------------------------------------

export interface VenueSearchParams {
  city: string
  venue_type?: VenueType
  capacity_min?: number
  capacity_max?: number
  date?: string             // ISO date string
  amenities?: string[]
  pricing_model?: PricingModel
}

// ---------------------------------------------------------------------------
// Zod schemas — validated in Server Actions
// ---------------------------------------------------------------------------

const VALID_FORMATS = [
  'small_group', 'workshop', 'performance', 'networking', 'outdoor', 'dining',
] as const

export const CreateExplorerSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(80),
  avatar_url: z.string().url().optional().or(z.literal('')),
  city: z.string().min(1, 'City is required'),
  interest_tags: z
    .array(z.string())
    .min(3, 'Select at least 3 interests')
    .max(5, 'Select at most 5 interests')
    .refine(
      (tags) => tags.every((t) => INTEREST_TAGS.some((it) => it.id === t)),
      { message: 'One or more interest tags are invalid' },
    ),
  preferred_formats: z.array(z.enum(VALID_FORMATS)).default([]),
  price_range_max_paise: z.number().int().min(0).default(50000),
  neighbourhood_preference: z.string().max(100).optional(),
  notification_preferences: z
    .object({
      whatsapp: z.boolean().default(true),
      digest_frequency: z.enum(['daily', 'weekly', 'never']).default('weekly'),
    })
    .default({ whatsapp: true, digest_frequency: 'weekly' }),
})

export type CreateExplorerInput = z.infer<typeof CreateExplorerSchema>
