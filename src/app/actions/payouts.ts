'use server'

// =============================================================================
// WIMC — Payout actions
// Creators request payouts for past events. Status changes (approve/pay/reject)
// are handled by the platform admin via service_role, not through these actions.
// =============================================================================

import { requireProfile } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateRevenueSplit } from '@/lib/revenue'
import { z } from 'zod'
import type { PayoutRequest, PayoutStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PayableEvent {
  id:            string
  title:         string
  starts_at:     string
  ticket_price:  number
  venue_adda_id: string | null
  rsvp_count:    number
  gross_paise:   number   // sum of amount_paid on captured RSVPs
  maker_paise:   number   // creator's share after platform fee
  platform_paise: number
}

const RequestPayoutSchema = z.object({
  event_ids:    z.array(z.string().uuid()).min(1, 'Select at least one event'),
  bank_name:    z.string().max(120).optional(),
  bank_account: z.string().max(30).optional(),
  bank_ifsc:    z.string().max(11).optional(),
  upi_id:       z.string().max(80).optional(),
}).refine(
  (d) => d.bank_account || d.upi_id,
  { message: 'Provide a bank account or UPI ID' },
)

// ---------------------------------------------------------------------------
// getPayableEvents
// Returns past events that have captured RSVPs and are not yet included in a
// pending/approved/paid payout request.
// ---------------------------------------------------------------------------

export async function getPayableEvents(): Promise<{ data: PayableEvent[] | null; error?: string }> {
  const { profile } = await requireProfile()
  const admin = createAdminClient()

  // 1. Events that are past (starts_at < now()) for this creator
  const { data: events, error: evErr } = await admin
    .from('events')
    .select('id, title, starts_at, ticket_price, venue_adda_id')
    .eq('creator_id', profile.id)
    .in('status', ['published', 'completed'])
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })

  if (evErr) return { data: null, error: evErr.message }
  if (!events?.length) return { data: [] }

  // 2. Event IDs already locked in a non-rejected payout request
  const { data: existingRequests } = await admin
    .from('payout_requests')
    .select('event_ids')
    .eq('creator_id', profile.id)
    .in('status', ['pending', 'approved', 'paid'] satisfies PayoutStatus[])

  const lockedIds = new Set<string>(
    (existingRequests ?? []).flatMap((r) => r.event_ids),
  )

  // 3. Filter out locked events
  const freeEvents = events.filter((e) => !lockedIds.has(e.id))
  if (!freeEvents.length) return { data: [] }

  // 4. Fetch captured RSVPs for free events
  const freeIds = freeEvents.map((e) => e.id)
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('event_id, amount_paid')
    .in('event_id', freeIds)
    .eq('payment_status', 'captured')

  // Build per-event aggregates
  const rsvpMap = new Map<string, { count: number; total: number }>()
  for (const r of rsvps ?? []) {
    const agg = rsvpMap.get(r.event_id) ?? { count: 0, total: 0 }
    agg.count += 1
    agg.total += r.amount_paid ?? 0
    rsvpMap.set(r.event_id, agg)
  }

  const makerTier = profile.maker_tier ?? 'mohalla'

  const payable: PayableEvent[] = freeEvents
    .filter((e) => (rsvpMap.get(e.id)?.count ?? 0) > 0)
    .map((e) => {
      const agg     = rsvpMap.get(e.id)!
      const split   = calculateRevenueSplit(e.ticket_price, agg.count, makerTier, e.venue_adda_id !== null)
      return {
        id:             e.id,
        title:          e.title,
        starts_at:      e.starts_at,
        ticket_price:   e.ticket_price,
        venue_adda_id:  e.venue_adda_id,
        rsvp_count:     agg.count,
        gross_paise:    agg.total,
        maker_paise:    split.makerPaise,
        platform_paise: split.platformPaise,
      }
    })

  return { data: payable }
}

// ---------------------------------------------------------------------------
// requestPayout
// Validates selected events are payable, computes amounts server-side,
// inserts the payout_request row.
// ---------------------------------------------------------------------------

export async function requestPayout(raw: unknown): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireProfile()
  const admin = createAdminClient()

  const parsed = RequestPayoutSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message }
  const input = parsed.data

  // Re-compute payable events server-side (don't trust client amounts)
  const { data: payable, error: pErr } = await getPayableEvents()
  if (pErr || !payable) return { success: false, error: pErr ?? 'Could not load payable events' }

  const payableMap = new Map(payable.map((e) => [e.id, e]))
  const invalid = input.event_ids.filter((id) => !payableMap.has(id))
  if (invalid.length) return { success: false, error: 'One or more selected events are not payable' }

  const selected  = input.event_ids.map((id) => payableMap.get(id)!)
  const gross     = selected.reduce((s, e) => s + e.gross_paise, 0)
  const maker     = selected.reduce((s, e) => s + e.maker_paise, 0)
  const platform  = selected.reduce((s, e) => s + e.platform_paise, 0)

  const { error: insErr } = await admin
    .from('payout_requests')
    .insert({
      creator_id:     profile.id,
      event_ids:      input.event_ids,
      gross_paise:    gross,
      maker_paise:    maker,
      platform_paise: platform,
      bank_name:      input.bank_name ?? null,
      bank_account:   input.bank_account ?? null,
      bank_ifsc:      input.bank_ifsc ?? null,
      upi_id:         input.upi_id ?? null,
      status:         'pending',
    })

  if (insErr) return { success: false, error: insErr.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// getPayoutHistory
// All payout requests for this creator, newest first.
// ---------------------------------------------------------------------------

export async function getPayoutHistory(): Promise<{ data: PayoutRequest[] | null; error?: string }> {
  const { profile } = await requireProfile()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('payout_requests')
    .select('*')
    .eq('creator_id', profile.id)
    .order('requested_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as PayoutRequest[] }
}
