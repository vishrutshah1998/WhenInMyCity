import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import DashboardOverview from '@/components/dashboard/DashboardOverview'
import { getLinkClickStats } from '@/app/actions/analytics'
import type { BookingRow } from '@/types/database'

export default async function DashboardPage() {
  const { profile } = await requireProfile()

  const supabase = await createClient()

  const [{ data: events }, linkClickStats] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('creator_id', profile.id)
      .order('starts_at', { ascending: false }),
    getLinkClickStats(profile.id),
  ])

  // Fetch bookings (RSVPs by others for the creator's events)
  const eventIds = (events ?? []).map((e) => e.id)
  const { data: bookingRows } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('id, event_id, attendee_name, attendee_phone, payment_status, amount_paid, qr_code_token, checked_in, created_at, events(id, title, starts_at, ends_at, venue_name, venue_address, cover_image_url, slug, ticket_price, status)')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
        .order('created_at', { ascending: false })
    : { data: [] }

  const safeProfile = { ...profile, social_links: profile.social_links ?? null }

  return (
    <Suspense>
      <DashboardOverview
        profile={safeProfile}
        events={events ?? []}
        bookings={(bookingRows ?? []) as unknown as BookingRow[]}
        linkClickStats={linkClickStats}
      />
    </Suspense>
  )
}
