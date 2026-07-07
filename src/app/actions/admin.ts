'use server'

// =============================================================================
// WIMC — Admin server actions
// All actions require is_admin = true on the caller's user_profiles row.
// All DB mutations use createAdminClient() (service_role, bypasses RLS).
// =============================================================================

import { requireAdmin } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { z } from 'zod'
import type { PayoutStatus, EventStatus } from '@/types/database'
import { createNotification } from '@/app/actions/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminPayoutRow {
  id:            string
  creator_id:    string
  creator_name:  string
  creator_slug:  string
  event_ids:     string[]
  gross_paise:   number
  maker_paise:   number
  platform_paise: number
  bank_name:     string | null
  bank_account:  string | null
  bank_ifsc:     string | null
  upi_id:        string | null
  status:        string
  notes:         string | null
  requested_at:  string
  processed_at:  string | null
}

export interface AdminEventRow {
  id:           string
  title:        string
  slug:         string
  creator_id:   string
  creator_name: string
  creator_slug: string
  status:       string
  starts_at:    string
  ticket_price: number
  rsvp_count:   number
  gross_paise:  number
  city:         string | null
}

export interface AdminVenueRow {
  id:                       string
  name:                     string
  slug:                     string
  city:                     string
  address:                  string
  pricing_model:            string
  is_active:                boolean
  is_verified:              boolean
  total_events_hosted:      number
  total_revenue_earned_paise: number
  created_at:               string
  proposal_count:           number
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export async function getAdminPayouts(status?: string): Promise<{ data: AdminPayoutRow[] | null; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  let query = admin
    .from('payout_requests')
    .select('*, creator:user_profiles(display_name, username)')
    .order('requested_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status as PayoutStatus)
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }

  const rows: AdminPayoutRow[] = (data ?? []).map((r) => ({
    id:            r.id,
    creator_id:    r.creator_id,
    creator_name:  (r.creator as { display_name: string; username: string } | null)?.display_name ?? 'Unknown',
    creator_slug:  (r.creator as { display_name: string; username: string } | null)?.username ?? '',
    event_ids:     r.event_ids,
    gross_paise:   r.gross_paise,
    maker_paise:   r.maker_paise,
    platform_paise: r.platform_paise,
    bank_name:     r.bank_name,
    bank_account:  r.bank_account,
    bank_ifsc:     r.bank_ifsc,
    upi_id:        r.upi_id,
    status:        r.status,
    notes:         r.notes,
    requested_at:  r.requested_at,
    processed_at:  r.processed_at,
  }))

  return { data: rows }
}

const UpdatePayoutSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['approved', 'paid', 'rejected']),
  notes:  z.string().max(500).optional(),
})

export async function updatePayoutStatus(raw: unknown): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const parsed = UpdatePayoutSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message }
  const { id, status, notes } = parsed.data

  // Fetch payout + creator before updating so we can notify after
  const { data: payout } = await admin
    .from('payout_requests')
    .select('creator_id, maker_paise')
    .eq('id', id)
    .single()

  const { error } = await admin
    .from('payout_requests')
    .update({ status, notes: notes ?? null, processed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // Notify creator (best-effort — never fail the admin action)
  if (payout) {
    const creatorId = payout.creator_id
    const amountRs = `₹${Math.round(payout.maker_paise / 100).toLocaleString('en-IN')}`

    const messages: Record<typeof status, { title: string; body: string; whatsapp: string }> = {
      approved: {
        title:    'Payout Approved',
        body:     `Your payout of ${amountRs} has been approved and will be processed shortly.`,
        whatsapp: `Hi! Your WIMC payout of ${amountRs} has been approved and will be processed shortly. 🎉`,
      },
      paid: {
        title:    'Payout Sent',
        body:     `Your payout of ${amountRs} has been sent to your bank account.`,
        whatsapp: `Hi! Your WIMC payout of ${amountRs} has been sent to your bank account. It should reflect within 1–2 business days. 💸`,
      },
      rejected: {
        title:    'Payout Update',
        body:     notes?.trim() || 'Your payout request could not be processed. Please contact support.',
        whatsapp: `Hi! There was an issue with your WIMC payout request. Please check your dashboard or contact support.`,
      },
    }

    const msg = messages[status]

    await Promise.all([
      createNotification({
        recipientId: creatorId,
        type:        status === 'rejected' ? 'payout_rejected' : 'payout_approved',
        title:       msg.title,
        body:        msg.body,
        actionUrl:   '/dashboard/payouts',
      }),

      (async () => {
        const { data: profile } = await admin
          .from('user_profiles')
          .select('phone, display_name')
          .eq('id', creatorId)
          .maybeSingle()
        if (profile?.phone) {
          await sendWhatsAppMessage(profile.phone, msg.whatsapp).catch(() => {})
        }
      })(),
    ])
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Venue Payouts
// ---------------------------------------------------------------------------

export interface AdminVenuePayoutRow {
  id:                  string
  venue_id:             string
  venue_name:           string
  booking_ids:         string[]
  gross_paise:         number
  platform_fee_paise:  number
  venue_share_paise:    number
  payment_method:      'bank' | 'upi'
  bank_account_name:   string | null
  bank_account_number: string | null
  bank_ifsc:           string | null
  upi_id:              string | null
  status:              string
  rejection_reason:    string | null
  requested_at:        string
  processed_at:        string | null
}

export async function getAdminVenuePayouts(status?: string): Promise<{ data: AdminVenuePayoutRow[] | null; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  let query = admin
    .from('venue_payout_requests')
    .select('*, venue:venue_profiles(name)')
    .order('requested_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status as 'pending' | 'approved' | 'paid' | 'rejected')
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }

  const rows: AdminVenuePayoutRow[] = (data ?? []).map((r) => ({
    id:                  r.id,
    venue_id:             r.venue_id,
    venue_name:           (r.venue as { name: string } | null)?.name ?? 'Unknown',
    booking_ids:         r.booking_ids,
    gross_paise:         r.gross_paise,
    platform_fee_paise:  r.platform_fee_paise,
    venue_share_paise:    r.venue_share_paise,
    payment_method:      r.payment_method,
    bank_account_name:   r.bank_account_name,
    bank_account_number: r.bank_account_number,
    bank_ifsc:           r.bank_ifsc,
    upi_id:              r.upi_id,
    status:              r.status,
    rejection_reason:    r.rejection_reason,
    requested_at:        r.requested_at,
    processed_at:        r.processed_at,
  }))

  return { data: rows }
}

const UpdateVenuePayoutSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['approved', 'paid', 'rejected']),
  notes:  z.string().max(500).optional(),
})

export async function updateVenuePayoutStatus(raw: unknown): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const parsed = UpdateVenuePayoutSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message }
  const { id, status, notes } = parsed.data

  const { error } = await admin
    .from('venue_payout_requests')
    .update({
      status,
      rejection_reason: status === 'rejected' ? (notes ?? null) : null,
      processed_at:     new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getAdminEvents(status?: string): Promise<{ data: AdminEventRow[] | null; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  let query = admin
    .from('events')
    .select('id, title, slug, creator_id, status, starts_at, ticket_price, creator:user_profiles(display_name, username, city)')
    .order('starts_at', { ascending: false })
    .limit(300)

  if (status && status !== 'all') {
    query = query.eq('status', status as EventStatus)
  }

  const { data: events, error: evErr } = await query
  if (evErr) return { data: null, error: evErr.message }
  if (!events?.length) return { data: [] }

  // Fetch RSVP aggregates
  const eventIds = events.map((e) => e.id)
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('event_id, amount_paid')
    .in('event_id', eventIds)
    .eq('payment_status', 'captured')

  const rsvpMap = new Map<string, { count: number; total: number }>()
  for (const r of rsvps ?? []) {
    const agg = rsvpMap.get(r.event_id) ?? { count: 0, total: 0 }
    agg.count += 1
    agg.total += r.amount_paid ?? 0
    rsvpMap.set(r.event_id, agg)
  }

  const rows: AdminEventRow[] = events.map((e) => {
    const creator = e.creator as { display_name: string; username: string; city: string | null } | null
    const agg = rsvpMap.get(e.id) ?? { count: 0, total: 0 }
    return {
      id:           e.id,
      title:        e.title,
      slug:         e.slug,
      creator_id:   e.creator_id,
      creator_name: creator?.display_name ?? 'Unknown',
      creator_slug: creator?.username ?? '',
      status:       e.status,
      starts_at:    e.starts_at,
      ticket_price: e.ticket_price,
      rsvp_count:   agg.count,
      gross_paise:  agg.total,
      city:         creator?.city ?? null,
    }
  })

  return { data: rows }
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export async function getAdminVenues(): Promise<{ data: AdminVenueRow[] | null; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: venues, error: venueErr } = await admin
    .from('venue_profiles')
    .select('id, name, slug, city, address, pricing_model, is_active, is_verified, total_events_hosted, total_revenue_earned_paise, created_at')
    .order('created_at', { ascending: false })

  if (venueErr) return { data: null, error: venueErr.message }
  if (!venues?.length) return { data: [] }

  const venueIds = venues.map((a) => a.id)
  const { data: proposals } = await admin
    .from('maker_venue_proposals')
    .select('venue_id')
    .in('venue_id', venueIds)

  const proposalCount = new Map<string, number>()
  for (const p of proposals ?? []) {
    proposalCount.set(p.venue_id, (proposalCount.get(p.venue_id) ?? 0) + 1)
  }

  const rows: AdminVenueRow[] = venues.map((a) => ({
    id:                       a.id,
    name:                     a.name,
    slug:                     a.slug,
    city:                     a.city,
    address:                  a.address,
    pricing_model:            a.pricing_model,
    is_active:                a.is_active,
    is_verified:              a.is_verified,
    total_events_hosted:      a.total_events_hosted,
    total_revenue_earned_paise: a.total_revenue_earned_paise,
    created_at:               a.created_at,
    proposal_count:           proposalCount.get(a.id) ?? 0,
  }))

  return { data: rows }
}

const ToggleVenueSchema = z.object({
  id:        z.string().uuid(),
  is_active: z.boolean(),
})

export async function toggleVenueActive(raw: unknown): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const parsed = ToggleVenueSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message }

  const { error } = await admin
    .from('venue_profiles')
    .update({ is_active: parsed.data.is_active })
    .eq('id', parsed.data.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

const ToggleVerifySchema = z.object({
  id:          z.string().uuid(),
  is_verified: z.boolean(),
})

export async function toggleVenueVerified(raw: unknown): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()

  const parsed = ToggleVerifySchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message }

  const { error } = await admin
    .from('venue_profiles')
    .update({ is_verified: parsed.data.is_verified })
    .eq('id', parsed.data.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
