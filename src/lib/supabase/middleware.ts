import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase session on every request and writes updated auth
 * cookies back to the response.
 *
 * This must be called from the root `middleware.ts` so that every route
 * benefits from session propagation. It returns a modified `NextResponse`
 * with refreshed cookies — always forward this response, not a new one.
 *
 * Route protection rules:
 *   - Unauthenticated requests to /dashboard/* or /onboarding/* → /signin
 *   - Authenticated users on /dashboard/* with no user_profiles row → /onboarding
 *   - Authenticated users visiting /signin → /dashboard
 *
 * @param request - The incoming Next.js middleware request.
 * @returns A `NextResponse` with refreshed session cookies.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Start with a passthrough response so we can attach cookies to it.
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies to both the request (for downstream server code) and
          // the response (so the browser receives them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: always call getUser() (not getSession()) — getUser() validates
  // the JWT with the Supabase Auth server, preventing spoofed session cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Server Action POST requests carry a `Next-Action` header.
  // Redirecting them breaks the client-side action protocol ("An unexpected
  // response was received from the server"), so we let them through and rely
  // on the action's own requireAuth() / getUser() guard instead.
  const isServerAction = request.headers.has('Next-Action')

  // ── Unauthenticated guard ────────────────────────────────────────────────
  const protectedPrefixes = ['/dashboard', '/onboarding']
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  )

  if (isProtected && !user && !isServerAction) {
    const signinUrl = request.nextUrl.clone()
    signinUrl.pathname = '/signin'
    // Preserve the original destination so we can redirect after login
    signinUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(signinUrl)
  }

  // ── Profile-existence guard (authenticated, /dashboard/* only) ──────────
  // If an authenticated user reaches a dashboard route but hasn't completed
  // onboarding (no user_profiles row), redirect them to /onboarding.
  // We skip this check for /onboarding/* itself to avoid redirect loops.
  if (user && pathname.startsWith('/dashboard')) {
    // Use the service role client for a fast, RLS-bypassing EXISTS query.
    // We create it inline here to keep middleware self-contained.
    const admin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { getAll() { return [] }, setAll() {} },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )

    const { data: profile, error } = await admin
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!error && profile === null) {
      const onboardingUrl = request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding'
      onboardingUrl.search = ''
      return NextResponse.redirect(onboardingUrl)
    }
  }

  // ── Authenticated-on-signin guard ────────────────────────────────────────
  // If the user is signed in and tries to visit /signin, send them home
  if (pathname === '/signin' && user) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/dashboard'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl)
  }

  return response
}
