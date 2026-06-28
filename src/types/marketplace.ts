// =============================================================================
// WIMC — Three-Sided Marketplace Types
// Makers (creators), Addas (venues), Explorers (audience members)
// =============================================================================

import { z } from 'zod'
import { INTEREST_TAGS } from '@/lib/constants/interests'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = 'maker' | 'explorer'

export type UserTier = 'wanderer' | 'local' | 'lantern' | 'beacon'

export type AddaType =
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

export type AvailabilitySlotType = 'morning' | 'afternoon' | 'evening' | 'full_day'

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
// Adda pricing config shapes
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
// Proposal counter-offer shape
// ---------------------------------------------------------------------------

export interface ProposalCounterOffer {
  proposed_date?: string
  proposed_slot?: string
  proposed_pricing_model?: PricingModel
  proposed_split_config?: Record<string, unknown>
  note?: string
}

// ---------------------------------------------------------------------------
// Availability update (input to updateAddaAvailability)
// ---------------------------------------------------------------------------

export interface AvailabilityUpdate {
  date: string              // ISO date string 'YYYY-MM-DD'
  slot_type: AvailabilitySlotType
  status: AvailabilityStatus
  notes?: string
}

// ---------------------------------------------------------------------------
// Adda search params
// ---------------------------------------------------------------------------

export interface AddaSearchParams {
  city: string
  adda_type?: AddaType
  capacity_min?: number
  capacity_max?: number
  date?: string             // ISO date string
  amenities?: string[]
  pricing_model?: PricingModel
}

// ---------------------------------------------------------------------------
// Zod schemas — validated in Server Actions
// ---------------------------------------------------------------------------

const VALID_ADDA_TYPES: AddaType[] = [
  'cafe', 'coworking', 'gallery', 'community_hall',
  'rooftop', 'garden', 'studio', 'library', 'restaurant',
]

const VALID_AMENITIES = [
  'projector', 'pa_system', 'natural_light', 'parking',
  'accessible', 'wifi', 'whiteboard', 'kitchen', 'outdoor_space', 'ac',
] as const

const VALID_FORMATS = [
  'small_group', 'workshop', 'performance', 'networking', 'outdoor', 'dining',
] as const

export const CreateAddaSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  adda_type: z
    .array(z.enum(VALID_ADDA_TYPES as [AddaType, ...AddaType[]]))
    .min(1, 'Select at least one Adda type'),
  city: z.string().min(1, 'City is required'),
  neighbourhood: z.string().max(100).optional(),
  address: z.string().min(5, 'Address is required').max(500),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  gallery_images: z.array(z.string().url()).max(12).default([]),
  capacity_min: z.number().int().min(1).optional(),
  capacity_max: z.number().int().min(1).optional(),
  capacity_configurations: z
    .array(z.object({ type: z.string(), capacity: z.number().int().positive() }))
    .default([]),
  amenities: z.array(z.enum(VALID_AMENITIES)).default([]),
  pricing_model: z.enum(['fixed_rental', 'door_split', 'hybrid', 'f_and_b_minimum']),
  pricing_config: z
    .object({
      fixed_rental_paise: z.number().int().positive().optional(),
      door_split_percent: z.number().min(0).max(100).optional(),
      hybrid_rental_paise: z.number().int().positive().optional(),
      hybrid_split_percent: z.number().min(0).max(100).optional(),
      f_and_b_minimum_paise: z.number().int().positive().optional(),
    })
    .default({}),
  contact_whatsapp: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid WhatsApp number')
    .optional()
    .or(z.literal('')),
  contact_email: z.string().email().optional().or(z.literal('')),
  instagram_handle: z
    .string()
    .regex(/^[a-zA-Z0-9_.]*$/, 'Invalid Instagram handle')
    .max(30)
    .optional()
    .or(z.literal('')),
})
  .refine(
    (data) => data.capacity_min == null || data.capacity_max == null || data.capacity_max >= data.capacity_min,
    { message: 'Maximum capacity must be ≥ minimum capacity', path: ['capacity_max'] },
  )

export type CreateAddaInput = z.infer<typeof CreateAddaSchema>

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
