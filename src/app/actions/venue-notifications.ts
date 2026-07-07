'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { revalidatePath } from 'next/cache'

const VENUE_NOTIFICATION_TYPES = [
  'venue_new_proposal',
  'venue_proposal_accepted',
  'venue_proposal_counter',
  'venue_event_confirmed',
  'venue_new_rating',
  'venue_new_review',
  'venue_booking_reminder',
  'venue_payout_processed',
  'venue_new_inquiry',
  'venue_space_trending',
  // Include generic types that flow to venue owners
  'new_proposal',
  'proposal_accepted',
  'proposal_counter',
  'event_confirmed',
] as const

export async function getVenueNotifications(
  venueId: string,
  limit = 10,
): Promise<{ notifications: import('@/types/database').Notification[]; unreadCount: number; totalUnreadCount: number }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // Verify the user owns this venue
  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('id', venueId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) return { notifications: [], unreadCount: 0, totalUnreadCount: 0 }

  const supabase = await createClient()

  // Fetch display list + a separate COUNT so badges reflect real totals, not just the fetched slice.
  const [{ data }, { count: dbUnreadCount }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, title, body, action_url, is_read, created_at, recipient_id, metadata')
      .eq('recipient_id', user.id)
      .in('type', [...VENUE_NOTIFICATION_TYPES])
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .in('type', [...VENUE_NOTIFICATION_TYPES])
      .eq('is_read', false),
  ])

  const notifications = (data ?? []) as import('@/types/database').Notification[]
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const totalUnreadCount = dbUnreadCount ?? 0
  return { notifications, unreadCount, totalUnreadCount }
}

export async function markVenueNotificationRead(notificationId: string): Promise<void> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)

  revalidatePath('/business/venue/dashboard')
  revalidatePath('/business/venue/notifications')
}

export async function markAllVenueNotificationsRead(): Promise<void> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .in('type', [...VENUE_NOTIFICATION_TYPES])

  revalidatePath('/business/venue/dashboard')
  revalidatePath('/business/venue/notifications')
}
