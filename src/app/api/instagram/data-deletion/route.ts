import { randomUUID } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearInstagramConnection } from '@/app/actions/instagram'
import { parseSignedRequest } from '@/lib/instagram/signed-request'

/**
 * POST /api/instagram/data-deletion
 *
 * Meta's Data Deletion Request callback (Business login settings → Data
 * deletion request URL) — fires when a user requests deletion of their
 * data via Instagram/Facebook's own settings, separate from our own
 * Disconnect button and from /api/instagram/deauthorize (which only clears
 * the connection, not necessarily in response to a deletion request).
 *
 * Meta requires a JSON response shaped { url, confirmation_code }, where
 * `url` is a page the user can visit to check deletion status. Deletion
 * happens synchronously in this handler — everything WIMC ever stores about
 * a connected Instagram account (encrypted token + cached thumbnails) is
 * cleared before responding, so the status page has nothing left to poll
 * for; it always reports complete.
 */
export async function POST(request: NextRequest) {
  const confirmationCode = randomUUID()
  const statusUrl = new URL(`/instagram/data-deletion-status?id=${confirmationCode}`, request.url).toString()
  const response = () => NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode })

  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appSecret) {
    console.error('[instagram/data-deletion] INSTAGRAM_APP_SECRET not set')
    return response()
  }

  const body = await request.text()
  const signedRequest = new URLSearchParams(body).get('signed_request')
  const payload = signedRequest ? parseSignedRequest(signedRequest, appSecret) : null

  if (!payload) {
    console.error('[instagram/data-deletion] missing or invalid signed_request')
    return response()
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('instagram_user_id', payload.user_id)
    .maybeSingle()

  if (!profile) {
    console.warn('[instagram/data-deletion] no profile found for instagram_user_id', payload.user_id)
    return response()
  }

  const { error } = await clearInstagramConnection(profile.id)
  if (error) {
    console.error('[instagram/data-deletion] clear failed', error)
  }

  return response()
}
