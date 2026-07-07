'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { calculateRevenueSplit } from '@/lib/revenue'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export interface AddaPayoutSummary {
  availablePaise: number
  pendingPaise: number
  totalPaidPaise: number
}

export interface PayoutRequest {
  id: string
  adda_id: string
  booking_ids: string[]
  gross_paise: number
  platform_fee_paise: number
  adda_share_paise: number
  payment_method: 'bank' | 'upi'
  bank_account_name: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  upi_id: string | null
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  rejection_reason: string | null
  requested_at: string
  processed_at: string | null
}

// "Bookings" are completed events at the adda with captured RSVPs
// that haven't been locked into a non-rejected payout request yet.
export interface PayableBooking {
  id: string           // event ID
  event_name: string
  event_date: string
  total_revenue_paise: number
  adda_share_paise: number
}

const RequestPayoutSchema = z.object({
  bookingIds:    z.array(z.string().uuid()).min(1),
  paymentMethod: z.enum(['bank', 'upi']),
  bankName:      z.string().optional(),
  bankNumber:    z.string().optional(),
  bankIfsc:      z.string().optional(),
  upiId:         z.string().optional(),
})

// ---------------------------------------------------------------------------
// getAddaPayoutData
// Returns the payout summary, payable bookings, and history for an adda.
// ---------------------------------------------------------------------------

export async function getAddaPayoutData(addaId: string): Promise<{
  summary: AddaPayoutSummary
  payableBookings: PayableBooking[]
  payoutHistory: PayoutRequest[]
  error: string | null
}> {
  const EMPTY = {
    summary: { availablePaise: 0, pendingPaise: 0, totalPaidPaise: 0 },
    payableBookings: [],
    payoutHistory: [],
    error: null,
  }

  const { user } = await requireAuth()
  const supabase = await createClient()
  const admin = createAdminClient()

  // Verify adda ownership via RLS-scoped client
  const { data: adda } = await supabase
    .from('adda_profiles')
    .select('id')
    .eq('id', addaId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) return { ...EMPTY, error: 'Access denied' }

  // Payout history — RLS ensures only this adda's rows are returned
  const { data: history, error: histErr } = await supabase
    .from('adda_payout_requests')
    .select('*')
    .eq('adda_id', addaId)
    .order('requested_at', { ascending: false })

  if (histErr) return { ...EMPTY, error: histErr.message }

  const payoutHistory = (history ?? []) as PayoutRequest[]
  const pendingPaise   = payoutHistory.filter(p => p.status === 'pending').reduce((s, p) => s + p.adda_share_paise, 0)
  const totalPaidPaise = payoutHistory.filter(p => p.status === 'paid').reduce((s, p) => s + p.adda_share_paise, 0)

  // Event IDs already locked in a non-rejected payout request
  const lockedEventIds = new Set<string>(
    payoutHistory
      .filter(p => ['pending', 'approved', 'paid'].includes(p.status))
      .flatMap(p => p.booking_ids),
  )

  // Past completed/published events at this adda (need admin client — events are creator-owned)
  const { data: pastEvents } = await admin
    .from('events')
    .select('id, title, starts_at, ticket_price')
    .eq('venue_id', addaId)
    .in('status', ['published', 'completed'])
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })

  const freeEvents = (pastEvents ?? []).filter(e => !lockedEventIds.has(e.id))

  let payableBookings: PayableBooking[] = []
  let availablePaise = 0

  if (freeEvents.length > 0) {
    const freeIds = freeEvents.map(e => e.id)

    const { data: rsvps } = await admin
      .from('rsvps')
      .select('event_id, amount_paid')
      .in('event_id', freeIds)
      .eq('payment_status', 'captured')

    const rsvpMap = new Map<string, { count: number; gross: number }>()
    for (const r of rsvps ?? []) {
      const agg = rsvpMap.get(r.event_id) ?? { count: 0, gross: 0 }
      rsvpMap.set(r.event_id, { count: agg.count + 1, gross: agg.gross + (r.amount_paid ?? 0) })
    }

    for (const ev of freeEvents) {
      const agg = rsvpMap.get(ev.id)
      if (!agg || agg.count === 0) continue

      // venue share fraction is independent of maker tier — wanderer is the baseline
      const split = calculateRevenueSplit(ev.ticket_price, agg.count, 'wanderer', true)

      payableBookings.push({
        id:                  ev.id,
        event_name:          ev.title,
        event_date:          ev.starts_at,
        total_revenue_paise: agg.gross,
        adda_share_paise:    split.venuePaise,
      })
      availablePaise += split.venuePaise
    }
  }

  return {
    summary: { availablePaise, pendingPaise, totalPaidPaise },
    payableBookings,
    payoutHistory,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// requestVenuePayout
// Validates ownership, re-computes amounts server-side, inserts the request.
// ---------------------------------------------------------------------------

export async function requestVenuePayout(
  addaId: string,
  payload: z.infer<typeof RequestPayoutSchema>,
): Promise<{ success: boolean; error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()
  const admin = createAdminClient()

  const parsed = RequestPayoutSchema.safeParse(payload)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { bookingIds, paymentMethod, bankName, bankNumber, bankIfsc, upiId } = parsed.data

  // Verify adda ownership
  const { data: adda } = await supabase
    .from('adda_profiles')
    .select('id')
    .eq('id', addaId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) return { success: false, error: 'Access denied' }

  if (paymentMethod === 'bank' && (!bankName || !bankNumber || !bankIfsc)) {
    return { success: false, error: 'Bank account details are required' }
  }
  if (paymentMethod === 'upi' && !upiId) {
    return { success: false, error: 'UPI ID is required' }
  }

  // Re-compute amounts server-side — don't trust client-provided values
  const { data: events } = await admin
    .from('events')
    .select('id, ticket_price')
    .in('id', bookingIds)
    .eq('venue_id', addaId)
    .in('status', ['published', 'completed'])

  if (!events?.length) return { success: false, error: 'No valid bookings found' }

  const eventIds = events.map(e => e.id)
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('event_id, amount_paid')
    .in('event_id', eventIds)
    .eq('payment_status', 'captured')

  const rsvpMap = new Map<string, { count: number; gross: number }>()
  for (const r of rsvps ?? []) {
    const agg = rsvpMap.get(r.event_id) ?? { count: 0, gross: 0 }
    rsvpMap.set(r.event_id, { count: agg.count + 1, gross: agg.gross + (r.amount_paid ?? 0) })
  }

  let totalGross    = 0
  let totalAdda     = 0
  let totalPlatform = 0

  for (const ev of events) {
    const agg = rsvpMap.get(ev.id)
    if (!agg || agg.count === 0) continue
    const split = calculateRevenueSplit(ev.ticket_price, agg.count, 'wanderer', true)
    totalGross    += agg.gross
    totalAdda     += split.venuePaise
    totalPlatform += split.platformPaise
  }

  const { error } = await supabase
    .from('adda_payout_requests')
    .insert({
      adda_id:             addaId,
      booking_ids:         bookingIds,
      gross_paise:         totalGross,
      platform_fee_paise:  totalPlatform,
      adda_share_paise:    totalAdda,
      payment_method:      paymentMethod,
      bank_account_name:   bankName   ?? null,
      bank_account_number: bankNumber ?? null,
      bank_ifsc:           bankIfsc   ?? null,
      upi_id:              upiId      ?? null,
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/business/venue/payouts')
  return { success: true, error: null }
}
