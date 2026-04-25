'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { MakerAddaProposal, ProposalStatus, MakerTier, CreatorType } from '@/types/database'

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
  maker_tier: MakerTier
  cumulative_events_hosted: number
  is_founding_maker: boolean
}

export interface ProposalWithMaker extends MakerAddaProposal {
  maker: MakerInfo
}

// ---------------------------------------------------------------------------
// Ownership helper
// ---------------------------------------------------------------------------

async function resolveOwnedAddaId(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const { data } = await admin
    .from('adda_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

// ---------------------------------------------------------------------------
// getAddaBookings
// ---------------------------------------------------------------------------

/**
 * Fetches all proposals for the caller's adda matching the given statuses,
 * joined with the maker's public profile info.
 */
export async function getAddaBookings(
  addaId: string,
  statuses: ProposalStatus[],
): Promise<{ proposals: ProposalWithMaker[]; error: string | null }> {
  const { user } = await requireAuth('/adda/bookings')

  if (!z.string().uuid().safeParse(addaId).success) {
    return { proposals: [], error: 'Invalid Adda ID.' }
  }

  const admin = createAdminClient()

  const ownedId = await resolveOwnedAddaId(user.id, admin)
  if (!ownedId || ownedId !== addaId) {
    return { proposals: [], error: 'Adda not found or you do not own this profile.' }
  }

  const { data: proposals, error } = await admin
    .from('maker_adda_proposals')
    .select('*')
    .eq('adda_id', addaId)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getAddaBookings]', error.message)
    return { proposals: [], error: 'Failed to load bookings.' }
  }

  if (!proposals?.length) return { proposals: [], error: null }

  const makerIds = [...new Set(proposals.map(p => p.maker_id))]
  const { data: makers } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, creator_type, is_verified, maker_tier, cumulative_events_hosted, is_founding_maker')
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
        maker_tier:               (m?.maker_tier ?? 'mohalla') as MakerTier,
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
 * Accepts or declines a pending proposal. Only the owning adda may call this.
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
    .from('maker_adda_proposals')
    .select('id, adda_id, status')
    .eq('id', proposalId)
    .maybeSingle()

  if (!proposal) return { error: 'Proposal not found.' }
  if (!['pending', 'counter_offered'].includes(proposal.status)) {
    return { error: 'This proposal can no longer be modified.' }
  }

  const ownedId = await resolveOwnedAddaId(user.id, admin)
  if (!ownedId || ownedId !== proposal.adda_id) {
    return { error: 'You do not own this booking.' }
  }

  const { error } = await admin
    .from('maker_adda_proposals')
    .update({
      status:             action === 'accept' ? 'accepted' : 'declined',
      adda_response_note: note ?? null,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', proposalId)

  if (error) {
    console.error('[respondToProposal]', error.message)
    return { error: 'Failed to update proposal. Please try again.' }
  }

  return { error: null }
}
