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
import type { SocialPlatform, Json } from '@/types/database'

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
      interestTags,
      socialLinks,
      colorScheme,
    } = parsed.data

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { ...EMPTY, error: 'You must be signed in to complete onboarding.' }
    }

    const admin = createAdminClient()

    // Build page_theme from selected colorScheme or fall back to creator-type default
    const pageTheme = buildThemeFromScheme(colorScheme, creatorType)

    // Build social_links record for user_profiles
    const socialLinksRecord: Record<string, string> = {}
    for (const link of socialLinks) {
      const url = link.url.trim()
      if (url) {
        socialLinksRecord[link.platform] = normalizeUrl(url, link.platform as SocialPlatform)
      }
    }

    // Check if profile already exists (e.g. re-running onboarding)
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      // Update all mutable fields; preserve username and avatar_url
      const { error: updateError } = await admin.from('user_profiles').update({
        display_name: displayName,
        bio: bio ?? null,
        city,
        creator_type: creatorType,
        interest_tags: interestTags,
        sub_types: subTypes,
        offline_activities: [],
        social_links: socialLinksRecord,
        page_theme: pageTheme,
      }).eq('id', user.id)

      if (updateError) {
        console.error('[completeOnboarding] profile update', updateError.message)
        return { ...EMPTY, error: 'Failed to update your profile. Please try again.' }
      }

      return { username: existingProfile.username, error: null }
    }

    // Confirm username still available for new profiles
    const { data: taken } = await admin
      .from('user_profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle()

    if (taken) {
      return { ...EMPTY, error: 'That username was just taken. Please choose another.' }
    }

    // Insert new profile
    const { error: profileError } = await admin.from('user_profiles').insert({
      id: user.id,
      username,
      display_name: displayName,
      bio: bio ?? null,
      avatar_url: null,
      city,
      creator_type: creatorType,
      interest_tags: interestTags,
      sub_types: subTypes,
      offline_activities: [],
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

    // Also create an explorer profile so the user can discover events
    const { error: explorerError } = await admin.from('explorer_profiles').insert({
      auth_user_id: user.id,
      display_name: displayName,
      city,
      interest_tags: interestTags,
      preferred_formats: [],
      price_range_max_paise: 50000,
      notification_preferences: { whatsapp: true, digest_frequency: 'weekly' },
    })
    if (explorerError) {
      console.error('[completeOnboarding] explorer profile', explorerError.message)
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
    explorer: '/onboarding',
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
// Internal: build page_theme from colorScheme + creator type
// ---------------------------------------------------------------------------

// Maps every color scheme to its recommended ProfileTheme preset.
const SCHEME_PRESETS: Record<string, Json> = {
  default:  { colorScheme: 'default',  fontFamily: 'archivo-black', backgroundStyle: 'solid' },
  midnight: { colorScheme: 'midnight', fontFamily: 'inter',         backgroundStyle: 'aurora',   auroraStyle: 'nebula' },
  ocean:    { colorScheme: 'ocean',    fontFamily: 'space-grotesk', backgroundStyle: 'aurora',   auroraStyle: 'mesh' },
  forest:   { colorScheme: 'forest',   fontFamily: 'playfair',      backgroundStyle: 'pattern',  patternStyle: 'dots', patternColorCombo: 'cool' },
  blush:    { colorScheme: 'blush',    fontFamily: 'playfair',      backgroundStyle: 'solid' },
  sand:     { colorScheme: 'sand',     fontFamily: 'inter',         backgroundStyle: 'solid' },
  pista:    { colorScheme: 'pista',    fontFamily: 'archivo-black', backgroundStyle: 'solid',    noiseBg: true, heavyBorders: true },
  gulaal:   { colorScheme: 'gulaal',   fontFamily: 'archivo-black', backgroundStyle: 'solid',    noiseBg: true },
  neel:     { colorScheme: 'neel',     fontFamily: 'archivo-black', backgroundStyle: 'solid' },
  turmeric: { colorScheme: 'turmeric', fontFamily: 'archivo-black', backgroundStyle: 'solid',    noiseBg: true, heavyBorders: true },
  steel:    { colorScheme: 'steel',    fontFamily: 'space-grotesk', backgroundStyle: 'solid',    noiseBg: true, heavyBorders: true },
  sienna:   { colorScheme: 'sienna',   fontFamily: 'inter',         backgroundStyle: 'solid' },
  indigo:   { colorScheme: 'indigo',   fontFamily: 'archivo-black', backgroundStyle: 'solid',    noiseBg: true },
  aurora:   { colorScheme: 'aurora',   fontFamily: 'playfair',      backgroundStyle: 'aurora',   auroraStyle: 'nebula' },
  sage:     { colorScheme: 'sage',     fontFamily: 'inter',         backgroundStyle: 'solid' },
  mint:     { colorScheme: 'mint',     fontFamily: 'space-grotesk', backgroundStyle: 'solid' },
}

// Default scheme per V2 creator type.
const CREATOR_TYPE_DEFAULT_SCHEME: Record<string, string> = {
  music:                  'indigo',
  comedy_theatre:         'turmeric',
  art_design:             'gulaal',
  video_content:          'steel',
  teaching_coaching:      'pista',
  lifestyle_wellness:     'sienna',
  business_brand:         'sand',
  professional_portfolio: 'steel',
  community_impact:       'forest',
  exploring:              'default',
}

function buildThemeFromScheme(colorScheme: string | undefined, creatorType: string): Json {
  const scheme = colorScheme || CREATOR_TYPE_DEFAULT_SCHEME[creatorType] || 'default'
  return SCHEME_PRESETS[scheme] ?? SCHEME_PRESETS['default']
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
