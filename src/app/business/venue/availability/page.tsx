import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AvailabilityClient from './AvailabilityClient'
import { getAvailabilityRules } from '@/app/actions/venue-availability'
import SectionTabs from '@/components/dashboard/SectionTabs'

export const metadata = { title: 'Availability Rules — Venue' }

const VENUE_SETTINGS_TABS = [
  { label: 'My Venue', href: '/business/venue/venue' },
  { label: 'Pricing', href: '/business/venue/pricing' },
  { label: 'Availability Rules', href: '/business/venue/availability' },
]

export default async function AvailabilityPage() {
  const { user } = await requireAuth('/business/venue/availability')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const { rules } = await getAvailabilityRules(venue.id)

  return (
    <>
      <div style={{ padding: '12px 24px 0', background: 'var(--venue-bg-surface)' }}>
        <SectionTabs
          tabs={VENUE_SETTINGS_TABS}
          textColor="var(--venue-text-primary)"
          mutedColor="var(--venue-text-muted)"
          accentColor="var(--venue-accent, #5DD9D0)"
          borderColor="var(--venue-border-default)"
        />
      </div>
      <AvailabilityClient venueId={venue.id} initialRules={rules} />
    </>
  )
}
