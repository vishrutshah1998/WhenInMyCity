'use server'

import { revalidatePath }    from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth }       from '@/lib/auth/requireAuth'
import { z }                 from 'zod'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpotListStatus = 'draft' | 'under_review' | 'published' | 'removed'

export interface SpotListItem {
  id:             string
  attraction_id:  string | null
  place_name:     string
  place_category: string | null
  note:           string | null
  position:       number
}

export interface SpotList {
  id:          string
  explorer_id: string
  title:       string
  description: string | null
  slug:        string
  status:      SpotListStatus
  is_public:   boolean
  city_id:     string
  created_at:  string
  updated_at:  string
  items:       SpotListItem[]
}

export interface PublicSpotList {
  id:          string
  title:       string
  description: string | null
  slug:        string
  city_id:     string
  created_at:  string
  author_name: string
  items:       SpotListItem[]
}

export interface AttractionOption {
  id:       string
  name:     string
  category: string
  address:  string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSlug(title: string): string {
  const base   = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : suffix
}

type ExplorerRow = { id: string; is_trusted_contributor: boolean }

async function getExplorerForUser(userId: string): Promise<ExplorerRow | null> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('explorer_profiles')
    .select('id, is_trusted_contributor')
    .eq('auth_user_id', userId)
    .maybeSingle() as { data: ExplorerRow | null }
  return data
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ListMetaSchema = z.object({
  title:       z.string().min(1, 'Title is required.').max(100),
  description: z.string().max(500).optional(),
})

const AddPlaceSchema = z.object({
  attraction_id:  z.string().uuid().optional(),
  place_name:     z.string().min(1).max(100),
  place_category: z.string().max(50).optional(),
  note:           z.string().max(200).optional(),
})

// ── createSpotList ────────────────────────────────────────────────────────────

export async function createSpotList(input: unknown): Promise<
  { success: true; list: SpotList } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const parsed = ListMetaSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  type ListRow = Omit<SpotList, 'items'>
  const { data, error } = await db
    .from('spot_lists')
    .insert({
      explorer_id: explorer.id,
      title:       parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      slug:        makeSlug(parsed.data.title),
      status:      'draft',
      is_public:   false,
    })
    .select('id, explorer_id, title, description, slug, status, is_public, city_id, created_at, updated_at')
    .single() as { data: ListRow | null; error: { message: string } | null }

  if (error || !data) {
    console.error('[createSpotList]', error?.message)
    return { success: false, error: 'Failed to create list.' }
  }

  revalidatePath('/explore/profile')
  return { success: true, list: { ...data, items: [] } }
}

// ── updateSpotListMeta ────────────────────────────────────────────────────────

export async function updateSpotListMeta(listId: string, input: unknown): Promise<
  { success: true } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const parsed = ListMetaSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('spot_lists')
    .update({
      title:       parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('explorer_id', explorer.id)

  if (error) {
    console.error('[updateSpotListMeta]', error.message)
    return { success: false, error: 'Failed to update list.' }
  }

  revalidatePath('/explore/profile')
  return { success: true }
}

// ── deleteSpotList ────────────────────────────────────────────────────────────

export async function deleteSpotList(listId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('spot_lists')
    .delete()
    .eq('id', listId)
    .eq('explorer_id', explorer.id)

  if (error) {
    console.error('[deleteSpotList]', error.message)
    return { success: false, error: 'Failed to delete list.' }
  }

  revalidatePath('/explore/profile')
  return { success: true }
}

// ── addPlaceToList ────────────────────────────────────────────────────────────

export async function addPlaceToList(listId: string, input: unknown): Promise<
  { success: true; item: SpotListItem } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const parsed = AddPlaceSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid place data.' }

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  // Verify ownership
  const { data: list } = await db
    .from('spot_lists')
    .select('id, status')
    .eq('id', listId)
    .eq('explorer_id', explorer.id)
    .maybeSingle() as { data: { id: string; status: string } | null }

  if (!list)               return { success: false, error: 'List not found.' }
  if (list.status === 'removed') return { success: false, error: 'Cannot modify a removed list.' }

  // Next position
  const { data: maxRow } = await db
    .from('spot_list_items')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { position: number } | null }

  const position = (maxRow?.position ?? -1) + 1

  const { data: item, error } = await db
    .from('spot_list_items')
    .insert({
      list_id:        listId,
      attraction_id:  parsed.data.attraction_id ?? null,
      place_name:     parsed.data.place_name.trim(),
      place_category: parsed.data.place_category ?? null,
      note:           parsed.data.note?.trim() || null,
      position,
    })
    .select('id, attraction_id, place_name, place_category, note, position')
    .single() as { data: SpotListItem | null; error: { message: string } | null }

  if (error || !item) {
    console.error('[addPlaceToList]', error?.message)
    return { success: false, error: 'Failed to add place.' }
  }

  await db.from('spot_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId)

  return { success: true, item }
}

// ── removePlaceFromList ───────────────────────────────────────────────────────

export async function removePlaceFromList(itemId: string, listId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  // Verify ownership via the parent list
  const { data: list } = await db
    .from('spot_lists')
    .select('id')
    .eq('id', listId)
    .eq('explorer_id', explorer.id)
    .maybeSingle() as { data: { id: string } | null }

  if (!list) return { success: false, error: 'List not found.' }

  const { error } = await db
    .from('spot_list_items')
    .delete()
    .eq('id', itemId)
    .eq('list_id', listId)

  if (error) {
    console.error('[removePlaceFromList]', error.message)
    return { success: false, error: 'Failed to remove place.' }
  }

  await db.from('spot_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId)

  return { success: true }
}

// ── publishSpotList ───────────────────────────────────────────────────────────
// Trusted contributors → published immediately.
// All others → under_review (admin approves offline).

export async function publishSpotList(listId: string): Promise<
  { success: true; status: SpotListStatus } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  const { data: list } = await db
    .from('spot_lists')
    .select('id, status')
    .eq('id', listId)
    .eq('explorer_id', explorer.id)
    .maybeSingle() as { data: { id: string; status: SpotListStatus } | null }

  if (!list)                       return { success: false, error: 'List not found.' }
  if (list.status === 'removed')   return { success: false, error: 'Cannot republish a removed list.' }
  if (list.status === 'published') return { success: true, status: 'published' }

  // Must have at least one place
  const { count } = await db
    .from('spot_list_items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId) as { count: number | null }

  if (!count || count < 1) {
    return { success: false, error: 'Add at least one place before publishing.' }
  }

  const newStatus: SpotListStatus = explorer.is_trusted_contributor ? 'published' : 'under_review'

  const { error } = await db
    .from('spot_lists')
    .update({
      status:     newStatus,
      is_public:  newStatus === 'published',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)

  if (error) {
    console.error('[publishSpotList]', error.message)
    return { success: false, error: 'Failed to publish list.' }
  }

  revalidatePath('/explore/profile')
  return { success: true, status: newStatus }
}

// ── unpublishSpotList ─────────────────────────────────────────────────────────

export async function unpublishSpotList(listId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const { user } = await requireAuth('/explore/profile')

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { success: false, error: 'Explorer profile not found.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('spot_lists')
    .update({ status: 'draft', is_public: false, updated_at: new Date().toISOString() })
    .eq('id', listId)
    .eq('explorer_id', explorer.id)

  if (error) {
    console.error('[unpublishSpotList]', error.message)
    return { success: false, error: 'Failed to unpublish list.' }
  }

  revalidatePath('/explore/profile')
  return { success: true }
}

// ── getMySpotLists ────────────────────────────────────────────────────────────

export async function getMySpotLists(): Promise<SpotList[]> {
  const { user } = await requireAuth('/explore/profile')

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return []

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  type ListRow = Omit<SpotList, 'items'>
  const { data: lists } = await db
    .from('spot_lists')
    .select('id, explorer_id, title, description, slug, status, is_public, city_id, created_at, updated_at')
    .eq('explorer_id', explorer.id)
    .neq('status', 'removed')
    .order('created_at', { ascending: false }) as { data: ListRow[] | null }

  if (!lists?.length) return []

  const listIds = lists.map(l => l.id)

  const { data: items } = await db
    .from('spot_list_items')
    .select('id, list_id, attraction_id, place_name, place_category, note, position')
    .in('list_id', listIds)
    .order('position', { ascending: true }) as {
      data: (SpotListItem & { list_id: string })[] | null
    }

  const itemsByList = new Map<string, SpotListItem[]>()
  for (const { list_id, ...item } of items ?? []) {
    if (!itemsByList.has(list_id)) itemsByList.set(list_id, [])
    itemsByList.get(list_id)!.push(item)
  }

  return lists.map(l => ({ ...l, items: itemsByList.get(l.id) ?? [] }))
}

// ── getPublicSpotList ─────────────────────────────────────────────────────────
// Used by the public /explore/lists/[slug] page. Returns null if not published.

export async function getPublicSpotList(slug: string): Promise<PublicSpotList | null> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  type RawList = { id: string; title: string; description: string | null; slug: string; city_id: string; created_at: string; explorer_id: string }
  const { data: list } = await db
    .from('spot_lists')
    .select('id, title, description, slug, city_id, created_at, explorer_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_public', true)
    .maybeSingle() as { data: RawList | null }

  if (!list) return null

  const [{ data: explorer }, { data: items }] = await Promise.all([
    db.from('explorer_profiles')
      .select('display_name')
      .eq('id', list.explorer_id)
      .maybeSingle() as Promise<{ data: { display_name: string } | null }>,

    db.from('spot_list_items')
      .select('id, attraction_id, place_name, place_category, note, position')
      .eq('list_id', list.id)
      .order('position', { ascending: true }) as Promise<{ data: SpotListItem[] | null }>,
  ])

  return {
    id:          list.id,
    title:       list.title,
    description: list.description,
    slug:        list.slug,
    city_id:     list.city_id,
    created_at:  list.created_at,
    author_name: explorer?.display_name ?? 'WIMC Explorer',
    items:       items ?? [],
  }
}

// ── flagSpotList ──────────────────────────────────────────────────────────────
// Report affordance on public lists. One flag per reporter per list.
// Flag count and reasons are visible to service role only (admin review).

export async function flagSpotList(listId: string, reason: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const { user } = await requireAuth('/signin')

  const trimmed = reason.trim()
  if (!trimmed)          return { success: false, error: 'Please describe why you are flagging this list.' }
  if (trimmed.length > 200) return { success: false, error: 'Reason must be under 200 characters.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db    = admin as any

  // Confirm list exists and is published
  const { data: list } = await db
    .from('spot_lists')
    .select('id')
    .eq('id', listId)
    .eq('status', 'published')
    .maybeSingle() as { data: { id: string } | null }

  if (!list) return { success: false, error: 'List not found.' }

  const { error } = await db
    .from('spot_list_flags')
    .insert({ list_id: listId, reporter_user_id: user.id, reason: trimmed })

  if (error) {
    // Unique constraint → already flagged — treat as success
    if (error.message?.includes('unique') || error.code === '23505') return { success: true }
    console.error('[flagSpotList]', error.message)
    return { success: false, error: 'Failed to submit report.' }
  }

  return { success: true }
}

// ── getAttractionOptions ──────────────────────────────────────────────────────
// Returns city_attractions for the "add from city guide" place picker.

export async function getAttractionOptions(cityId = 'ahmedabad-gandhinagar'): Promise<AttractionOption[]> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('city_attractions')
    .select('id, name, category, address')
    .eq('city_id', cityId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true }) as { data: AttractionOption[] | null }

  return data ?? []
}
