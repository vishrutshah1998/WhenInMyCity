import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAddaBookings } from '@/app/actions/adda-bookings'
import AddaSidebar from '@/components/adda/AddaSidebar'
import BookingsPageClient from '@/components/adda/bookings/BookingsPageClient'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function AddaBookingsPage() {
  const { user } = await requireAuth('/adda/bookings')

  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/adda/onboarding')

  // Fetch all statuses in one round-trip; client filters by tab
  const { proposals, error } = await getAddaBookings(adda.id, [
    'pending',
    'counter_offered',
    'accepted',
    'declined',
    'expired',
    'withdrawn',
  ])

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
        {/* Sticky topbar */}
        <header style={{
          position: 'sticky',
          top: 0,
          height: 56,
          background: 'rgba(10, 10, 10, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--adda-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          zIndex: 40,
        }}>
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              lineHeight: 1.2,
            }}>
              Bookings
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              marginTop: 1,
            }}>
              {adda.name}
            </div>
          </div>
        </header>

        <BookingsPageClient
          addaId={adda.id}
          initialProposals={proposals}
          fetchError={error}
        />
      </div>
    </div>
  )
}
