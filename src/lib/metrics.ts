import { createAdminClient } from '@/lib/supabase/admin'

export type MetricColumn =
  | 'rsvps_total_count'
  | 'events_attended_count'
  | 'no_shows_count'
  | 'reviews_posted_count'
  | 'events_saved_count'
  | 'creators_followed_count'

/**
 * Atomically increments (or decrements with a negative delta) a tier metric
 * counter on user_profiles. Fire-and-forget — never throws, errors are logged.
 */
export function bumpUserMetric(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  column: MetricColumn,
  delta = 1,
  context = 'unknown',
): void {
  void (async () => {
    const { error } = await admin.rpc('increment_user_metric', {
      p_user_id: userId,
      p_column: column,
      p_delta: delta,
    })
    if (error) console.error(`[${context}] metric bump failed`, error.message)
  })()
}
