'use client'

import { useState, useTransition, useRef, useEffect, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AsYouType, isValidPhoneNumber, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import { sendPhoneOTP, verifyPhoneOTP, signInWithGoogle } from '@/app/actions/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { WimcWordmark } from '@/components/WimcWordmark'
import { CountryCodeSelect, DIAL_COUNTRIES } from '@/components/CountryCodeSelect'

const E = [0.22, 1, 0.36, 1] as const

// WhatsApp brand mark — same path/green used by src/components/profile/WhatsAppCommunityBlock.tsx
const WA_GREEN = '#25D366'
const WA_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z'

function WhatsAppGlyph({ size = 14, color = WA_GREEN }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <path d={WA_PATH} />
    </svg>
  )
}

/** Domestic (+91) keeps its exact original validation; everything else defers to libphonenumber-js. */
function isPhoneValid(digits: string, iso: CountryCode): boolean {
  if (iso === 'IN') return /^[6-9]\d{9}$/.test(digits)
  if (!digits) return false
  return isValidPhoneNumber(`+${getCountryCallingCode(iso)}${digits}`, iso)
}

function formatPhoneDisplay(digits: string, iso: CountryCode): string {
  return digits ? new AsYouType(iso).input(digits) : ''
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [view, setView]              = useState<'phone' | 'otp'>('phone')
  const [countryIso, setCountryIso]  = useState<CountryCode>('IN')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [otpDigits, setOtpDigits]    = useState(['', '', '', '', '', ''])
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // SMS is the default channel for +91; every other country is WhatsApp-only
  // (AmazeSMS is DLT-gated domestic-only) — same policy as the guest-RSVP OTP
  // flow in event-page.tsx. A "Try WhatsApp instead" fallback appears 20s
  // after an SMS code is sent.
  const [otpChannel, setOtpChannel] = useState<'sms' | 'whatsapp'>('sms')
  const [whatsappFallbackReady, setWhatsappFallbackReady] = useState(false)

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const otp = otpDigits.join('')

  const isIndia   = countryIso === 'IN'
  const dialCode  = getCountryCallingCode(countryIso)
  const e164Phone = phoneDigits ? `+${dialCode}${phoneDigits}` : ''
  const phoneValid = isPhoneValid(phoneDigits, countryIso)

  // Default the country chip from device locale, falling back to India.
  useEffect(() => {
    try {
      const region = new Intl.Locale(navigator.language).region
      if (region && DIAL_COUNTRIES.some((c) => c.iso === region)) {
        setCountryIso(region as CountryCode)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (view !== 'otp' || otpChannel !== 'sms') {
      setWhatsappFallbackReady(false)
      return
    }
    setWhatsappFallbackReady(false)
    const t = setTimeout(() => setWhatsappFallbackReady(true), 20000)
    return () => clearTimeout(t)
  }, [view, otpChannel])

  function submitSendOTP(channel: 'sms' | 'whatsapp') {
    setError(null)
    startTransition(async () => {
      const result = await sendPhoneOTP(e164Phone, channel)
      if (result.error) { setError(result.error) }
      else { setOtpChannel(channel); setView('otp') }
    })
  }

  function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    submitSendOTP(isIndia ? 'sms' : 'whatsapp')
  }

  function runVerifyOTP(code: string) {
    setError(null)
    startTransition(async () => {
      const result = await verifyPhoneOTP(e164Phone, code)
      if (result.error) { setError(result.error) }
      else if (result.isNewUser) {
        const onboardingDest = next.startsWith('/onboarding')
          ? next
          : '/onboarding'

        if (!next.startsWith('/onboarding') && next !== '/dashboard') {
          try { sessionStorage.setItem('wimc_post_onboarding_redirect', next) } catch {}
        }

        router.push(onboardingDest)
      }
      else {
        const returningDest = next.startsWith('/onboarding')
          ? '/dashboard'
          : next

        router.push(returningDest)
      }
    })
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const updated = [...otpDigits]
    updated[index] = digit
    setOtpDigits(updated)
    if (digit && index < 5) otpInputRefs.current[index + 1]?.focus()
    const code = updated.join('')
    if (code.length === 6 && !updated.includes('') && !isPending) runVerifyOTP(code)
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const digits = [...pasted.split(''), ...Array(6 - pasted.length).fill('')].slice(0, 6)
    setOtpDigits(digits)
    if (pasted.length === 6 && !isPending) { runVerifyOTP(pasted) }
    else { otpInputRefs.current[Math.min(pasted.length, 5)]?.focus() }
  }

  function goBackToPhone() {
    setView('phone')
    setOtpDigits(['', '', '', '', '', ''])
    setError(null)
    setOtpChannel('sms')
  }

  function handlePhoneDigitsChange(raw: string) {
    setPhoneDigits(raw.replace(/\D/g, '').slice(0, 15))
  }

  return (
    <div className="flex min-h-screen font-body" style={{ background: '#131317', color: '#e5e1e6', overflow: 'hidden' }}>
      {/* Noise grain */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          zIndex: 50, opacity: 0.028,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      <main className="relative flex w-full min-h-screen flex-col md:flex-row" style={{ zIndex: 10 }}>

        {/* ── Left editorial panel ── */}
        <section
          className="hidden md:flex md:w-1/2 relative flex-col justify-center items-center overflow-hidden"
          style={{
            padding: 40,
            background: '#1b1b1f',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)',
            backgroundSize: '20px 20px',
            borderRight: '1px dashed #57423e',
          }}
        >
          {/* Stamp watermark */}
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ opacity: 0.07 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-stamp.png"
              alt=""
              style={{ width: '70%', maxWidth: 420, transform: 'rotate(-8deg)', filter: 'grayscale(1)' }}
            />
          </div>

          {/* 3D flip card — perspective on the outer div, rotateY on the inner motion div */}
          <FlipCard isFlipped={view === 'otp'} />
        </section>

        {/* ── Right form panel ── */}
        <AnimatePresence mode="wait">
          {view === 'phone' ? (
            <motion.section
              key="phone-form"
              className="flex-1 flex flex-col justify-center relative"
              style={{ background: '#131317' }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: E }}
            >
              <div
                className="max-w-md w-full mx-auto px-6 md:px-10 lg:px-16"
                style={{ display: 'flex', flexDirection: 'column', gap: 40 }}
              >
                {/* Mobile wordmark */}
                <div className="md:hidden">
                  <WimcWordmark color="#E8705A" height={22} />
                </div>

                {/* Heading */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em', color: '#e5e1e6', margin: 0 }}>
                    Let&apos;s find your city&apos;s culture.
                  </h1>
                  <p style={{ fontSize: 15, color: '#dec0ba', lineHeight: 1.6, margin: 0 }}>
                    Enter your number. We&apos;ll send you a code.
                  </p>
                </div>

                {/* Phone form */}
                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div
                    style={{ borderBottom: '1px solid #57423e', display: 'flex', alignItems: 'center', transition: 'border-color 0.2s' }}
                    onFocusCapture={e => (e.currentTarget.style.borderBottomColor = '#ffb4a6')}
                    onBlurCapture={e => (e.currentTarget.style.borderBottomColor = '#57423e')}
                  >
                    <label className="sr-only" htmlFor="mobile_number">Mobile Number</label>
                    <CountryCodeSelect
                      variant="sheet"
                      value={countryIso}
                      onChange={setCountryIso}
                      className="flex items-center gap-1 shrink-0 bg-transparent border-none cursor-pointer select-none py-4 pr-1 font-mono text-[13px] text-[#dec0ba]"
                    />
                    <input
                      id="mobile_number"
                      name="mobile_number"
                      type="tel"
                      inputMode="numeric"
                      placeholder={isIndia ? '00000 00000' : 'Phone number'}
                      required
                      value={formatPhoneDisplay(phoneDigits, countryIso)}
                      onChange={e => handlePhoneDigitsChange(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 600,
                        color: '#e5e1e6', caretColor: '#ffb4a6',
                        padding: '16px 0 16px 8px', letterSpacing: '0.04em',
                      }}
                      className="placeholder-[#57423e]"
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      style={{ fontSize: 12, color: '#ffb4ab', fontFamily: 'monospace', letterSpacing: '0.05em', margin: 0 }}
                    >
                      ⚠ {error}
                    </motion.p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      type="submit"
                      disabled={isPending || !phoneValid}
                      className="w-full flex items-center justify-between transition-colors duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group"
                      style={{ background: '#ffb4a6', color: '#630e03', fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 600, padding: '16px 24px', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { if (!isPending && phoneValid) e.currentTarget.style.background = '#ffdad3' }}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ffb4a6')}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {!isIndia && !isPending && <WhatsAppGlyph size={20} color="#630e03" />}
                        {isPending ? 'Sending…' : isIndia ? 'Send OTP' : 'Send code on WhatsApp'}
                      </span>
                      {!isPending && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform duration-200" style={{ fontSize: 24 }}>arrow_forward</span>}
                    </button>

                    {isIndia ? (
                      <button
                        type="button"
                        onClick={() => submitSendOTP('whatsapp')}
                        disabled={isPending || !phoneValid}
                        className="w-fit mx-auto flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: WA_GREEN, padding: '4px 0' }}
                      >
                        <WhatsAppGlyph />
                        Get the code on WhatsApp instead
                      </button>
                    ) : (
                      <p style={{ textAlign: 'center', fontSize: 12, color: '#dec0ba', margin: 0 }}>
                        We&apos;ll send your verification code via WhatsApp.
                      </p>
                    )}
                  </div>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {/* Google */}
                <form action={signInWithGoogle}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 transition-all"
                    style={{ padding: '14px 20px', background: 'white', color: '#1a1a1a', fontWeight: 700, fontSize: 14, borderRadius: 4, cursor: 'pointer', border: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                </form>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', color: '#dec0ba', textTransform: 'uppercase' }}>
                    No spam. Just culture.
                  </span>
                </div>
              </div>
            </motion.section>

          ) : (

            <motion.section
              key="otp-form"
              className="flex-1 flex flex-col justify-center relative"
              style={{ background: '#FAF7F0' }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: E }}
            >
              {/* Subtle grain on cream side */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: 0.05, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
              />

              <div
                className="w-full max-w-md mx-auto relative px-6 md:px-10 lg:px-16"
                style={{ display: 'flex', flexDirection: 'column', gap: 40 }}
              >
                {/* Back link */}
                <button
                  onClick={goBackToPhone}
                  className="flex items-center gap-1 w-fit transition-colors"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#57423e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#a33d2b')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#57423e')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                  Change number
                </button>

                {/* Heading */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#131317', textTransform: 'uppercase', margin: 0 }}>
                    Check your<br />messages.
                  </h1>
                  <p style={{ fontSize: 15, color: '#353438', lineHeight: 1.6, margin: 0 }}>
                    We sent a 6-digit code via {otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to{' '}
                    <strong>+{dialCode} {formatPhoneDisplay(phoneDigits, countryIso)}</strong>.
                    {' '}It&apos;s valid for 10 minutes.
                  </p>
                </div>

                {/* OTP form */}
                <form
                  style={{ display: 'flex', flexDirection: 'column', gap: 40 }}
                  onSubmit={e => { e.preventDefault(); runVerifyOTP(otp) }}
                >
                  {/* 6 dashed OTP boxes */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpInputRefs.current[i] = el }}
                        aria-label={`Digit ${i + 1}`}
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        autoFocus={i === 0}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        placeholder="•"
                        style={{
                          flex: 1, minWidth: 0, maxWidth: 56,
                          height: 72,
                          textAlign: 'center',
                          fontFamily: 'Outfit, sans-serif',
                          fontSize: 28, fontWeight: 900,
                          color: '#131317',
                          background: 'transparent',
                          border: '2px dashed #57423e',
                          outline: 'none',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = '#131317'
                          e.currentTarget.style.background = 'rgba(19,19,23,0.05)'
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = '#57423e'
                          e.currentTarget.style.background = 'transparent'
                        }}
                      />
                    ))}
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      style={{ fontSize: 12, color: '#a33d2b', fontFamily: 'monospace', letterSpacing: '0.05em', margin: 0 }}
                    >
                      ⚠ {error}
                    </motion.p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      type="submit"
                      disabled={isPending || otp.length < 6}
                      className="w-full flex items-center justify-center gap-3 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: '#131317', color: '#FAF7F0', fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 600, padding: '16px 24px', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { if (!isPending && otp.length >= 6) e.currentTarget.style.background = '#201f23' }}
                      onMouseLeave={e => (e.currentTarget.style.background = '#131317')}
                    >
                      {isPending ? 'Verifying…' : 'Verify & Enter'}
                      {!isPending && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform duration-200" style={{ fontSize: 24 }}>arrow_forward</span>}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => submitSendOTP(otpChannel)}
                        disabled={isPending}
                        style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#57423e', background: 'none', border: 'none', borderBottom: '1px solid transparent', cursor: 'pointer', paddingBottom: 2 }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#131317'
                          e.currentTarget.style.borderBottomColor = '#131317'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = '#57423e'
                          e.currentTarget.style.borderBottomColor = 'transparent'
                        }}
                      >
                        Didn&apos;t get it? Resend
                      </button>
                      {isIndia && otpChannel === 'sms' && whatsappFallbackReady && (
                        <button
                          type="button"
                          onClick={() => submitSendOTP('whatsapp')}
                          disabled={isPending}
                          className="flex items-center gap-1.5"
                          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: WA_GREEN, background: 'none', border: 'none', borderBottom: '1px solid transparent', cursor: 'pointer', paddingBottom: 2 }}
                          onMouseEnter={e => (e.currentTarget.style.borderBottomColor = WA_GREEN)}
                          onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
                        >
                          <WhatsAppGlyph />
                          Switch to WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}

function FlipCard({ isFlipped }: { isFlipped: boolean }) {
  return (
    <div
      style={{ perspective: '1200px', width: '100%', maxWidth: 380, position: 'relative', zIndex: 10 }}
      className="group"
    >
      {/* Hover rotate wrapper */}
      <div
        style={{ transform: 'rotate(-3deg)', transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(0deg)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'rotate(-3deg)')}
      >
        {/* Flip container */}
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.75, ease: E }}
          style={{
            transformStyle: 'preserve-3d',
            position: 'relative',
            height: 496,
            width: '100%',
          }}
        >
          {/* Front face: "Culture Lives Offline." */}
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
            <TicketCard
              heading={<>Culture<br />Lives<br />Offline.</>}
              body="We keep it connected. The best independent events, communities, and spaces in your city."
              accentColor="#ffb4a6"
            />
          </div>

          {/* Back face: "Access Granted" */}
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}>
            <AccessGrantedCard />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function AccessGrantedCard() {
  return (
    <div style={{
      background: '#1b1b1f',
      border: '1px solid #57423e',
      boxShadow: '8px 8px 0px 0px rgba(255,180,166,0.1)',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#ffb4a6', zIndex: 2 }} />

      {/* Postmark stamp */}
      <div style={{
        position: 'absolute', top: -16, right: -16,
        width: 96, height: 96,
        opacity: 0.4,
        transform: 'rotate(3deg)',
        pointerEvents: 'none',
        zIndex: 10,
        color: '#ffb4a6',
      }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="50" cy="50" r="48" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="38" />
          <text fill="currentColor" stroke="none" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" textAnchor="middle" x="50" y="45">VERIFIED</text>
          <text fill="currentColor" stroke="none" fontFamily="JetBrains Mono, monospace" fontSize="8" textAnchor="middle" x="50" y="60">WIMC/08492</text>
        </svg>
      </div>

      {/* Header strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottom: '1px dashed #57423e', flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#dec0ba', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entry Pass</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#ffb4a6' }}>No. 08492</span>
      </div>

      {/* Image canvas — grayscale venue photo */}
      <div style={{ position: 'relative', height: 256, width: '100%', background: '#353438', padding: 8, flexShrink: 0 }}>
        <div style={{
          width: '100%', height: '100%',
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC-E3Tqwda5NoipNVM7N9NuZfwF_H6iXsLN_brILeoGD5vVeLI-xK0fmgQMiaS2-RrKrWMoNl85cdAoypsaaZHKtUxUY_lZfC1j71qEpBw04cuvP7tVa1Q_ij0AiO-O3KdFG_Rl5IGk80peh4goMltVacuy4jyLPQ4slh5jzRFZe1QKLMumDvdAsIgAMrp4XFlKbW-7l6bOymc5QtbLhPt5jYjShTRibR6okLhhFELzaE027FfRFZD47202R3H-G5IkadpXcb2KP-48')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(1) contrast(1.25)',
          mixBlendMode: 'luminosity',
          border: '1px solid #57423e',
        }} />
      </div>

      {/* Content area */}
      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 'clamp(24px, 4vw, 40px)',
          fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em',
          color: '#e5e1e6', textTransform: 'uppercase', margin: 0,
        }}>
          Access Granted
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#dec0ba', lineHeight: 1.6, margin: 0 }}>
          Validate your presence to enter the WIMC ecosystem.
        </p>
      </div>

      {/* Bottom stub */}
      <div style={{
        height: 34, borderTop: '2px dashed #57423e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: '#1b1b1f',
        overflow: 'hidden', position: 'relative', flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', color: '#e5e1e6', textTransform: 'uppercase' }}>ADMIT ONE</span>
        {/* Barcode — taller than stub, clipped by overflow:hidden, shifted down to peek */}
        <div style={{ height: 64, display: 'flex', gap: 2, alignItems: 'center', opacity: 0.7, transform: 'translateY(8px)' }}>
          <div style={{ width: 4,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 8,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 4,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 2,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 12, height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 4,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 8,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 4,  height: '100%', background: '#e5e1e6' }} />
          <div style={{ width: 2,  height: '100%', background: '#e5e1e6' }} />
        </div>
      </div>
    </div>
  )
}

function TicketCard({ heading, body, accentColor }: { heading: ReactNode; body: string; accentColor: string }) {
  return (
    <div style={{ background: '#131317', border: '1px solid #57423e', boxShadow: '8px 8px 0px 0px rgba(255,180,166,0.12)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left accent bar */}
        <div style={{ width: 3, background: accentColor, flexShrink: 0 }} />
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', color: '#dec0ba', textTransform: 'uppercase' }}>WIMC / ENTRY PASS</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#dec0ba' }}>No. 08492</span>
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', color: '#e5e1e6', textTransform: 'uppercase', flex: 1, margin: 0 }}>
            {heading}
          </h2>
          <p style={{ fontSize: 13, color: '#dec0ba', lineHeight: 1.6, marginTop: 12 }}>
            {body}
          </p>
        </div>
      </div>

      {/* Dashed divider with punch holes */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: -6, width: 12, height: 12, borderRadius: '50%', background: '#1b1b1f', border: '1px solid #57423e', zIndex: 1 }} />
        <div style={{ width: '100%', borderTop: '1px dashed #57423e' }} />
        <div style={{ position: 'absolute', right: -6, width: 12, height: 12, borderRadius: '50%', background: '#1b1b1f', border: '1px solid #57423e', zIndex: 1 }} />
      </div>

      {/* Stub */}
      <div style={{ height: 34, background: '#353438', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: '#dec0ba', textTransform: 'uppercase' }}>ADMIT ONE</span>
        <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'center', opacity: 0.5 }}>
          {[4, 2, 1, 8, 3, 4, 2, 1].map((w, i) => (
            <div key={i} style={{ width: w, height: '100%', background: '#dec0ba' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
