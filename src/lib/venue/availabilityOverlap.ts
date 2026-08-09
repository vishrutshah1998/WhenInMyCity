import type { createAdminClient } from '@/lib/supabase/admin'
import type { AvailabilityStatus } from '@/types/marketplace'

/**
 * Checks whether a proposed [startTime, endTime) window on `date` overlaps
 * any existing venue_availability row in the given statuses. Check-then-act,
 * not atomic — no DB-level exclusion constraint backs this (would need the
 * btree_gist extension), so this is a best-effort guard against concurrent
 * double-booking, not a hard guarantee.
 */
export async function hasOverlap(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    venueId: string
    date: string
    startTime: string
    endTime: string
    statuses: AvailabilityStatus[]
    excludeId?: string
  },
): Promise<boolean> {
  let query = admin
    .from('venue_availability')
    .select('id')
    .eq('venue_id', params.venueId)
    .eq('date', params.date)
    .in('status', params.statuses)
    .lt('start_time', params.endTime)
    .gt('end_time', params.startTime)

  if (params.excludeId) {
    query = query.neq('id', params.excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('[hasOverlap]', error.message)
    return false
  }

  return (data?.length ?? 0) > 0
}
