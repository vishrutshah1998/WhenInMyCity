import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface AuthContext {
  /** The validated Supabase auth user. */
  user: User
  /**
   * The user's profile row from `user_profiles`, or `null` if onboarding
   * hasn't been completed yet.
   */
  profile: UserProfile | null
}

// ---------------------------------------------------------------------------
// Core utility
// ---------------------------------------------------------------------------

/**
 * Server-side auth guard for Server Components, Server Actions, and Route
 * Handlers.
 *
 * Validates the session using `getUser()` (calls the Supabase Auth server —
 * not just the local JWT) and redirects to `/signin?next=<redirectTo>` if
 * there is no valid session.
 *
 * Also fetches the `user_profiles` row so callers don't need a second query.
 * `profile` is `null` for new users who haven't completed onboarding.
 *
 * @param redirectTo - Path to redirect back to after sign-in.
 *   Defaults to `/dashboard`. Stored in the `next` query param.
 * @returns `AuthContext` — guaranteed to have a valid `user`.
 * @throws `NEXT_REDIRECT` — Next.js redirect to `/signin` if unauthenticated.
 *
 * @example
 * // In a Server Component
 * export default async function DashboardPage() {
 *   const { user, profile } = await requireAuth()
 *   return <h1>Welcome, {profile?.display_name ?? user.email}</h1>
 * }
 *
 * @example
 * // In a Server Action
 * export async function updateProfile(formData: FormData) {
 *   'use server'
 *   const { user } = await requireAuth('/settings')
 *   // ... mutate with user.id
 * }
 */
export async function requireAuth(redirectTo = '/dashboard'): Promise<AuthContext> {
  const supabase = await createClient()

  // getUser() validates the JWT against the Supabase Auth server.
  // Never use getSession() here — it only reads the local cookie without
  // server-side validation, making it spoofable.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    const params = new URLSearchParams({ next: redirectTo })
    redirect(`/signin?${params.toString()}`)
  }

  // Fetch the profile; tolerate a missing row (new user mid-onboarding).
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    // Log but don't crash — let the caller decide what to do with profile: null.
    console.error('[requireAuth] profile fetch error', profileError.message)
  }

  return { user, profile: profile ?? null }
}

// ---------------------------------------------------------------------------
// Convenience guard — requires a completed profile (post-onboarding)
// ---------------------------------------------------------------------------

/**
 * Like `requireAuth`, but additionally redirects to `/onboarding` if the
 * user hasn't created a profile yet.
 *
 * Use this in dashboard pages / actions that depend on `profile` being
 * non-null.
 *
 * @param redirectTo - Passed through to `requireAuth`.
 * @returns `AuthContext` with a guaranteed non-null `profile`.
 * @throws `NEXT_REDIRECT` to `/signin` (no session) or `/onboarding` (no profile).
 *
 * @example
 * export default async function EventsPage() {
 *   const { profile } = await requireProfile()
 *   return <EventList creatorId={profile.id} />
 * }
 */
export async function requireProfile(
  redirectTo = '/dashboard',
): Promise<AuthContext & { profile: UserProfile }> {
  const ctx = await requireAuth(redirectTo)

  if (!ctx.profile) {
    redirect('/onboarding/role')
  }

  return ctx as AuthContext & { profile: UserProfile }
}

// ---------------------------------------------------------------------------
// Admin guard — requires is_admin = true on the user_profiles row
// ---------------------------------------------------------------------------

/**
 * Like `requireAuth`, but additionally redirects to `/dashboard` if the
 * authenticated user does not have `is_admin = true`.
 *
 * Uses `createAdminClient()` to bypass RLS so the flag check is reliable even
 * if the caller has restricted column-level policies.
 *
 * @throws `NEXT_REDIRECT` to `/signin` (no session) or `/dashboard` (not admin).
 */
export async function requireAdmin(): Promise<AuthContext & { profile: UserProfile }> {
  const ctx = await requireAuth('/admin')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', ctx.user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  return { ...ctx, profile: profile as UserProfile }
}
