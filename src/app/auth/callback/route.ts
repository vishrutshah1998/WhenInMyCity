import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /auth/callback
 *
 * Handles two OAuth flows:
 *   1. Google OAuth redirect — exchanges the `code` query param for a session.
 *   2. Magic-link / email confirmation (if ever used) — same code exchange.
 *
 * After session creation, routing logic:
 *   - `user_profiles` row exists  → creator returning user  → `/dashboard`
 *   - `explorer_profiles` row exists → explorer returning user → `/explore`
 *   - Neither row                 → brand new user          → `/onboarding/role`
 *   - Error at any step           → `/signin?error=auth_failed`
 *
 * Supabase PKCE flow: the `code` is exchanged server-side, keeping the
 * client secret off the browser entirely.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // A missing code means someone navigated here directly — send them away.
  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=auth_failed', origin))
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('[auth/callback] exchangeCodeForSession failed', error?.message)
    return NextResponse.redirect(new URL('/signin?error=auth_failed', origin))
  }

  const userId = data.session.user.id
  const googleEmail = data.session.user.email ?? null

  // Check all profile tables in parallel so returning users of any
  // role are routed to the right home without re-entering onboarding.
  // Creator takes priority: a dual-persona user (creator + venue) lands on
  // /dashboard where they can switch to the Adda dashboard.
  const [{ data: creatorProfile }, { data: explorerProfile }, { data: addaProfile }] =
    await Promise.all([
      supabase.from('user_profiles').select('id, contact_email').eq('id', userId).maybeSingle(),
      supabase.from('explorer_profiles').select('id').eq('auth_user_id', userId).maybeSingle(),
      supabase.from('adda_profiles').select('id, contact_email').eq('auth_user_id', userId).maybeSingle(),
    ])

  // Backfill contact_email from Google OAuth for returning users who don't have one yet.
  if (googleEmail) {
    if (creatorProfile && !creatorProfile.contact_email) {
      await supabase
        .from('user_profiles')
        .update({ contact_email: googleEmail })
        .eq('id', userId)
    }
    if (addaProfile && !addaProfile.contact_email) {
      await supabase
        .from('adda_profiles')
        .update({ contact_email: googleEmail })
        .eq('auth_user_id', userId)
    }
  }

  if (creatorProfile) {
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

  if (explorerProfile) {
    return NextResponse.redirect(new URL('/explore', origin))
  }

  if (addaProfile) {
    return NextResponse.redirect(new URL('/business/venue/dashboard', origin))
  }

  // Brand-new user — take them directly to onboarding screen 1.
  return NextResponse.redirect(new URL('/onboarding', origin))
}
