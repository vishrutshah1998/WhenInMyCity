'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendPhoneOTP, verifyPhoneOTP, signInWithGoogle } from '@/app/actions/auth'
import { WimcLogo } from '@/components/WimcLogo'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [view, setView] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
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

  function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await verifyPhoneOTP(phone, otp)
      if (result.error) {
        setError(result.error)
      } else if (result.isNewUser) {
        router.push('/onboarding')
      } else {
        router.push(next)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:items-center md:justify-center overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4">
        {view === 'otp' ? (
          <button
            onClick={() => { setView('phone'); setError(null) }}
            className="flex items-center text-primary"
          >
            <span className="material-symbols-outlined mr-1">arrow_back</span>
          </button>
        ) : (
          <div className="w-6" />
        )}
        <WimcLogo color="#E8572A" size="xs" />
        <div className="w-6" />
      </div>

      <main className="flex-1 flex flex-col w-full md:max-w-[480px] md:h-auto">

        {/* Desktop logo */}
        <div className="hidden md:flex justify-center mb-10">
          <WimcLogo color="#E8572A" size="md" />
        </div>

        <div className="flex-1 flex flex-col px-8 pt-24 pb-12 md:p-12 md:bg-surface-container-low md:rounded-3xl md:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">

          {view === 'phone' ? (
            <>
              <div className="mb-10 text-center md:text-left">
                <h1 className="font-headline font-bold text-3xl md:text-4xl text-on-surface tracking-tight mb-2">
                  Welcome
                </h1>
                <p className="text-on-surface-variant font-medium">
                  Enter your phone number to continue
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 px-1" htmlFor="phone">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 flex items-center space-x-2 pointer-events-none border-r border-outline-variant/30 pr-3">
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
                      className="w-full pl-24 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 text-lg font-medium placeholder:text-on-surface-variant/40 outline-none text-on-surface"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-error text-sm font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending || phone.length < 10}
                  className="w-full py-4 bg-primary text-on-primary font-headline font-bold text-lg rounded-lg shadow-[0_4px_12px_rgba(232,87,42,0.25)] hover:shadow-[0_6px_20px_rgba(232,87,42,0.35)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Sending…' : 'Send OTP'}
                </button>
              </form>

              <div className="relative my-10 flex items-center">
                <div className="flex-grow border-t border-outline-variant/20" />
                <span className="flex-shrink mx-4 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-outline-variant/20" />
              </div>

              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-3 py-4 bg-surface-container-low border border-outline-variant/30 text-on-surface font-semibold rounded-lg hover:bg-surface-container-high active:scale-[0.98] transition-all duration-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </form>
            </>
          ) : view === 'otp' ? (
            <>
              <div className="mb-10 text-center md:text-left">
                <h1 className="font-headline font-bold text-3xl md:text-4xl text-on-surface tracking-tight mb-2">
                  Enter OTP
                </h1>
                <p className="text-on-surface-variant font-medium">
                  Sent to +91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 px-1" htmlFor="otp">
                    6-Digit OTP
                  </label>
                  <input
                    id="otp"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full py-4 px-6 bg-surface-container-low border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 text-3xl font-mono tracking-[0.5em] text-center placeholder:text-on-surface-variant/30 outline-none text-on-surface"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-error text-sm font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending || otp.length < 6}
                  className="w-full py-4 bg-primary text-on-primary font-headline font-bold text-lg rounded-lg shadow-[0_4px_12px_rgba(232,87,42,0.25)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Verifying…' : 'Verify & Continue'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    startTransition(async () => {
                      const result = await sendPhoneOTP(phone)
                      if (result.error) setError(result.error)
                    })
                  }}
                  disabled={isPending}
                  className="text-primary font-semibold text-sm hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </>
          ) : null}

          <div className="mt-auto pt-10 text-center border-t border-outline-variant/10">
            <p className="text-on-surface-variant text-xs leading-relaxed">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary font-bold hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </main>

      {/* Background glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-40 -mt-20" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -ml-20 -mb-20" />
      </div>

      {/* Material Symbols font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
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
