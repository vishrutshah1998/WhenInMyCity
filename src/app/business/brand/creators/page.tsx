import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import BrowseCreatorsClient, { type CreatorCard } from './BrowseCreatorsClient'

export default async function BrandCreatorsPage() {
  await requireAuth('/business/brand/creators')

  const supabase = await createClient()

  const { data } = await supabase
    .from('user_profiles')
    .select('username, display_name, creator_type, interest_tags, city, avatar_url, bio, user_tier, is_verified, cumulative_events_hosted')
    .eq('user_role', 'maker')
    .neq('creator_type', 'business_brand')
    .order('cumulative_events_hosted', { ascending: false })
    .limit(200)

  const creators: CreatorCard[] = (data ?? []).map(row => ({
    username:                   row.username,
    display_name:               row.display_name,
    creator_type:               row.creator_type ?? 'exploring',
    interest_tags:              row.interest_tags ?? [],
    city:                       row.city ?? '',
    avatar_url:                 row.avatar_url ?? null,
    bio:                        row.bio ?? null,
    user_tier:                  (row.user_tier as string) ?? 'wanderer',
    is_verified:                row.is_verified ?? false,
    cumulative_events_hosted:   row.cumulative_events_hosted ?? 0,
  }))

  return <BrowseCreatorsClient creators={creators} />
}
