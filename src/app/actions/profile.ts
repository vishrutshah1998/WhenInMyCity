'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileThemeSchema } from '@/types/theme'
import type { ProfileTheme } from '@/types/theme'
import type { CreatorType } from '@/types/database'

// ---------------------------------------------------------------------------
// updateProfileTheme
// ---------------------------------------------------------------------------

export async function updateProfileTheme(
  theme: ProfileTheme,
): Promise<{ error: string | null }> {
  const parsed = ProfileThemeSchema.safeParse(theme)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('user_profiles')
    .update({ page_theme: parsed.data, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('[updateProfileTheme]', error.message)
    return { error: 'Failed to save theme.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// updateProfile — general profile fields
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// uploadAvatar — accepts FormData so File serialization works correctly
// ---------------------------------------------------------------------------

export async function uploadAvatar(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { url: null, error: 'Not authenticated.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { url: null, error: null }

  if (file.size > 5 * 1024 * 1024) return { url: null, error: 'Avatar must be smaller than 5 MB.' }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) return { url: null, error: 'Avatar must be a JPEG, PNG, WebP, or GIF.' }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(`${user.id}/avatar.${ext}`, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[uploadAvatar]', uploadError.message)
    return { url: null, error: 'Failed to upload avatar.' }
  }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(`${user.id}/avatar.${ext}`)
  return { url: urlData.publicUrl, error: null }
}

// ---------------------------------------------------------------------------
// updateProfile — general profile fields
// ---------------------------------------------------------------------------

export interface UpdateProfileInput {
  display_name: string
  bio: string
  city: string
  creator_type?: CreatorType
  sub_types: string[]
  offline_activities: string[]
  social_links: Record<string, string>
  avatar_url?: string
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  if (!input.display_name.trim()) return { error: 'Display name is required.' }
  if (!input.city.trim()) return { error: 'City is required.' }
  if (input.bio.length > 160) return { error: 'Bio must be 160 characters or fewer.' }

  // Clean social links — strip empty values and normalise URLs
  const socialLinks: Record<string, string> = {}
  for (const [platform, url] of Object.entries(input.social_links)) {
    const cleaned = (url ?? '').trim()
    if (cleaned) {
      socialLinks[platform] = platform !== 'whatsapp' && !cleaned.startsWith('http')
        ? `https://${cleaned}`
        : cleaned
    }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      display_name:       input.display_name.trim(),
      bio:                input.bio.trim() || null,
      city:               input.city.trim(),
      ...(input.creator_type ? { creator_type: input.creator_type } : {}),
      sub_types:          input.sub_types,
      offline_activities: input.offline_activities,
      social_links:       socialLinks,
      ...(input.avatar_url ? { avatar_url: input.avatar_url } : {}),
      updated_at:         new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[updateProfile]', error.message)
    return { error: 'Failed to save profile.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/${user.id}`)
  return { error: null }
}

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

export async function deleteAccount(): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/signin')

  // Delete profile row (cascades to blocks, events, rsvps via FK ON DELETE CASCADE)
  await supabase.from('user_profiles').delete().eq('id', user.id)
  // Sign out first so cookies are cleared on the client before we delete the auth record
  await supabase.auth.signOut()
  // Permanently remove the auth.users record — re-login will create a fresh account and trigger onboarding
  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(user.id)

  redirect('/')
}
