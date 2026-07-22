import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearInstagramConnection } from '@/app/actions/instagram'
import { parseSignedRequest } from '@/lib/instagram/signed-request'

const OK = () => NextResponse.json({ received: true }, { status: 200 })

/**
 * POST /api/instagram/deauthorize
 *
 * Meta's deauthorize callback (Business login settings → Deauthorize
 * callback URL) — fires when a user removes WIMC's access from their
 * Instagram/Facebook account settings directly, bypassing our own
 * Disconnect button. Body is form-encoded with a single `signed_request`
 * field identifying the user only by their Instagram-scoped user_id (see
 * instagram_user_id on user_profiles, captured at OAuth connect time).
 *
 * Always returns 200 — this isn't a retried webhook, but there's nothing
 * useful a non-200 would communicate back to Meta, and every failure mode
 * here (bad signature, unknown user, missing config) is already logged.
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appSecret) {
    console.error('[instagram/deauthorize] INSTAGRAM_APP_SECRET not set')
    return OK()
  }

  const body = await request.text()
  const signedRequest = new URLSearchParams(body).get('signed_request')
  const payload = signedRequest ? parseSignedRequest(signedRequest, appSecret) : null

  if (!payload) {
    console.error('[instagram/deauthorize] missing or invalid signed_request')
    return OK()
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('instagram_user_id', payload.user_id)
    .maybeSingle()

  if (!profile) {
    console.warn('[instagram/deauthorize] no profile found for instagram_user_id', payload.user_id)
    return OK()
  }

  const { error } = await clearInstagramConnection(profile.id)
  if (error) {
    console.error('[instagram/deauthorize] clear failed', error)
  }

  return OK()
}
