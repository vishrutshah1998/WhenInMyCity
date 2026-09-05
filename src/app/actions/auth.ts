'use server'

import { redirect } from 'next/navigation'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { createClient } from '@/lib/supabase/server'
import { checkOTPRateLimit } from '@/lib/ratelimit'
import { setSignupOtpChannel, type SignupOtpChannel } from '@/lib/signup-otp-channel'

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a phone number to E.164.
 *
 * Domestic (+91) keeps the original strict pattern unchanged — accepts
 * `+91XXXXXXXXXX`, `91XXXXXXXXXX`, or a bare 10-digit number starting 6–9.
 * Anything else defers to libphonenumber-js, mirroring
 * src/app/actions/guest-otp.ts's PhoneSchema so both flows agree on what
 * counts as a valid international number. Returns `null` when invalid.
 */
function normalisePhone(raw: string): string | null {
  const stripped = raw.trim().replace(/\s+/g, '')

  let indiaDigits: string | null = null
  if (stripped.startsWith('+91')) {
    indiaDigits = stripped.slice(3)
  } else if (stripped.startsWith('91') && stripped.length === 12) {
    indiaDigits = stripped.slice(2)
  } else if (/^\d{10}$/.test(stripped)) {
    indiaDigits = stripped
  }

  if (indiaDigits !== null) {
    return /^[6-9]\d{9}$/.test(indiaDigits) ? `+91${indiaDigits}` : null
  }

  const parsed = parsePhoneNumberFromString(stripped)
  return parsed && parsed.isValid() && parsed.country !== 'IN' ? parsed.number : null
}

function isDomestic(phone: string): boolean {
  return phone.startsWith('+91')
}

// ---------------------------------------------------------------------------
// Phone OTP
// ---------------------------------------------------------------------------

/**
 * Sends a 6-digit OTP to the supplied phone number, via SMS or WhatsApp.
 *
 * The OTP itself is generated and dispatched by Supabase Auth's Send SMS
 * Hook (src/app/api/webhooks/send-sms/route.ts), which forwards to AmazeSMS
 * or Meta WhatsApp depending on the `channel` passed here — recorded in a
 * short-lived Redis side-channel (src/lib/signup-otp-channel.ts) since
 * Supabase's hook payload carries no channel concept of its own. Expiry is
 * controlled by the `OTP_EXP` setting in the Supabase project (set to 600
 * seconds / 10 minutes).
 *
 * AmazeSMS is a DLT-gated domestic-only transport, so international (+91)
 * numbers always use WhatsApp regardless of the requested channel — same
 * policy as src/app/actions/guest-otp.ts.
 *
 * @param phone - Raw phone number string (any common Indian format, or a
 *   full E.164 international number).
 * @param channel - 'sms' (default) or 'whatsapp'.
 * @returns `{ error: string | null }` — null on success, a human-readable
 *   message on failure.
 *
 * @example
 * const { error } = await sendPhoneOTP('9876543210', 'whatsapp')
 */
export async function sendPhoneOTP(
  phone: string,
  channel: SignupOtpChannel = 'sms',
): Promise<{ error: string | null }> {
  const rl = await checkOTPRateLimit()
  if (!rl.success) return { error: rl.error! }

  const e164 = normalisePhone(phone)

  if (!e164) {
    return { error: 'Please enter a valid phone number.' }
  }

  const effectiveChannel: SignupOtpChannel = isDomestic(e164) ? channel : 'whatsapp'

  await setSignupOtpChannel(e164, effectiveChannel)

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
  const e164 = normalisePhone(phone)

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
