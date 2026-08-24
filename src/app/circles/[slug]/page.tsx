import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import {
  getCommunityBySlug,
  getCommunityMembership,
  getCommunityMemberCount,
  getCommunityFeed,
  getCommunityCalendar,
  getPendingJoinRequests,
} from '@/app/actions/communities'
import CircleClient from './CircleClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const community = await getCommunityBySlug(slug)

  if (!community || community.status !== 'approved') return { title: 'Circle not found — WIMC' }

  return {
    title: `${community.name} — When In My City`,
    description: community.description ?? `${community.name}, a WIMC community.`,
    openGraph: {
      title: community.name,
      description: community.description ?? `${community.name}, a WIMC community.`,
      images: community.cover_image_url ? [{ url: community.cover_image_url }] : [],
    },
  }
}

export default async function CircleSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const community = await getCommunityBySlug(slug)

  if (!community) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const viewerUserId = user?.id ?? null

  // communities_select_public_or_own already keeps a pending/rejected
  // community hidden from everyone except its creator — but getCommunityBySlug
  // uses the session client, so this only ever resolves for the creator or an
  // approved community in the first place. Guard explicitly for clarity.
  if (community.status !== 'approved' && community.created_by !== viewerUserId) notFound()

  const [membership, memberCount, feed, calendar] = await Promise.all([
    getCommunityMembership(community.id),
    getCommunityMemberCount(community.id),
    getCommunityFeed(community.id),
    getCommunityCalendar(community.id),
  ])

  const pendingRequests = membership.isOwner ? await getPendingJoinRequests(community.id) : []

  return (
    <CircleClient
      community={community}
      membership={membership}
      memberCount={memberCount}
      initialFeed={feed}
      calendar={calendar}
      pendingRequests={pendingRequests}
      viewerUserId={viewerUserId}
    />
  )
}
