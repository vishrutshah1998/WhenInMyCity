import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers.
 *
 * Reads and writes session cookies via Next.js `cookies()`, which is only
 * available in a server context. The cookie store must be awaited in Next.js
 * 15+; for Next.js 14 it is synchronous — this implementation is compatible
 * with both by awaiting the result.
 *
 * @example
 * // In a Server Component
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // `setAll` is called from Server Components where cookie mutation
            // is not permitted. The session will still be refreshed by the
            // middleware, so this error is safe to swallow.
          }
        },
      },
    },
  )
}
