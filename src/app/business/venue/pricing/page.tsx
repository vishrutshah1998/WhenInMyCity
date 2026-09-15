import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import PricingClient from './PricingClient'
import SectionTabs from '@/components/dashboard/SectionTabs'

const VENUE_SETTINGS_TABS = [
  { label: 'My Venue', href: '/business/venue/venue' },
  { label: 'Pricing', href: '/business/venue/pricing' },
  { label: 'Availability Rules', href: '/business/venue/availability' },
]

export default async function PricingPage() {
  const { user } = await requireAuth('/business/venue/pricing')
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

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
      <PricingClient venue={venue} />
    </>
  )
}
