import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVenueNotifications } from '@/app/actions/venue-notifications'
import { VenueNotificationsClient } from '@/components/venue/VenueNotificationsClient'

export const metadata = { title: 'Inbox — Venue' }

export default async function VenueNotificationsPage() {
  const { user } = await requireAuth('/business/venue/notifications')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { notifications, unreadCount } = await getVenueNotifications(venue.id, 100)

  return <VenueNotificationsClient notifications={notifications} unreadCount={unreadCount} />
}
