'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { notifyMakerOfProposalResponse } from '@/lib/notifications'
import { createNotification, resolveNotificationsForProposal } from '@/app/actions/notifications'
import { generateUniqueSlug } from '@/app/actions/events'
import { fromPgTime } from '@/lib/venue/timeFormat'
import type { MakerVenueProposal, ProposalStatus, UserTier, CreatorType, Json } from '@/types/database'
import type { ProposedSplitConfig } from '@/types/marketplace'

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
 * Accepts, declines, or counter-offers on a pending proposal. Only the
 * owning venue may call this. `counterOffer` is required for (and only
 * meaningful with) action === 'counter_offer'; it's persisted as-is into
 * the `counter_offer` JSONB column.
 *
 * On accept: also blocks a tentative `venue_availability` slot for the
 * proposed date, creates (or links, if `event_id` was already set) a draft
 * `events` row so the booking shows up on the maker's Events page to prep
 * against, and notifies the maker (WhatsApp-style log + in-app).
 * On accept/counter-offer: notifies the maker in-app.
 */
export async function respondToProposal(
  proposalId: string,
  action: 'accept' | 'decline' | 'counter_offer',
  note?: string,
  counterOffer?: ProposedSplitConfig,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!z.string().uuid().safeParse(proposalId).success) {
    return { error: 'Invalid proposal ID.' }
  }

  if (action === 'counter_offer' && !counterOffer) {
    return { error: 'Counter offer terms are required.' }
  }

  const admin = createAdminClient()

  const { data: proposal } = await admin
    .from('maker_venue_proposals')
    .select('id, venue_id, status, proposed_date, start_time, end_time, maker_id, event_title, counter_offer_by, event_id, expected_attendees')
    .eq('id', proposalId)
    .maybeSingle()

  if (!proposal) return { error: 'Proposal not found.' }
  if (!['pending', 'counter_offered'].includes(proposal.status)) {
    return { error: 'This proposal can no longer be modified.' }
  }
  // A 'counter_offered' status can mean either side's counter is on the
  // table — only respond when it's genuinely the Venue's turn (the maker's
  // original ask is still pending, or the maker just countered back).
  if (proposal.status === 'counter_offered' && proposal.counter_offer_by === 'venue') {
    return { error: "This is your own counter-offer — you're waiting on the maker to respond to it." }
  }

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name, address, lat, lng')
    .eq('id', proposal.venue_id)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) {
    return { error: 'You do not own this booking.' }
  }

  const newStatus =
    action === 'accept' ? 'accepted' :
    action === 'decline' ? 'declined' :
    'counter_offered'

  const { error } = await admin
    .from('maker_venue_proposals')
    .update({
      status:             newStatus,
      venue_response_note: note ?? null,
      updated_at:         new Date().toISOString(),
      ...(action === 'counter_offer' ? { counter_offer: counterOffer as unknown as Json, counter_offer_by: 'venue' as const } : {}),
    })
    .eq('id', proposalId)

  if (error) {
    console.error('[respondToProposal]', error.message)
    return { error: 'Failed to update proposal. Please try again.' }
  }

  // On acceptance: create a tentative availability slot so the date shows as booked.
  if (action === 'accept' && proposal.start_time && proposal.end_time) {
    const { error: slotError } = await admin
      .from('venue_availability')
      .insert({
        venue_id:   venue.id,
        date:       proposal.proposed_date,
        start_time: proposal.start_time,
        end_time:   proposal.end_time,
        status:     'pending',
      })

    if (slotError) {
      // Non-fatal: the proposal status was already updated.
      console.error('[respondToProposal] slot upsert', slotError.message)
    }
  }

  // On acceptance: create (or link, if the proposal already carried an
  // `event_id`) a draft event so the booking shows up on the maker's Events
  // page to prep against, using the proposal's real start/end time.
  let linkedEventId: string | null = null
  if (action === 'accept') {
    if (proposal.event_id) {
      linkedEventId = proposal.event_id
      const { error: linkError } = await admin
        .from('events')
        .update({ venue_id: venue.id })
        .eq('id', proposal.event_id)

      if (linkError) {
        console.error('[respondToProposal] event link', linkError.message)
      }
    } else if (proposal.start_time && proposal.end_time) {
      const startTime = fromPgTime(proposal.start_time)
      const endTime = fromPgTime(proposal.end_time)

      try {
        const slug = await generateUniqueSlug(proposal.event_title)
        const { data: newEvent, error: eventError } = await admin
          .from('events')
          .insert({
            creator_id:      proposal.maker_id,
            title:           proposal.event_title,
            venue_name:      venue.name,
            venue_address:   venue.address,
            venue_lat:       venue.lat,
            venue_lng:       venue.lng,
            venue_id:        venue.id,
            starts_at:       new Date(`${proposal.proposed_date}T${startTime}:00+05:30`).toISOString(),
            ends_at:         new Date(`${proposal.proposed_date}T${endTime}:00+05:30`).toISOString(),
            ticket_price:    0,
            capacity:        proposal.expected_attendees ?? null,
            status:          'draft',
            slug,
          })
          .select('id')
          .single()

        if (eventError || !newEvent) {
          console.error('[respondToProposal] event creation', eventError?.message)
        } else {
          linkedEventId = newEvent.id
          const { error: backlinkError } = await admin
            .from('maker_venue_proposals')
            .update({ event_id: newEvent.id })
            .eq('id', proposalId)

          if (backlinkError) {
            console.error('[respondToProposal] event backlink', backlinkError.message)
          }
        }
      } catch (err) {
        // Non-fatal: the proposal was already accepted; the maker can still
        // create the event manually if this fails.
        console.error('[respondToProposal] event creation', err)
      }
    }
  }

  // Notify maker of the response (fire-and-forget)
  notifyMakerOfProposalResponse(
    proposal as unknown as MakerVenueProposal,
    newStatus as 'accepted' | 'declined' | 'counter_offered',
    venue.name ?? 'The Venue',
  ).catch(() => {})

  // The venue has now acted on this proposal — clear the earlier unread
  // notifications tied to it (e.g. the original "new booking request") before
  // inserting any new one, so they don't linger as unread after being acted on.
  void (async () => {
    try {
      await resolveNotificationsForProposal(proposalId, admin)

      // In-app notification to maker on accept/counter-offer/decline. Only the
      // generic type is created — 'venue_proposal_accepted'/'venue_proposal_counter'
      // used to be written here too, but those are read only by queries scoped
      // to the venue owner's own recipient_id; sent to the maker instead, they
      // were unreachable dead rows.
      const notifByStatus = {
        accept: {
          type: 'proposal_accepted',
          title: 'Proposal accepted!',
          body: `${venue.name} accepted your booking for "${proposal.event_title}". It's in your Events page as a draft — add ticket details and publish when ready.`,
          actionUrl: linkedEventId ? `/dashboard/events/${linkedEventId}` : '/dashboard/events?tab=venue-bookings',
        },
        counter_offer: {
          type: 'proposal_counter',
          title: 'Counter offer received',
          body: `${venue.name} sent a counter offer for your booking request.`,
          actionUrl: '/dashboard/events?tab=venue-bookings',
        },
        decline: {
          type: 'proposal_declined',
          title: 'Booking request declined',
          body: `${venue.name} couldn't accommodate your booking for "${proposal.event_title}".`,
          actionUrl: '/dashboard/events?tab=venue-bookings',
        },
      }[action]

      await createNotification({
        recipientId: proposal.maker_id,
        ...notifByStatus,
        metadata: { proposalId },
      })

      // On accept, also notify the venue owner — they're the one who just
      // acted, but 'venue_proposal_accepted' was previously never written
      // with the correct recipient (see comment above), so it never showed
      // up in their own notifications. Gives both sides a persisted record
      // of the confirmation, not just the maker.
      if (action === 'accept') {
        await createNotification({
          recipientId: user.id,
          type: 'venue_proposal_accepted',
          title: 'Booking confirmed!',
          body: `Your booking for "${proposal.event_title}" on ${new Date(proposal.proposed_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} is confirmed and on your calendar.`,
          actionUrl: '/business/venue/bookings',
          metadata: { proposalId },
        })
      }
    } catch { /* fire-and-forget */ }
  })()

  return { error: null }
}

// ---------------------------------------------------------------------------
// Booking messages
// ---------------------------------------------------------------------------

export interface BookingMessageDTO {
  id:       string
  senderId: string
  body:     string
  sentAt:   string
  readAt:   string | null
}

/**
 * Resolves whether `userId` is a party to this proposal (the maker who sent
 * it, or the owner of the venue it was sent to). Returns null if the
 * proposal doesn't exist or the caller isn't a party to it.
 */
async function resolveProposalParty(
  proposalId: string,
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ makerId: string; venueOwnerId: string } | null> {
  const { data: proposal } = await admin
    .from('maker_venue_proposals')
    .select('maker_id, venue_id')
    .eq('id', proposalId)
    .maybeSingle()

  if (!proposal) return null

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('auth_user_id')
    .eq('id', proposal.venue_id)
    .maybeSingle()

  if (!venue || !venue.auth_user_id) return null
  if (userId !== proposal.maker_id && userId !== venue.auth_user_id) return null

  return { makerId: proposal.maker_id, venueOwnerId: venue.auth_user_id }
}

/**
 * Fetches the message thread for a booking proposal, marking messages from
 * the other party as read. Callable by either the maker who sent the
 * proposal or the owner of the venue it was sent to.
 */
export async function getBookingMessages(
  proposalId: string,
): Promise<{ messages: BookingMessageDTO[]; error: string | null }> {
  const { user } = await requireAuth()

  if (!z.string().uuid().safeParse(proposalId).success) {
    return { messages: [], error: 'Invalid proposal ID.' }
  }

  const admin = createAdminClient()

  const party = await resolveProposalParty(proposalId, user.id, admin)
  if (!party) return { messages: [], error: 'You do not have access to this booking.' }

  const { error: readError } = await admin
    .from('booking_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('proposal_id', proposalId)
    .neq('sender_id', user.id)
    .is('read_at', null)

  if (readError) console.error('[getBookingMessages] mark read', readError.message)

  const { data, error } = await admin
    .from('booking_messages')
    .select('id, sender_id, body, sent_at, read_at')
    .eq('proposal_id', proposalId)
    .order('sent_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('[getBookingMessages]', error.message)
    return { messages: [], error: 'Failed to load messages.' }
  }

  return {
    messages: (data ?? []).map((m) => ({
      id:       m.id,
      senderId: m.sender_id,
      body:     m.body,
      sentAt:   m.sent_at,
      readAt:   m.read_at,
    })),
    error: null,
  }
}

/**
 * Sends a message on a booking proposal. Callable by either the maker who
 * sent the proposal or the owner of the venue it was sent to.
 */
export async function sendBookingMessage(
  proposalId: string,
  body: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!z.string().uuid().safeParse(proposalId).success) {
    return { error: 'Invalid proposal ID.' }
  }

  const trimmed = body.trim()
  if (!trimmed) return { error: 'Message cannot be empty.' }
  if (trimmed.length > 2000) return { error: 'Message is too long.' }

  const admin = createAdminClient()

  const party = await resolveProposalParty(proposalId, user.id, admin)
  if (!party) return { error: 'You do not have access to this booking.' }

  const { error } = await admin.from('booking_messages').insert({
    proposal_id: proposalId,
    sender_id:   user.id,
    body:        trimmed,
  })

  if (error) {
    console.error('[sendBookingMessage]', error.message)
    return { error: 'Failed to send message. Please try again.' }
  }

  return { error: null }
}
