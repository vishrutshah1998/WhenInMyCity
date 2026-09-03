'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getPersonaProfile } from '@/app/actions/profile'

// ---------------------------------------------------------------------------
// completeExplorerOnboarding
// ---------------------------------------------------------------------------

interface ExplorerPayload {
  displayName: string
  username: string
  city: string
  neighbourhood: string | null
  explorerScene: string
  interestTags: string[]
  preferredFormats: string[]
  priceRangeMaxPaise: number
  notificationPreferences: { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  explorerCreatorIntent: string[]
  avatarUrl?: string | null
}

export async function completeExplorerOnboarding(payload: ExplorerPayload) {
  // City is required for /{city}/{username} URL routing
  if (!payload.city || payload.city.trim() === '') {
    throw new Error('City is required to complete onboarding.')
  }

  const supabase = await createClient()
  const admin    = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { error: explorerError } = await supabase
    .from('explorer_profiles')
    .upsert({
      auth_user_id:             user.id,
      display_name:             payload.displayName,
      city:                     payload.city,
      interest_tags:            payload.interestTags,
      neighbourhood_preference: payload.neighbourhood,
      preferred_formats:        payload.preferredFormats,
      price_range_max_paise:    payload.priceRangeMaxPaise,
      notification_preferences: payload.notificationPreferences,
      explorer_scene:           payload.explorerScene,
      explorer_creator_intent:  payload.explorerCreatorIntent,
      ...(payload.avatarUrl ? { avatar_url: payload.avatarUrl } : {}),
    }, { onConflict: 'auth_user_id' })

  if (explorerError) throw new Error(explorerError.message)

  // The explorer flow auto-derives `username` from display name (E2) with no
  // user-facing picker or live availability check, so collisions (e.g. two
  // "Priya"s) are only caught here — resolve them the same way
  // completeBusinessOnboarding does, rather than letting the upsert below
  // throw an unhandled unique-constraint error.
  let username = payload.username
  const { data: usernameTaken } = await admin
    .from('user_profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()
  if (usernameTaken) {
    for (let i = 0; i < 10; i++) {
      const candidate = `${payload.username}-${Math.floor(1000 + Math.random() * 9000)}`
      const { data: c } = await admin.from('user_profiles').select('id').eq('username', candidate).maybeSingle()
      if (!c) { username = candidate; break }
    }
  }

  // FIX: this upsert previously never added 'explorer' to personas[] at
  // all — a pre-existing bug independent of the creator/brand table split.
  const { data: existing } = await admin
    .from('user_profiles')
    .select('personas')
    .eq('id', user.id)
    .maybeSingle()
  const existingPersonas = (existing?.personas ?? []) as string[]
  const mergedPersonas = existingPersonas.includes('explorer')
    ? existingPersonas
    : [...existingPersonas, 'explorer']

  // city/creator_type stay here: NOT NULL columns on user_profiles with no
  // default (creator_type:'exploring' is also the legacy routing/discriminator
  // value). interest_tags, explorer_scene, and explorer_creator_intent now
  // live solely in explorer_profiles (upserted above, migration 078).
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,                           // user_profiles PK is `id`, not auth_user_id
      username,
      display_name: payload.displayName,
      city: payload.city,
      creator_type: 'exploring',             // valid CreatorType value
      user_tier: 'wanderer',                 // explorers stay at wanderer
      personas: mergedPersonas,
    }, { onConflict: 'id' })

  if (profileError) throw new Error(profileError.message)

  // Seed default blocks only for new profiles (no existing blocks)
  const { count } = await admin
    .from('page_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
  if (!count) {
    await admin.from('page_blocks').insert([
      {
        profile_id: user.id,
        block_type: 'text_bio' as const,
        position: 0,
        is_visible: true,
        config: { body: '' },
      },
      {
        profile_id: user.id,
        block_type: 'event_listing' as const,
        position: 1,
        is_visible: true,
        config: { title: 'Upcoming Events', show_past: false, auto_populate: true },
      },
    ])
  }

  await supabase.auth.updateUser({
    data: { onboarding_complete: true, persona: 'explorer' },
  })
}

// ---------------------------------------------------------------------------
// completeBusinessOnboarding
// ---------------------------------------------------------------------------

interface BrandPayload {
  displayName: string
  username: string
  city: string
  businessSlug: string
  brandCategories: string[]
  wimcGoals: string[]
  targetAudience: string[]
  whatsapp?: string
  email?: string
  instagram?: string
  website?: string
  brandDescription: string
  logoUrl?: string
}

export async function completeBusinessOnboarding(payload: BrandPayload): Promise<{ username: string }> {
  // City is required for /{city}/{username} URL routing
  if (!payload.city || payload.city.trim() === '') {
    throw new Error('City is required to complete onboarding.')
  }

  const supabase = await createClient()
  const admin    = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // If the user already has a row, preserve their existing username and personas
  // to avoid clobbering them when they re-submit this screen.
  const { data: existing } = await admin
    .from('user_profiles')
    .select('username, personas')
    .eq('id', user.id)
    .maybeSingle()

  let slug = existing?.username ?? payload.businessSlug

  // Only try to claim a new slug if the stored one differs from what we want.
  if (slug !== payload.businessSlug) {
    // Check whether the desired slug is available.
    const { data: taken } = await admin
      .from('user_profiles')
      .select('id')
      .eq('username', payload.businessSlug)
      .maybeSingle()
    if (!taken) {
      slug = payload.businessSlug
    } else {
      // Slug is taken — append random 4-digit suffix to keep it unique.
      for (let i = 0; i < 10; i++) {
        const candidate = `${payload.businessSlug}-${Math.floor(1000 + Math.random() * 9000)}`
        const { data: c } = await admin.from('user_profiles').select('id').eq('username', candidate).maybeSingle()
        if (!c) { slug = candidate; break }
      }
    }
  }

  const existingPersonas = (existing?.personas ?? []) as string[]
  const mergedPersonas = existingPersonas.includes('brand')
    ? existingPersonas
    : [...existingPersonas, 'brand']

  // city/creator_type stay here too (NOT NULL columns on user_profiles with
  // no default, and creator_type is still the legacy routing discriminator
  // getBrandPublicPage filters on) — bio/business_categories/wimc_goals/
  // target_audience/contact_*/website_url/instagram_handle/avatar_url now
  // live solely in brand_profiles, upserted below.
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      username: slug,
      display_name: payload.displayName,
      city: payload.city,
      creator_type: 'business_brand',
      personas: mergedPersonas,
    }, { onConflict: 'id' })

  if (error) throw new Error(error.message)

  const { error: brandProfileError } = await admin
    .from('brand_profiles')
    .upsert({
      auth_user_id: user.id,
      business_name: payload.displayName,
      bio: payload.brandDescription,
      city: payload.city,
      business_categories: payload.brandCategories,
      wimc_goals: payload.wimcGoals,
      target_audience: payload.targetAudience,
      contact_whatsapp: payload.whatsapp ?? null,
      contact_email: payload.email ?? null,
      website_url: payload.website ?? null,
      instagram_handle: payload.instagram ?? null,
      ...(payload.logoUrl ? { avatar_url: payload.logoUrl } : {}),
    }, { onConflict: 'auth_user_id' })

  if (brandProfileError) throw new Error(brandProfileError.message)

  await supabase.auth.updateUser({
    data: { onboarding_complete: true, persona: 'brand' },
  })

  return { username: slug }
}

// ---------------------------------------------------------------------------
// savePersonaScreen
// Lightweight draft save for new v3 screens.
// Existing screens still call saveOnboardingScreen() in onboarding.ts.
// ---------------------------------------------------------------------------

interface PersonaScreenData {
  persona: 'creator' | 'business' | 'explorer'
  screen: string
  data: Record<string, unknown>
}

export async function savePersonaScreen(
  payload: PersonaScreenData,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.auth.updateUser({
    data: {
      [`ob_${payload.persona}_${payload.screen}`]: payload.data,
    },
  })

  return { error: error?.message ?? null }
}

// ---------------------------------------------------------------------------
// getBrandPublicPage
// Public — no auth required. Fetches a brand profile by city + username.
// ---------------------------------------------------------------------------

import type { UserProfile } from '@/types/database'

export async function getBrandPublicPage(
  city: string,
  username: string,
): Promise<{ brand: UserProfile } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .eq('creator_type', 'business_brand')
    .maybeSingle()

  if (error) return { error: 'Failed to load brand page.' }
  if (!data) return { error: 'Brand not found.' }

  // Fetched before the city-match gate below, so that gate (this route's
  // equivalent of the canonical-city redirect fixed for Creator in 2b-i)
  // uses the fresher value — brand_profiles is what onboarding + settings
  // actually keep current (Phase 2b-ii). Explicit field overrides only —
  // brand_profiles has its own PK `id`, same collision risk 2b-i avoided
  // for creator_profiles. business_name falls back to display_name per
  // migration 075's own column comment; every current render site reads
  // `display_name` for the shown name (none reference business_name), so
  // folding the fallback in here means those sites need no changes.
  const brandProfile = await getPersonaProfile(data.id, 'brand')
  const merged: UserProfile = brandProfile ? {
    ...data,
    display_name:        brandProfile.business_name ?? data.display_name,
    bio:                 brandProfile.bio ?? data.bio,
    avatar_url:          brandProfile.avatar_url ?? data.avatar_url,
    city:                brandProfile.city ?? data.city,
    business_categories: brandProfile.business_categories ?? data.business_categories,
    wimc_goals:          brandProfile.wimc_goals ?? data.wimc_goals,
    target_audience:     brandProfile.target_audience ?? data.target_audience,
    contact_whatsapp:    brandProfile.contact_whatsapp ?? data.contact_whatsapp,
    contact_email:       brandProfile.contact_email ?? data.contact_email,
    website_url:         brandProfile.website_url ?? data.website_url,
    instagram_handle:    brandProfile.instagram_handle ?? data.instagram_handle,
    page_theme:          brandProfile.page_theme ?? data.page_theme,
  } : (data as unknown as UserProfile)

  // Case-insensitive city match
  const normalize = (s: string) => s.toLowerCase().replace(/-/g, ' ').trim()
  if (normalize(merged.city) !== normalize(city)) return { error: 'Brand not found.' }

  return { brand: merged }
}
