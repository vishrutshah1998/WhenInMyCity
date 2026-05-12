'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendPhoneOTP, verifyPhoneOTP, signInWithGoogle } from '@/app/actions/auth'
import { WimcLogo } from '@/components/WimcLogo'

const FEATURE_TAGS = [
  { emoji: '🎪', label: 'Host events' },
  { emoji: '🔗', label: 'Link-in-bio page' },
  { emoji: '🏙️', label: 'Discover your city' },
]

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [view, setView] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitSendOTP() {
    setError(null)
    startTransition(async () => {
      const result = await sendPhoneOTP(phone)
      if (result.error) {
        setError(result.error)
      } else {
        setView('otp')
      }
    })
  }

  function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    submitSendOTP()
  }

  function runVerifyOTP(code: string) {
    setError(null)
    startTransition(async () => {
      const result = await verifyPhoneOTP(phone, code)
      if (result.error) {
        setError(result.error)
      } else if (result.isNewUser) {
        router.push('/onboarding')
      } else {
        router.push(next)
      }
    })
  }

  function handleOTPChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    if (value.length === 6 && !isPending) {
      runVerifyOTP(value)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body transition-colors duration-500">
      {/* Ambient glow — matches onboarding screens */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 70% 10%, rgba(232,87,42,0.12), transparent)' }}
      />

      {/* Header — identical pattern to screen-1 */}
      <header className="w-full flex items-center justify-between px-5 py-3">
        {view === 'otp' ? (
          <>
            <button
              onClick={() => { setView('phone'); setOtp(''); setError(null) }}
              className="flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="absolute left-1/2 -translate-x-1/2"><WimcLogo size="sm" /></span>
            <div />
          </>
        ) : (
          <>
            <WimcLogo size="sm" />
            <div />
          </>
        )}
      </header>

      <main className="flex-1 px-5 pt-3 pb-28 max-w-xl mx-auto w-full space-y-5">

        {view === 'phone' ? (
          <>
            {/* Title — same label + heading pattern as screen-1 */}
            <div>
              <p className="text-xs font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">
                Hey there 👋
              </p>
              <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                What&apos;s your number?
              </h1>
            </div>

            {/* Feature tags — fill the space, communicate value before asking */}
            <div className="flex flex-wrap gap-2">
              {FEATURE_TAGS.map((tag) => (
                <span
                  key={tag.label}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: 'rgba(232,87,42,0.08)',
                    borderColor: 'rgba(232,87,42,0.20)',
                    color: 'rgba(232,87,42,0.85)',
                  }}
                >
                  <span>{tag.emoji}</span>
                  {tag.label}
                </span>
              ))}
            </div>

            {/* Phone input — same field style as screen-1 */}
            <form onSubmit={handleSendOTP} className="space-y-2">
              <section className="space-y-1.5">
                <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="phone">
                  Phone number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 flex items-center pointer-events-none border-r border-outline-variant/25 pr-3">
                    <span className="text-on-surface font-semibold text-sm">🇮🇳 +91</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    maxLength={10}
                    placeholder="00000 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    autoFocus
                    className="w-full pl-24 pr-4 py-3 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none text-base"
                  />
                </div>
                <p className="text-xs text-on-surface-variant/45 px-0.5">
                  We&apos;ll send a one-time code · No spam, ever.
                </p>
              </section>
              {error && <p className="text-error text-sm font-medium">{error}</p>}
            </form>

            {/* OR divider */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-outline-variant/15" />
              <span className="flex-shrink mx-4 text-xs font-medium text-on-surface-variant/35 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-outline-variant/15" />
            </div>

            {/* Google — same tile style as screen-1 category tiles */}
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 p-3 rounded-xl text-left transition-all duration-200 active:scale-95 border-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-headline font-bold text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Continue with Google
                </span>
              </button>
            </form>

            <p className="text-on-surface-variant/35 text-xs text-center leading-relaxed px-0.5">
              By continuing you agree to our{' '}
              <a href="#" className="text-primary/60 font-semibold hover:text-primary transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary/60 font-semibold hover:text-primary transition-colors">Privacy Policy</a>
            </p>
          </>
        ) : (
          <>
            {/* OTP view — same label + heading pattern */}
            <div>
              <p className="text-xs font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">
                Almost there ✨
              </p>
              <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                Check your phone.
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Sent a 6-digit code to +91{' '}
                <span className="font-semibold text-on-surface">
                  {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
                </span>
              </p>
            </div>

            <section className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="otp">
                Your code
              </label>
              <input
                id="otp"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="——————"
                value={otp}
                onChange={handleOTPChange}
                className="w-full py-4 px-6 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-4xl font-mono tracking-[0.5em] text-center placeholder:text-on-surface-variant/20 placeholder:tracking-[0.3em] outline-none text-on-surface"
                autoFocus
              />
              <p className="text-xs text-on-surface-variant/45 px-0.5">
                Didn&apos;t get it?{' '}
                <button
                  type="button"
                  onClick={submitSendOTP}
                  disabled={isPending}
                  className="text-primary/70 font-semibold hover:text-primary transition-colors disabled:opacity-40"
                >
                  Resend code
                </button>
              </p>
              {error && <p className="text-error text-sm font-medium">{error}</p>}
            </section>
          </>
        )}
      </main>

      {/* Sticky CTA — same pattern as screen-1 footer */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-5 py-4 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto">
          {view === 'phone' ? (
            <button
              type="button"
              onClick={submitSendOTP}
              disabled={isPending || phone.length < 10}
              className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: '#E8572A' }}
            >
              {isPending ? 'Sending…' : 'Send code'}
              {!isPending && <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runVerifyOTP(otp)}
              disabled={isPending || otp.length < 6}
              className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: '#E8572A' }}
            >
              {isPending ? 'Verifying…' : 'Verify & continue'}
              {!isPending && <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>}
            </button>
          )}
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
