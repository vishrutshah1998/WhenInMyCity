'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'

/**
 * Downloads up to 5 Google Places photos (by photo_reference) and stores them
 * in Supabase Storage under venue-covers/prefetch/{userId}/{n}.jpg.
 *
 * Called immediately after the user confirms their venue address in V5.
 * The returned URLs are stored in session storage (SK.v_google_photos) and
 * passed to completeVenueOnboarding, which merges them into gallery_images.
 */
export async function prefetchGooglePhotos(
  photoRefs: string[],
): Promise<{ urls: string[]; error: string | null }> {
  const { user } = await requireAuth('/onboarding')

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { urls: [], error: null } // silently no-op if not configured

  if (!photoRefs.length) return { urls: [], error: null }

  const admin = createAdminClient()
  const urls: string[] = []

  await Promise.all(
    photoRefs.slice(0, 5).map(async (ref, i) => {
      try {
        const photoUrl =
          `https://maps.googleapis.com/maps/api/place/photo` +
          `?maxwidth=1200&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`

        const res = await fetch(photoUrl, { redirect: 'follow' })
        if (!res.ok) return

        const contentType = res.headers.get('content-type') ?? 'image/jpeg'
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
        const buffer = Buffer.from(await res.arrayBuffer())
        const storagePath = `prefetch/${user.id}/${i}.${ext}`

        const { error: uploadError } = await admin.storage
          .from('venue-covers')
          .upload(storagePath, buffer, { upsert: true, contentType })

        if (uploadError) return

        const { data } = admin.storage.from('venue-covers').getPublicUrl(storagePath)
        urls[i] = data.publicUrl
      } catch {
        // non-fatal — partial results are fine
      }
    }),
  )

  return { urls: urls.filter(Boolean), error: null }
}
