// =============================================================================
// Netlify Scheduled Function — triggers GET /api/cron/reconcile-payments
//
// Replaces the vercel.json cron entry (Netlify does not read vercel.json, so
// that entry never executed). The route's stale-RSVP step is cursor-paginated
// (PAGE_SIZE=100 per page) — this loops through its pages until done or until
// we're near Netlify's 30s execution limit for scheduled functions, same
// pattern as evaluate-tiers/evaluate-venue-tiers. Any remaining pages are
// picked up by the next run 15 minutes later, since the route re-queries
// current state each time (not a delta since last run).
//
// The route's rating-prompt/no-show and failed-refund-retry steps are NOT
// part of this pagination — they only run on the first page of each tick
// (see route.ts), so looping here doesn't re-trigger them.
// =============================================================================

const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'
const TIME_BUDGET_MS = 25_000

export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[scheduled:reconcile-payments] CRON_SECRET not set — skipping')
    return
  }

  const start = Date.now()
  let cursor = ''
  let pages = 0

  while (true) {
    const url = new URL('/api/cron/reconcile-payments', BASE_URL)
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } })
    const body: any = await res.json().catch(() => null)
    pages++

    if (!res.ok) {
      console.error('[scheduled:reconcile-payments] request failed', res.status, body)
      return
    }

    console.log('[scheduled:reconcile-payments] page complete', { page: pages, ...body })

    if (body?.done || !body?.nextCursor) break
    cursor = body.nextCursor

    if (Date.now() - start > TIME_BUDGET_MS) {
      console.warn('[scheduled:reconcile-payments] time budget exceeded, remaining pages deferred to next run', { pages, cursor })
      break
    }
  }
}

export const config = {
  schedule: '*/15 * * * *',
}
