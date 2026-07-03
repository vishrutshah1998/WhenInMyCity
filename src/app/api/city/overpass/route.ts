import { NextRequest, NextResponse } from 'next/server'

// ── OSM amenity types per layer ───────────────────────────────────────────────
// Overpass/OSM data is ODbL-licensed and may be displayed on any OSM-based map.
// Do NOT use this route to forward Google Places coordinates — use
// /api/city/places/nearby (list-only, no lat/lng) for Places data.

const LAYER_AMENITIES: Record<string, string[]> = {
  toilet:   ['toilets'],
  hospital: ['hospital', 'clinic'],
  police:   ['police'],
  petrol:   ['fuel'],
}

const DEFAULT_LAT = 23.0225 // Ahmedabad city centre
const DEFAULT_LNG = 72.5714
const RADIUS_M    = 3000    // 3 km radius
const MAX_RESULTS = 20

// Round to ~500 m grid so nearby user locations share a cached response.
function snapCoord(n: number) {
  return Math.round(n * 200) / 200
}

type OsmElement = {
  type:    'node' | 'way'
  id:      number
  lat?:    number
  lon?:    number
  center?: { lat: number; lon: number }
  tags?:   Record<string, string>
}

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams
  const layer = sp.get('layer') ?? ''
  const lat   = snapCoord(parseFloat(sp.get('lat') ?? String(DEFAULT_LAT)))
  const lng   = snapCoord(parseFloat(sp.get('lng') ?? String(DEFAULT_LNG)))

  const amenities = LAYER_AMENITIES[layer]
  if (!amenities) {
    return NextResponse.json({ error: 'Invalid layer' }, { status: 400 })
  }

  // Overpass QL: nodes (points) and ways (buildings, returned with centroid)
  const unions = amenities
    .flatMap(a => [
      `node["amenity"="${a}"](around:${RADIUS_M},${lat},${lng});`,
      `way["amenity"="${a}"](around:${RADIUS_M},${lat},${lng});`,
    ])
    .join('\n  ')

  const query = `[out:json][timeout:15];\n(\n  ${unions}\n);\nout center ${MAX_RESULTS};`

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      // 30-minute server-side cache; Overpass is a shared community resource
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      console.error('[city/overpass] Overpass error', res.status)
      return NextResponse.json({ places: [] })
    }

    const data = await res.json() as { elements?: OsmElement[] }

    const places = (data.elements ?? [])
      .map(el => {
        const elLat = el.lat ?? el.center?.lat
        const elLng = el.lon ?? el.center?.lon
        if (elLat == null || elLng == null) return null
        // Prefer name, fall back to operator or brand tag common on fuel stations
        const name =
          el.tags?.name ??
          el.tags?.operator ??
          el.tags?.brand ??
          el.tags?.['name:en'] ??
          null
        return { id: `osm-${el.type}-${el.id}`, name, lat: elLat, lng: elLng }
      })
      .filter((p): p is { id: string; name: string | null; lat: number; lng: number } => p !== null)
      .slice(0, MAX_RESULTS)

    return NextResponse.json({ places })
  } catch (err) {
    console.error('[city/overpass] fetch error', err)
    return NextResponse.json({ places: [] })
  }
}
