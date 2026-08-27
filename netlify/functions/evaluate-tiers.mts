// =============================================================================
// Netlify Scheduled Function — triggers GET /api/cron/evaluate-tiers
//
// Replaces the vercel.json cron entry (Netlify does not read vercel.json, so
// that entry never executed). Calls the existing route with the same
// CRON_SECRET bearer-token auth the route already expects, looping through
// its cursor pagination until done or until we're near Netlify's 30s
// execution limit for scheduled functions — any remaining pages are picked
// up by tomorrow's run, since the route re-evaluates current state each time
// (not a delta since last run).
// =============================================================================

const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'
const TIME_BUDGET_MS = 25_000

export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[scheduled:evaluate-tiers] CRON_SECRET not set — skipping')
    return
  }

  const start = Date.now()
  let cursor = ''
  let pages = 0

  while (true) {
    const url = new URL('/api/cron/evaluate-tiers', BASE_URL)
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } })
    const body: any = await res.json().catch(() => null)
    pages++

    if (!res.ok) {
      console.error('[scheduled:evaluate-tiers] request failed', res.status, body)
      return
    }

    console.log('[scheduled:evaluate-tiers] page complete', { page: pages, ...body })

    if (body?.done || !body?.nextCursor) break
    cursor = body.nextCursor

    if (Date.now() - start > TIME_BUDGET_MS) {
      console.warn('[scheduled:evaluate-tiers] time budget exceeded, remaining pages deferred to next run', { pages, cursor })
      break
    }
  }
}

export const config = {
  schedule: '0 2 * * *',
}
