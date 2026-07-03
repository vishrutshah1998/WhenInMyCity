import { NextRequest, NextResponse } from 'next/server'

// ── Ride-app deep link builders ───────────────────────────────────────────────
//
// Only redirects to the fixed domains below — no open redirect risk.
// lat/lng are used only to fill pre-defined query-param positions in known URLs.

const APPS = ['uber', 'ola', 'rapido', 'nammayatri', 'irctc'] as const
type RideApp = (typeof APPS)[number]

function buildDestUrl(app: RideApp, name: string, lat: number, lng: number): string {
  const n = encodeURIComponent(name)
  switch (app) {
    case 'uber':
      // Universal web link — opens Uber app on mobile, web on desktop
      return (
        `https://m.uber.com/ul/?action=setPickup&pickup=my_location` +
        `&dropoff[formatted_address]=${n}` +
        `&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}` +
        `&dropoff[nickname]=${n}`
      )
    case 'ola':
      return (
        `https://book.olacabs.com/?serviceType=p2p` +
        `&drop_lat=${lat}&drop_lng=${lng}&drop_name=${n}`
      )
    case 'rapido':
      // No officially published param spec; attempt best-known form
      return `https://rapido.bike/book?drop_lat=${lat}&drop_lng=${lng}&drop_name=${n}`
    case 'nammayatri':
      // Universal rider link; destination pre-fill not in public spec
      return 'https://nammayatri.in/link/rider/'
    case 'irctc':
      // Display-only: no public deep link API for train search pre-fill
      return 'https://www.irctc.co.in/nget/train-search'
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp  = req.nextUrl.searchParams
  const app = sp.get('app') ?? ''
  const ref = sp.get('ref') ?? 'direct'
  const dest = sp.get('dest') ?? ''
  const lat  = parseFloat(sp.get('lat') ?? '0')
  const lng  = parseFloat(sp.get('lng') ?? '0')

  if (!APPS.includes(app as RideApp)) {
    return NextResponse.json({ error: 'Invalid app' }, { status: 400 })
  }

  // Attribution log — visible in server/Vercel logs.
  // When Phase A adds an attribution_events table, replace this line
  // with a DB insert: { event: 'transit_handoff', app, dest, ref, ts: now() }
  console.info(`[transit/handoff] app=${app} dest="${dest}" ref=${ref}`)

  const url = buildDestUrl(app as RideApp, dest, lat, lng)
  // 302 so CDN/browser does not cache the redirect (destination URLs are dynamic)
  return NextResponse.redirect(url, { status: 302 })
}
