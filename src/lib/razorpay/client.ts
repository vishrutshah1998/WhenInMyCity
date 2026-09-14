// =============================================================================
// WIMC — Razorpay client-side checkout key
//
// Client-safe (no 'server-only' import) — NEXT_PUBLIC_* vars are inlined at
// build time, so this mirrors the RAZORPAY_MODE switch in ./index.ts using
// its own NEXT_PUBLIC_-prefixed flag.
// =============================================================================

/**
 * Returns the Razorpay Checkout.js `key` to use client-side — the test-mode
 * public key when `NEXT_PUBLIC_RAZORPAY_MODE=test`, else the live public key.
 * Falls back to `''` if the relevant var isn't set (matches every call
 * site's prior `?? ''` behavior).
 */
export function getRazorpayCheckoutKey(): string {
  const isTest = process.env.NEXT_PUBLIC_RAZORPAY_MODE === 'test'
  return (isTest ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID_TEST : process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) ?? ''
}
