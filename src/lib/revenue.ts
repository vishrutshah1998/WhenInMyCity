// =============================================================================
// WIMC — Revenue split calculation utilities
// Three-way split: Maker / Adda / Platform, net of Razorpay processing fees.
// =============================================================================

import type { MakerTier } from '@/types/database'
import { REVENUE_SPLITS } from '@/lib/constants/interests'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The fractional split configuration applied to an event's revenue.
 * Stored in `adda_event_revenue.split_config` so historical events can always
 * be reconstructed without needing to know the maker's tier at event time.
 */
export interface RevenueSplitConfig {
  makerFraction: number    // e.g. 0.75
  venueFraction: number    // e.g. 0.15
  platformFraction: number // e.g. 0.10
  payoutDays: number       // T+ days until maker payout
  makerTier: MakerTier
  hasVenue: boolean
}

/**
 * Full breakdown of the money flows for a batch of tickets.
 *
 * All values are in **paise** (₹1 = 100 paise).
 */
export interface RevenueSplitResult {
  /** Gross ticket revenue before any deductions. */
  totalPaise: number
  /** Amount the Maker receives. */
  makerPaise: number
  /** Amount the Adda (venue) receives. Zero when `hasVenue` is false. */
  venuePaise: number
  /** Gross platform commission (before Razorpay fees are subtracted). */
  platformPaise: number
  /** Razorpay processing fee (2 % of gross). Deducted from platform share. */
  razorpayFeePaise: number
  /**
   * GST levied on the *net* platform commission (platformGross − razorpayFee).
   * 18 % per SAC 998596.
   */
  gstOnPlatformFeePaise: number
  /** Net platform revenue after Razorpay fee but before GST is collected. */
  platformNetPaise: number
  /** Summary config used — embed this in `adda_event_revenue.split_config`. */
  config: RevenueSplitConfig
}

// ---------------------------------------------------------------------------
// calculateRevenueSplit
// ---------------------------------------------------------------------------

/**
 * Computes the three-way revenue split for a batch of tickets.
 *
 * Calculation order:
 *  1. `total = ticketPricePaise × quantity`
 *  2. `razorpayFee = round(total × 0.02)`   — charged by Razorpay to WIMC
 *  3. Gross shares are applied to **total** (not net); fractions sum to 1.
 *  4. `platformNet = platformGross − razorpayFee`
 *  5. `gstOnPlatform = round(platformNet × 0.18)`  — GST on platform's take
 *  6. If `hasVenue = false` the venue share rolls into the maker share.
 *
 * Rounding: maker and venue shares are `Math.round`-ed; platform takes the
 * remainder to ensure exactness: `platformGross = total − maker − venue`.
 *
 * @param ticketPricePaise  Per-ticket face value in paise.
 * @param quantity          Number of tickets sold.
 * @param makerTier         Maker's current tier (determines split fractions).
 * @param hasVenue          False for self-organised events without an Adda.
 * @returns `RevenueSplitResult`
 *
 * @example
 * // Nukkad maker, ₹500 ticket, 20 attendees, with venue
 * calculateRevenueSplit(50000, 20, 'nukkad', true)
 * // total = 1,000,000 paise (₹10,000)
 * // maker = 750,000  (75 %)
 * // venue = 150,000  (15 %)
 * // platform gross = 100,000  (10 %)
 * // razorpay = 20,000  (2 %)
 * // platform net = 80,000
 * // gst on platform = 14,400  (18 % of 80,000)
 */
export function calculateRevenueSplit(
  ticketPricePaise: number,
  quantity: number,
  makerTier: MakerTier,
  hasVenue: boolean,
): RevenueSplitResult {
  const split = REVENUE_SPLITS[makerTier] ?? REVENUE_SPLITS['mohalla']

  const totalPaise = ticketPricePaise * quantity

  // Razorpay processing fee: 2% of gross
  const razorpayFeePaise = Math.round(totalPaise * 0.02)

  // Gross shares (applied to total; fractions must sum to 1.0)
  let makerPaise  = Math.round(totalPaise * split.maker)
  let venuePaise  = Math.round(totalPaise * split.venue)
  // Platform takes the remainder to avoid rounding drift
  let platformPaise = totalPaise - makerPaise - venuePaise

  // If no Adda is involved, venue share rolls up to maker
  if (!hasVenue) {
    makerPaise += venuePaise
    venuePaise = 0
  }

  // Net platform revenue after paying Razorpay
  const platformNetPaise = platformPaise - razorpayFeePaise

  // GST on net platform commission (18 %)
  const gstOnPlatformFeePaise = Math.round(platformNetPaise * 0.18)

  const config: RevenueSplitConfig = {
    makerFraction:    split.maker,
    venueFraction:    hasVenue ? split.venue : 0,
    platformFraction: split.platform,
    payoutDays:       split.payoutDays,
    makerTier,
    hasVenue,
  }

  return {
    totalPaise,
    makerPaise,
    venuePaise,
    platformPaise,
    razorpayFeePaise,
    gstOnPlatformFeePaise,
    platformNetPaise,
    config,
  }
}

// ---------------------------------------------------------------------------
// calculatePayoutDate
// ---------------------------------------------------------------------------

/**
 * Returns the estimated payout date for a maker based on their tier.
 *
 * | Tier    | T+   |
 * |---------|------|
 * | Mohalla | T+7  |
 * | Nukkad  | T+3  |
 * | Chowk   | T+1  |
 * | Maidan  | T+0  |
 *
 * T is the event date (not the current date).
 *
 * @param eventDate  The date/time the event takes place.
 * @param makerTier  Maker's current tier.
 * @returns Estimated payout `Date`.
 */
export function calculatePayoutDate(eventDate: Date, makerTier: MakerTier): Date {
  const payoutDays = REVENUE_SPLITS[makerTier]?.payoutDays ?? 7
  const payout = new Date(eventDate)
  payout.setDate(payout.getDate() + payoutDays)
  return payout
}
