// =============================================================================
// WIMC — Notification helpers
// All functions are fire-and-forget and must never throw.
// =============================================================================

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { Event, MakerAddaProposal, UserProfile } from '@/types/database'

/** Short date formatter for notification messages — e.g. "15 Apr 2026". */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

// ---------------------------------------------------------------------------
// notifyAddaOfProposal
// ---------------------------------------------------------------------------

/**
 * Logs a WhatsApp-style notification to the Adda owner when a Maker sends
 * a new event proposal.
 *
 * **v1:** Outputs to `console.log`. A real WhatsApp Business API call
 * (e.g. via Meta Cloud API or Twilio) will replace this in v2.
 *
 * Message format:
 * ```
 * 🎪 New event proposal!
 * [Maker name] wants to host [event title] at your Adda on [date]
 * View proposal: wheninmycity.com/adda/[slug]/proposals/[id]
 * ```
 *
 * @param proposal  The `maker_adda_proposals` row that was just inserted.
 * @param makerName Human-readable name of the Maker (from user_profiles).
 * @param addaSlug  The Adda's URL slug (for the deep-link in the message).
 */
export async function notifyAddaOfProposal(
  proposal: MakerAddaProposal,
  makerName: string,
  addaSlug: string,
  addaWhatsapp?: string | null,
): Promise<void> {
  try {
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'}/adda/${addaSlug}/proposals/${proposal.id}`
    const message = [
      '🎪 New event proposal!',
      `${makerName} wants to host "${proposal.event_title}" at your Adda on ${formatDate(proposal.proposed_date)}.`,
      `View proposal: ${proposalUrl}`,
    ].join('\n')

    if (addaWhatsapp) {
      await sendWhatsAppMessage(addaWhatsapp, message)
    } else {
      console.log('[NOTIFY:WhatsApp → Adda]', message)
    }
  } catch {
    // Notifications must never crash the caller.
  }
}

// ---------------------------------------------------------------------------
// notifyMakerOfProposalResponse
// ---------------------------------------------------------------------------

/**
 * Logs a WhatsApp-style notification to the Maker when an Adda responds to
 * their proposal (accept, decline, or counter-offer).
 *
 * **v1:** Outputs to `console.log`. Real WhatsApp delivery in v2.
 *
 * Message format (accepted):
 * ```
 * ✅ Your proposal was accepted!
 * [Adda name] accepted your request to host "[event title]" on [date].
 * Manage booking: wheninmycity.com/dashboard/proposals/[id]
 * ```
 *
 * Message format (declined):
 * ```
 * ❌ Proposal declined
 * [Adda name] couldn't accommodate "[event title]" on [date].
 * Find another Adda: wheninmycity.com/dashboard/addas
 * ```
 *
 * Message format (counter_offered):
 * ```
 * 💬 Counter-offer received
 * [Adda name] sent a counter-offer for "[event title]".
 * Review and respond: wheninmycity.com/dashboard/proposals/[id]
 * ```
 *
 * @param proposal  The `maker_adda_proposals` row.
 * @param response  How the Adda responded.
 * @param addaName  Human-readable name of the Adda.
 */
export async function notifyMakerOfProposalResponse(
  proposal: MakerAddaProposal,
  response: 'accepted' | 'declined' | 'counter_offered',
  addaName: string,
): Promise<void> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'
    const proposalUrl = `${appUrl}/dashboard/venues`

    const notifConfig = {
      accepted: {
        type:  'proposal_accepted',
        title: 'Booking Request Accepted 🎉',
        body:  `${addaName} accepted your request to host "${proposal.event_title}" on ${formatDate(proposal.proposed_date)}.`,
        wa:    `✅ Great news! ${addaName} accepted your booking request for "${proposal.event_title}" on ${formatDate(proposal.proposed_date)}. Manage it here: ${proposalUrl}`,
      },
      declined: {
        type:  'proposal_declined',
        title: 'Booking Request Declined',
        body:  `${addaName} couldn't accommodate "${proposal.event_title}" on ${formatDate(proposal.proposed_date)}.`,
        wa:    `❌ ${addaName} couldn't accommodate "${proposal.event_title}" on ${formatDate(proposal.proposed_date)}. Try another venue: ${proposalUrl}`,
      },
      counter_offered: {
        type:  'proposal_counter_offered',
        title: 'Counter-offer Received 💬',
        body:  `${addaName} sent a counter-offer for "${proposal.event_title}".`,
        wa:    `💬 ${addaName} sent a counter-offer for "${proposal.event_title}". Review it: ${proposalUrl}`,
      },
    }

    const cfg = notifConfig[response]
    const admin = createAdminClient()

    // maker_id == user_profiles.id == auth.users.id
    await Promise.all([
      admin.from('notifications').insert({
        recipient_id: proposal.maker_id,
        type:         cfg.type,
        title:        cfg.title,
        body:         cfg.body,
        action_url:   '/dashboard/venues',
        metadata:     { proposal_id: proposal.id, adda_name: addaName },
      }),

      (async () => {
        const { data: profile } = await admin
          .from('user_profiles')
          .select('phone')
          .eq('id', proposal.maker_id)
          .maybeSingle()
        if (profile?.phone) {
          await sendWhatsAppMessage(profile.phone, cfg.wa).catch(() => {})
        }
      })(),
    ])
  } catch {
    // Notifications must never crash the caller.
  }
}

// ---------------------------------------------------------------------------
// notifyFollowersOfNewEvent
// ---------------------------------------------------------------------------

const FOLLOWER_BATCH_SIZE = 1_000

/**
 * Creates a 'followed_maker_new_event' notification row for every Explorer
 * who follows the given Maker, and logs the WhatsApp message that would be
 * sent in v2.
 *
 * Notification inserts go through the admin client (RLS blocks normal client
 * inserts on the notifications table).
 *
 * Batches DB inserts in groups of FOLLOWER_BATCH_SIZE to avoid request
 * size limits.
 *
 * @param event  - The newly published event row.
 * @param maker  - The creator's user_profiles row.
 */
export async function notifyFollowersOfNewEvent(
  event: Event,
  maker: UserProfile,
): Promise<void> {
  try {
    const admin = createAdminClient()

    // Find all Explorer profiles that follow this Maker.
    const { data: followers, error: fetchError } = await admin
      .from('explorer_profiles')
      .select('id, auth_user_id, display_name, notification_preferences')
      .contains('followed_maker_ids', [maker.id])

    if (fetchError) {
      console.error('[notifyFollowersOfNewEvent] fetch followers failed', fetchError.message)
      return
    }

    if (!followers?.length) return

    console.info(
      `[notifyFollowersOfNewEvent] notifying ${followers.length} followers`,
      { eventId: event.id, makerId: maker.id },
    )

    const eventUrl = `/${maker.username}/${event.slug}`
    const title    = `${maker.display_name} just listed a new event`

    // Build notification rows + log WhatsApp messages.
    const notifications = followers.map((f) => {
      // v2: trigger WhatsApp message per Explorer.
      const prefs = f.notification_preferences as
        | { whatsapp?: boolean; digest_frequency?: string }
        | null
      if (prefs?.whatsapp !== false) {
        console.log('[NOTIFY:WhatsApp → Explorer]', {
          explorerId: f.id,
          message: `Hi ${f.display_name}! ${maker.display_name} just listed "${event.title}". Book your spot: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}${eventUrl}`,
        })
      }

      return {
        recipient_id: f.auth_user_id,
        type:         'followed_maker_new_event' as const,
        title,
        body:         event.title,
        action_url:   eventUrl,
        metadata:     { event_id: event.id, maker_id: maker.id },
      }
    })

    // Batch inserts.
    for (let i = 0; i < notifications.length; i += FOLLOWER_BATCH_SIZE) {
      const batch = notifications.slice(i, i + FOLLOWER_BATCH_SIZE)

      const { error: insertError } = await admin
        .from('notifications')
        .insert(batch)

      if (insertError) {
        console.error(
          '[notifyFollowersOfNewEvent] batch insert failed',
          { batchStart: i, batchSize: batch.length },
          insertError.message,
        )
      }
    }
  } catch (err) {
    // Must never crash the caller.
    console.error('[notifyFollowersOfNewEvent] unexpected error', String(err))
  }
}

// ---------------------------------------------------------------------------
// notifyNearbyExplorers
// ---------------------------------------------------------------------------

/**
 * Notifies explorers in the same city as the Maker who have at least one
 * matching interest tag — but are NOT already followers (they get their own
 * notification via notifyFollowersOfNewEvent).
 *
 * Batches DB inserts to stay within request size limits.
 */
export async function notifyNearbyExplorers(
  event: Event,
  maker: UserProfile,
): Promise<void> {
  try {
    if (!maker.city || !maker.interest_tags?.length) return

    const admin = createAdminClient()

    // Fetch explorers in the same city who are NOT already followers.
    const { data: candidates, error: fetchError } = await admin
      .from('explorer_profiles')
      .select('id, auth_user_id, display_name, interest_tags, followed_maker_ids, notification_preferences')
      .eq('city', maker.city)

    if (fetchError) {
      console.error('[notifyNearbyExplorers] fetch failed', fetchError.message)
      return
    }

    if (!candidates?.length) return

    const makerTagSet = new Set(maker.interest_tags)
    const eventUrl = `/${maker.username}/${event.slug}`
    const title = `New event near you: ${event.title}`

    const notifications: Array<{
      recipient_id: string
      type: string
      title: string
      body: string
      action_url: string
      metadata: Record<string, string>
    }> = []

    for (const explorer of candidates) {
      // Skip followers — they get notifyFollowersOfNewEvent instead.
      if ((explorer.followed_maker_ids as string[]).includes(maker.id)) continue

      // Require at least one interest tag match.
      const hasTagMatch = (explorer.interest_tags as string[]).some((t) => makerTagSet.has(t))
      if (!hasTagMatch) continue

      const prefs = explorer.notification_preferences as
        | { whatsapp?: boolean; digest_frequency?: string }
        | null
      if (prefs?.whatsapp !== false) {
        console.log('[NOTIFY:WhatsApp → Explorer (nearby)]', {
          explorerId: explorer.id,
          message: `Hi ${explorer.display_name}! There's a new event in your city that matches your interests: "${event.title}" by ${maker.display_name}. Check it out: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}${eventUrl}`,
        })
      }

      notifications.push({
        recipient_id: explorer.auth_user_id,
        type:         'recommended_event_nearby',
        title,
        body:         `By ${maker.display_name} · ${formatDate(event.starts_at)}`,
        action_url:   eventUrl,
        metadata:     { event_id: event.id, maker_id: maker.id },
      })
    }

    if (!notifications.length) return

    console.info(`[notifyNearbyExplorers] notifying ${notifications.length} explorers`, {
      eventId: event.id, city: maker.city,
    })

    for (let i = 0; i < notifications.length; i += FOLLOWER_BATCH_SIZE) {
      const batch = notifications.slice(i, i + FOLLOWER_BATCH_SIZE)
      const { error: insertError } = await admin.from('notifications').insert(batch)
      if (insertError) {
        console.error('[notifyNearbyExplorers] batch insert failed', {
          batchStart: i, batchSize: batch.length,
        }, insertError.message)
      }
    }
  } catch (err) {
    console.error('[notifyNearbyExplorers] unexpected error', String(err))
  }
}
