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
import type { SocialPlatform, Json, UserTier } from '@/types/database'

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

// Default block list per creator type — used when no explicit selection provided (pre-C9 flow)
const DEFAULT_BLOCKS_BY_TYPE: Record<string, string[]> = {
  music:                  ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  comedy_theatre:         ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  art_design:             ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  video_content:          ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  teaching_coaching:      ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'community_stats'],
  lifestyle_wellness:     ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  business_brand:         ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'booking_request'],
  professional_portfolio: ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  community_impact:       ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'community_stats'],
  exploring:              ['text_bio', 'social_links_row', 'event_listing'],
}

export async function completeOnboarding(
  data: z.infer<typeof CompleteOnboardingSchema>,
  selectedBlocks?: string[],
): Promise<{ username: string; error: string | null }> {
  const EMPTY = { username: '', error: null as string | null }

  try {
    const parsed = CompleteOnboardingSchema.safeParse({
      ...data,
      username: data.username.toLowerCase(),
      // Normalize partial URLs and filter out entries that can't pass schema validation
      socialLinks: data.socialLinks
        .map(link => {
          if (link.platform === 'whatsapp') {
            // Normalize 10-digit Indian numbers to E.164
            const raw = link.url.trim().replace(/\s+/g, '')
            if (/^\d{10}$/.test(raw)) return { ...link, url: `+91${raw}` }
            if (/^91\d{10}$/.test(raw)) return { ...link, url: `+${raw}` }
            return link
          }
          const url = !link.url.startsWith('http')
            ? `https://${link.url.replace(/^@/, '')}`
            : link.url
          return { ...link, url }
        })
        .filter(link => {
          if (link.platform === 'whatsapp') {
            return z.string().url().safeParse(link.url).success || link.url.startsWith('+91')
          }
          return z.string().url().safeParse(link.url).success
        }),
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
      interestTags,
      socialLinks,
      colorScheme,
      pageThemeJson,
    } = parsed.data

    // City is required for /{city}/{username} URL routing
    if (!city || city.trim() === '') {
      return { ...EMPTY, error: 'City is required to complete onboarding.' }
    }

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { ...EMPTY, error: 'You must be signed in to complete onboarding.' }
    }

    const admin = createAdminClient()

    // Use full preset theme when provided, otherwise derive from colorScheme + creator type
    const pageTheme = pageThemeJson
      ? (pageThemeJson as Json)
      : buildThemeFromScheme(colorScheme, creatorType)

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
      .select('username, avatar_url, personas')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      // Update all mutable fields; preserve username and avatar_url
      // Also upgrade from wanderer→local when a creator re-completes onboarding
      const { data: currentTierRow } = await admin
        .from('user_profiles')
        .select('user_tier')
        .eq('id', user.id)
        .single()
      const tierUpgrade: { user_tier?: UserTier } = currentTierRow?.user_tier === 'wanderer' ? { user_tier: 'local' } : {}

      // Ensure 'creator' is in personas array — merge without duplicates
      const existingPersonas = (existingProfile.personas ?? []) as string[]
      const mergedPersonas = existingPersonas.includes('creator')
        ? existingPersonas
        : ['creator', ...existingPersonas]

      const { error: updateError } = await admin.from('user_profiles').update({
        display_name: displayName,
        bio: bio ?? null,
        city,
        creator_type: creatorType,
        interest_tags: interestTags,
        sub_types: subTypes,
        offline_activities: offlineActivities,
        social_links: socialLinksRecord,
        page_theme: pageTheme,
        personas: mergedPersonas,
        ...tierUpgrade,
      }).eq('id', user.id)

      if (updateError) {
        console.error('[completeOnboarding] profile update', updateError.message)
        return { ...EMPTY, error: 'Failed to update your profile. Please try again.' }
      }

      // Sync city + interests to explorer_profiles if one exists
      await admin.from('explorer_profiles').update({
        display_name: displayName,
        city,
        interest_tags: interestTags,
      }).eq('auth_user_id', user.id)

      // Seed blocks when explicitly requested and the profile has none yet
      // (handles the case where doReveal() created the profile with selectedBlocks=[]
      //  and now the sections screen is confirming with the real selection)
      if (selectedBlocks !== undefined && selectedBlocks.length > 0) {
        const { count: existingBlockCount } = await admin
          .from('page_blocks')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', user.id)

        if ((existingBlockCount ?? 0) === 0) {
          const blocks: {
            profile_id: string; block_type: string; position: number
            is_visible: boolean; config: Record<string, unknown>
          }[] = []
          let pos = 0

          if (selectedBlocks.includes('text_bio'))
            blocks.push({ profile_id: user.id, block_type: 'text_bio', position: pos++, is_visible: true, config: { body: bio ?? '' } })

          if (selectedBlocks.includes('social_links_row') && socialLinks.length > 0) {
            const links = socialLinks
              .filter(l => l.url.trim())
              .map(l => ({ platform: l.platform, url: normalizeUrl(l.url.trim(), l.platform as SocialPlatform) }))
            if (links.length > 0)
              blocks.push({ profile_id: user.id, block_type: 'social_links_row', position: pos++, is_visible: true, config: { links } })
          }

          if (selectedBlocks.includes('creator_type_badge'))
            blocks.push({ profile_id: user.id, block_type: 'creator_type_badge', position: pos++, is_visible: true, config: { creator_type: creatorType, show_link_to_city_feed: true } })

          if (selectedBlocks.includes('city_community'))
            blocks.push({ profile_id: user.id, block_type: 'city_community', position: pos++, is_visible: true, config: { city, show_city_feed_link: true } })

          if (selectedBlocks.includes('event_listing'))
            blocks.push({ profile_id: user.id, block_type: 'event_listing', position: pos++, is_visible: true, config: { title: 'Upcoming Events', show_past: false, auto_populate: true } })

          if (selectedBlocks.includes('community_stats'))
            blocks.push({ profile_id: user.id, block_type: 'community_stats', position: pos++, is_visible: true, config: { show_events_hosted: true, show_total_attendees: true, show_average_rating: true } })

          if (selectedBlocks.includes('booking_request'))
            blocks.push({ profile_id: user.id, block_type: 'booking_request', position: pos++, is_visible: true, config: { label: 'Book me for an event', description: '', categories: [creatorType] } })

          if (selectedBlocks.includes('newsletter_signup'))
            blocks.push({ profile_id: user.id, block_type: 'newsletter_signup', position: pos++, is_visible: true, config: { label: 'Stay in the loop', placeholder: 'your@email.com', button_label: 'Subscribe' } })

          if (selectedBlocks.includes('collab_invite'))
            blocks.push({ profile_id: user.id, block_type: 'collab_invite', position: pos++, is_visible: true, config: { collab_types: ['performance', 'workshop'], availability_note: '', message: 'Open to collaborations' } })

          if (selectedBlocks.includes('whatsapp_community')) {
            const waLink = socialLinks.find(l => l.platform === 'whatsapp')
            if (waLink?.url)
              blocks.push({ profile_id: user.id, block_type: 'whatsapp_community', position: pos++, is_visible: true, config: { label: 'Join my WhatsApp community', invite_url: waLink.url } })
          }

          if (blocks.length > 0) {
            await admin.from('page_blocks').insert(blocks as never)
          }
        }
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
      user_tier: 'local',                    // creators start at local tier
      interest_tags: interestTags,
      sub_types: subTypes,
      offline_activities: offlineActivities,
      social_links: socialLinksRecord,
      phone: user.phone ?? null,
      page_theme: pageTheme,
      personas: ['creator'],
    })

    if (profileError) {
      console.error('[completeOnboarding] profile insert', profileError.message)
      if (profileError.code === '23505') {
        return { ...EMPTY, error: 'That username was just taken. Please choose another.' }
      }
      return { ...EMPTY, error: 'Failed to create your profile. Please try again.' }
    }

    // Seed page blocks from profile data — guard against duplicate calls
    const { count: existingBlockCount } = await admin
      .from('page_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)

    if ((existingBlockCount ?? 0) === 0) {
      const blocksToSeed = selectedBlocks ?? DEFAULT_BLOCKS_BY_TYPE[creatorType] ?? ['text_bio', 'social_links_row', 'event_listing']
      const blocks: {
        profile_id: string
        block_type: string
        position: number
        is_visible: boolean
        config: Record<string, unknown>
      }[] = []
      let pos = 0

      if (blocksToSeed.includes('text_bio')) {
        blocks.push({ profile_id: user.id, block_type: 'text_bio', position: pos++, is_visible: true, config: { body: bio ?? '' } })
      }

      if (blocksToSeed.includes('social_links_row') && socialLinks.length > 0) {
        const links = socialLinks
          .filter(l => l.url.trim())
          .map(l => ({ platform: l.platform, url: normalizeUrl(l.url.trim(), l.platform as SocialPlatform) }))
        if (links.length > 0) {
          blocks.push({ profile_id: user.id, block_type: 'social_links_row', position: pos++, is_visible: true, config: { links } })
        }
      }

      if (blocksToSeed.includes('creator_type_badge')) {
        blocks.push({ profile_id: user.id, block_type: 'creator_type_badge', position: pos++, is_visible: true, config: { creator_type: creatorType, show_link_to_city_feed: true } })
      }

      if (blocksToSeed.includes('city_community')) {
        blocks.push({ profile_id: user.id, block_type: 'city_community', position: pos++, is_visible: true, config: { city, show_city_feed_link: true } })
      }

      if (blocksToSeed.includes('event_listing')) {
        blocks.push({ profile_id: user.id, block_type: 'event_listing', position: pos++, is_visible: true, config: { title: 'Upcoming Events', show_past: false, auto_populate: true } })
      }

      if (blocksToSeed.includes('community_stats')) {
        blocks.push({ profile_id: user.id, block_type: 'community_stats', position: pos++, is_visible: true, config: { show_events_hosted: true, show_total_attendees: true, show_average_rating: true } })
      }

      if (blocksToSeed.includes('booking_request')) {
        blocks.push({ profile_id: user.id, block_type: 'booking_request', position: pos++, is_visible: true, config: { label: 'Book me for an event', description: '', categories: [creatorType] } })
      }

      if (blocksToSeed.includes('newsletter_signup')) {
        blocks.push({ profile_id: user.id, block_type: 'newsletter_signup', position: pos++, is_visible: true, config: { label: 'Stay in the loop', placeholder: 'your@email.com', button_label: 'Subscribe' } })
      }

      if (blocksToSeed.includes('collab_invite')) {
        blocks.push({ profile_id: user.id, block_type: 'collab_invite', position: pos++, is_visible: true, config: { collab_types: ['performance', 'workshop'], availability_note: '', message: 'Open to collaborations' } })
      }

      if (blocksToSeed.includes('whatsapp_community')) {
        const waLink = socialLinks.find(l => l.platform === 'whatsapp')
        if (waLink?.url) {
          blocks.push({ profile_id: user.id, block_type: 'whatsapp_community', position: pos++, is_visible: true, config: { label: 'Join my WhatsApp community', invite_url: waLink.url } })
        }
      }

      if (blocks.length > 0) {
        await admin.from('page_blocks').insert(blocks as never)
      }
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
  role: 'maker' | 'venue' | 'explorer',
): Promise<{ redirectTo: string | null; error: string | null }> {
  if (!['maker', 'venue', 'explorer'].includes(role)) {
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
    venue:     '/onboarding/venue',
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

export async function getAuthUserPhone(): Promise<{ phone: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { phone: user?.phone ?? null }
}
