import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getPersonaProfile } from '@/app/actions/profile'
import { resolveTheme } from '@/types/theme'
import BrandPublicPage, { type BrandRow } from './BrandPublicPage'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: brand } = await supabase
    .from('user_profiles')
    .select('id, display_name, bio')
    .eq('username', slug)
    .eq('creator_type', 'business_brand')
    .maybeSingle()

  if (!brand) return { title: 'Brand not found — WIMC' }

  // Same business_name/bio fallback as the main page render below.
  const brandProfile = await getPersonaProfile(brand.id, 'brand')
  const displayName = brandProfile?.business_name ?? brand.display_name
  const bio          = brandProfile?.bio ?? brand.bio

  return {
    title: `${displayName} — Brand on When In My City`,
    description:
      bio ??
      `Discover ${displayName} on WIMC. Open for creator partnerships.`,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: rawBrand } = await supabase
    .from('user_profiles')
    .select(
      'id, display_name, username, city, bio, business_categories, wimc_goals, target_audience, contact_whatsapp, contact_email, instagram_handle, website_url, created_at, page_theme',
    )
    .eq('username', slug)
    .eq('creator_type', 'business_brand')
    .maybeSingle()

  if (!rawBrand) notFound()

  // brand_profiles is what onboarding + settings actually keep current
  // (Phase 2b-ii) — explicit field overrides only, same allowlist as
  // getBrandPublicPage(); avatar_url isn't merged here since this render
  // (unlike BrandCityPage) never reads it.
  const brandProfile = await getPersonaProfile(rawBrand.id, 'brand')
  const brand: BrandRow & { page_theme?: unknown } = brandProfile ? {
    ...rawBrand,
    display_name:        brandProfile.business_name ?? rawBrand.display_name,
    bio:                 brandProfile.bio ?? rawBrand.bio,
    city:                brandProfile.city ?? rawBrand.city,
    business_categories: brandProfile.business_categories ?? rawBrand.business_categories,
    wimc_goals:          brandProfile.wimc_goals ?? rawBrand.wimc_goals,
    target_audience:     brandProfile.target_audience ?? rawBrand.target_audience,
    contact_whatsapp:    brandProfile.contact_whatsapp ?? rawBrand.contact_whatsapp,
    contact_email:       brandProfile.contact_email ?? rawBrand.contact_email,
    website_url:         brandProfile.website_url ?? rawBrand.website_url,
    instagram_handle:    brandProfile.instagram_handle ?? rawBrand.instagram_handle,
    page_theme:          brandProfile.page_theme ?? rawBrand.page_theme,
  } : rawBrand

  const { data: creatorsRaw } = await supabase
    .from('user_profiles')
    .select('id, display_name, creator_type, sub_types')
    .neq('creator_type', 'business_brand')
    .neq('creator_type', 'exploring')
    .eq('city', brand.city)
    .limit(3)

  type NearbyCreator = { id: string; display_name: string; creator_type: string; sub_types: string[] }
  const rawCreators = (creatorsRaw ?? []) as NearbyCreator[]
  let creators: NearbyCreator[] = rawCreators

  // Same staleness class as 2b-i's followed-creators overlay: sub_types
  // (and, defensively, creator_type) are only guaranteed current on
  // creator_profiles for a re-onboarded Creator, not on user_profiles.
  if (rawCreators.length > 0) {
    const { data: nearbyCreatorProfiles } = await supabase
      .from('creator_profiles')
      .select('auth_user_id, creator_type, sub_types')
      .in('auth_user_id', rawCreators.map((c) => c.id))
    const overlayById = new Map((nearbyCreatorProfiles ?? []).map((cp) => [cp.auth_user_id, cp]))
    creators = rawCreators.map((c) => {
      const overlay = overlayById.get(c.id)
      return overlay ? { ...c, creator_type: overlay.creator_type, sub_types: overlay.sub_types } : c
    })
  }

  const theme = resolveTheme(brand.page_theme, {
    creatorType:        'business_brand',
    businessCategories: brand.business_categories ?? [],
  })

  const { data: { user } } = await supabase.auth.getUser()

  return <BrandPublicPage brand={brand} creators={creators} theme={theme} isOwner={user?.id === brand.id} />
}
