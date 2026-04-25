import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client with the service role key.
 *
 * SECURITY: This client bypasses Row-Level Security entirely. Only use it on
 * the server for operations that require elevated privileges (middleware checks,
 * storage uploads, cross-user admin queries). Never expose this client or its
 * key to the browser.
 *
 * Uses no-op cookie handlers because the service role client doesn't manage
 * user sessions — it acts as the database superuser.
 *
 * @example
 * // In a Server Action (after verifying the caller's identity separately)
 * const admin = createAdminClient()
 * const { data } = await admin.from('user_profiles').select('id').eq('id', userId).maybeSingle()
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        // No session cookies needed for the service role client.
        getAll() { return [] },
        setAll() {},
      },
      auth: {
        // Disable automatic session management — the service role key is
        // stateless and does not need to refresh tokens.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
