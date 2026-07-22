import { createHmac, timingSafeEqual } from 'crypto'

// ---------------------------------------------------------------------------
// Meta `signed_request` parsing — used by the deauthorize and data-deletion
// callback routes (src/app/api/instagram/deauthorize, data-deletion). Meta
// POSTs a single `signed_request` form field shaped
// `<base64url signature>.<base64url JSON payload>`, HMAC-SHA256-signed over
// the payload segment using the app secret. This is the same format Meta
// uses for Facebook Login's deauthorize/data-deletion callbacks.
// ---------------------------------------------------------------------------

interface SignedRequestPayload {
  algorithm: string
  issued_at: number
  user_id: string
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4)
  return Buffer.from(padded + '='.repeat(padLength), 'base64')
}

/**
 * Verifies the HMAC-SHA256 signature and returns the decoded payload, or
 * null if the signed_request is malformed or fails verification.
 */
export function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const [encodedSig, encodedPayload] = signedRequest.split('.')
  if (!encodedSig || !encodedPayload) return null

  const expectedSig = createHmac('sha256', appSecret).update(encodedPayload).digest()
  const providedSig = base64UrlDecode(encodedSig)

  if (expectedSig.length !== providedSig.length || !timingSafeEqual(expectedSig, providedSig)) {
    return null
  }

  let payload: SignedRequestPayload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as SignedRequestPayload
  } catch {
    return null
  }

  if (payload.algorithm !== 'HMAC-SHA256' || !payload.user_id) return null

  return payload
}
