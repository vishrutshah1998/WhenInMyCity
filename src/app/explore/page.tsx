import { redirect } from 'next/navigation'
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

  // Require an explorer profile — redirect to setup if missing.
  const { data: explorerRow } = await admin
    .from('explorer_profiles')
    .select('saved_event_ids, city')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!explorerRow) redirect('/onboarding/explorer')

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

  const savedEventIds: string[] = explorerRow.saved_event_ids ?? []

  return (
    <BrowseClient
      events={events}
      savedEventIds={savedEventIds}
      currentFilters={filters}
    />
  )
}
