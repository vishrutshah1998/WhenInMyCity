'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileThemeSchema } from '@/types/theme'
import type { ProfileTheme } from '@/types/theme'
import type { CreatorType } from '@/types/database'
import { UsernameSchema } from '@/types/onboarding'

// ---------------------------------------------------------------------------
// Scheme → theme preset map (duplicated from onboarding.ts to keep server-only)
// ---------------------------------------------------------------------------

const SCHEME_PRESETS: Record<string, ProfileTheme> = {
  default:    { colorScheme: 'default',    fontFamily: 'archivo-black', backgroundStyle: 'solid' },
  midnight:   { colorScheme: 'midnight',   fontFamily: 'inter',         backgroundStyle: 'aurora',  auroraStyle: 'nebula' },
  ocean:      { colorScheme: 'ocean',      fontFamily: 'space-grotesk', backgroundStyle: 'aurora',  auroraStyle: 'mesh'   },
  forest:     { colorScheme: 'forest',     fontFamily: 'playfair',      backgroundStyle: 'pattern', patternStyle: 'dots', patternColorCombo: 'cool' },
  blush:      { colorScheme: 'blush',      fontFamily: 'playfair',      backgroundStyle: 'solid' },
  sand:       { colorScheme: 'sand',       fontFamily: 'inter',         backgroundStyle: 'solid' },
  pista:      { colorScheme: 'pista',      fontFamily: 'archivo-black', backgroundStyle: 'solid',   noiseBg: true, heavyBorders: true },
  gulaal:     { colorScheme: 'gulaal',     fontFamily: 'archivo-black', backgroundStyle: 'solid',   noiseBg: true },
  neel:       { colorScheme: 'neel',       fontFamily: 'archivo-black', backgroundStyle: 'solid' },
  turmeric:   { colorScheme: 'turmeric',   fontFamily: 'archivo-black', backgroundStyle: 'solid',   noiseBg: true, heavyBorders: true },
  steel:      { colorScheme: 'steel',      fontFamily: 'space-grotesk', backgroundStyle: 'solid',   noiseBg: true, heavyBorders: true },
  sienna:     { colorScheme: 'sienna',     fontFamily: 'inter',         backgroundStyle: 'solid' },
  indigo:     { colorScheme: 'indigo',     fontFamily: 'archivo-black', backgroundStyle: 'solid',   noiseBg: true },
  aurora:     { colorScheme: 'aurora',     fontFamily: 'playfair',      backgroundStyle: 'aurora',  auroraStyle: 'nebula' },
  sage:       { colorScheme: 'sage',       fontFamily: 'inter',         backgroundStyle: 'solid' },
  mint:       { colorScheme: 'mint',       fontFamily: 'space-grotesk', backgroundStyle: 'solid' },
  electric:   { colorScheme: 'electric',   fontFamily: 'inter',         backgroundStyle: 'solid' },
  velvet:     { colorScheme: 'velvet',     fontFamily: 'playfair',      backgroundStyle: 'solid' },
  nightforest:{ colorScheme: 'nightforest',fontFamily: 'inter',         backgroundStyle: 'solid' },
  parchment:  { colorScheme: 'parchment',  fontFamily: 'inter',         backgroundStyle: 'solid' },
  gallery:    { colorScheme: 'gallery',    fontFamily: 'inter',         backgroundStyle: 'solid' },
  terracotta: { colorScheme: 'terracotta', fontFamily: 'inter',         backgroundStyle: 'solid' },
}

// ---------------------------------------------------------------------------
// updateColorScheme — pick a scheme by id, full theme is derived server-side
// ---------------------------------------------------------------------------

export async function updateColorScheme(
  schemeId: string,
): Promise<{ error: string | null }> {
  const preset = SCHEME_PRESETS[schemeId]
  if (!preset) return { error: 'Unknown color scheme.' }
  return updateProfileTheme(preset)
}

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
  username?: string
  creator_type?: CreatorType
  sub_types: string[]
  offline_activities: string[]
  interest_tags?: string[]
  social_links: Record<string, string>
  avatar_url?: string
  neighbourhood?: string
  show_city_mastery?: boolean
  contact_email?: string
  website_url?: string
  explorer_scene?: string
  explorer_creator_intent?: string[]
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

  // Validate and check availability for username changes
  let newUsername: string | undefined
  if (input.username !== undefined) {
    const normalized = input.username.trim().toLowerCase()
    const parsed = UsernameSchema.safeParse(normalized)
    if (!parsed.success) return { error: parsed.error.errors[0].message }

    const admin = createAdminClient()
    const { data: taken } = await admin
      .from('user_profiles')
      .select('id')
      .ilike('username', normalized)
      .neq('id', user.id)
      .maybeSingle()

    if (taken) return { error: 'That username is already taken. Please choose another.' }
    newUsername = normalized
  }

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
      ...(newUsername !== undefined ? { username: newUsername } : {}),
      ...(input.creator_type ? { creator_type: input.creator_type } : {}),
      sub_types:          input.sub_types,
      offline_activities: input.offline_activities,
      ...(input.interest_tags !== undefined ? { interest_tags: input.interest_tags } : {}),
      social_links:       socialLinks,
      ...(input.avatar_url ? { avatar_url: input.avatar_url } : {}),
      neighbourhood:      input.neighbourhood?.trim() || null,
      ...(input.show_city_mastery !== undefined ? { show_city_mastery: input.show_city_mastery } : {}),
      contact_email:      input.contact_email?.trim() || null,
      website_url:        input.website_url?.trim() || null,
      ...(input.explorer_scene !== undefined ? { explorer_scene: input.explorer_scene?.trim() || null } : {}),
      ...(input.explorer_creator_intent !== undefined ? { explorer_creator_intent: input.explorer_creator_intent } : {}),
      updated_at:         new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[updateProfile]', error.message)
    if (error.code === '23505') return { error: 'That username is already taken. Please choose another.' }
    return { error: 'Failed to save profile.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/${user.id}`)
  return { error: null }
}

// ---------------------------------------------------------------------------
// dismissChecklistTask
// ---------------------------------------------------------------------------

export async function dismissChecklistTask(taskId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('setup_checklist_dismissed')
    .eq('id', user.id)
    .single()

  const current: string[] = profile?.setup_checklist_dismissed ?? []
  if (current.includes(taskId)) return { error: null }

  const { error } = await supabase
    .from('user_profiles')
    .update({ setup_checklist_dismissed: [...current, taskId] })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
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
