import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import PricingClient from './PricingClient'

export default async function PricingPage() {
  const { user } = await requireAuth('/business/venue/pricing')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  return <PricingClient venue={venue} />
}
