import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LAYER_TYPES: Record<string, string[]> = {
  toilet:   ['toilet'],
  hospital: ['hospital', 'pharmacy'],
  police:   ['police'],
  petrol:   ['gas_station'],
}

// Default map centre: Ahmedabad city centre
const DEFAULT_LAT = 23.0225
const DEFAULT_LNG = 72.5714

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const layer  = searchParams.get('layer') ?? ''
  const lat    = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LAT))
  const lng    = parseFloat(searchParams.get('lng') ?? String(DEFAULT_LNG))

  if (!LAYER_TYPES[layer]) {
    return NextResponse.json({ error: 'Invalid layer' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ places: [], error: 'Places API not configured' })
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.shortFormattedAddress',
    },
    body: JSON.stringify({
      includedTypes: LAYER_TYPES[layer],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000,
        },
      },
    }),
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.error('[city/places/nearby] Google API error:', await res.text())
    return NextResponse.json({ places: [] })
  }

  type RawPlace = {
    id: string
    displayName: { text: string }
    shortFormattedAddress?: string
  }
  const data = await res.json() as { places?: RawPlace[] }

  // lat/lng deliberately omitted: Google Places data must not be rendered on
  // a non-Google map (Maps Platform ToS §3.2.4). For map-renderable civic
  // POIs use /api/city/overpass (OSM/ODbL data, no restriction).
  // Any UI consuming this response MUST render a "Powered by Google" logo
  // per Maps Platform ToS §3.2.3(b). The attribution flag below signals this.
  const places = (data.places ?? []).map(p => ({
    place_id: p.id,
    name:     p.displayName.text,
    vicinity: p.shortFormattedAddress ?? '',
  }))

  // Persist only place_id per Google Places ToS
  if (places.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await admin
      .from('civic_layer_cache')
      .upsert(
        places.map((p: { place_id: string }) => ({ layer_type: layer, place_id: p.place_id })),
        { onConflict: 'layer_type,place_id', ignoreDuplicates: true },
      )
  }

  // powered_by_google: true — callers must display "Powered by Google" branding
  return NextResponse.json({ places, powered_by_google: true })
}
