import { NextRequest, NextResponse } from 'next/server'

const FIELDS = [
  'address_components',
  'formatted_address',
  'geometry',
  'name',
  'opening_hours',
  'rating',
  'user_ratings_total',
  'website',
  'formatted_phone_number',
  'types',
  'business_status',
].join(',')

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API not configured' }, { status: 500 })
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&key=${apiKey}`

  const upstream = await fetch(url, { next: { revalidate: 86400 } })
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
  }

  const body = await upstream.json() as {
    status: string
    result?: {
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
      name?: string
      address_components?: { long_name: string; short_name: string; types: string[] }[]
      opening_hours?: unknown
      rating?: number
      formatted_phone_number?: string
      website?: string
    }
  }

  if (body.status !== 'OK' || !body.result) {
    return NextResponse.json({ error: body.status ?? 'NO_RESULT' }, { status: 400 })
  }

  const r = body.result
  const components: Record<string, string> = {}
  for (const c of r.address_components ?? []) {
    for (const t of c.types) {
      if (!components[t]) components[t] = c.long_name
    }
  }

  return NextResponse.json({
    formattedAddress: r.formatted_address ?? '',
    lat: r.geometry?.location?.lat ?? 0,
    lng: r.geometry?.location?.lng ?? 0,
    city: components['locality'] ?? components['administrative_area_level_2'] ?? '',
    state: components['administrative_area_level_1'] ?? '',
    pincode: components['postal_code'] ?? '',
    googlePlaceId: placeId,
    googleName: r.name ?? '',
    phone: r.formatted_phone_number ?? '',
    website: r.website ?? '',
    existingRating: r.rating ?? null,
    openingHours: r.opening_hours ?? null,
  })
}
