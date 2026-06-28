import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import CreatorsClient, { type ProposalWithMaker } from './CreatorsClient'

export default async function AddaCreatorsPage() {
  const { user } = await requireAuth('/business/venue/creators')

  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const { data: proposals } = await admin
    .from('maker_adda_proposals')
    .select(`
      *,
      maker:maker_id (
        id, display_name, username, avatar_url,
        creator_type, user_tier, cumulative_events_hosted
      )
    `)
    .eq('adda_id', adda.id)
    .order('created_at', { ascending: false })

  return (
    <CreatorsClient initialProposals={(proposals ?? []) as unknown as ProposalWithMaker[]} />
  )
}
