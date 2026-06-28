'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { cityToSlug } from '@/lib/profile-url'

// ---------------------------------------------------------------------------
// updateBrandProfile — editable brand fields only.
// Locked fields (display_name, city, business_categories, phone, username,
// created_at) are intentionally excluded — they establish marketplace trust
// and cannot be changed post-onboarding.
// ---------------------------------------------------------------------------

const UpdateBrandProfileSchema = z.object({
  bio:             z.string().max(500).optional(),
  contact_email:   z.string().email().optional().or(z.literal('')),
  instagram_handle:z.string().max(60).optional().or(z.literal('')),
  website_url:     z.string().url().optional().or(z.literal('')),
  wimc_goals:      z.array(z.string()).optional(),
  target_audience: z.array(z.string()).optional(),
})

export type UpdateBrandProfileInput = z.infer<typeof UpdateBrandProfileSchema>

export async function updateBrandProfile(
  input: UpdateBrandProfileInput,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const supabase  = await createClient()

  const parsed = UpdateBrandProfileSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const d = parsed.data

  const { error } = await supabase
    .from('user_profiles')
    .update({
      ...(d.bio              !== undefined ? { bio:              d.bio || null }              : {}),
      ...(d.contact_email    !== undefined ? { contact_email:   d.contact_email || null }    : {}),
      ...(d.instagram_handle !== undefined ? { instagram_handle:d.instagram_handle || null } : {}),
      ...(d.website_url      !== undefined ? { website_url:     d.website_url || null }      : {}),
      ...(d.wimc_goals       !== undefined ? { wimc_goals:      d.wimc_goals }               : {}),
      ...(d.target_audience  !== undefined ? { target_audience: d.target_audience }          : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[updateBrandProfile]', error.message)
    return { error: 'Failed to save changes.' }
  }

  // Revalidate the public brand page so the iframe preview reflects changes
  const { data: updated } = await supabase
    .from('user_profiles')
    .select('city, username')
    .eq('id', user.id)
    .maybeSingle()

  if (updated?.city && updated?.username) {
    revalidatePath(`/${cityToSlug(updated.city)}/${updated.username}`)
  }

  return { error: null }
}
