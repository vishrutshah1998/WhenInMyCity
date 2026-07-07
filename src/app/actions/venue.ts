'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import {
  CreateVenueSchema,
  type CreateVenueInput,
  type AvailabilityUpdate,
  type ProposalCounterOffer,
  type VenueSearchParams,
} from '@/types/marketplace'
import { notifyVenueOfProposal, notifyMakerOfProposalResponse } from '@/lib/notifications'
import { createNotification } from '@/app/actions/notifications'
import type {
  VenueProfile,
  MakerVenueProposal,
  Json,
  Event,
  UserProfile,
  UserTier,
} from '@/types/database'
import { resolveTheme, type ProfileTheme } from '@/types/theme'

// ---------------------------------------------------------------------------
// Proposal input schema + type
// ---------------------------------------------------------------------------

const VALID_SLOTS = ['morning', 'afternoon', 'evening', 'full_day'] as const

const SendProposalSchema = z.object({
  venue_id:                  z.string().uuid('Invalid Venue ID'),
  proposed_date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  proposed_slot:            z.enum(VALID_SLOTS),
  event_title:              z.string().min(3, 'Event title must be at least 3 characters').max(120),
  event_id:                 z.string().uuid().optional(),
  expected_attendees:       z.number().int().min(1).max(10000).optional(),
  expected_revenue_paise:   z.number().int().min(0).optional(),
  proposed_pricing_model:   z
    .enum(['fixed_rental', 'door_split', 'hybrid', 'f_and_b_minimum'])
    .optional(),
  proposed_split_config:    z.record(z.unknown()).default({}),
  message:                  z.string().max(1000).optional(),
})

export type SendProposalInput = z.infer<typeof SendProposalSchema>

/** Tier ordering for gate checks. */
const TIER_ORDER: Record<UserTier, number> = {
  wanderer: 0, local: 1, lantern: 2, beacon: 3,
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts an venue name into a URL-safe slug.
 * Strips non-alphanumeric characters; truncates to 55 chars to leave room
 * for a uniqueness suffix.
 *
 * @example slugifyVenue('The Blue Café') → 'the-blue-cafe'
 */
function slugifyVenue(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics (café → cafe)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55)
}

/**
 * Returns a unique slug derived from the venue name.
 * If the base slug is taken, appends a random 3-digit suffix.
 */
async function generateVenueSlug(name: string): Promise<string> {
  const base = slugifyVenue(name) || 'venue'
  const admin = createAdminClient()

  const candidates = [
    base,
    ...Array.from({ length: 5 }, () => `${base}-${Math.floor(100 + Math.random() * 900)}`),
  ]

  for (const candidate of candidates) {
    if (candidate.length < 3) continue

    const { data, error } = await admin
      .from('venue_profiles')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle()

    if (error) {
      console.error('[generateVenueSlug] lookup error', error.message)
      continue
    }

    if (data === null) return candidate
  }

  return `venue-${Math.floor(100000 + Math.random() * 900000)}`
}

// ---------------------------------------------------------------------------
// createVenueProfile
// ---------------------------------------------------------------------------

/**
 * Creates a new Venue profile for the authenticated user.
 *
 * Steps:
 *   1. Validates input with Zod.
 *   2. Checks that the user hasn't already registered an Venue.
 *   3. Generates a unique URL slug from the Venue name.
 *   4. Inserts the venue_profiles row.
 *
 * Cover image upload is handled separately via `uploadVenueCoverImage()`.
 *
 * @returns `{ slug, error: null }` on success or `{ slug: '', error: string }` on failure.
 */
export async function createVenueProfile(
  data: CreateVenueInput,
): Promise<{ slug: string; error: string | null }> {
  const { user } = await requireAuth('/onboarding/venue')

  const parsed = CreateVenueSchema.safeParse(data)
  if (!parsed.success) {
    return { slug: '', error: parsed.error.errors[0].message }
  }

  const admin = createAdminClient()

  // Guard: one venue per auth account.
  const { data: existing } = await admin
    .from('venue_profiles')
    .select('slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { slug: existing.slug, error: null }  // idempotent
  }

  const slug = await generateVenueSlug(parsed.data.name)

  const { error: insertError } = await admin.from('venue_profiles').insert({
    auth_user_id: user.id,
    slug,
    name:                     parsed.data.name,
    description:              parsed.data.description ?? null,
    venue_type:                parsed.data.venue_type,
    city:                     parsed.data.city,
    neighbourhood:            parsed.data.neighbourhood ?? null,
    address:                  parsed.data.address,
    lat:                      parsed.data.lat ?? null,
    lng:                      parsed.data.lng ?? null,
    cover_image_url:          parsed.data.cover_image_url || null,
    gallery_images:           parsed.data.gallery_images,
    capacity_min:             parsed.data.capacity_min ?? null,
    capacity_max:             parsed.data.capacity_max ?? null,
    capacity_configurations:  parsed.data.capacity_configurations,
    amenities:                parsed.data.amenities,
    pricing_model:            parsed.data.pricing_model,
    pricing_config:           parsed.data.pricing_config,
    contact_whatsapp:         parsed.data.contact_whatsapp || null,
    contact_email:            parsed.data.contact_email || null,
    instagram_handle:         parsed.data.instagram_handle || null,
  })

  if (insertError) {
    console.error('[createVenueProfile] insert', insertError.message)
    if (insertError.code === '23505') {
      return { slug: '', error: 'That slug is already taken. Please try a different name.' }
    }
    return { slug: '', error: 'Failed to create your Venue profile. Please try again.' }
  }

  return { slug, error: null }
}

// ---------------------------------------------------------------------------
// uploadVenueCoverImage
// ---------------------------------------------------------------------------

/**
 * Uploads an Venue cover image via FormData.
 * Must be called after `createVenueProfile` so the venue_profiles row exists.
 *
 * @param formData - Must contain a `file` field with the image File.
 * @returns `{ url: string | null; error: string | null }`
 */
export async function uploadVenueCoverImage(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const { user } = await requireAuth()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { url: null, error: 'No file provided.' }
  if (file.size > 5 * 1024 * 1024) return { url: null, error: 'Cover image must be smaller than 5 MB.' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) return { url: null, error: 'Cover must be a JPEG, PNG, WebP, or GIF.' }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const storagePath = `${user.id}/cover.${ext}`

  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('venue-covers')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[uploadVenueCoverImage]', uploadError.message)
    return { url: null, error: 'Failed to upload cover image. Please try again.' }
  }

  const { data: urlData } = admin.storage.from('venue-covers').getPublicUrl(storagePath)

  // Patch the venue profile row with the cover URL.
  await admin
    .from('venue_profiles')
    .update({ cover_image_url: urlData.publicUrl })
    .eq('auth_user_id', user.id)

  return { url: urlData.publicUrl, error: null }
}

// ---------------------------------------------------------------------------
// getVenueProfile
// ---------------------------------------------------------------------------

/**
 * Fetches a public Venue profile by slug.
 * Used by the Venue public page at /venue/[slug].
 */
export async function getVenueProfile(
  slug: string,
): Promise<{ venue: VenueProfile | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[getVenueProfile]', error.message)
    return { venue: null }
  }

  return { venue: data }
}

// ---------------------------------------------------------------------------
// updateVenueContactInfo — editable profile fields (not identity-locked ones)
// ---------------------------------------------------------------------------

const UpdateVenueContactSchema = z.object({
  description:        z.string().max(1000).optional(),
  contact_email:      z.string().email().optional().or(z.literal('')),
  contact_whatsapp:   z.string().max(20).optional().or(z.literal('')),
  instagram_handle:   z.string().max(60).optional().or(z.literal('')),
  event_preferences:  z.array(z.string()).optional(),
  available_days:     z.array(z.string()).optional(),
  capacity_min:       z.number().int().min(1).optional(),
  capacity_max:       z.number().int().min(1).optional(),
})

export type UpdateVenueContactInput = z.infer<typeof UpdateVenueContactSchema>

export async function updateVenueContactInfo(
  venueId: string,
  input: UpdateVenueContactInput,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // Verify ownership
  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, auth_user_id')
    .eq('id', venueId)
    .maybeSingle()

  if (!venue || venue.auth_user_id !== user.id) return { error: 'Venue not found.' }

  const parsed = UpdateVenueContactSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const d = parsed.data
  const { error } = await admin
    .from('venue_profiles')
    .update({
      ...(d.description        !== undefined ? { description:      d.description || null }          : {}),
      ...(d.contact_email      !== undefined ? { contact_email:    d.contact_email || null }        : {}),
      ...(d.contact_whatsapp   !== undefined ? { contact_whatsapp: d.contact_whatsapp || null }     : {}),
      ...(d.instagram_handle   !== undefined ? { instagram_handle: d.instagram_handle || null }     : {}),
      ...(d.event_preferences  !== undefined ? { event_preferences: d.event_preferences }           : {}),
      ...(d.available_days     !== undefined ? { available_days:   d.available_days }               : {}),
      ...(d.capacity_min       !== undefined ? { capacity_min:     d.capacity_min }                 : {}),
      ...(d.capacity_max       !== undefined ? { capacity_max:     d.capacity_max }                 : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', venueId)

  if (error) {
    console.error('[updateVenueContactInfo]', error.message)
    return { error: 'Failed to save changes.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// updateVenueStudioContent — studio-specific fields including highlights stored
// in pricing_config.studio_highlights (no schema migration needed)
// ---------------------------------------------------------------------------

export interface UpdateVenueStudioInput {
  event_preferences?: string[]
  studio_highlights?: string[]
  tagline?:           string
  contact_whatsapp?:  string
  instagram_handle?:  string
}

export async function updateVenueStudioContent(
  venueId: string,
  input: UpdateVenueStudioInput,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, auth_user_id, pricing_config')
    .eq('id', venueId)
    .maybeSingle()

  if (!venue || venue.auth_user_id !== user.id) return { error: 'Venue not found.' }

  const existingConfig = (venue.pricing_config as Record<string, unknown>) ?? {}
  const pricingConfig = {
    ...existingConfig,
    ...(input.studio_highlights !== undefined ? { studio_highlights: input.studio_highlights } : {}),
    ...(input.tagline           !== undefined ? { tagline:           input.tagline || null }   : {}),
  }
  const configChanged = input.studio_highlights !== undefined || input.tagline !== undefined

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.event_preferences !== undefined) updates.event_preferences = input.event_preferences
  if (input.contact_whatsapp  !== undefined) updates.contact_whatsapp  = input.contact_whatsapp || null
  if (input.instagram_handle  !== undefined) updates.instagram_handle  = input.instagram_handle || null
  if (configChanged)                         updates.pricing_config    = pricingConfig

  const { error } = await admin.from('venue_profiles').update(updates).eq('id', venueId)

  if (error) {
    console.error('[updateVenueStudioContent]', error.message)
    return { error: 'Failed to save changes.' }
  }

  revalidatePath('/business/venue/studio')
  revalidatePath(`/venue/${venue.id}`)
  return { error: null }
}

// ---------------------------------------------------------------------------
// updateVenueAvailability
// ---------------------------------------------------------------------------

/**
 * Upserts multiple availability slots for the authenticated Venue owner.
 *
 * @param availability - Array of { date, slot_type, status, notes? }
 * @returns `{ error: string | null }`
 */
export async function updateVenueAvailability(
  availability: AvailabilityUpdate[],
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!availability.length) return { error: null }

  const admin = createAdminClient()

  // Resolve the venue_id for this owner.
  const { data: venue, error: venueError } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (venueError || !venue) {
    return { error: 'Venue profile not found.' }
  }

  const rows = availability.map((slot) => ({
    venue_id:   venue.id,
    date:      slot.date,
    slot_type: slot.slot_type,
    status:    slot.status,
    notes:     slot.notes ?? null,
  }))

  const { error: upsertError } = await admin
    .from('venue_availability')
    .upsert(rows, { onConflict: 'venue_id,date,slot_type' })

  if (upsertError) {
    console.error('[updateVenueAvailability]', upsertError.message)
    return { error: 'Failed to update availability. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getVenueProposals
// ---------------------------------------------------------------------------

/**
 * Returns all proposals received by the authenticated Venue, newest first.
 */
export async function getVenueProposals(): Promise<{ proposals: MakerVenueProposal[] }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) return { proposals: [] }

  const { data, error } = await admin
    .from('maker_venue_proposals')
    .select('*')
    .eq('venue_id', venue.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getVenueProposals]', error.message)
    return { proposals: [] }
  }

  return { proposals: data ?? [] }
}

// ---------------------------------------------------------------------------
// respondToProposal
// ---------------------------------------------------------------------------

/**
 * Lets the Venue owner respond to a Maker's booking proposal.
 *
 * - 'accept':        Sets status = 'accepted'; creates a tentative availability slot.
 * - 'decline':       Sets status = 'declined'.
 * - 'counter_offer': Sets status = 'counter_offered', stores counterOffer JSON.
 *
 * @returns `{ error: string | null }`
 */
export async function respondToProposal(
  proposalId: string,
  response: 'accept' | 'decline' | 'counter_offer',
  counterOffer?: ProposalCounterOffer,
  note?: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  // Verify the authenticated user owns the venue that received this proposal.
  const { data: proposal, error: fetchError } = await admin
    .from('maker_venue_proposals')
    .select('id, venue_id, proposed_date, proposed_slot, status, maker_id, event_title')
    .eq('id', proposalId)
    .maybeSingle()

  if (fetchError || !proposal) {
    return { error: 'Proposal not found.' }
  }

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name')
    .eq('id', proposal.venue_id)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) {
    return { error: 'You are not authorised to respond to this proposal.' }
  }

  if (!['pending', 'counter_offered'].includes(proposal.status)) {
    return { error: `Cannot respond to a proposal with status '${proposal.status}'.` }
  }

  const newStatus =
    response === 'accept'
      ? 'accepted'
      : response === 'decline'
      ? 'declined'
      : 'counter_offered'

  const { error: updateError } = await admin
    .from('maker_venue_proposals')
    .update({
      status:             newStatus,
      counter_offer:      response === 'counter_offer' ? (counterOffer as unknown as Json ?? {}) : {},
      venue_response_note: note ?? null,
    })
    .eq('id', proposalId)

  if (updateError) {
    console.error('[respondToProposal]', updateError.message)
    return { error: 'Failed to update proposal. Please try again.' }
  }

  // On acceptance: create a tentative availability slot so the date shows as booked.
  if (response === 'accept') {
    const { error: slotError } = await admin
      .from('venue_availability')
      .upsert(
        {
          venue_id:   venue.id,
          date:      proposal.proposed_date,
          slot_type: proposal.proposed_slot as 'morning' | 'afternoon' | 'evening' | 'full_day',
          status:    'pending',
        },
        { onConflict: 'venue_id,date,slot_type' },
      )

    if (slotError) {
      // Non-fatal: the proposal status was already updated.
      console.error('[respondToProposal] slot upsert', slotError.message)
    }
  }

  // Notify maker of the response (fire-and-forget)
  notifyMakerOfProposalResponse(
    proposal as unknown as import('@/types/database').MakerVenueProposal,
    newStatus as 'accepted' | 'declined' | 'counter_offered',
    venue?.name ?? 'The Venue',
  ).catch(() => {})

  // In-app notification to maker on accept or counter-offer
  if (newStatus === 'accepted' || newStatus === 'counter_offered') {
    createNotification({
      recipientId: proposal.maker_id,
      type: newStatus === 'accepted' ? 'proposal_accepted' : 'proposal_counter',
      title: newStatus === 'accepted' ? 'Proposal accepted!' : 'Counter offer received',
      body: newStatus === 'accepted'
        ? `${venue.name} accepted your booking for "${proposal.event_title}".`
        : `${venue.name} sent a counter offer for your booking request.`,
      actionUrl: '/dashboard/venues',
    }).catch(() => {})
    // Venue-specific type for venue notification inbox
    createNotification({
      recipientId: proposal.maker_id,
      type: newStatus === 'accepted' ? 'venue_proposal_accepted' : 'venue_proposal_counter',
      title: newStatus === 'accepted' ? 'Booking confirmed!' : 'Counter offer received',
      body: newStatus === 'accepted'
        ? `${venue.name} confirmed your booking for "${proposal.event_title}".`
        : `${venue.name} sent a counter offer for "${proposal.event_title}".`,
      actionUrl: '/dashboard/venues',
    }).catch(() => {})
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// searchVenues
// ---------------------------------------------------------------------------

/**
 * Searches for Venues matching the given criteria.
 * Results are ordered by total_events_hosted DESC (social proof first).
 *
 * Requires Maker authentication at Nukkad tier or above.
 *
 * @returns `{ venues: VenueProfile[] }`
 */
export async function searchVenues(
  params: VenueSearchParams,
): Promise<{ venues: VenueProfile[]; error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  // Enforce Nukkad+ tier gating.
  const { data: maker } = await admin
    .from('user_profiles')
    .select('user_tier, user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!maker || maker.user_role !== 'maker') {
    return { venues: [], error: 'Only Makers can search for Venues.' }
  }

  const tierOrder: Record<string, number> = { wanderer: 0, local: 1, lantern: 2, beacon: 3 }
  if ((tierOrder[maker.user_tier] ?? 0) < 1) {
    return {
      venues: [],
      error: 'Venue search is available from the Local tier onwards. Keep hosting events to unlock this feature!',
    }
  }

  let query = admin
    .from('venue_profiles')
    .select('*')
    .eq('is_active', true)
    .eq('city', params.city)
    .order('total_events_hosted', { ascending: false })

  if (params.venue_type) {
    query = query.contains('venue_type', [params.venue_type])
  }

  if (params.capacity_min != null) {
    query = query.gte('capacity_max', params.capacity_min)
  }

  if (params.capacity_max != null) {
    query = query.lte('capacity_min', params.capacity_max)
  }

  if (params.pricing_model) {
    query = query.eq('pricing_model', params.pricing_model)
  }

  if (params.amenities?.length) {
    query = query.contains('amenities', params.amenities)
  }

  // Date filtering: exclude venues where the date is fully booked (all 4 slots confirmed/blocked).
  // Simple approximation: if a date filter is supplied, we check at the app layer after fetching.
  const { data, error } = await query.limit(50)

  if (error) {
    console.error('[searchVenues]', error.message)
    return { venues: [], error: 'Search failed. Please try again.' }
  }

  let results = data ?? []

  // If a date filter is provided, exclude venues where every slot on that date is unavailable.
  if (params.date && results.length) {
    const venueIds = results.map((a) => a.id)

    const { data: slots } = await admin
      .from('venue_availability')
      .select('venue_id, status')
      .in('venue_id', venueIds)
      .eq('date', params.date)
      .in('status', ['blocked', 'confirmed'])

    // Count unavailable slots per venue (4 total: morning, afternoon, evening, full_day).
    const blockedCounts: Record<string, number> = {}
    for (const slot of slots ?? []) {
      blockedCounts[slot.venue_id] = (blockedCounts[slot.venue_id] ?? 0) + 1
    }

    // Exclude only venues where full_day is blocked/confirmed (simplest heuristic).
    const { data: fullDayBlocked } = await admin
      .from('venue_availability')
      .select('venue_id')
      .in('venue_id', venueIds)
      .eq('date', params.date)
      .eq('slot_type', 'full_day')
      .in('status', ['blocked', 'confirmed'])

    const blockedVenueIds = new Set((fullDayBlocked ?? []).map((s) => s.venue_id))
    results = results.filter((a) => !blockedVenueIds.has(a.id))
  }

  return { venues: results, error: null }
}

// ---------------------------------------------------------------------------
// sendProposal
// ---------------------------------------------------------------------------

/**
 * Sends a Maker's booking proposal to an Venue.
 *
 * Guards:
 *  1. Caller must be an authenticated Maker at Nukkad tier or above.
 *     (Mohalla tier cannot access the Venue matching system.)
 *  2. The proposed date must have an 'available' full_day or matching slot in
 *     `venue_availability`. Venues with no explicit availability record are
 *     treated as available by default.
 *  3. No existing 'accepted' proposal can exist for the same venue + date.
 *
 * On success:
 *  - Inserts a `maker_venue_proposals` row with `expires_at = now + 72 hours`.
 *  - Logs a WhatsApp-style notification to the Venue owner (v1: console.log).
 *
 * @param data  Validated proposal payload.
 * @returns `{ proposalId: string; error: null }` or `{ proposalId: ''; error: string }`.
 */
export async function sendProposal(
  data: SendProposalInput,
): Promise<{ proposalId: string; error: string | null }> {
  const { user } = await requireAuth('/dashboard')

  const parsed = SendProposalSchema.safeParse(data)
  if (!parsed.success) {
    return { proposalId: '', error: parsed.error.errors[0].message }
  }

  const d = parsed.data
  const admin = createAdminClient()

  // Gate: caller must be a Maker at Nukkad+
  const { data: maker } = await admin
    .from('user_profiles')
    .select('display_name, user_tier, user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!maker || maker.user_role !== 'maker') {
    return { proposalId: '', error: 'Only Makers can send Venue proposals.' }
  }
  if ((TIER_ORDER[maker.user_tier as UserTier] ?? 0) < TIER_ORDER['local']) {
    return {
      proposalId: '',
      error: 'Venue proposals are available from the Nukkad tier. Keep hosting events to unlock this!',
    }
  }

  // Validate the Venue exists
  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id, name, slug, is_active, contact_whatsapp')
    .eq('id', d.venue_id)
    .maybeSingle()

  if (!venue || !venue.is_active) {
    return { proposalId: '', error: 'Venue not found or is currently inactive.' }
  }

  // Guard: no existing accepted proposal for this venue on this date
  const { data: conflict } = await admin
    .from('maker_venue_proposals')
    .select('id')
    .eq('venue_id', d.venue_id)
    .eq('proposed_date', d.proposed_date)
    .eq('status', 'accepted')
    .maybeSingle()

  if (conflict) {
    return {
      proposalId: '',
      error: 'This Venue already has a confirmed booking on that date. Please choose another date.',
    }
  }

  // Check availability (if an explicit record exists; absence = available)
  const { data: availSlot } = await admin
    .from('venue_availability')
    .select('status')
    .eq('venue_id', d.venue_id)
    .eq('date', d.proposed_date)
    .eq('slot_type', d.proposed_slot)
    .maybeSingle()

  if (availSlot && !['available'].includes(availSlot.status)) {
    return {
      proposalId: '',
      error: `The ${d.proposed_slot} slot on ${d.proposed_date} is not available. Please choose a different slot or date.`,
    }
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data: inserted, error: insertError } = await admin
    .from('maker_venue_proposals')
    .insert({
      maker_id: user.id,
      venue_id:                d.venue_id,
      event_id:               d.event_id ?? null,
      proposed_date:          d.proposed_date,
      proposed_slot:          d.proposed_slot,
      event_title:            d.event_title,
      expected_attendees:     d.expected_attendees ?? null,
      expected_revenue_paise: d.expected_revenue_paise ?? null,
      proposed_pricing_model: d.proposed_pricing_model ?? null,
      proposed_split_config:  d.proposed_split_config as Json,
      message:                d.message ?? null,
      status:                 'pending',
      counter_offer:          {} as Json,
      expires_at:             expiresAt,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[sendProposal] insert', insertError?.message)
    return { proposalId: '', error: 'Failed to send proposal. Please try again.' }
  }

  // Fetch the full row for the notification
  const { data: proposalRow } = await admin
    .from('maker_venue_proposals')
    .select('*')
    .eq('id', inserted.id)
    .single()

  if (proposalRow) {
    notifyVenueOfProposal(proposalRow, maker.display_name, venue.slug, venue.contact_whatsapp)
      .catch(() => { /* fire-and-forget */ })
  }

  // In-app notifications to venue owner (fire-and-forget)
  void (async () => {
    try {
      const { data: venueOwner } = await admin
        .from('venue_profiles')
        .select('auth_user_id')
        .eq('id', d.venue_id)
        .maybeSingle()
      if (venueOwner?.auth_user_id) {
        await createNotification({
          recipientId: venueOwner.auth_user_id,
          type: 'new_proposal',
          title: 'New venue proposal',
          body: `${maker.display_name ?? 'A maker'} wants to host "${d.event_title}" at your Venue.`,
          actionUrl: '/business/venue/dashboard/proposals',
        })
        await createNotification({
          recipientId: venueOwner.auth_user_id,
          type: 'venue_new_proposal',
          title: 'New booking request',
          body: `${maker.display_name ?? 'A maker'} wants to host "${d.event_title}" at your space.`,
          actionUrl: '/business/venue/bookings',
        })
      }
    } catch {}
  })()

  return { proposalId: inserted.id, error: null }
}

// ---------------------------------------------------------------------------
// withdrawProposal
// ---------------------------------------------------------------------------

/**
 * Allows a Maker to withdraw a proposal they sent, provided it is still in a
 * mutable state ('pending' or 'counter_offered').
 *
 * If the proposal had tentatively held an availability slot ('pending' status
 * in `venue_availability`), that slot is freed back to 'available'.
 *
 * @param proposalId  The proposal to withdraw.
 * @returns `{ error: string | null }`
 */
export async function withdrawProposal(
  proposalId: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/dashboard')

  const uuidResult = z.string().uuid().safeParse(proposalId)
  if (!uuidResult.success) return { error: 'Invalid proposal ID.' }

  const admin = createAdminClient()

  const { data: proposal } = await admin
    .from('maker_venue_proposals')
    .select('id, maker_id, venue_id, proposed_date, proposed_slot, status')
    .eq('id', proposalId)
    .maybeSingle()

  if (!proposal) return { error: 'Proposal not found.' }
  if (proposal.maker_id !== user.id) {
    return { error: 'You can only withdraw proposals you sent.' }
  }
  if (!['pending', 'counter_offered'].includes(proposal.status)) {
    return { error: `Cannot withdraw a proposal with status '${proposal.status}'.` }
  }

  const { error: updateError } = await admin
    .from('maker_venue_proposals')
    .update({ status: 'withdrawn' })
    .eq('id', proposalId)

  if (updateError) {
    console.error('[withdrawProposal]', updateError.message)
    return { error: 'Failed to withdraw proposal. Please try again.' }
  }

  // Free any tentative availability slot this proposal held (fire-and-forget)
  admin
    .from('venue_availability')
    .update({ status: 'available' })
    .eq('venue_id', proposal.venue_id)
    .eq('date', proposal.proposed_date)
    .eq('slot_type', proposal.proposed_slot as import('@/types/database').AvailabilitySlotType)
    .eq('status', 'pending')
    .then(
      () => { /* success */ },
      (e: Error) => console.error('[withdrawProposal] slot release', e.message),
    )

  return { error: null }
}

// ---------------------------------------------------------------------------
// acceptCounterOffer
// ---------------------------------------------------------------------------

/**
 * Called by the Maker after reviewing an Venue's counter-offer.
 * Accepting locks the date as 'confirmed' and optionally links the event.
 *
 * Steps:
 *  1. Verifies the caller sent the proposal and its status is 'counter_offered'.
 *  2. Updates proposal status to 'accepted'.
 *  3. Upserts an `venue_availability` row with `status = 'confirmed'`.
 *  4. If an `event_id` is attached, updates `events.venue_id`.
 *  5. Sends a notification to the Venue (accepted response).
 *
 * @param proposalId  The proposal to accept.
 * @returns `{ error: string | null }`
 */
export async function acceptCounterOffer(
  proposalId: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/dashboard')

  const uuidResult = z.string().uuid().safeParse(proposalId)
  if (!uuidResult.success) return { error: 'Invalid proposal ID.' }

  const admin = createAdminClient()

  const { data: proposal } = await admin
    .from('maker_venue_proposals')
    .select('*')
    .eq('id', proposalId)
    .maybeSingle()

  if (!proposal) return { error: 'Proposal not found.' }
  if (proposal.maker_id !== user.id) {
    return { error: 'You can only accept counter-offers on proposals you sent.' }
  }
  if (proposal.status !== 'counter_offered') {
    return { error: `Proposal status is '${proposal.status}' — only 'counter_offered' proposals can be accepted here.` }
  }

  const { error: updateError } = await admin
    .from('maker_venue_proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

  if (updateError) {
    console.error('[acceptCounterOffer] update proposal', updateError.message)
    return { error: 'Failed to accept counter-offer. Please try again.' }
  }

  // Lock the availability slot as confirmed (fire-and-forget)
  admin
    .from('venue_availability')
    .upsert(
      {
        venue_id:   proposal.venue_id,
        date:      proposal.proposed_date,
        slot_type: proposal.proposed_slot as import('@/types/database').AvailabilitySlotType,
        status:    'confirmed',
        event_id:  proposal.event_id ?? null,
      },
      { onConflict: 'venue_id,date,slot_type' },
    )
    .then(
      () => { /* success */ },
      (e: Error) => console.error('[acceptCounterOffer] slot confirm', e.message),
    )

  // Link the event to this Venue (fire-and-forget)
  if (proposal.event_id) {
    admin
      .from('events')
      .update({ venue_id: proposal.venue_id })
      .eq('id', proposal.event_id)
      .eq('creator_id', user.id)
      .then(
        () => { /* success */ },
        (e: Error) => console.error('[acceptCounterOffer] event link', e.message),
      )
  }

  // Notify the Venue of the acceptance
  const { data: venue } = await admin
    .from('venue_profiles')
    .select('name')
    .eq('id', proposal.venue_id)
    .maybeSingle()

  notifyMakerOfProposalResponse(proposal, 'accepted', venue?.name ?? 'The Venue')
    .catch(() => { /* fire-and-forget */ })

  return { error: null }
}

// ---------------------------------------------------------------------------
// getProposalHistory
// ---------------------------------------------------------------------------

/**
 * Returns all proposals sent by a Maker, including the Venue's profile data
 * for display in the Maker dashboard proposals list.
 *
 * Access control: only the Maker who sent the proposals can view them.
 *
 * @param makerId  Must equal the authenticated user's `user_profiles.id`.
 * @returns Array of proposals with embedded Venue details.
 */
export async function getProposalHistory(
  makerId: string,
): Promise<Array<MakerVenueProposal & { venue: Pick<VenueProfile, 'id' | 'name' | 'slug' | 'city' | 'cover_image_url' | 'pricing_model'> | null }>> {
  const { user } = await requireAuth('/dashboard')

  if (user.id !== makerId) return []

  const admin = createAdminClient()

  const { data: proposals, error } = await admin
    .from('maker_venue_proposals')
    .select('*')
    .eq('maker_id', makerId)
    .order('created_at', { ascending: false })

  if (error || !proposals?.length) return []

  // Batch-fetch Venue profiles
  const venueIds = [...new Set(proposals.map((p) => p.venue_id))]
  const { data: venues } = await admin
    .from('venue_profiles')
    .select('id, name, slug, city, cover_image_url, pricing_model')
    .in('id', venueIds)

  const venueMap = new Map((venues ?? []).map((a) => [a.id, a]))

  return proposals.map((p) => ({
    ...p,
    venue: venueMap.get(p.venue_id) ?? null,
  }))
}

// ---------------------------------------------------------------------------
// getVenuePublicPage
// ---------------------------------------------------------------------------

/**
 * Fetches all data needed to render an Venue's public profile page at `/venue/[slug]`.
 *
 * No authentication required — this is a public endpoint.
 *
 * Returns:
 *  - Full Venue profile (only if `is_active = true`)
 *  - Upcoming published events (next 60 days, joined with maker profile snippet)
 *  - 6 most recent past (completed) events (title, date, attendee count, cover)
 *  - Aggregate stats: total event count + average maker rating
 *
 * @param slug  The Venue's URL slug.
 * @returns Page data or `{ error: string }` if the Venue is not found.
 */
export async function getVenuePublicPage(slug: string): Promise<{
  venue: VenueProfile
  upcomingEvents: Array<Event & {
    maker: Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'creator_type'>
  }>
  pastEvents: Array<{
    title: string
    date: string
    attendee_count: number
    cover_image_url: string | null
  }>
  stats: { total_events: number; average_rating: number }
  theme: ProfileTheme
} | { error: string }> {
  const supabase = await createClient()

  const { data: venue, error: venueError } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (venueError) {
    console.error('[getVenuePublicPage]', venueError.message)
    return { error: 'Failed to load Venue page.' }
  }
  if (!venue) return { error: 'Venue not found.' }

  const now = new Date().toISOString()
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const [upcomingResult, pastResult, profileResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('status', 'published')
      .gte('starts_at', now)
      .lte('starts_at', in60Days)
      .order('starts_at', { ascending: true })
      .limit(10),

    supabase
      .from('events')
      .select('id, title, starts_at, cover_image_url, creator_id')
      .eq('venue_id', venue.id)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(6),

    supabase
      .from('user_profiles')
      .select('page_theme')
      .eq('id', venue.auth_user_id)
      .maybeSingle(),
  ])

  const upcomingEvents = upcomingResult.data ?? []
  const pastEventRows = pastResult.data ?? []

  // Fetch maker profiles for upcoming events
  const creatorIds = [...new Set(upcomingEvents.map((e) => e.creator_id))]
  const { data: makers } = creatorIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, display_name, username, avatar_url, creator_type')
        .in('id', creatorIds)
    : { data: [] }

  const makerMap = new Map((makers ?? []).map((m) => [m.id, m]))

  const upcomingWithMakers = upcomingEvents.map((ev) => ({
    ...ev,
    maker: (() => {
      const m = makerMap.get(ev.creator_id)
      return {
        display_name: m?.display_name ?? 'Unknown Maker',
        username:     m?.username ?? '',
        avatar_url:   m?.avatar_url ?? null,
        creator_type: m?.creator_type ?? ('content_creation' as UserProfile['creator_type']),
      }
    })(),
  }))

  // Fetch attendee counts for past events
  let pastWithCounts: Array<{ title: string; date: string; attendee_count: number; cover_image_url: string | null }> = []
  if (pastEventRows.length) {
    const pastIds = pastEventRows.map((e) => e.id)
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('event_id')
      .in('event_id', pastIds)
      .eq('payment_status', 'captured')

    const countMap = new Map<string, number>()
    for (const r of rsvps ?? []) {
      countMap.set(r.event_id, (countMap.get(r.event_id) ?? 0) + 1)
    }

    pastWithCounts = pastEventRows.map((e) => ({
      title:           e.title,
      date:            e.starts_at,
      attendee_count:  countMap.get(e.id) ?? 0,
      cover_image_url: e.cover_image_url,
    }))
  }

  const stats = {
    total_events:   venue.total_events_hosted,
    average_rating: venue.average_maker_rating,
  }

  const theme = resolveTheme(profileResult.data?.page_theme, { venueTypes: venue.venue_type ?? [] })

  return {
    venue,
    upcomingEvents: upcomingWithMakers,
    pastEvents:     pastWithCounts,
    stats,
    theme,
  }
}
