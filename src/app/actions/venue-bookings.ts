'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { MakerVenueProposal, ProposalStatus, UserTier, CreatorType } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MakerInfo {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  creator_type: CreatorType
  is_verified: boolean
  user_tier: UserTier
  cumulative_events_hosted: number
  is_founding_maker: boolean
}

export interface ProposalWithMaker extends MakerVenueProposal {
  maker: MakerInfo
}

// ---------------------------------------------------------------------------
// Ownership helper
// ---------------------------------------------------------------------------

async function resolveOwnedVenueId(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const { data } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// ---------------------------------------------------------------------------
// getVenueBookings
// ---------------------------------------------------------------------------

/**
 * Fetches all proposals for the caller's venue matching the given statuses,
 * joined with the maker's public profile info.
 */
export async function getVenueBookings(
  venueId: string,
  statuses: ProposalStatus[],
): Promise<{ proposals: ProposalWithMaker[]; error: string | null }> {
  const { user } = await requireAuth('/business/venue/bookings')

  if (!z.string().uuid().safeParse(venueId).success) {
    return { proposals: [], error: 'Invalid Venue ID.' }
  }

  const admin = createAdminClient()

  const ownedId = await resolveOwnedVenueId(user.id, admin)
  if (!ownedId || ownedId !== venueId) {
    return { proposals: [], error: 'Venue not found or you do not own this profile.' }
  }

  const { data: proposals, error } = await admin
    .from('maker_venue_proposals')
    .select('*')
    .eq('venue_id', venueId)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getVenueBookings]', error.message)
    return { proposals: [], error: 'Failed to load bookings.' }
  }

  if (!proposals?.length) return { proposals: [], error: null }

  const makerIds = [...new Set(proposals.map((p) => p.maker_id))]
  const { data: makers } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, creator_type, is_verified, user_tier, cumulative_events_hosted, is_founding_maker')
    .in('id', makerIds)

  const makerMap = new Map((makers ?? []).map(m => [m.id, m]))

  const result: ProposalWithMaker[] = proposals.map(p => {
    const m = makerMap.get(p.maker_id)
    return {
      ...p,
      maker: {
        id:                       m?.id ?? p.maker_id,
        display_name:             m?.display_name ?? 'Unknown Maker',
        username:                 m?.username ?? '',
        avatar_url:               m?.avatar_url ?? null,
        creator_type:             (m?.creator_type ?? 'content_creation') as CreatorType,
        is_verified:              m?.is_verified ?? false,
        user_tier:               (m?.user_tier ?? 'wanderer') as UserTier,
        cumulative_events_hosted: m?.cumulative_events_hosted ?? 0,
        is_founding_maker:        m?.is_founding_maker ?? false,
      },
    }
  })

  return { proposals: result, error: null }
}

// ---------------------------------------------------------------------------
// respondToProposal
// ---------------------------------------------------------------------------

/**
 * Accepts or declines a pending proposal. Only the owning venue may call this.
 */
export async function respondToProposal(
  proposalId: string,
  action: 'accept' | 'decline',
  note?: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!z.string().uuid().safeParse(proposalId).success) {
    return { error: 'Invalid proposal ID.' }
  }

  const admin = createAdminClient()

  const { data: proposal } = await admin
    .from('maker_venue_proposals')
    .select('id, venue_id, status')
    .eq('id', proposalId)
    .maybeSingle()

  if (!proposal) return { error: 'Proposal not found.' }
  if (!['pending', 'counter_offered'].includes(proposal.status)) {
    return { error: 'This proposal can no longer be modified.' }
  }

  const ownedId = await resolveOwnedVenueId(user.id, admin)
  if (!ownedId || ownedId !== proposal.venue_id) {
    return { error: 'You do not own this booking.' }
  }

  const { error } = await admin
    .from('maker_venue_proposals')
    .update({
      status:             action === 'accept' ? 'accepted' : 'declined',
      venue_response_note: note ?? null,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', proposalId)

  if (error) {
    console.error('[respondToProposal]', error.message)
    return { error: 'Failed to update proposal. Please try again.' }
  }

  return { error: null }
}
