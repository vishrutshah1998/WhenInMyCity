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
import type { SocialPlatform, Json, UserTier, UserProfile, PageBlock, Event, CreatorType } from '@/types/database'
import { resolveTheme, type ProfileTheme } from '@/types/theme'

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
// getSubtypePopularity — public, no auth required. Real counts only — an
// early/empty user_profiles table just yields {} and callers fall back to
// definition order, never a fabricated ranking.
// ---------------------------------------------------------------------------

export async function getSubtypePopularity(category: string): Promise<Record<string, number>> {
  if (!category) return {}

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .select('sub_types')
    .eq('creator_type', category as CreatorType)

  if (error || !data) {
    if (error) console.error('[getSubtypePopularity]', error.message)
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of data) {
    for (const subtype of row.sub_types ?? []) {
      counts[subtype] = (counts[subtype] ?? 0) + 1
    }
  }
  return counts
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
  // V3 categories
  dance:                  ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  fitness_wellness:       ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'community_stats'],
  food_culinary:          ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  spirituality:           ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'community_stats'],
  travel_adventure:       ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  literature_poetry:      ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing'],
  crafts_making:          ['text_bio', 'social_links_row', 'creator_type_badge', 'event_listing', 'booking_request'],
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
  nightforest: { colorScheme: 'nightforest', fontFamily: 'playfair', backgroundStyle: 'solid' },
  parchment:   { colorScheme: 'parchment',   fontFamily: 'playfair', backgroundStyle: 'solid' },
  terracotta:  { colorScheme: 'terracotta',  fontFamily: 'inter',    backgroundStyle: 'solid', noiseBg: true },
}

// Default scheme per creator category. Covers both the legacy V2 taxonomy
// (video_content, lifestyle_wellness, business_brand, professional_portfolio,
// exploring — no longer selectable via onboarding, kept for old accounts)
// and the current V3 CREATOR_CATEGORIES ids actually offered in C3
// (music, comedy_theatre, dance, art_design, fitness_wellness, food_culinary,
// teaching_coaching, spirituality, community_impact, travel_adventure,
// literature_poetry, crafts_making). Every V3 id must have an entry here —
// a miss silently falls back to 'default' regardless of category.
const CREATOR_TYPE_DEFAULT_SCHEME: Record<string, string> = {
  // V2 legacy
  video_content:          'steel',
  lifestyle_wellness:     'sienna',
  business_brand:         'sand',
  professional_portfolio: 'steel',
  exploring:              'default',
  // V3 — shared with legacy where the vibe already matched
  music:                  'indigo',      // ink + electric indigo — performer energy
  comedy_theatre:         'turmeric',    // ink + golden yellow — stage energy
  art_design:             'gulaal',      // ink + gulaal red — tactile, visual
  teaching_coaching:      'pista',       // ink + pista green — clean, grounded
  community_impact:       'forest',      // dark green + jade — organic, civic
  // V3 — new
  dance:                  'aurora',      // fuchsia aurora glow — matches Explorer's own "dance" scene theme
  fitness_wellness:       'sage',        // warm off-white + sage green — wellness (scheme's own description)
  food_culinary:          'sienna',      // ink + burnt sienna — spice, warmth
  spirituality:           'nightforest', // near-black warm-green — candlelit, meditative (scheme's own description)
  travel_adventure:       'ocean',       // deep navy + luminous cyan — maps, water, horizon
  literature_poetry:      'parchment',   // aged-paper light — writer/literary (scheme's own description)
  crafts_making:          'terracotta',  // warm linen + clay — craft/pottery (scheme's own description)
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

// ---------------------------------------------------------------------------
// getOnboardingStudioBootstrap — same query shape as /dashboard/studio's
// server component, but callable from the client-driven onboarding wizard
// right after completeOnboarding() has created the profile + seeded blocks.
// Also returns the auth user's phone/email so the client can pre-fill
// WhatsApp / contact email from however the user actually signed up.
// ---------------------------------------------------------------------------

export async function getOnboardingStudioBootstrap(): Promise<
  | { error: string; profile?: undefined; blocks?: undefined; events?: undefined; theme?: undefined; authPhone?: undefined; authEmail?: undefined }
  | { error: null; profile: UserProfile; blocks: PageBlock[]; events: Event[]; theme: ProfileTheme; authPhone: string | null; authEmail: string | null }
> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'You must be signed in.' }

  const admin = createAdminClient()
  const [{ data: profile }, { data: blocks }, { data: events }] = await Promise.all([
    admin.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
    admin.from('page_blocks').select('*').eq('profile_id', user.id).order('position', { ascending: true }),
    admin.from('events').select('*').eq('creator_id', user.id).eq('status', 'published').order('starts_at', { ascending: true }),
  ])

  if (!profile) return { error: 'Profile not found. Please try again.' }

  const theme = resolveTheme(profile.page_theme, profile.creator_type ?? undefined)
  return {
    error: null,
    profile: { ...profile, social_links: profile.social_links ?? null },
    blocks: blocks ?? [],
    events: events ?? [],
    theme,
    authPhone: user.phone ?? null,
    authEmail: user.email ?? null,
  }
}
