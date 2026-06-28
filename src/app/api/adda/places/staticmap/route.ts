import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) return new NextResponse(null, { status: 400 })

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return new NextResponse(null, { status: 500 })

  const url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}` +
    `&zoom=16&size=440x140` +
    `&markers=color:0x5DD9D0%7C${lat},${lng}` +
    `&style=feature:all%7Celement:geometry%7Ccolor:0x1a1a2e` +
    `&style=feature:all%7Celement:labels.text.fill%7Ccolor:0x9896B0` +
    `&style=feature:road%7Celement:geometry%7Ccolor:0x2d3561` +
    `&key=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) return new NextResponse(null, { status: 502 })

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
