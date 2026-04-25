'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkOTPRateLimit } from '@/lib/ratelimit'

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Normalises an Indian mobile number to E.164 format (+91XXXXXXXXXX).
 *
 * Accepts:
 *   - `+91XXXXXXXXXX`   — already E.164
 *   - `91XXXXXXXXXX`    — without leading +
 *   - `XXXXXXXXXX`      — bare 10-digit number
 *
 * Returns `null` when the number doesn't match a valid Indian mobile pattern
 * (starts with 6–9, exactly 10 digits after the country code).
 */
function normaliseIndianPhone(raw: string): string | null {
  const stripped = raw.trim().replace(/\s+/g, '')

  let digits: string

  if (stripped.startsWith('+91')) {
    digits = stripped.slice(3)
  } else if (stripped.startsWith('91') && stripped.length === 12) {
    digits = stripped.slice(2)
  } else {
    digits = stripped
  }

  // Indian mobile: 10 digits, starts with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return null
  }

  return `+91${digits}`
}

// ---------------------------------------------------------------------------
// Phone OTP
// ---------------------------------------------------------------------------

/**
 * Sends a 6-digit OTP SMS to the supplied Indian phone number.
 *
 * The OTP is dispatched via Supabase Auth which forwards to the configured
 * SMS provider (MSG91). Expiry is controlled by the `OTP_EXP` setting in
 * the Supabase project (set to 600 seconds / 10 minutes).
 *
 * @param phone - Raw phone number string (any common Indian format accepted).
 * @returns `{ error: string | null }` — null on success, a human-readable
 *   message on failure.
 *
 * @example
 * const { error } = await sendPhoneOTP('9876543210')
 */
export async function sendPhoneOTP(
  phone: string,
): Promise<{ error: string | null }> {
  const rl = await checkOTPRateLimit()
  if (!rl.success) return { error: rl.error! }

  const e164 = normaliseIndianPhone(phone)

  if (!e164) {
    return {
      error:
        'Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210).',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: {
      // shouldCreateUser: true allows new users to sign up via OTP.
      // Set to false if you want a closed beta / invite-only flow.
      shouldCreateUser: true,
    },
  })

  if (error) {
    // Surface a friendly message; log the raw error for observability.
    console.error('[sendPhoneOTP]', error.message)

    if (error.message.toLowerCase().includes('rate limit')) {
      return {
        error: 'Too many requests. Please wait a minute before trying again.',
      }
    }

    return { error: 'Failed to send OTP. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// OTP Verification
// ---------------------------------------------------------------------------

/**
 * Verifies the 6-digit OTP entered by the user.
 *
 * After successful verification the session is written to cookies by the
 * Supabase SSR client.  The caller should then redirect based on `isNewUser`:
 *   - `isNewUser: true`  → /onboarding
 *   - `isNewUser: false` → /dashboard
 *
 * @param phone - The same phone number used in `sendPhoneOTP`.
 * @param token - The 6-digit OTP entered by the user.
 * @returns `{ error: string | null; isNewUser: boolean }`
 *
 * @example
 * const { error, isNewUser } = await verifyPhoneOTP('+919876543210', '123456')
 * if (!error) router.push(isNewUser ? '/onboarding' : '/dashboard')
 */
export async function verifyPhoneOTP(
  phone: string,
  token: string,
): Promise<{ error: string | null; isNewUser: boolean }> {
  const e164 = normaliseIndianPhone(phone)

  if (!e164) {
    return {
      error: 'Invalid phone number format.',
      isNewUser: false,
    }
  }

  if (!/^\d{6}$/.test(token.trim())) {
    return {
      error: 'OTP must be exactly 6 digits.',
      isNewUser: false,
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: token.trim(),
    type: 'sms',
  })

  if (error) {
    console.error('[verifyPhoneOTP]', error.message)

    if (
      error.message.toLowerCase().includes('expired') ||
      error.message.toLowerCase().includes('invalid')
    ) {
      return {
        error: 'Incorrect or expired OTP. Please request a new one.',
        isNewUser: false,
      }
    }

    return { error: 'Verification failed. Please try again.', isNewUser: false }
  }

  if (!data.user) {
    return {
      error: 'Could not retrieve user after verification.',
      isNewUser: false,
    }
  }

  // Check whether this user has completed onboarding (has a profile row).
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    // Non-fatal: treat as new user so onboarding catches them.
    console.error('[verifyPhoneOTP] profile lookup error', profileError.message)
    return { error: null, isNewUser: true }
  }

  return { error: null, isNewUser: profile === null }
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/**
 * Initiates the Google OAuth flow.
 *
 * Supabase returns a `url` which we redirect the user to. After the user
 * grants permission, Google redirects back to `/auth/callback` which
 * exchanges the code for a session.
 *
 * This is a Server Action — call it from a `<form action={signInWithGoogle}>`
 * or from a client-side `startTransition(() => signInWithGoogle())`.
 *
 * @throws Redirects the browser to the Google OAuth consent screen.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        // Request an offline refresh token so sessions survive browser restart.
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    console.error('[signInWithGoogle]', error?.message)
    redirect('/signin?error=oauth_failed')
  }

  redirect(data.url)
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

/**
 * Signs the current user out and clears the session cookies.
 *
 * Always redirects to `/` after sign-out (even if sign-out fails, we clear
 * local state via the redirect + middleware).
 *
 * @throws Redirects to `/` after sign-out.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('[signOut]', error.message)
  }

  redirect('/')
}
