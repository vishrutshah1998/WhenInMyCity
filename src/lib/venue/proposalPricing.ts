import type { PricingConfig, PricingModel, ProposedSplitConfig } from '@/types/marketplace'
import type { PricingRule } from '@/components/venue/editor/types'
import { hoursBetween } from '@/lib/venue/timeFormat'

const WEEKDAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function weekdayOf(dateStr: string): string {
  // proposed_date is a plain 'YYYY-MM-DD' — parse as UTC so the weekday
  // isn't shifted by the server's local timezone.
  return WEEKDAY_CODES[new Date(`${dateStr}T00:00:00Z`).getUTCDay()]
}

function windowOverlaps(ruleFrom: string, ruleTo: string, startTime: string, endTime: string): boolean {
  return ruleFrom < endTime && startTime < ruleTo
}

function isAllDayWindow(from: string, to: string): boolean {
  return from === '00:00' && (to === '23:59' || to === '24:00')
}

export interface ResolvedRentalRate {
  rentalFeePaise: number
  ruleName: string
  hours: number
}

/**
 * Picks the pricing_rule that applies to a proposed date + time window and
 * returns the computed rental fee. Rules are day-of-week scoped; when a
 * venue has split one weekday across multiple time-boxed rules, prefers the
 * rule whose window overlaps the proposed time range, then the narrowest
 * (non-all-day) window, then array order.
 * Returns null when no active rule covers that weekday at all.
 */
export function resolveFixedRentalRate(
  pricingRules: PricingRule[] | undefined,
  proposedDate: string,
  startTime: string,
  endTime: string,
): ResolvedRentalRate | null {
  if (!pricingRules?.length) return null

  const weekday = weekdayOf(proposedDate)
  const candidates = pricingRules.filter(r => r.active && r.days.includes(weekday))
  if (candidates.length === 0) return null

  let rule = candidates[0]
  if (candidates.length > 1) {
    const overlapping = candidates.filter(r => windowOverlaps(r.time_from, r.time_to, startTime, endTime))
    const pool = overlapping.length > 0 ? overlapping : candidates
    rule = pool.find(r => !isAllDayWindow(r.time_from, r.time_to)) ?? pool[0]
  }

  const hours = Math.max(hoursBetween(startTime, endTime), rule.min_hours)
  return {
    rentalFeePaise: Math.round(rule.rate_per_hour_paise * hours),
    ruleName: rule.name,
    hours,
  }
}

// ---------------------------------------------------------------------------
// Display terms — resolves what price terms to show for a proposal: the
// venue's actual counter offer once one has been sent, otherwise its listed
// rate. Shared between the venue side (BookingRequestCard) and the maker
// side (VenuesClient's proposal drawer) so the two never drift on how a
// counter offer is detected or how a listed rate is derived.
// ---------------------------------------------------------------------------

export interface DisplayTerms {
  source: 'counter' | 'listed'
  pricingModel: PricingModel
  rentalFeePaise: number | null
  splitPercentage: number | null
  minimumSpendPaise: number | null
  rentalRuleName?: string
}

function isProposedSplitConfig(v: unknown): v is ProposedSplitConfig {
  return !!v && typeof v === 'object' && 'pricingModel' in (v as Record<string, unknown>)
}

function extractCounterAmounts(c: ProposedSplitConfig): {
  rentalFeePaise: number
  splitPercentage: number
  minimumSpendPaise: number
} {
  switch (c.pricingModel) {
    case 'fixed_rental':
      return { rentalFeePaise: c.rentalFeePaise, splitPercentage: 0, minimumSpendPaise: 0 }
    case 'door_split':
      return { rentalFeePaise: 0, splitPercentage: c.splitPercentage, minimumSpendPaise: 0 }
    case 'f_and_b_minimum':
      return { rentalFeePaise: 0, splitPercentage: 0, minimumSpendPaise: c.minimumSpendPaise }
    case 'hybrid':
      return { rentalFeePaise: c.rentalFeePaise, splitPercentage: c.splitPercentage, minimumSpendPaise: 0 }
  }
}

/**
 * Resolves what price terms to show: the venue's actual counter offer once
 * one has been sent; otherwise its listed rate. For fixed_rental/hybrid the
 * listed rate is computed from the venue's hourly pricing_rules (the only
 * thing the current pricing editor ever writes) — falling back to the
 * legacy flat `fixed_rental_paise` field only if a venue predates the
 * pricing_rules editor and still has one set. door_split/f_and_b_minimum
 * have no preset value by design (the pricing editor tells venues those
 * terms are "negotiated per booking"), so a null there means genuinely
 * unset, not zero — callers must render an honest "not set" state instead
 * of a fabricated ₹0/0%.
 */
export function resolveDisplayTerms(
  counterOffer: unknown,
  pricingModel: PricingModel,
  pricingConfig: PricingConfig | null,
  proposedDate: string,
  startTime: string,
  endTime: string,
): DisplayTerms | null {
  if (isProposedSplitConfig(counterOffer)) {
    return { source: 'counter', pricingModel: counterOffer.pricingModel, ...extractCounterAmounts(counterOffer) }
  }
  if (!pricingConfig) return null

  const rules = (pricingConfig as PricingConfig & { pricing_rules?: PricingRule[] }).pricing_rules
  const resolved =
    pricingModel === 'fixed_rental' || pricingModel === 'hybrid'
      ? resolveFixedRentalRate(rules, proposedDate, startTime, endTime)
      : null

  const flatRental = pricingConfig.fixed_rental_paise ?? pricingConfig.hybrid_rental_paise ?? null
  const rentalFeePaise =
    pricingModel === 'fixed_rental' || pricingModel === 'hybrid'
      ? resolved?.rentalFeePaise ?? (flatRental && flatRental > 0 ? flatRental : null)
      : null

  const rawSplit = pricingConfig.door_split_percent ?? pricingConfig.hybrid_split_percent ?? null
  const rawMinimum = pricingConfig.f_and_b_minimum_paise ?? null

  return {
    source: 'listed',
    pricingModel,
    rentalFeePaise,
    splitPercentage: rawSplit && rawSplit > 0 ? rawSplit : null,
    minimumSpendPaise: rawMinimum && rawMinimum > 0 ? rawMinimum : null,
    rentalRuleName: resolved?.ruleName,
  }
}

// ---------------------------------------------------------------------------
// Listed pricing summary — a date-independent preview for browsing venues,
// before a date/slot has been chosen (so resolveFixedRentalRate's weekday
// resolution doesn't apply yet). fixed_rental/hybrid rates are shown as a
// per-hour range across active pricing_rules rather than a single computed
// total, since the actual total depends on a date this view doesn't have.
// ---------------------------------------------------------------------------

export interface ListedPricingSummary {
  rentalRange: { minPaise: number; maxPaise: number } | null
  flatRentalPaise: number | null
  splitPercentage: number | null
  minimumSpendPaise: number | null
}

export function summarizeListedPricing(pricingConfig: PricingConfig | null): ListedPricingSummary {
  const rules = (pricingConfig as (PricingConfig & { pricing_rules?: PricingRule[] }) | null)?.pricing_rules
  const activeRates = (rules ?? []).filter(r => r.active).map(r => r.rate_per_hour_paise)

  const flatRental = pricingConfig?.fixed_rental_paise ?? pricingConfig?.hybrid_rental_paise ?? null
  const rawSplit = pricingConfig?.door_split_percent ?? pricingConfig?.hybrid_split_percent ?? null
  const rawMinimum = pricingConfig?.f_and_b_minimum_paise ?? null

  return {
    rentalRange: activeRates.length ? { minPaise: Math.min(...activeRates), maxPaise: Math.max(...activeRates) } : null,
    flatRentalPaise: flatRental && flatRental > 0 ? flatRental : null,
    splitPercentage: rawSplit && rawSplit > 0 ? rawSplit : null,
    minimumSpendPaise: rawMinimum && rawMinimum > 0 ? rawMinimum : null,
  }
}
