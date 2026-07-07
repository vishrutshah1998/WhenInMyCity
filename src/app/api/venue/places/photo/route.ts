import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref')
  if (!ref) return new NextResponse(null, { status: 400 })

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return new NextResponse(null, { status: 500 })

  const url =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) return new NextResponse(null, { status: 502 })

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
