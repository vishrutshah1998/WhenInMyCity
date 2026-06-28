import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
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
    .select('display_name, bio')
    .eq('username', slug)
    .eq('creator_type', 'business_brand')
    .maybeSingle()

  if (!brand) return { title: 'Brand not found — WIMC' }

  return {
    title: `${brand.display_name} — Brand on When In My City`,
    description:
      brand.bio ??
      `Discover ${brand.display_name} on WIMC. Open for creator partnerships.`,
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

  const brand = rawBrand as BrandRow & { page_theme?: unknown }

  const { data: creatorsRaw } = await supabase
    .from('user_profiles')
    .select('id, display_name, creator_type, sub_types')
    .neq('creator_type', 'business_brand')
    .neq('creator_type', 'exploring')
    .eq('city', brand.city)
    .limit(3)

  const creators = (creatorsRaw ?? []) as Array<{
    id: string
    display_name: string
    creator_type: string
    sub_types: string[]
  }>

  const theme = resolveTheme(brand.page_theme, {
    creatorType:        'business_brand',
    businessCategories: brand.business_categories ?? [],
  })

  return <BrandPublicPage brand={brand} creators={creators} theme={theme} />
}
