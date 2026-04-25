'use server'

// =============================================================================
// WIMC — Adda onboarding server actions
// Mirrors the Maker onboarding pattern: step data is persisted in Supabase
// auth user_metadata until completeAddaOnboarding commits everything atomically.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { PricingModel, AvailabilitySlotType } from '@/types/database'

// ---------------------------------------------------------------------------
// Step-data shapes
// ---------------------------------------------------------------------------

const Step1Schema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 characters').max(100),
  description:   z.string().max(1000).optional(),
  city:          z.string().min(1, 'City is required'),
  neighbourhood: z.string().max(100).optional(),
  address:       z.string().min(5, 'Address is required').max(500),
  lat:           z.number().min(-90).max(90).optional(),
  lng:           z.number().min(-180).max(180).optional(),
})

const VALID_ADDA_TYPES = [
  'cafe', 'coworking', 'gallery', 'community_hall',
  'rooftop', 'garden', 'studio', 'library', 'restaurant',
] as const

const Step2Schema = z.object({
  adda_type: z
    .array(z.enum(VALID_ADDA_TYPES))
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
  'projector', 'pa_system', 'natural_light', 'parking',
  'accessible', 'wifi', 'whiteboard', 'kitchen', 'outdoor_space', 'ac',
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

/** Union of step payloads accepted by `saveAddaOnboardingStep`. */
export type AddaOnboardingStepData =
  | ({ step: 1 } & z.infer<typeof Step1Schema>)
  | ({ step: 2 } & z.infer<typeof Step2Schema>)
  | ({ step: 3 } & z.infer<typeof Step3Schema>)
  | ({ step: 4 } & z.infer<typeof Step4Schema>)

// ---------------------------------------------------------------------------
// Complete onboarding schema (validated in completeAddaOnboarding)
// ---------------------------------------------------------------------------

const CompleteAddaSchema = z.object({
  // Step 1
  name:          z.string().min(2).max(100),
  description:   z.string().max(1000).optional(),
  city:          z.string().min(1),
  neighbourhood: z.string().max(100).optional(),
  address:       z.string().min(5).max(500),
  lat:           z.number().optional(),
  lng:           z.number().optional(),
  // Step 2
  adda_type:                z.array(z.enum(VALID_ADDA_TYPES)).min(1),
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
  // Step 4
  contact_whatsapp: z.string().optional().or(z.literal('')),
  contact_email:    z.string().email().optional().or(z.literal('')),
  instagram_handle: z.string().max(30).optional().or(z.literal('')),
}).refine(
  (d) => d.capacity_min == null || d.capacity_max == null || d.capacity_max >= d.capacity_min,
  { message: 'Maximum capacity must be ≥ minimum capacity', path: ['capacity_max'] },
)

export type CompleteAddaInput = z.infer<typeof CompleteAddaSchema>

// ---------------------------------------------------------------------------
// Slug validation regex (3-50 chars, lowercase alphanumeric + hyphens)
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$|^[a-z0-9]{3,50}$/

// ---------------------------------------------------------------------------
// checkAddaSlugAvailable
// ---------------------------------------------------------------------------

/**
 * Checks whether a proposed Adda URL slug is valid and unoccupied.
 *
 * Validation rules:
 *  - 3–50 characters
 *  - Lowercase alphanumeric characters and hyphens only
 *  - No leading or trailing hyphens
 *
 * The check is case-insensitive (slugs are stored lowercase by convention).
 *
 * @param slug - The candidate slug (as typed by the user).
 * @returns `{ available: true }` or `{ available: false, error: string }`.
 */
export async function checkAddaSlugAvailable(
  slug: string,
): Promise<{ available: boolean; error?: string }> {
  if (!SLUG_RE.test(slug)) {
    return {
      available: false,
      error: 'Slug must be 3–50 characters and contain only lowercase letters, numbers, and hyphens.',
    }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('adda_profiles')
    .select('slug')
    .eq('slug', slug.toLowerCase())
    .maybeSingle()

  if (error) {
    console.error('[checkAddaSlugAvailable]', error.message)
    return { available: false, error: 'Could not check slug availability. Please try again.' }
  }

  return data === null ? { available: true } : { available: false, error: 'That slug is already taken.' }
}

// ---------------------------------------------------------------------------
// saveAddaOnboardingStep
// ---------------------------------------------------------------------------

/**
 * Persists one step's worth of Adda onboarding data to the authenticated
 * user's Supabase auth `user_metadata` under the key `adda_onboarding`.
 *
 * Each call merges (not replaces) the existing metadata so partial progress
 * from earlier steps is preserved.
 *
 * Steps:
 *  1. basicInfo  — name, description, city, neighbourhood, address, lat/lng
 *  2. venueType  — adda_type, capacity_min/max, capacity_configurations
 *  3. amenities  — amenities, pricing_model, pricing_config
 *  4. contact    — contact_whatsapp, contact_email, instagram_handle
 *
 * @param step  Step number (1–4).
 * @param data  The step payload (validated with the appropriate Zod schema).
 * @returns `{ error: string | null }`
 */
export async function saveAddaOnboardingStep(
  step: number,
  data: AddaOnboardingStepData,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/onboarding/adda')

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

  // Merge with existing adda_onboarding metadata
  const { data: existing } = await admin.auth.admin.getUserById(user.id)
  const current = (existing?.user?.user_metadata?.adda_onboarding ?? {}) as Record<string, unknown>

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...existing?.user?.user_metadata,
      adda_onboarding: { ...current, ...(parsed.data as Record<string, unknown>), last_step: step },
    },
  })

  if (error) {
    console.error('[saveAddaOnboardingStep]', error.message)
    return { error: 'Failed to save your progress. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// completeAddaOnboarding
// ---------------------------------------------------------------------------

/**
 * Finalises Adda onboarding by committing the profile and default availability.
 *
 * Steps:
 *  1. Validates the complete payload with Zod.
 *  2. Checks that this auth account does not already have an Adda profile.
 *  3. Uploads the cover image to `adda-covers/{adda_id}/cover.{ext}`.
 *  4. Uploads up to 12 gallery images to `adda-covers/{adda_id}/gallery/{n}.{ext}`.
 *  5. Inserts the `adda_profiles` row.
 *  6. Creates default `adda_availability` rows: every day for the next 30 days,
 *     `slot_type = 'full_day'`, `status = 'available'`.
 *  7. Clears the `adda_onboarding` key from `user_metadata`.
 *
 * File uploads are accepted via `coverImageFile` and `galleryImageFiles` on the
 * input object. These are optional — the profile can be completed with
 * pre-uploaded URLs (e.g. if the client already called `uploadAddaCoverImage`).
 *
 * @param data            Validated onboarding payload (all four steps merged).
 * @param coverImageFile  Optional cover image `File` to upload.
 * @param galleryFiles    Optional array of up to 12 gallery `File` objects.
 * @returns `{ slug, error: null }` on success, `{ slug: '', error }` on failure.
 */
export async function completeAddaOnboarding(
  data: CompleteAddaInput,
  coverImageFile?: File,
  galleryFiles?: File[],
): Promise<{ slug: string; error: string | null }> {
  const { user } = await requireAuth('/onboarding/adda')

  const parsed = CompleteAddaSchema.safeParse(data)
  if (!parsed.success) {
    return { slug: '', error: parsed.error.errors[0].message }
  }

  const d = parsed.data

  const admin = createAdminClient()

  // Idempotency guard: one Adda per auth account
  const { data: existing } = await admin
    .from('adda_profiles')
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

  // Insert adda_profiles row
  const { error: insertError } = await admin.from('adda_profiles').insert({
    auth_user_id:            user.id,
    slug,
    name:                    d.name,
    description:             d.description ?? null,
    adda_type:               d.adda_type,
    city:                    d.city,
    neighbourhood:           d.neighbourhood ?? null,
    address:                 d.address,
    lat:                     d.lat ?? null,
    lng:                     d.lng ?? null,
    cover_image_url:         coverUrl,
    gallery_images:          galleryUrls,
    capacity_min:            d.capacity_min ?? null,
    capacity_max:            d.capacity_max ?? null,
    capacity_configurations: d.capacity_configurations,
    amenities:               d.amenities,
    pricing_model:           d.pricing_model as PricingModel,
    pricing_config:          d.pricing_config,
    contact_whatsapp:        d.contact_whatsapp || null,
    contact_email:           d.contact_email || null,
    instagram_handle:        d.instagram_handle || null,
  })

  if (insertError) {
    console.error('[completeAddaOnboarding] insert', insertError.message)
    return { slug: '', error: 'Failed to create your Adda profile. Please try again.' }
  }

  // Fetch the newly created adda_id for availability seeding
  const { data: newAdda } = await admin
    .from('adda_profiles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  // Seed default availability: next 30 days as full_day / available
  if (newAdda) {
    const availabilityRows = buildDefaultAvailability(newAdda.id)
    // Insert in chunks to stay within Supabase's row limits
    const chunkSize = 50
    for (let i = 0; i < availabilityRows.length; i += chunkSize) {
      await admin
        .from('adda_availability')
        .upsert(availabilityRows.slice(i, i + chunkSize), { onConflict: 'adda_id,date,slot_type' })
    }
  }

  // Clear onboarding metadata
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { adda_onboarding: null },
  }).catch(() => { /* non-fatal */ })

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
    .slice(0, 48) || 'adda'

  const candidates = [
    base,
    ...Array.from({ length: 6 }, () => `${base}-${Math.floor(100 + Math.random() * 900)}`),
  ]

  for (const candidate of candidates) {
    if (candidate.length < 3) continue
    const { data } = await admin
      .from('adda_profiles')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle()
    if (data === null) return candidate
  }

  return `adda-${Math.floor(100000 + Math.random() * 900000)}`
}

/** Uploads a single image to the `adda-covers` bucket and returns its public URL. */
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
    .from('adda-covers')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[completeAddaOnboarding] image upload', uploadError.message)
    return { url: '', error: 'Failed to upload image. Please try again.' }
  }

  const { data: urlData } = admin.storage.from('adda-covers').getPublicUrl(storagePath)
  return { url: urlData.publicUrl, error: null }
}

/**
 * Builds `adda_availability` rows for the next 30 days (full_day / available).
 * Used to seed a freshly onboarded Adda's calendar.
 */
function buildDefaultAvailability(
  addaId: string,
): Array<{ adda_id: string; date: string; slot_type: AvailabilitySlotType; status: 'available' }> {
  const rows: ReturnType<typeof buildDefaultAvailability> = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    rows.push({
      adda_id:   addaId,
      date:      d.toISOString().split('T')[0],
      slot_type: 'full_day',
      status:    'available',
    })
  }

  return rows
}
