'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { revalidatePath } from 'next/cache'

const ADDA_NOTIFICATION_TYPES = [
  'adda_new_proposal',
  'adda_proposal_accepted',
  'adda_proposal_counter',
  'adda_event_confirmed',
  'adda_new_rating',
  'adda_new_review',
  'adda_booking_reminder',
  'adda_payout_processed',
  'adda_new_inquiry',
  'adda_space_trending',
  // Include generic types that flow to adda owners
  'new_proposal',
  'proposal_accepted',
  'proposal_counter',
  'event_confirmed',
] as const

export async function getAddaNotifications(
  addaId: string,
  limit = 10,
): Promise<{ notifications: import('@/types/database').Notification[]; unreadCount: number; totalUnreadCount: number }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // Verify the user owns this adda
  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id')
    .eq('id', addaId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) return { notifications: [], unreadCount: 0, totalUnreadCount: 0 }

  const supabase = await createClient()

  // Fetch display list + a separate COUNT so badges reflect real totals, not just the fetched slice.
  const [{ data }, { count: dbUnreadCount }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, title, body, action_url, is_read, created_at, recipient_id, metadata')
      .eq('recipient_id', user.id)
      .in('type', [...ADDA_NOTIFICATION_TYPES])
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .in('type', [...ADDA_NOTIFICATION_TYPES])
      .eq('is_read', false),
  ])

  const notifications = (data ?? []) as import('@/types/database').Notification[]
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const totalUnreadCount = dbUnreadCount ?? 0
  return { notifications, unreadCount, totalUnreadCount }
}

export async function markAddaNotificationRead(notificationId: string): Promise<void> {
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

export async function markAllAddaNotificationsRead(): Promise<void> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .in('type', [...ADDA_NOTIFICATION_TYPES])

  revalidatePath('/business/venue/dashboard')
  revalidatePath('/business/venue/notifications')
}
