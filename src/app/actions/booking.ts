'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
