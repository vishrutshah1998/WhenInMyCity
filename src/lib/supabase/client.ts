import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for use in Browser (Client) Components.
 *
 * Each call returns a new client instance — call this inside a component or
 * hook rather than at module level so that cookies are always fresh.
 *
 * @example
 * const supabase = createClient()
 * const { data } = await supabase.from('events').select('*')
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
