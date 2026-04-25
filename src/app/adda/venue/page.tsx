import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AddaSidebar from '@/components/adda/AddaSidebar'
import VenueEditorClient from '@/components/adda/venue/VenueEditorClient'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function VenuePage() {
  const { user } = await requireAuth('/adda/venue')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/adda/onboarding')

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Owner'

  return (
    <div className="adda-theme" style={{ minHeight: '100vh', background: 'var(--adda-bg-base)' }}>
      <AddaSidebar
        addaId={adda.id}
        venueName={adda.name}
        ownerName={ownerName}
        initials={getInitials(ownerName)}
      />
      <div style={{ marginLeft: 240 }}>
        <VenueEditorClient adda={adda} slug={adda.slug} />
      </div>
    </div>
  )
}
