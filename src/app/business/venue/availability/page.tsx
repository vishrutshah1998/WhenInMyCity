import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AvailabilityClient from './AvailabilityClient'
import { getAvailabilityRules } from '@/app/actions/venue-availability'

export const metadata = { title: 'Availability Rules — Adda' }

export default async function AvailabilityPage() {
  const { user } = await requireAuth('/business/venue/availability')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const { rules } = await getAvailabilityRules(adda.id)

  return <AvailabilityClient addaId={adda.id} initialRules={rules} />
}
