'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { Json } from '@/types/database'
import type { VenueFormState } from '@/components/venue/editor/types'

export async function saveVenueDetails(
  addaId: string,
  state: VenueFormState,
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  // Build gallery arrays: first photo is cover, rest go in gallery_images
  const coverPhoto = state.photos.find(p => p.is_cover)
  const galleryPhotos = state.photos.filter(p => !p.is_cover && !p.is_local)

  // Build extended pricing_config — preserves all new venue detail fields
  const extendedConfig = {
    pricing_rules: state.pricing_rules,
    parking_details: state.parking_details,
    accessibility_notes: state.accessibility_notes,
    house_rules: state.house_rules,
    included_items: state.included_items,
    cancellation_policy: state.cancellation_policy,
  }

  const { error } = await supabase
    .from('adda_profiles')
    .update({
      name: state.name.trim(),
      description: state.description.trim() || null,
      adda_type: state.adda_type,
      capacity_min: state.capacity_min,
      capacity_max: state.capacity_max,
      amenities: state.amenities,
      pricing_model: state.pricing_model as never,
      pricing_config: extendedConfig as unknown as Json,
      gallery_images: galleryPhotos.map(p => p.url),
      cover_image_url: coverPhoto?.url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', addaId)
    .eq('auth_user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
