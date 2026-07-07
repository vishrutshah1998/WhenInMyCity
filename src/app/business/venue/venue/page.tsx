import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import VenueEditorClient from '@/components/venue/editor/VenueEditorClient'

export default async function VenuePage() {
  const { user } = await requireAuth('/business/venue/venue')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  return <VenueEditorClient adda={adda} slug={adda.slug} />
}
