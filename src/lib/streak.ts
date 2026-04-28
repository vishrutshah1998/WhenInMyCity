import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

// Returns the ISO date string (YYYY-MM-DD) of the Monday that starts the
// calendar week containing `date`.
function weekMonday(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon, …
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().slice(0, 10)
}

/**
 * Updates the weekly attendance streak for a user after a successful check-in.
 *
 * Rules:
 *  - Same week as last attendance → no-op (already counted)
 *  - Next consecutive week       → streak++
 *  - One week missed + freeze token available → streak++, freeze--
 *  - Otherwise                  → streak resets to 1
 *
 * Swallows all errors so streak logic never breaks check-in.
 */
export async function updateAttendanceStreak(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  userId: string,
): Promise<void> {
  try {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('attendance_streak, streak_freeze_tokens, last_streak_week')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) return

    const currentWeek = weekMonday(new Date())
    const lastWeek    = profile.last_streak_week as string | null

    let streak       = (profile.attendance_streak       as number) ?? 0
    let freezeTokens = (profile.streak_freeze_tokens    as number) ?? 0

    if (!lastWeek) {
      streak = 1
    } else if (lastWeek === currentWeek) {
      return // already counted this week
    } else {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000
      const weeksDiff = Math.round(
        (new Date(currentWeek).getTime() - new Date(lastWeek).getTime()) / msPerWeek,
      )

      if (weeksDiff === 1) {
        streak++
      } else if (weeksDiff === 2 && freezeTokens > 0) {
        streak++
        freezeTokens--
      } else {
        streak = 1
      }
    }

    await admin
      .from('user_profiles')
      .update({
        attendance_streak:    streak,
        streak_freeze_tokens: freezeTokens,
        last_streak_week:     currentWeek,
      })
      .eq('id', userId)
  } catch {
    // Never surface streak errors to the caller
  }
}
