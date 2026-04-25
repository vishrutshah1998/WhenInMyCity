import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js root middleware — runs on every matched request.
 *
 * Delegates to `updateSession` which:
 *   1. Creates a Supabase client that can read/write cookies on the edge.
 *   2. Calls `supabase.auth.getUser()` to validate and refresh the session.
 *   3. Redirects unauthenticated requests to `/dashboard/*` and `/onboarding/*`
 *      to `/signin?next=<original-path>`.
 *   4. Redirects authenticated users away from `/signin` to `/dashboard`.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - Public assets with common image/font extensions
     *
     * The negative lookahead keeps the matcher fast by skipping static assets
     * that never need session checks.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)',
  ],
}
