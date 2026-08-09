// ---------------------------------------------------------------------------
// Maps a venue's preferred_times (collected during onboarding from its real
// weekly open/close hours — see slotsToTimeBuckets in
// src/app/onboarding/business/V7/page.tsx) to a concrete start/end clock
// range, for defaulting and quick-preset selection in the booking proposal
// flow. Reuses the exact ranges this codebase already established in
// migration 069_venue_time_precision.sql (previously used to backfill the
// old coarse slot_type enum) rather than inventing new boundaries. late_night
// has no precedent there — scoped same-day here so it can never produce a
// start >= end pair that ProposalModal's validation would reject.
// ---------------------------------------------------------------------------

export interface TimeRange {
  start: string
  end: string
}

export const PREFERRED_TIME_RANGES: Record<string, TimeRange> = {
  morning:    { start: '09:00', end: '13:00' },
  afternoon:  { start: '13:00', end: '17:00' },
  evening:    { start: '18:00', end: '22:00' },
  late_night: { start: '21:00', end: '23:30' },
}

const FALLBACK_RANGE: TimeRange = { start: '09:00', end: '21:00' }

// Evening wins when a venue has multiple preferred_times set — most events at
// these venue types (cafe/rooftop/gallery/studio/etc.) skew evening, and it
// sidesteps a bias in how preferred_times gets computed: slotsToTimeBuckets
// checks morning before evening for each day, so 'morning' tends to land in
// the array whenever a venue is ever open in the morning at all, independent
// of which slot is actually its primary one.
const PRIORITY = ['evening', 'afternoon', 'morning', 'late_night'] as const

/** Smart default start/end for a new proposal, based on the venue's own preferred hours. */
export function defaultTimeRangeForVenue(preferredTimes: string[] | null | undefined): TimeRange {
  if (!preferredTimes?.length) return FALLBACK_RANGE
  const picked = PRIORITY.find((p) => preferredTimes.includes(p))
  return picked ? PREFERRED_TIME_RANGES[picked] : FALLBACK_RANGE
}

export interface TimePreset {
  key: string
  label: string
  range: TimeRange
}

export const TIME_PRESETS: TimePreset[] = [
  { key: 'morning',   label: '🌤 Morning',   range: PREFERRED_TIME_RANGES.morning },
  { key: 'afternoon', label: '☀️ Afternoon', range: PREFERRED_TIME_RANGES.afternoon },
  { key: 'evening',   label: '🌆 Evening',   range: PREFERRED_TIME_RANGES.evening },
]
