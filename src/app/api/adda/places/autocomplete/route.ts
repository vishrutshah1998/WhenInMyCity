import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input        = req.nextUrl.searchParams.get('input')?.trim()
  const sessionToken = req.nextUrl.searchParams.get('sessionToken') ?? ''
  const types        = req.nextUrl.searchParams.get('types') ?? 'establishment|geocode'

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ predictions: [] })
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(input)}` +
    `&components=country:in` +
    `&types=${encodeURIComponent(types)}` +
    `&sessiontoken=${encodeURIComponent(sessionToken)}` +
    `&key=${apiKey}`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return NextResponse.json({ predictions: [] })

  const body = await res.json() as {
    status: string
    predictions?: {
      place_id: string
      description: string
      structured_formatting: { main_text: string; secondary_text: string }
    }[]
  }

  if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ predictions: [] })
  }

  return NextResponse.json({ predictions: body.predictions ?? [] })
}
