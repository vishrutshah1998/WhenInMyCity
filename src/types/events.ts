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
      .min(1, 'Adda name is required')
      .max(120, 'Adda name must be at most 120 characters'),

    venue_address: z
      .string()
      .min(5, 'Adda address must be at least 5 characters')
      .max(255, 'Adda address must be at most 255 characters'),

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
// Normalised Razorpay payment status → WIMC PaymentStatus
// ---------------------------------------------------------------------------

export type NormalisedPaymentStatus = 'captured' | 'authorized' | 'failed' | 'refunded'
