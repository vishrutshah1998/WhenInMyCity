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
  'photos',
  'reviews',
  'price_level',
  'editorial_summary',
  'wheelchair_accessible_entrance',
].join(',')

interface GoogleReview {
  author_name: string
  rating: number
  text: string
  time: number
  profile_photo_url?: string
}

interface GooglePhoto {
  photo_reference: string
  height: number
  width: number
}

interface OpeningHoursPeriod {
  open:  { day: number; time: string }
  close: { day: number; time: string }
}

interface GoogleOpeningHours {
  open_now?:      boolean
  periods?:       OpeningHoursPeriod[]
  weekday_text?:  string[]
}

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
      opening_hours?: GoogleOpeningHours
      rating?: number
      formatted_phone_number?: string
      website?: string
      photos?: GooglePhoto[]
      reviews?: GoogleReview[]
      price_level?: number
      editorial_summary?: { overview?: string }
      types?: string[]
      wheelchair_accessible_entrance?: boolean
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

  // Extract up to 5 photo references — actual download/upload happens in the
  // prefetchGooglePhotos server action so the API key stays server-side.
  const photoRefs = (r.photos ?? []).slice(0, 5).map(p => p.photo_reference)

  // Keep up to 5 reviews; strip profile_photo_url to save space
  const reviews: GoogleReview[] = (r.reviews ?? []).slice(0, 5).map(rv => ({
    author_name: rv.author_name,
    rating: rv.rating,
    text: rv.text,
    time: rv.time,
  }))

  // Parse opening hours into a day-indexed structure for V7 pre-fill.
  // dayOpenClose maps 0 (Sun)–6 (Sat) → { open: "HH:MM", close: "HH:MM" } | null
  const dayOpenClose: Record<number, { open: string; close: string } | null> = {}
  for (const period of r.opening_hours?.periods ?? []) {
    if (period.open?.day !== undefined && period.close?.day !== undefined) {
      const fmt = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`
      dayOpenClose[period.open.day] = { open: fmt(period.open.time), close: fmt(period.close.time) }
    }
  }

  return NextResponse.json({
    formattedAddress: r.formatted_address ?? '',
    lat: r.geometry?.location?.lat ?? 0,
    lng: r.geometry?.location?.lng ?? 0,
    city: components['locality'] ?? components['administrative_area_level_2'] ?? '',
    state: components['administrative_area_level_1'] ?? '',
    pincode: components['postal_code'] ?? '',
    neighbourhood: components['sublocality_level_1'] ?? components['sublocality'] ?? '',
    googlePlaceId: placeId,
    googleName: r.name ?? '',
    phone: r.formatted_phone_number ?? '',
    website: r.website ?? '',
    existingRating: r.rating ?? null,
    openingHours: r.opening_hours ?? null,
    openingHoursParsed: dayOpenClose,
    photoRefs,
    reviews,
    priceLevel: r.price_level ?? null,
    editorialSummary: r.editorial_summary?.overview ?? null,
    placeTypes: r.types ?? [],
    wheelchairAccessible: r.wheelchair_accessible_entrance ?? null,
  })
}
