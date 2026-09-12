// =============================================================================
// Netlify Scheduled Function — triggers GET /api/cron/expire-applications
//
// The route is cursor-paginated (PAGE_SIZE=500 per page) — this loops
// through its pages until done or until we're near Netlify's 30s execution
// limit for scheduled functions, same pattern as evaluate-tiers/
// evaluate-venue-tiers/reconcile-payments. Any remaining pages are picked up
// by the next run 15 minutes later, since the route re-queries current state
// each time (not a delta since last run).
//
// Schedule: every 15 minutes, matching reconcile-payments — the tightest
// cadence already in use in this codebase. The shortest allowed payment
// window (events.application_payment_window_minutes, migration 080) is 60
// minutes, so a 15-minute cron means a row is flagged 'expired' at most 15
// minutes after its deadline — at most 25% of the shortest possible window,
// without introducing a faster cadence than anything else here needs.
// Note this sweep doesn't gate correctness: initiatePaymentForApplication
// (event-applications.ts) independently rejects a payment attempt against an
// elapsed payment_deadline regardless of how promptly this cron runs — the
// 15-minute cadence only affects how quickly the host-facing queue and
// applicant-facing state catch up to reality, not whether a guest can pay
// late.
// =============================================================================

const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'
const TIME_BUDGET_MS = 25_000

export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[scheduled:expire-applications] CRON_SECRET not set — skipping')
    return
  }

  const start = Date.now()
  let cursor = ''
  let pages = 0

  while (true) {
    const url = new URL('/api/cron/expire-applications', BASE_URL)
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } })
    const body: any = await res.json().catch(() => null)
    pages++

    if (!res.ok) {
      console.error('[scheduled:expire-applications] request failed', res.status, body)
      return
    }

    console.log('[scheduled:expire-applications] page complete', { page: pages, ...body })

    if (body?.done || !body?.nextCursor) break
    cursor = body.nextCursor

    if (Date.now() - start > TIME_BUDGET_MS) {
      console.warn('[scheduled:expire-applications] time budget exceeded, remaining pages deferred to next run', { pages, cursor })
      break
    }
  }
}

export const config = {
  schedule: '*/15 * * * *',
}
