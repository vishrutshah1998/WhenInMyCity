'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionState {
  /** The authenticated Supabase user, or `null` when signed out. */
  user: User | null
  /** The full Supabase session (includes access_token, expires_at, etc.). */
  session: Session | null
  /** True while the initial session check is in progress. */
  loading: boolean
  /**
   * True when the user is authenticated but has no `user_profiles` row yet.
   * Use this to gate onboarding-related UI.
   */
  isNewUser: boolean
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Client-side hook that subscribes to Supabase auth state changes.
 *
 * Keeps `user`, `session`, `loading`, and `isNewUser` in sync across tab
 * focus, token refresh, sign-in, and sign-out events.
 *
 * The `isNewUser` flag is determined by querying `user_profiles` once per
 * sign-in event; it is reset to `false` on sign-out.
 *
 * @example
 * function Navbar() {
 *   const { user, loading } = useSession()
 *   if (loading) return <Skeleton />
 *   return user ? <UserMenu /> : <SignInButton />
 * }
 */
export function useSession(): SessionState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    /**
     * Checks whether a profile row exists for the given user ID.
     * Sets `isNewUser` accordingly.
     */
    async function checkProfile(userId: string) {
      const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      setIsNewUser(data === null)
    }

    // Hydrate state from the current session immediately (avoids flash).
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        // Fire profile check without blocking the initial render.
        checkProfile(initialSession.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Subscribe to future auth state changes (sign-in, sign-out, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        checkProfile(newSession.user.id)
      } else {
        // Signed out — reset the new-user flag.
        setIsNewUser(false)
      }

      // Once the first auth event fires, loading is definitely done.
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, session, loading, isNewUser }
}
