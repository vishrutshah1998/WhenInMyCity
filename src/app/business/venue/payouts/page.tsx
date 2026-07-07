import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import VenuePayoutsClient from './VenuePayoutsClient'
import { getAddaPayoutData } from '@/app/actions/venue-payouts'

export const metadata = { title: 'Payouts — Adda' }

export default async function VenuePayoutsPage() {
  const { user } = await requireAuth('/business/venue/payouts')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const { summary, payableBookings, payoutHistory, error } = await getAddaPayoutData(adda.id)

  return (
    <VenuePayoutsClient
      addaId={adda.id}
      summary={summary}
      initialPayableBookings={payableBookings}
      initialPayoutHistory={payoutHistory}
      serverError={error}
    />
  )
}
