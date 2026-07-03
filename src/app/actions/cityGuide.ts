'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type CityAttractionSource = 'curated' | 'heritage_dataset'

export type CityAttraction = {
  id: string
  name: string
  category: string
  description: string | null
  lat: number
  lng: number
  photo_url: string | null
  address: string | null
  sort_order: number
  source: CityAttractionSource
  external_url: string | null
}

export type TransitRoute = {
  id: string
  operator: 'gmrc' | 'janmarg' | 'amts'
  route_number: string | null
  name: string
  from_stop: string
  to_stop: string
  fare_min_paise: number | null
  fare_max_paise: number | null
  frequency_minutes: number | null
  operating_hours: string | null
  notes: string | null
}

export async function getCityAttractions(
  editionKey = 'ahmedabad-gandhinagar',
): Promise<CityAttraction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('city_attractions')
    .select('id, name, category, description, lat, lng, photo_url, address, sort_order, source, external_url')
    .eq('city_id', editionKey)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as CityAttraction[]
}

export async function getTransitRoutes(): Promise<TransitRoute[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('transit_routes')
    .select('id, operator, route_number, name, from_stop, to_stop, fare_min_paise, fare_max_paise, frequency_minutes, operating_hours, notes')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as TransitRoute[]
}
