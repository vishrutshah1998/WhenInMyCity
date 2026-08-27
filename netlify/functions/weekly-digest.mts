// =============================================================================
// Netlify Scheduled Function — triggers GET /api/cron/weekly-digest
//
// Replaces the vercel.json cron entry (Netlify does not read vercel.json, so
// that entry never executed). The route paginates internally (PAGE_SIZE=200
// explorers per page, looped in one request) — no cursor to chain here.
// =============================================================================

const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'

export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[scheduled:weekly-digest] CRON_SECRET not set — skipping')
    return
  }

  const res = await fetch(new URL('/api/cron/weekly-digest', BASE_URL), {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body: any = await res.json().catch(() => null)

  if (!res.ok) {
    console.error('[scheduled:weekly-digest] request failed', res.status, body)
    return
  }

  console.log('[scheduled:weekly-digest] complete', body)
}

export const config = {
  schedule: '30 3 * * 0',
}
