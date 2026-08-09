'use server'

// =============================================================================
// WIMC — Notification Server Actions
//
// Handles reading and updating notifications for all user roles.
// The notifications table uses admin-client inserts (RLS blocks normal writes);
// reads and mark-read updates work via the server client which applies RLS.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { Notification, Json } from '@/types/database'

// ---------------------------------------------------------------------------
// createNotification
// ---------------------------------------------------------------------------

/**
 * Inserts a notification row for any user. Uses the admin client so it can
 * write on behalf of users other than the caller (e.g. notifying a creator
 * when an attendee buys a ticket). Fire-and-forget safe.
 */
export async function createNotification({
  recipientId,
  type,
  title,
  body,
  actionUrl,
  metadata,
}: {
  recipientId: string
  type: string
  title: string
  body: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.from('notifications').insert({
    recipient_id: recipientId,
    type,
    title,
    body,
    action_url: actionUrl ?? null,
    is_read: false,
    ...(metadata ? { metadata: metadata as Json } : {}),
  })

  if (error) {
    console.error('[createNotification]', { recipientId, type }, error.message)
  }
}

// ---------------------------------------------------------------------------
// resolveNotificationsForProposal
// ---------------------------------------------------------------------------

/**
 * Marks any still-unread notifications tagged with this proposal's ID
 * (via `metadata.proposalId`) as read. Called whenever a proposal moves to
 * a new state (countered, accepted, declined) so the notification that
 * prompted the now-superseded state doesn't linger as unread forever —
 * previously nothing ever resolved these, so e.g. the original "new booking
 * request" notification stayed unread even after the proposal was fully
 * accepted several steps later.
 */
export async function resolveNotificationsForProposal(
  proposalId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { error } = await admin
    .from('notifications')
    .update({ is_read: true })
    .contains('metadata', { proposalId })
    .eq('is_read', false)

  if (error) {
    console.error('[resolveNotificationsForProposal]', { proposalId }, error.message)
  }
}

// ---------------------------------------------------------------------------
// getNotificationsForUser
// ---------------------------------------------------------------------------

/**
 * Returns the 50 most recent notifications for the authenticated user,
 * ordered by created_at DESC.
 *
 * Works for all roles (Maker, Venue, Explorer) — notification types differ
 * but the query is identical.
 *
 * Notification types by role:
 *   Maker:    'new_follower' | 'event_rsvp' | 'tier_upgrade' | 'proposal_response' | 'new_rating'
 *   Venue:     'new_proposal' | 'event_confirmed' | 'payment_settled'
 *   Explorer: 'followed_maker_new_event' | 'event_reminder' | 'rating_prompt'
 */
export async function getNotificationsForUser(): Promise<Notification[]> {
  const { user } = await requireAuth()

  // Use the SSR client so RLS applies (recipient_id = auth.uid()).
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getNotificationsForUser]', error.message)
    return []
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// markNotificationRead
// ---------------------------------------------------------------------------

/**
 * Marks a single notification as read.
 *
 * No-ops if the notification is already read or belongs to a different user
 * (RLS ensures only own rows are touched).
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { user } = await requireAuth()

  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)  // belt-and-suspenders alongside RLS

  if (error) {
    console.error('[markNotificationRead]', { notificationId }, error.message)
  }
}

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------

/**
 * Marks every unread notification for the authenticated user as read in one
 * UPDATE statement.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { user } = await requireAuth()

  // Admin client allows a single bulk update that bypasses the SELECT-then-
  // UPDATE round-trip (RLS UPDATE policy still checks recipient_id = auth.uid
  // for server client, but admin is faster for bulk ops).
  const admin = createAdminClient()

  const { error } = await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('[markAllNotificationsRead]', error.message)
  }
}
