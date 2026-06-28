'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// completeExplorerOnboarding
// ---------------------------------------------------------------------------

interface ExplorerPayload {
  displayName: string
  username: string
  city: string
  explorerScene: string
  interestTags: string[]
  explorerCreatorIntent: string[]
}

export async function completeExplorerOnboarding(payload: ExplorerPayload) {
  // City is required for /{city}/{username} URL routing
  if (!payload.city || payload.city.trim() === '') {
    throw new Error('City is required to complete onboarding.')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { error: explorerError } = await supabase
    .from('explorer_profiles')
    .upsert({
      auth_user_id: user.id,
      display_name: payload.displayName,
      city: payload.city,
      interest_tags: payload.interestTags,
    }, { onConflict: 'auth_user_id' })

  if (explorerError) throw new Error(explorerError.message)

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,                           // user_profiles PK is `id`, not auth_user_id
      username: payload.username,
      display_name: payload.displayName,
      city: payload.city,
      creator_type: 'exploring',             // valid CreatorType value
      interest_tags: payload.interestTags,
      explorer_scene: payload.explorerScene,
      explorer_creator_intent: payload.explorerCreatorIntent,
      user_tier: 'wanderer',                 // explorers stay at wanderer
    }, { onConflict: 'id' })

  if (profileError) throw new Error(profileError.message)

  // Seed default blocks only for new profiles (no existing blocks)
  const admin = createAdminClient()
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
        config: { text: '' },
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

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      username: slug,
      display_name: payload.displayName,
      city: payload.city,
      creator_type: 'business_brand',
      bio: payload.brandDescription,
      business_categories: payload.brandCategories,
      wimc_goals: payload.wimcGoals,
      target_audience: payload.targetAudience,
      contact_whatsapp: payload.whatsapp ?? null,
      contact_email: payload.email ?? null,
      website_url: payload.website ?? null,
      instagram_handle: payload.instagram ?? null,
      personas: mergedPersonas,
      ...(payload.logoUrl ? { avatar_url: payload.logoUrl } : {}),
    }, { onConflict: 'id' })

  if (error) throw new Error(error.message)

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

  // Case-insensitive city match
  const normalize = (s: string) => s.toLowerCase().replace(/-/g, ' ').trim()
  if (normalize(data.city) !== normalize(city)) return { error: 'Brand not found.' }

  return { brand: data as unknown as UserProfile }
}
