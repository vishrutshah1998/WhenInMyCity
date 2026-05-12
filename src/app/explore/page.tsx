import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { browseEvents } from '@/app/actions/explorer'
import BrowseClient from './BrowseClient'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; interest_tag?: string; date?: string }>
}) {
  const { user } = await requireAuth('/explore')
  const admin = createAdminClient()

  const [{ data: explorerRow }, { data: userProfile }] = await Promise.all([
    admin
      .from('explorer_profiles')
      .select('saved_event_ids, city')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('attendance_streak, streak_freeze_tokens, setup_checklist_dismissed, events_attended_count, created_at')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const params = await searchParams

  const filters = {
    city:         params.city         ?? '',
    interest_tag: params.interest_tag ?? '',
    date:         params.date         ?? '',
  }

  const { events } = await browseEvents({
    city:         filters.city         || undefined,
    interest_tag: filters.interest_tag || undefined,
    date:         filters.date         || undefined,
  })

  const savedEventIds: string[] = explorerRow?.saved_event_ids ?? []

  // Show the onboarding challenge card for new users who haven't attended any events yet
  const dismissed         = userProfile?.setup_checklist_dismissed ?? []
  const createdAt         = userProfile?.created_at ?? new Date().toISOString()
  const daysSinceSignup   = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  const showChallengeCard =
    !dismissed.includes('challenge_card') &&
    (userProfile?.events_attended_count ?? 0) === 0 &&
    daysSinceSignup < 14

  return (
    <BrowseClient
      events={events}
      savedEventIds={savedEventIds}
      currentFilters={filters}
      attendanceStreak={userProfile?.attendance_streak ?? 0}
      streakFreezeTokens={userProfile?.streak_freeze_tokens ?? 0}
      showChallengeCard={showChallengeCard}
      signupDate={createdAt}
      city={explorerRow?.city ?? ''}
    />
  )
}
