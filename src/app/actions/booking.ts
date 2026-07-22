'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createNotification } from '@/app/actions/notifications'
import type { BookingRequestConfig } from '@/types/database'

const InquirySchema = z.object({
  creatorId:      z.string().uuid(),
  blockId:        z.string().uuid(),
  requesterName:  z.string().min(1).max(120),
  requesterEmail: z.string().email(),
  eventType:      z.string().max(100).optional(),
  message:        z.string().max(1000).optional(),
})

export async function submitBookingInquiry(
  input: unknown,
): Promise<{ success: boolean; error?: string }> {
  const parsed = InquirySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid submission.' }

  const { creatorId, blockId, requesterName, requesterEmail, eventType, message } = parsed.data

  const supabase = createAdminClient()
  const { error } = await supabase.from('booking_inquiries').insert({
    creator_id:      creatorId,
    block_id:        blockId,
    requester_name:  requesterName,
    requester_email: requesterEmail,
    event_type:      eventType ?? null,
    message:         message ?? null,
  })

  if (error) {
    console.error('[submitBookingInquiry]', error.message)
    return { success: false, error: 'Failed to submit inquiry. Please try again.' }
  }

  void (async () => {
    try {
      await createNotification({
        recipientId: creatorId,
        type: 'new_booking_inquiry',
        title: 'New booking inquiry',
        body: `${requesterName} wants to book you${eventType ? ` for ${eventType}` : ''}.`,
        actionUrl: '/dashboard/bookings',
      })
    } catch {}
  })()

  return { success: true }
}

const VALID_STATUSES = ['new', 'read', 'replied', 'declined'] as const
type InquiryStatus = typeof VALID_STATUSES[number]

const UpdateStatusSchema = z.object({
  inquiryId: z.string().uuid(),
  status:    z.enum(VALID_STATUSES),
})

export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireAuth()

  const parsed = UpdateStatusSchema.safeParse({ inquiryId, status })
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const admin = createAdminClient()

  // Verify this inquiry belongs to the authenticated creator before updating
  const { data: inquiry } = await admin
    .from('booking_inquiries')
    .select('creator_id')
    .eq('id', parsed.data.inquiryId)
    .maybeSingle()

  if (!inquiry || inquiry.creator_id !== user.id) {
    return { success: false, error: 'Not found.' }
  }

  const { error } = await admin
    .from('booking_inquiries')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.inquiryId)

  if (error) {
    console.error('[updateInquiryStatus]', error.message)
    return { success: false, error: 'Failed to update status.' }
  }

  revalidatePath('/dashboard/bookings')
  return { success: true }
}

const ToggleAcceptedSchema = z.object({
  inquiryId: z.string().uuid(),
})

export async function toggleInquiryAccepted(
  inquiryId: string,
): Promise<{ success: boolean; error?: string; accepted_at?: string | null }> {
  const { user } = await requireAuth()

  const parsed = ToggleAcceptedSchema.safeParse({ inquiryId })
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const admin = createAdminClient()

  // Verify this inquiry belongs to the authenticated creator before updating
  const { data: inquiry } = await admin
    .from('booking_inquiries')
    .select('creator_id, accepted_at')
    .eq('id', parsed.data.inquiryId)
    .maybeSingle()

  if (!inquiry || inquiry.creator_id !== user.id) {
    return { success: false, error: 'Not found.' }
  }

  const nextAcceptedAt = inquiry.accepted_at ? null : new Date().toISOString()

  const { error } = await admin
    .from('booking_inquiries')
    .update({ accepted_at: nextAcceptedAt })
    .eq('id', parsed.data.inquiryId)

  if (error) {
    console.error('[toggleInquiryAccepted]', error.message)
    return { success: false, error: 'Failed to update.' }
  }

  revalidatePath('/dashboard/bookings')
  return { success: true, accepted_at: nextAcceptedAt }
}

// ---------------------------------------------------------------------------
// Booking capacity — derived from accepted inquiries in the current calendar
// month, for the public-facing booking_request block badge.
// ---------------------------------------------------------------------------

export type BookingCapacityStatus = {
  slots_filled: number
  effective_status: 'open' | 'closed' | 'waitlist'
}

export async function getBookingCapacityStatus(
  creatorId: string,
  config: BookingRequestConfig,
): Promise<BookingCapacityStatus> {
  const admin = createAdminClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await admin
    .from('booking_inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .not('accepted_at', 'is', null)
    .gte('accepted_at', startOfMonth.toISOString())

  const slots_filled = count ?? 0

  const effective_status: 'open' | 'closed' | 'waitlist' =
    config.status_override ??
    (config.slots_total != null && slots_filled >= config.slots_total ? 'closed' : 'open')

  return { slots_filled, effective_status }
}
