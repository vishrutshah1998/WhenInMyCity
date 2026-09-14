// =============================================================================
// WIMC — Event Types & Zod Schemas
// =============================================================================

import { z } from 'zod'

// ---------------------------------------------------------------------------
// GST thresholds (SAC 998596 — ticketed events)
// ---------------------------------------------------------------------------

/**
 * Ticket prices at or below this value (per person) are GST-exempt.
 * Above this, 18% GST applies on the total ticket amount.
 * ₹500 = 50000 paise.
 */
export const GST_EXEMPT_THRESHOLD_PAISE = 50_000

/** GST rate for event tickets priced above the threshold. */
export const GST_RATE = 0.18

/**
 * Computes the amount to charge in paise, inclusive of GST where applicable.
 *
 * @param ticketPricePaise - Per-ticket price in paise (as stored in DB).
 * @param quantity         - Number of tickets.
 * @returns Total amount in paise to pass to Razorpay.
 *
 * @example
 * calculateChargeAmount(29900, 2)  // ₹299 × 2 = ₹598, exempt   → 59800
 * calculateChargeAmount(75000, 1)  // ₹750 × 1.18 = ₹885         → 88500
 */
export function calculateChargeAmount(
  ticketPricePaise: number,
  quantity: number,
): number {
  const subtotal = ticketPricePaise * quantity
  if (ticketPricePaise > GST_EXEMPT_THRESHOLD_PAISE) {
    return Math.round(subtotal * (1 + GST_RATE))
  }
  return subtotal
}

// ---------------------------------------------------------------------------
// TicketTier — Patreon-style fan ticket tier
// ---------------------------------------------------------------------------

export interface TicketTier {
  id:          string          // client-generated nanoid for stable keys
  name:        string          // e.g. "General", "Supporter", "Patron"
  price_paise: number          // 0 = free tier
  description: string          // one-line tagline shown under the tier name
  benefits:    string[]        // bullet-point list of what's included
  capacity:    number | null   // null = uses event-level capacity
}

export const TicketTierSchema = z.object({
  id:          z.string().min(1),
  name:        z.string().min(1, 'Tier name is required').max(50),
  price_paise: z.number().int().min(0).max(10_000_000),
  description: z.string().max(200).default(''),
  benefits:    z.string().max(100).array().max(8).default([]),
  capacity:    z.number().int().min(1).nullable().optional().transform((v) => v ?? null),
})

// ---------------------------------------------------------------------------
// CreateEventInput — validated input for createEvent()
// ---------------------------------------------------------------------------

export const CreateEventSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title must be at most 120 characters'),

    description: z
      .string()
      .max(2000, 'Description must be at most 2000 characters')
      .optional(),

    cover_image_url: z
      .string()
      .url('cover_image_url must be a valid URL')
      .optional()
      .or(z.literal('')),

    venue_name: z
      .string()
      .min(1, 'Venue name is required')
      .max(120, 'Venue name must be at most 120 characters'),

    venue_address: z
      .string()
      .min(5, 'Venue address must be at least 5 characters')
      .max(255, 'Venue address must be at most 255 characters'),

    venue_lat: z.number().min(-90).max(90).optional(),
    venue_lng: z.number().min(-180).max(180).optional(),

    starts_at: z
      .string()
      .datetime({ message: 'starts_at must be an ISO-8601 datetime' }),

    ends_at: z
      .string()
      .datetime({ message: 'ends_at must be an ISO-8601 datetime' })
      .optional(),

    /**
     * Ticket price in paise. 0 = free event.
     * ₹1 = 100 paise; ₹299 = 29900 paise.
     * The max value guards against accidental data-entry errors (₹100k cap).
     */
    ticket_price: z
      .number()
      .int('ticket_price must be a whole number of paise')
      .min(0, 'ticket_price cannot be negative')
      .max(10_000_000, 'ticket_price cannot exceed ₹1,00,000'),

    capacity: z
      .number()
      .int('capacity must be a whole number')
      .min(1, 'capacity must be at least 1')
      .optional(),

    whatsapp_group_url: z
      .string()
      .url('whatsapp_group_url must be a valid URL')
      .optional()
      .or(z.literal('')),

    google_maps_url: z
      .string()
      .url('google_maps_url must be a valid URL')
      .optional()
      .or(z.literal('')),

    /**
     * Optional early-access window. If set, Wanderer-tier explorers cannot RSVP
     * until this timestamp passes. Local+ explorers bypass the gate.
     * Must be before starts_at.
     */
    early_access_at: z
      .string()
      .datetime({ message: 'early_access_at must be an ISO-8601 datetime' })
      .optional(),

    /**
     * Fan ticket tiers (Lantern+). When non-empty, overrides flat ticket_price.
     * ticket_price is still required but set to 0 (or min tier price) by the form.
     */
    ticket_tiers: z
      .array(TicketTierSchema)
      .max(5, 'Maximum 5 ticket tiers')
      .optional(),

    /**
     * 'casual'   — free events using Going / Maybe / Not Going signals.
     * 'ticketed' — standard flow (paid or free with name+phone collection).
     * Only valid when ticket_price === 0; form enforces this.
     */
    rsvp_style: z.enum(['ticketed', 'casual']).optional(),

    /**
     * If true, applicants are held for host review instead of being
     * confirmed/booked immediately. Meaningful two ways:
     *   - rsvp_style === 'casual' (free) — a "going" RSVP is held as
     *     rsvps.application_status, set by casualRSVP/casualRSVPGuest
     *     (migration 079, Phase A).
     *   - rsvp_style === 'ticketed' with ticket_price > 0 (paid) — an
     *     application is held in the event_applications table, set by
     *     applyToEvent (migration 080, Phase B).
     * A free ticketed event has no gating mechanism — this is forced false
     * for it regardless of what's passed (see createEvent).
     */
    requires_approval: z.boolean().optional(),

    /**
     * Optional single custom question shown to applicants. Max 200 chars.
     * Shared by both the free-casual (Phase A) and paid-gated (Phase B)
     * approval flows.
     */
    application_question: z
      .string()
      .max(200, 'Application question must be at most 200 characters')
      .optional(),

    /**
     * Minutes an approved paid-gated applicant has to pay before their
     * approval expires (60-10080, i.e. 1 hour to 7 days). Only meaningful
     * when rsvp_style === 'ticketed', ticket_price > 0, and
     * requires_approval is true. No DB default (migration 080) — the
     * 24h/1440-minute default is applied by the create-event form.
     */
    application_payment_window_minutes: z
      .number()
      .int()
      .min(60, 'Payment window must be at least 60 minutes (1 hour)')
      .max(10080, 'Payment window must be at most 10080 minutes (7 days)')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.ends_at && data.starts_at) {
        return new Date(data.ends_at) > new Date(data.starts_at)
      }
      return true
    },
    { message: 'ends_at must be after starts_at', path: ['ends_at'] },
  )
  .refine(
    (data) => {
      // Lat requires lng and vice versa.
      const hasLat = data.venue_lat !== undefined
      const hasLng = data.venue_lng !== undefined
      return hasLat === hasLng
    },
    { message: 'venue_lat and venue_lng must both be provided or both omitted' },
  )
  .refine(
    (data) => {
      if (data.early_access_at && data.starts_at) {
        return new Date(data.early_access_at) < new Date(data.starts_at)
      }
      return true
    },
    { message: 'early_access_at must be before the event start time', path: ['early_access_at'] },
  )

export type CreateEventInput = z.infer<typeof CreateEventSchema>

// ---------------------------------------------------------------------------
// Razorpay response shapes
// ---------------------------------------------------------------------------

export interface RazorpayOrder {
  id: string              // order_xxx
  entity: 'order'
  amount: number          // paise
  amount_paid: number
  amount_due: number
  currency: 'INR'
  receipt: string
  status: 'created' | 'attempted' | 'paid'
  notes: Record<string, string>
  created_at: number      // UNIX timestamp
}

/**
 * A Route transfer attached to an order at creation time via the order's
 * `transfers` array (`POST /v1/orders`) — Razorpay Route, Phase 2. Confirmed
 * live: this is embedded directly in the order-creation call, not a
 * separate endpoint. `amount` may be less than the order's own `amount`;
 * the remainder implicitly stays with the main account (no explicit
 * "platform transfer" object is needed).
 */
export interface RazorpayOrderTransfer {
  account: string                    // recipient's razorpay_account_id (acc_xxx)
  amount: number                     // paise; must not exceed the order's amount
  currency: 'INR'
  notes?: Record<string, string>
  linked_account_notes?: string[]
  on_hold?: boolean
  on_hold_until?: number             // UNIX timestamp (seconds)
}

export interface RazorpayPayment {
  id: string              // pay_xxx
  entity: 'payment'
  amount: number          // paise
  currency: 'INR'
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  order_id: string
  method: string
  captured: boolean
  description: string | null
  notes: Record<string, string>
  created_at: number
}

export interface RazorpayRefund {
  id: string              // rfnd_xxx
  entity: 'refund'
  amount: number          // paise
  currency: 'INR'
  payment_id: string
  notes: Record<string, string>
  receipt: string | null
  acquirer_data: Record<string, string>
  created_at: number
  status: 'pending' | 'processed' | 'failed'
  speed_processed: string
  speed_requested: string
}

export interface RazorpayItem {
  id: string              // item_xxx
  active: boolean
  amount: number          // paise
  unit_amount: number
  currency: 'INR'
  name: string
  description: string | null
}

// ---------------------------------------------------------------------------
// Razorpay Route — Linked Accounts (v2). See src/lib/razorpay/index.ts and
// the Route integration plan for the validated request/response shapes.
// ---------------------------------------------------------------------------

export interface RazorpayAddress {
  street1: string
  street2?: string
  city: string
  state: string
  postal_code: string
  country: string   // ISO 3166-1 alpha-2, e.g. 'IN'
}

export interface RazorpayLinkedAccount {
  id: string               // acc_xxx
  entity: 'account'
  email: string
  phone: string
  type: 'route'
  status: string
  reference_id: string
  legal_business_name: string
  business_type: string
  contact_name: string
  profile: {
    category: string
    subcategory: string
    addresses: { registered: RazorpayAddress }
  }
  legal_info: {
    pan: string
    gst?: string
  }
  created_at: number
}

export interface RazorpayStakeholder {
  id: string               // sth_xxx
  entity: 'stakeholder'
  name: string
  email: string
  addresses: { residential: RazorpayAddress }
  kyc: { pan: string }
  created_at: number
}

/**
 * One item in a Product Configuration's `requirements[]`. Only `description`
 * (used to detect the "Max retry exceeded" lockout — there is no distinct
 * reason_code for that specific case, confirmed in live testing) and
 * `reason_code` are relied on by WIMC code; other fields Razorpay may
 * include (e.g. `field_reference`) are read but not typed strictly since
 * their exact shape wasn't part of what the plan's live testing confirmed.
 */
export interface RazorpayProductRequirement {
  reason_code?: string
  description: string
  [key: string]: unknown
}

export interface RazorpayProductConfiguration {
  id: string                                   // acc_prd_xxx
  product_name: 'route'
  active: boolean
  // Present on the response but NOT a trustworthy completion signal — see
  // the "Validated Findings" in the plan doc (Finding #11): activation_status
  // transitions asynchronously and can change between consecutive reads with
  // no API call from us in between. Never branch app logic on this field
  // directly; it's typed here only so it can be displayed/logged.
  activation_status?: string
  requirements: RazorpayProductRequirement[]
  tnc?: { id: string; accepted: boolean; accepted_at: number | null }
  created_at?: number
}

// ---------------------------------------------------------------------------
// Normalised Razorpay payment status → WIMC PaymentStatus
// ---------------------------------------------------------------------------

export type NormalisedPaymentStatus = 'captured' | 'authorized' | 'failed' | 'refunded'
