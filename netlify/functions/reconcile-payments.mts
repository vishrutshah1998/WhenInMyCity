// =============================================================================
// Netlify Scheduled Function — triggers GET /api/cron/reconcile-payments
//
// Replaces the vercel.json cron entry (Netlify does not read vercel.json, so
// that entry never executed). The route itself is a single bounded pass
// (limit 100 stale RSVPs, limit 20 failed refunds per call) — no pagination
// to chain here.
// =============================================================================

const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'

export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[scheduled:reconcile-payments] CRON_SECRET not set — skipping')
    return
  }

  const res = await fetch(new URL('/api/cron/reconcile-payments', BASE_URL), {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body: any = await res.json().catch(() => null)

  if (!res.ok) {
    console.error('[scheduled:reconcile-payments] request failed', res.status, body)
    return
  }

  console.log('[scheduled:reconcile-payments] complete', body)
}

export const config = {
  schedule: '*/15 * * * *',
}
