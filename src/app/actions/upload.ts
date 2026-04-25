'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Uploads a cover image for an event to Supabase Storage.
 *
 * Requires an `event-covers` bucket to be created in Supabase with public
 * read access. Create it in the Supabase dashboard or via migration:
 *   INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);
 */
export async function uploadEventCover(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { url: null, error: 'Not authenticated.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { url: null, error: 'No file provided.' }
  if (file.size > 5 * 1024 * 1024) return { url: null, error: 'Image must be smaller than 5 MB.' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return { url: null, error: 'Image must be JPEG, PNG, or WebP.' }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${user.id}/${Date.now()}.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('event-covers')
    .upload(filename, file, { upsert: false, contentType: file.type })

  if (uploadError) {
    console.error('[uploadEventCover]', uploadError.message)
    return { url: null, error: 'Failed to upload image.' }
  }

  const { data: { publicUrl } } = admin.storage
    .from('event-covers')
    .getPublicUrl(filename)

  return { url: publicUrl, error: null }
}
