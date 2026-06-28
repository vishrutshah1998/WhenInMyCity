import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { profileUrl } from '@/lib/profile-url'
import { getOrCreateReferralLink, getReferralLinkStats } from '@/app/actions/referrals'
import EventManageClient from './EventManageClient'

export default async function EventManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const [{ data: event }, { data: profile }, { count: rsvpCount }] = await Promise.all([
    admin.from('events').select('*').eq('id', id).eq('creator_id', user.id).maybeSingle(),
    admin.from('user_profiles').select('user_tier, username, city').eq('id', user.id).single(),
    admin.from('rsvps').select('id', { count: 'exact', head: true }).eq('event_id', id).eq('payment_status', 'captured'),
  ])

  if (!event) notFound()

  // Referral link — only for published events
  let referralUrl: string | null = null
  let referralStats = { total: 0, redeemed: 0 }

  if (event.status === 'published' && profile?.username) {
    const [linkResult, stats] = await Promise.all([
      getOrCreateReferralLink(event.id),
      getReferralLinkStats(event.id),
    ])
    if (linkResult.code) {
      referralUrl = `https://wheninmycity.com${profileUrl(profile.city, profile.username)}/ref/${linkResult.code}`
    }
    referralStats = stats
  }

  return (
    <EventManageClient
      event={event}
      rsvpCount={rsvpCount ?? 0}
      creatorTier={(profile?.user_tier ?? 'wanderer') as string}
      referralUrl={referralUrl}
      referralStats={referralStats}
    />
  )
}
