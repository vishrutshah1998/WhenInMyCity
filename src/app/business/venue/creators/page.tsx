import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import CreatorsClient, { type ProposalWithMaker } from './CreatorsClient'

export default async function VenueCreatorsPage() {
  const { user } = await requireAuth('/business/venue/creators')

  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { data: proposals } = await admin
    .from('maker_venue_proposals')
    .select(`
      *,
      maker:maker_id (
        id, display_name, username, avatar_url,
        creator_type, user_tier, cumulative_events_hosted
      )
    `)
    .eq('venue_id', venue.id)
    .order('created_at', { ascending: false })

  return (
    <CreatorsClient initialProposals={(proposals ?? []) as unknown as ProposalWithMaker[]} />
  )
}
