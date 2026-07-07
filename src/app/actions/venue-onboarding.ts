'use server'

// =============================================================================
// WIMC — Venue onboarding server actions
// Mirrors the Maker onboarding pattern: step data is persisted in Supabase
// auth user_metadata until completeVenueOnboarding commits everything atomically.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { PricingModel, AvailabilitySlotType } from '@/types/database'

// ---------------------------------------------------------------------------
// Step-data shapes
// ---------------------------------------------------------------------------

const Step1Schema = z.object({
  name:              z.string().min(2, 'Name must be at least 2 characters').max(100),
  description:       z.string().max(1000).optional(),
  city:              z.string().min(1, 'City is required'),
  neighbourhood:     z.string().max(100).optional(),
  address:           z.string().min(5, 'Address is required').max(500),
  lat:               z.number().min(-90).max(90).optional(),
  lng:               z.number().min(-180).max(180).optional(),
  google_place_id:   z.string().optional(),
  google_name:       z.string().optional(),
  phone:             z.string().optional(),
  website:           z.string().url().optional().or(z.literal('')),
  google_rating:     z.number().min(1).max(5).optional(),
  google_reviews:    z.array(z.object({
    author_name: z.string(),
    rating:      z.number(),
    text:        z.string(),
    time:        z.number(),
  })).optional(),
  google_photo_urls: z.array(z.string().url()).max(5).optional(),
})

const VALID_VENUE_TYPES = [
  'cafe', 'coworking', 'gallery', 'community_hall',
  'rooftop', 'garden', 'studio', 'library', 'restaurant',
] as const

const Step2Schema = z.object({
  venue_type: z
    .array(z.enum(VALID_VENUE_TYPES))
    .min(1, 'Select at least one venue type'),
  capacity_min: z.number().int().min(1).optional(),
  capacity_max: z.number().int().min(1).optional(),
  capacity_configurations: z
    .array(z.object({ type: z.string(), capacity: z.number().int().positive() }))
    .default([]),
}).refine(
  (d) => d.capacity_min == null || d.capacity_max == null || d.capacity_max >= d.capacity_min,
  { message: 'Maximum capacity must be ≥ minimum capacity', path: ['capacity_max'] },
)

const VALID_AMENITIES = [
  // Connectivity & Tech
  'wifi', 'projector', 'sound_system', 'pa_system', 'microphone', 'power_backup',
  // Food & Drink
  'serves_food', 'bar_alcohol', 'coffee_tea', 'outside_catering', 'kitchen',
  // Space & Access
  'parking', 'ac', 'wheelchair', 'accessible', 'outdoor', 'outdoor_space', 'near_transit',
  // Vibe & Rules
  'board_games', 'photo_friendly', 'natural_light', 'dj_ok', 'smoking_area', 'late_night',
  // Legacy
  'whiteboard',
] as const

const VALID_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const

const Step3Schema = z.object({
  amenities:      z.array(z.enum(VALID_AMENITIES)).default([]),
  pricing_model:  z.enum(['fixed_rental', 'door_split', 'hybrid', 'f_and_b_minimum']),
  pricing_config: z.object({
    fixed_rental_paise:   z.number().int().positive().optional(),
    door_split_percent:   z.number().min(0).max(100).optional(),
    hybrid_rental_paise:  z.number().int().positive().optional(),
    hybrid_split_percent: z.number().min(0).max(100).optional(),
    f_and_b_minimum_paise: z.number().int().positive().optional(),
  }).default({}),
  available_days: z.array(z.enum(VALID_DAYS)).default([]),
})

const Step4Schema = z.object({
  contact_whatsapp:  z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid WhatsApp number')
    .optional()
    .or(z.literal('')),
  contact_email:     z.string().email().optional().or(z.literal('')),
  instagram_handle:  z
    .string()
    .regex(/^[a-zA-Z0-9_.]*$/, 'Invalid Instagram handle')
    .max(30)
    .optional()
    .or(z.literal('')),
})

/** Union of step payloads accepted by `saveVenueOnboardingStep`. */
export type VenueOnboardingStepData =
  | ({ step: 1 } & z.infer<typeof Step1Schema>)
  | ({ step: 2 } & z.infer<typeof Step2Schema>)
  | ({ step: 3 } & z.infer<typeof Step3Schema>)
  | ({ step: 4 } & z.infer<typeof Step4Schema>)

// ---------------------------------------------------------------------------
// Complete onboarding schema (validated in completeVenueOnboarding)
// ---------------------------------------------------------------------------

const CompleteVenueSchema = z.object({
  // Step 1
  name:              z.string().min(2).max(100),
  description:       z.string().max(1000).optional(),
  city:              z.string().min(1),
  neighbourhood:     z.string().max(100).optional(),
  address:           z.string().min(5).max(500),
  lat:               z.number().optional(),
  lng:               z.number().optional(),
  google_place_id:   z.string().optional(),
  google_name:       z.string().optional(),
  phone:             z.string().optional(),
  website:           z.string().url().optional().or(z.literal('')),
  google_rating:     z.number().min(1).max(5).optional(),
  google_reviews:    z.array(z.object({
    author_name: z.string(),
    rating:      z.number(),
    text:        z.string(),
    time:        z.number(),
  })).optional(),
  google_photo_urls: z.array(z.string().url()).max(5).optional(),
  // Step 2
  venue_type:                z.array(z.enum(VALID_VENUE_TYPES)).min(1),
  capacity_min:             z.number().int().min(1).optional(),
  capacity_max:             z.number().int().min(1).optional(),
  capacity_configurations:  z.array(z.object({ type: z.string(), capacity: z.number() })).default([]),
  // Step 3
  amenities:      z.array(z.enum(VALID_AMENITIES)).default([]),
  pricing_model:  z.enum(['fixed_rental', 'door_split', 'hybrid', 'f_and_b_minimum']),
  pricing_config: z.object({
    fixed_rental_paise:    z.number().int().positive().optional(),
    door_split_percent:    z.number().min(0).max(100).optional(),
    hybrid_rental_paise:   z.number().int().positive().optional(),
    hybrid_split_percent:  z.number().min(0).max(100).optional(),
    f_and_b_minimum_paise: z.number().int().positive().optional(),
  }).default({}),
  available_days: z.array(z.enum(VALID_DAYS)).default([]),
  // Step 4
  contact_whatsapp: z.string().optional().or(z.literal('')),
  contact_email:    z.string().email().optional().or(z.literal('')),
  instagram_handle: z.string().max(30).optional().or(z.literal('')),
  // New extended fields
  preferred_times:    z.array(z.enum(['morning', 'afternoon', 'evening', 'late_night'])).default([]),
  event_preferences:  z.array(z.string()).default([]),
  lead_time_weeks:    z.number().int().min(1).max(52).optional(),
  alcohol_license:    z.boolean().default(false),
  sound_curfew_time:  z.string().optional(),
  google_place_types: z.array(z.string()).default([]),
}).refine(
  (d) => d.capacity_min == null || d.capacity_max == null || d.capacity_max >= d.capacity_min,
  { message: 'Maximum capacity must be ≥ minimum capacity', path: ['capacity_max'] },
)

export type CompleteVenueInput = z.infer<typeof CompleteVenueSchema>

// ---------------------------------------------------------------------------
// saveVenueOnboardingStep
// ---------------------------------------------------------------------------

/**
 * Persists one step's worth of Venue onboarding data to the authenticated
 * user's Supabase auth `user_metadata` under the key `venue_onboarding`.
 *
 * Each call merges (not replaces) the existing metadata so partial progress
 * from earlier steps is preserved.
 *
 * Steps:
 *  1. basicInfo  — name, description, city, neighbourhood, address, lat/lng
 *  2. venueType  — venue_type, capacity_min/max, capacity_configurations
 *  3. amenities  — amenities, pricing_model, pricing_config, available_days
 *  4. contact    — contact_whatsapp, contact_email, instagram_handle
 *
 * @param step  Step number (1–4).
 * @param data  The step payload (validated with the appropriate Zod schema).
 * @returns `{ error: string | null }`
 */
export async function saveVenueOnboardingStep(
  step: number,
  data: VenueOnboardingStepData,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/onboarding/venue')

  let parsed: z.SafeParseReturnType<unknown, unknown>

  switch (step) {
    case 1: parsed = Step1Schema.safeParse(data); break
    case 2: parsed = Step2Schema.safeParse(data); break
    case 3: parsed = Step3Schema.safeParse(data); break
    case 4: parsed = Step4Schema.safeParse(data); break
    default: return { error: `Invalid step number: ${step}` }
  }

  if (!parsed.success) {
    return { error: (parsed as z.SafeParseError<unknown>).error.errors[0].message }
  }

  const admin = createAdminClient()

  // Merge with existing venue_onboarding metadata
  const { data: existing } = await admin.auth.admin.getUserById(user.id)
  const current = (existing?.user?.user_metadata?.venue_onboarding ?? {}) as Record<string, unknown>

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...existing?.user?.user_metadata,
      venue_onboarding: { ...current, ...(parsed.data as Record<string, unknown>), last_step: step },
    },
  })

  if (error) {
    console.error('[saveVenueOnboardingStep]', error.message)
    return { error: 'Failed to save your progress. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// completeVenueOnboarding
// ---------------------------------------------------------------------------

/**
 * Finalises Venue onboarding by committing the profile and default availability.
 *
 * Steps:
 *  1. Validates the complete payload with Zod.
 *  2. Checks that this auth account does not already have an Venue profile.
 *  3. Uploads the cover image to `venue-covers/{venue_id}/cover.{ext}`.
 *  4. Uploads up to 12 gallery images to `venue-covers/{venue_id}/gallery/{n}.{ext}`.
 *  5. Inserts the `venue_profiles` row.
 *  6. Seeds `venue_availability` for the next 30 days, restricted to the
 *     days the venue selected in V7 (available_days). If available_days is
 *     empty, seeds all 7 days as a safe fallback.
 *  7. Clears the `venue_onboarding` key from `user_metadata`.
 *
 * @param data            Validated onboarding payload (all four steps merged).
 * @param coverImageFile  Optional cover image `File` to upload.
 * @param galleryFiles    Optional array of up to 12 gallery `File` objects.
 * @returns `{ slug, error: null }` on success, `{ slug: '', error }` on failure.
 */
export async function completeVenueOnboarding(
  data: CompleteVenueInput,
  coverImageFile?: File,
  galleryFiles?: File[],
): Promise<{ slug: string; error: string | null }> {
  const { user } = await requireAuth('/onboarding/venue')

  // City is required for /{city}/{slug} URL routing
  if (!data.city || data.city.trim() === '') {
    return { slug: '', error: 'City is required to complete onboarding.' }
  }

  const parsed = CompleteVenueSchema.safeParse(data)
  if (!parsed.success) {
    return { slug: '', error: parsed.error.errors[0].message }
  }

  const d = parsed.data

  const admin = createAdminClient()

  // Idempotency guard: one Venue per auth account
  const { data: existing } = await admin
    .from('venue_profiles')
    .select('slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { slug: existing.slug, error: null }
  }

  // Generate a unique slug from the venue name
  const slug = await generateUniqueSlug(d.name, admin)

  let coverUrl: string | null = null
  const galleryUrls: string[] = []

  // Upload cover image
  if (coverImageFile && coverImageFile.size > 0) {
    const coverResult = await uploadImage(admin, coverImageFile, slug, 'cover')
    if (coverResult.error) return { slug: '', error: coverResult.error }
    coverUrl = coverResult.url
  }

  // Upload gallery images (max 12)
  const filesToUpload = (galleryFiles ?? []).slice(0, 12)
  for (let i = 0; i < filesToUpload.length; i++) {
    const f = filesToUpload[i]
    if (!f || f.size === 0) continue
    const result = await uploadImage(admin, f, slug, `gallery/${i}`)
    if (result.url) galleryUrls.push(result.url)
  }

  // Merge Google-prefetched photos (already in Supabase Storage) with any
  // user-uploaded gallery files, capped at the 12-image DB constraint.
  const allGallery = [...(d.google_photo_urls ?? []), ...galleryUrls].slice(0, 12)

  // Insert venue_profiles row
  const { error: insertError } = await admin.from('venue_profiles').insert({
    auth_user_id:            user.id,
    slug,
    name:                    d.name,
    description:             d.description ?? null,
    venue_type:               d.venue_type,
    city:                    d.city,
    neighbourhood:           d.neighbourhood ?? null,
    address:                 d.address,
    lat:                     d.lat ?? null,
    lng:                     d.lng ?? null,
    cover_image_url:         coverUrl ?? (allGallery[0] ?? null),
    gallery_images:          allGallery,
    capacity_min:            d.capacity_min ?? null,
    capacity_max:            d.capacity_max ?? null,
    capacity_configurations: d.capacity_configurations,
    amenities:               d.amenities,
    pricing_model:           d.pricing_model as PricingModel,
    pricing_config:          d.pricing_config,
    contact_whatsapp:        d.contact_whatsapp || null,
    contact_email:           d.contact_email || null,
    instagram_handle:        d.instagram_handle || null,
    google_place_id:         d.google_place_id ?? null,
    google_name:             d.google_name ?? null,
    phone:                   d.phone || null,
    website:                 d.website || null,
    google_rating:           d.google_rating ?? null,
    google_reviews:          d.google_reviews ?? [],
    preferred_times:         d.preferred_times,
    event_preferences:       d.event_preferences,
    lead_time_weeks:         d.lead_time_weeks ?? 2,
    alcohol_license:         d.alcohol_license,
    sound_curfew_time:       d.sound_curfew_time ?? null,
    google_place_types:      d.google_place_types,
  })

  if (insertError) {
    console.error('[completeVenueOnboarding] insert', insertError.message)
    return { slug: '', error: 'Failed to create your Venue profile. Please try again.' }
  }

  // Fetch the newly created venue_id for availability seeding
  const { data: newVenue } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  // Seed availability: next 30 days, restricted to the days the venue selected.
  // Falls back to all 7 days if available_days is empty (safe default).
  if (newVenue) {
    const availabilityRows = buildDefaultAvailability(newVenue.id, d.available_days)
    const chunkSize = 50
    for (let i = 0; i < availabilityRows.length; i += chunkSize) {
      await admin
        .from('venue_availability')
        .upsert(availabilityRows.slice(i, i + chunkSize), { onConflict: 'venue_id,date,slot_type' })
    }
  }

  // Clear onboarding metadata
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { venue_onboarding: null },
  }).catch(() => { /* non-fatal */ })

  // Ensure 'venue' is in the personas array on user_profiles so business layout
  // guards work correctly for users who completed onboarding before this was set.
  const { data: up } = await admin
    .from('user_profiles')
    .select('personas')
    .eq('id', user.id)
    .maybeSingle()
  const existingPersonas = (up?.personas ?? []) as string[]
  if (!existingPersonas.includes('venue')) {
    await admin
      .from('user_profiles')
      .update({ personas: [...existingPersonas, 'venue'] })
      .eq('id', user.id)
  }

  return { slug, error: null }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Generates a unique slug derived from the venue name. */
async function generateUniqueSlug(
  name: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'venue'

  const candidates = [
    base,
    ...Array.from({ length: 6 }, () => `${base}-${Math.floor(100 + Math.random() * 900)}`),
  ].filter((c) => c.length >= 3)

  const { data: taken } = await admin
    .from('venue_profiles')
    .select('slug')
    .in('slug', candidates)

  const takenSet = new Set((taken ?? []).map((r) => r.slug))
  const free = candidates.find((c) => !takenSet.has(c))
  if (free) return free

  return `venue-${Math.floor(100000 + Math.random() * 900000)}`
}

/** Uploads a single image to the `venue-covers` bucket and returns its public URL. */
async function uploadImage(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
  slug: string,
  pathSegment: string,
): Promise<{ url: string; error: null } | { url: ''; error: string }> {
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) return { url: '', error: `Image "${file.name}" must be smaller than 5 MB.` }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return { url: '', error: 'Images must be JPEG, PNG, or WebP.' }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const storagePath = `${slug}/${pathSegment}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('venue-covers')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[completeVenueOnboarding] image upload', uploadError.message)
    return { url: '', error: 'Failed to upload image. Please try again.' }
  }

  const { data: urlData } = admin.storage.from('venue-covers').getPublicUrl(storagePath)
  return { url: urlData.publicUrl, error: null }
}

// Day-of-week index: 0 = Sunday … 6 = Saturday (matches JS Date.getDay())
const DAY_INDICES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

/**
 * Builds `venue_availability` rows for the next 30 days.
 *
 * Only days that appear in `availableDays` are included. If `availableDays`
 * is empty (venue skipped V7 or it wasn't collected), all 7 days are seeded
 * as a safe fallback — matching the old behaviour.
 *
 * @param venueId       The newly inserted venue_profiles.id
 * @param availableDays  Array of day names from V7 (e.g. ['monday','friday'])
 */
function buildDefaultAvailability(
  venueId: string,
  availableDays: string[],
): Array<{ venue_id: string; date: string; slot_type: AvailabilitySlotType; status: 'available' }> {
  // Normalise to lowercase for safe comparison
  const allowedIndices = availableDays.length > 0
    ? new Set(availableDays.map(d => DAY_INDICES[d.toLowerCase()]).filter(i => i !== undefined))
    : null // null = allow all days

  const rows: ReturnType<typeof buildDefaultAvailability> = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)

    // Skip days the venue said they're unavailable
    if (allowedIndices !== null && !allowedIndices.has(d.getDay())) continue

    rows.push({
      venue_id:   venueId,
      date:      d.toISOString().split('T')[0],
      slot_type: 'full_day',
      status:    'available',
    })
  }

  return rows
}
