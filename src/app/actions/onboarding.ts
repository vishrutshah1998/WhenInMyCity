'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  UsernameSchema,
  Screen1Schema,
  Screen2Schema,
  CompleteOnboardingSchema,
  type Screen1Data,
  type Screen2Data,
} from '@/types/onboarding'
import { getCategoryColors } from '@/lib/constants/categories'
import type { SocialPlatform, BlockType, Json } from '@/types/database'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function slugify(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .slice(0, 27)
}

function randomSuffix(): string {
  return String(Math.floor(100 + Math.random() * 900))
}

// ---------------------------------------------------------------------------
// checkUsernameAvailable
// ---------------------------------------------------------------------------

export async function checkUsernameAvailable(
  username: string,
): Promise<{ available: boolean; error?: string }> {
  const normalized = username.toLowerCase()
  const parsed = UsernameSchema.safeParse(normalized)

  if (!parsed.success) {
    return { available: false, error: parsed.error.errors[0].message }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .select('username')
    .eq('username', normalized)
    .maybeSingle()

  if (error) {
    console.error('[checkUsernameAvailable]', error.message)
    return { available: false, error: 'Could not check username availability. Please try again.' }
  }

  return { available: data === null }
}

// ---------------------------------------------------------------------------
// generateUsernameFromName
// ---------------------------------------------------------------------------

export async function generateUsernameFromName(displayName: string): Promise<string> {
  const base = slugify(displayName) || 'creator'
  const admin = createAdminClient()

  const candidates = [
    base,
    ...Array.from({ length: 5 }, () => `${base}_${randomSuffix()}`),
  ]

  for (const candidate of candidates) {
    if (candidate.length < 3 || candidate.length > 30) continue
    const { data, error } = await admin
      .from('user_profiles')
      .select('username')
      .ilike('username', candidate)
      .maybeSingle()
    if (error) continue
    if (data === null) return candidate
  }

  return `user_${Math.floor(100000 + Math.random() * 900000)}`
}

// ---------------------------------------------------------------------------
// saveOnboardingScreen
// ---------------------------------------------------------------------------

export async function saveOnboardingScreen(
  screen: 1 | 2,
  data: Screen1Data | Screen2Data,
): Promise<{ error: string | null }> {
  let parseResult:
    | ReturnType<typeof Screen1Schema.safeParse>
    | ReturnType<typeof Screen2Schema.safeParse>

  switch (screen) {
    case 1:
      parseResult = Screen1Schema.safeParse(data)
      break
    case 2:
      parseResult = Screen2Schema.safeParse(data)
      break
  }

  if (!parseResult.success) {
    return { error: parseResult.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to save onboarding progress.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: { [`onboarding_s${screen}`]: parseResult.data },
  })

  if (updateError) {
    console.error(`[saveOnboardingScreen] screen=${screen}`, updateError.message)
    return { error: 'Failed to save your progress. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  data: z.infer<typeof CompleteOnboardingSchema>,
): Promise<{ username: string; error: string | null }> {
  const EMPTY = { username: '', error: null as string | null }

  try {
    const parsed = CompleteOnboardingSchema.safeParse({
      ...data,
      username: data.username.toLowerCase(),
    })

    if (!parsed.success) {
      return { ...EMPTY, error: parsed.error.errors[0].message }
    }

    const {
      displayName,
      username,
      bio,
      city,
      creatorType,
      subTypes,
      offlineActivities,
      socialLinks,
      themeVariant,
    } = parsed.data

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { ...EMPTY, error: 'You must be signed in to complete onboarding.' }
    }

    const admin = createAdminClient()

    // Guard: already onboarded
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      return { username: existingProfile.username, error: null }
    }

    // Confirm username still available
    const { data: taken } = await admin
      .from('user_profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle()

    if (taken) {
      return { ...EMPTY, error: 'That username was just taken. Please choose another.' }
    }

    // Build page_theme from category + variant
    const colors = getCategoryColors(creatorType)
    const pageTheme = buildTheme(colors.primary, colors.secondary, themeVariant)

    // Build social_links record for user_profiles
    const socialLinksRecord: Record<string, string> = {}
    for (const link of socialLinks) {
      const url = link.url.trim()
      if (url) {
        socialLinksRecord[link.platform] = normalizeUrl(url, link.platform as SocialPlatform)
      }
    }

    // Insert user_profiles (social_links stored here, rendered as inline icon row)
    const { error: profileError } = await admin.from('user_profiles').insert({
      id: user.id,
      username,
      display_name: displayName,
      bio: bio ?? null,
      avatar_url: null,
      city,
      creator_type: creatorType,
      interest_tags: [],
      sub_types: subTypes,
      offline_activities: offlineActivities,
      social_links: socialLinksRecord,
      phone: user.phone ?? null,
      page_theme: pageTheme,
    })

    if (profileError) {
      console.error('[completeOnboarding] profile insert', profileError.message)
      if (profileError.code === '23505') {
        return { ...EMPTY, error: 'That username was just taken. Please choose another.' }
      }
      return { ...EMPTY, error: 'Failed to create your profile. Please try again.' }
    }

    // Insert text_bio block
    type BlockInsert = {
      profile_id: string
      block_type: BlockType
      position: number
      is_visible: boolean
      config: Json
    }

    const blocks: BlockInsert[] = [
      {
        profile_id: user.id,
        block_type: 'text_bio',
        position: 0,
        is_visible: true,
        config: { body: bio ?? '' },
      },
    ]

    const { error: blocksError } = await admin.from('page_blocks').insert(blocks)
    if (blocksError) {
      console.error('[completeOnboarding] default blocks', blocksError.message)
    }

    // Clear onboarding metadata
    await supabase.auth.updateUser({
      data: { onboarding_s1: null, onboarding_s2: null },
    })

    return { username, error: null }
  } catch (err) {
    console.error('[completeOnboarding] unexpected', err)
    return { ...EMPTY, error: 'An unexpected error occurred. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// selectUserRole
// ---------------------------------------------------------------------------

export async function selectUserRole(
  role: 'maker' | 'adda' | 'explorer',
): Promise<{ redirectTo: string | null; error: string | null }> {
  if (!['maker', 'adda', 'explorer'].includes(role)) {
    return { redirectTo: null, error: 'Invalid role selected.' }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { redirectTo: null, error: 'You must be signed in to begin onboarding.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: { pending_role: role },
  })

  if (updateError) {
    console.error('[selectUserRole]', updateError.message)
    return { redirectTo: null, error: 'Failed to save your role selection. Please try again.' }
  }

  const redirectMap: Record<string, string> = {
    maker:    '/onboarding',
    adda:     '/onboarding/adda',
    explorer: '/onboarding/explorer',
  }

  return { redirectTo: redirectMap[role], error: null }
}

// ---------------------------------------------------------------------------
// uploadOnboardingAvatar
// ---------------------------------------------------------------------------

export async function uploadOnboardingAvatar(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { url: null, error: 'Not authenticated.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { url: null, error: 'No file provided.' }
  if (file.size > 5 * 1024 * 1024) return { url: null, error: 'Avatar must be smaller than 5 MB.' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) return { url: null, error: 'Avatar must be a JPEG, PNG, WebP, or GIF.' }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const storagePath = `${user.id}/avatar.${ext}`
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[uploadOnboardingAvatar]', uploadError.message)
    return { url: null, error: 'Failed to upload avatar. Please try again.' }
  }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(storagePath)

  await admin
    .from('user_profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', user.id)

  return { url: urlData.publicUrl, error: null }
}

// ---------------------------------------------------------------------------
// Internal: build page_theme object from category colors + variant
// ---------------------------------------------------------------------------

function buildTheme(
  primary: string,
  secondary: string,
  variant: 'soft' | 'bold' | 'dark',
): Json {
  switch (variant) {
    case 'soft':
      return { color_primary: primary, color_bg: secondary, background_type: 'solid' }
    case 'bold':
      return { color_primary: '#ffffff', color_bg: primary, background_type: 'solid' }
    case 'dark': {
      const darkened = darkenHex(primary, 0.4)
      return { color_primary: primary, color_bg: darkened, background_type: 'solid' }
    }
  }
}

function darkenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function normalizeUrl(url: string, platform: SocialPlatform): string {
  // WhatsApp numbers don't need URL normalization
  if (platform === 'whatsapp') return url
  // Add https if missing
  if (url && !url.startsWith('http')) return `https://${url}`
  return url
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', youtube: 'YouTube', spotify: 'Spotify',
  soundcloud: 'SoundCloud', jiosaavn: 'JioSaavn', twitter: 'Twitter',
  x: 'X', tiktok: 'TikTok', twitch: 'Twitch', podcast: 'Podcast',
  linkedin: 'LinkedIn', behance: 'Behance', dribbble: 'Dribbble',
  github: 'GitHub', website: 'Website', whatsapp: 'WhatsApp',
  googlemaps: 'Google Maps', zomato: 'Zomato/Swiggy', shopify: 'Shopify',
  telegram: 'Telegram', meetup: 'Meetup', substack: 'Substack', other: 'Link',
}

function platformLabel(platform: SocialPlatform): string {
  return PLATFORM_LABELS[platform] ?? 'Link'
}
