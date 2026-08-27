// =============================================================================
// Netlify Scheduled Function — triggers GET /api/cron/event-reminders
//
// Replaces the vercel.json cron entry (Netlify does not read vercel.json, so
// that entry never executed). The route is a single bounded pass over events
// starting in the next 22–26h — no pagination to chain here.
// =============================================================================

const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'

export default async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[scheduled:event-reminders] CRON_SECRET not set — skipping')
    return
  }

  const res = await fetch(new URL('/api/cron/event-reminders', BASE_URL), {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body: any = await res.json().catch(() => null)

  if (!res.ok) {
    console.error('[scheduled:event-reminders] request failed', res.status, body)
    return
  }

  console.log('[scheduled:event-reminders] complete', body)
}

export const config = {
  schedule: '0 20 * * *',
}
