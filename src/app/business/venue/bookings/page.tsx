import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAddaBookings } from '@/app/actions/adda-bookings'
import BookingsPageClient from '@/components/adda/bookings/BookingsPageClient'

export default async function AddaBookingsPage() {
  const { user } = await requireAuth('/business/venue/bookings')

  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const { proposals, error } = await getAddaBookings(adda.id, [
    'pending',
    'counter_offered',
    'accepted',
    'declined',
    'expired',
    'withdrawn',
  ])

  return (
    <BookingsPageClient
      addaId={adda.id}
      initialProposals={proposals}
      fetchError={error}
    />
  )
}
