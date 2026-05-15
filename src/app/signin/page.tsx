'use client'

import { useState, useTransition, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendPhoneOTP, verifyPhoneOTP, signInWithGoogle } from '@/app/actions/auth'
import { WimcLogo } from '@/components/WimcLogo'
import { motion, AnimatePresence } from 'framer-motion'

const E = [0.22, 1, 0.36, 1] as const

const stampVariants = {
  idle: { scaleY: 1, rotate: -8, opacity: 0.18 },
  thump: {
    scaleY: [1, 0.92, 1.04, 1],
    rotate: [-8, -8, -8, -8],
    opacity: [0.18, 0.28, 0.22, 0.18],
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [view, setView]              = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone]            = useState('')
  const [otpDigits, setOtpDigits]    = useState(['', '', '', '', '', ''])
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [stampState, setStampState]  = useState<'idle' | 'thump'>('idle')

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const otp = otpDigits.join('')

  function triggerStamp() {
    setStampState('thump')
    setTimeout(() => setStampState('idle'), 400)
  }

  function submitSendOTP() {
    setError(null)
    triggerStamp()
    startTransition(async () => {
      const result = await sendPhoneOTP(phone)
      if (result.error) { setError(result.error) }
      else { setView('otp') }
    })
  }

  function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    submitSendOTP()
  }

  function runVerifyOTP(code: string) {
    setError(null)
    triggerStamp()
    startTransition(async () => {
      const result = await verifyPhoneOTP(phone, code)
      if (result.error) { setError(result.error) }
      else if (result.isNewUser) { router.push('/onboarding') }
      else { router.push(next) }
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
  }

  return (
    <motion.div
      className="flex flex-col min-h-screen font-body overflow-hidden"
      animate={{ backgroundColor: view === 'otp' ? '#172211' : '#07070A' }}
      transition={{ duration: 0.55, ease: E }}
      style={{ color: '#F0EFF8' }}
    >
      {/* Noise grain */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          zIndex: 0, opacity: 0.028,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* Ambient glow — phone view only */}
      <AnimatePresence>
        {view === 'phone' && (
          <motion.div
            aria-hidden
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,112,90,0.09) 0%, transparent 65%)', animation: 'wimc-blob 22s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,168,0,0.05) 0%, transparent 65%)', animation: 'wimc-blob 28s ease-in-out infinite', animationDelay: '-9s' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone-view nav (flow) */}
      <AnimatePresence>
        {view === 'phone' && (
          <motion.nav
            className="relative flex items-center justify-between px-6 py-4 md:px-14 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,10,0.85)', backdropFilter: 'blur(14px)', zIndex: 10 }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: E }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                aria-label="Go back"
                style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
              </button>
              <WimcLogo color="white" size="sm" />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Split layout */}
      <div className="relative flex flex-1 overflow-hidden" style={{ zIndex: 1 }}>

        {/* Left panel */}
        <AnimatePresence mode="wait">
          {view === 'phone' ? (
            /* Phone: orange ticket card */
            <motion.div
              key="left-phone"
              className="hidden lg:flex flex-col justify-center items-center relative overflow-hidden"
              style={{ width: '45%', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '48px', background: '#050508' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: E }}
            >
              <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(232,112,90,0.008) 20px, rgba(232,112,90,0.008) 22px)', pointerEvents: 'none' }} />

              <motion.div
                style={{ filter: 'drop-shadow(0 28px 56px rgba(232,112,90,0.3))', width: '100%', maxWidth: 400 }}
                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: E, delay: 0.1 }}
              >
                <div
                  className="w-full flex flex-col relative overflow-hidden"
                  style={{
                    background: '#E8705A',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 16,
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 22px), calc(100% - 22px) 100%, 22px 100%, 0% calc(100% - 22px))',
                  }}
                >
                  <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 10px, transparent 10px, transparent 20px)', pointerEvents: 'none' }} />

                  <motion.img
                    aria-hidden
                    src="/stamp.png"
                    alt=""
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      width: 192, height: 192,
                      objectFit: 'contain',
                      transform: 'rotate(12deg)',
                      mixBlendMode: 'screen',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      opacity: 0,
                    }}
                    animate={{ opacity: 0.35 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.65 }}
                  />

                  <div style={{ padding: '40px 40px 0', position: 'relative', zIndex: 10 }}>
                    <h2
                      className="font-display font-black leading-[0.88] tracking-[-0.045em] text-white"
                      style={{ fontSize: 'clamp(32px, 3vw, 48px)', marginBottom: 12 }}
                    >
                      Culture<br />lives here
                    </h2>

                    <div className="flex flex-col gap-5 mt-10">
                      {[
                        { icon: 'calendar_month',      title: 'Discover Events',    sub: 'Find the best events in your city' },
                        { icon: 'confirmation_number', title: 'Book Tickets',       sub: 'Get tickets to your favourite shows' },
                        { icon: 'group',               title: 'Connect Community',  sub: 'Join culture enthusiasts' },
                      ].map(f => (
                        <div key={f.title} className="flex items-start gap-4">
                          <span className="material-symbols-outlined text-white" style={{ fontSize: 22, opacity: 0.85, marginTop: 2, flexShrink: 0 }}>{f.icon}</span>
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{f.title}</h3>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{f.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px dashed rgba(255,255,255,0.3)',
                      margin: '32px 0 0',
                      padding: '16px 40px 20px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      background: 'rgba(0,0,0,0.12)',
                      position: 'relative', zIndex: 10,
                    }}
                  >
                    <div className="flex items-end gap-px w-full" style={{ opacity: 0.5 }}>
                      {[3,1,2,1,3,2,1,2,1,3,1,2,3,1,2,2,1,3,1,2].map((w, i) => (
                        <div key={i} style={{ width: w * 2.5, height: 32, background: 'white', flexShrink: 0 }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 8, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>WIMC-PASS-001</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* OTP: dark green panel */
            <motion.section
              key="left-otp"
              className="hidden lg:flex flex-col justify-between relative overflow-hidden"
              style={{ width: '50%', background: '#0D140A', borderRight: '1px solid #304724', padding: '48px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: E }}
            >
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ marginBottom: 80 }}>
                  <WimcLogo color="white" size="sm" />
                </div>
                <h3
                  className="font-bold leading-[1.1]"
                  style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', maxWidth: 360, marginBottom: 24 }}
                >
                  Discovery begins with a single city.
                </h3>
                <p style={{ color: '#a5c893', fontSize: 18, maxWidth: 320, lineHeight: 1.6 }}>
                  Enter your phone number to receive a secure access code and start your journey.
                </p>
              </div>

              <div
                aria-hidden
                style={{
                  position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%',
                  background: 'linear-gradient(to top, rgba(236,91,19,0.12) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Right panel */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {view === 'phone' ? (
              /* Phone form — unchanged */
              <motion.div
                key="right-phone"
                className="flex flex-col justify-center px-6 py-12 md:px-14 lg:px-16 h-full"
                style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: E }}
              >
                <div className="space-y-7">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div style={{ width: 24, height: 1, background: '#E8705A', opacity: 0.7 }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#E8705A' }}>BOARDING PASS</span>
                    </div>
                    <h1
                      className="font-display font-black tracking-[-0.04em] leading-[0.9]"
                      style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: '#fff' }}
                    >
                      What&apos;s your<br />
                      <span style={{ backgroundImage: 'linear-gradient(110deg, #E8705A 0%, #F5A800 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>number?</span>
                    </h1>
                    <p style={{ fontSize: 14, color: '#9896B0', marginTop: 12, lineHeight: 1.6 }}>
                      We&apos;ll send a one-time code. No spam, ever.
                    </p>
                  </div>

                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div style={{ border: '1px solid rgba(232,112,90,0.2)', background: 'rgba(232,112,90,0.03)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(232,112,90,0.1)', background: 'rgba(232,112,90,0.06)' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(232,112,90,0.7)' }}>MOBILE NUMBER</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>INDIA · +91</span>
                      </div>
                      <div className="flex items-stretch">
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderRight: '1px solid rgba(232,112,90,0.12)', background: 'rgba(232,112,90,0.05)', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#E8705A' }}>🇮🇳  +91</span>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="00000 00000"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          autoFocus
                          style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            padding: '14px 16px', fontSize: 18, fontFamily: 'monospace',
                            fontWeight: 600, color: '#F0EFF8', caretColor: '#E8705A',
                            letterSpacing: '0.08em',
                          }}
                          className="placeholder-[#3C3A52]"
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ fontSize: 12, color: '#E8705A', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      >
                        ⚠ {error}
                      </motion.p>
                    )}
                  </form>

                  <div className="flex items-center gap-4">
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  <form action={signInWithGoogle}>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 transition-all"
                      style={{
                        padding: '14px 20px',
                        background: 'white',
                        border: 'none',
                        color: '#1a1a1a',
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: '0.02em',
                        borderRadius: 10,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </button>
                  </form>

                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.7, fontFamily: 'monospace' }}>
                    By continuing you agree to our{' '}
                    <a href="#" style={{ color: 'rgba(232,112,90,0.6)' }}>Terms</a>
                    {' '}and{' '}
                    <a href="#" style={{ color: 'rgba(232,112,90,0.6)' }}>Privacy Policy</a>
                  </p>
                </div>
              </motion.div>
            ) : (
              /* OTP — new dark green design */
              <motion.section
                key="right-otp"
                className="flex flex-col items-center justify-center h-full relative overflow-hidden"
                style={{ padding: '80px 32px 140px' }}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.4, ease: E }}
              >
                {/* Coral postmark watermark */}
                <div className="absolute top-20 right-20 pointer-events-none select-none">
                  <svg
                    width="200" height="200" viewBox="0 0 200 200" fill="none"
                    style={{ opacity: 0.15, filter: 'grayscale(1) sepia(1) hue-rotate(-20deg) saturate(3)', color: '#FF7F50' }}
                  >
                    <circle cx="100" cy="100" r="90" stroke="currentColor" strokeDasharray="10 5" strokeWidth="2" />
                    <path d="M40 100 Q 100 20 160 100" fill="none" stroke="currentColor" strokeWidth="2" />
                    <text fill="currentColor" fontFamily="JetBrains Mono" fontSize="12" letterSpacing="4" textAnchor="middle" x="50%" y="55%">VERIFIED ARRIVAL</text>
                    <path d="M50 130 L 150 130" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>

                <div className="w-full max-w-md flex flex-col items-center text-center" style={{ gap: 32 }}>
                  <header>
                    <span style={{ color: '#F5A800', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      Verify Code
                    </span>
                    <h1
                      className="font-bold tracking-tight mt-4"
                      style={{
                        fontSize: 'clamp(36px, 5vw, 52px)',
                        backgroundImage: 'linear-gradient(to bottom right, #F5A800, #ec5b13)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      }}
                    >
                      Check your messages.
                    </h1>
                    <p style={{ color: '#a5c893', marginTop: 16 }}>
                      We sent a 6-digit code to{' '}
                      <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: 600 }}>
                        +91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
                      </span>
                    </p>
                  </header>

                  <div className="flex flex-col w-full" style={{ gap: 32 }}>
                    {/* 6 individual OTP boxes */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { otpInputRefs.current[i] = el }}
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
                            width: 56, height: 80, textAlign: 'center',
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700,
                            color: digit ? 'white' : '#304724',
                            background: 'rgba(245, 168, 0, 0.05)',
                            border: 'none', borderBottom: '2px solid #F5A800',
                            outline: 'none', caretColor: '#F5A800',
                            transition: 'border-color 0.15s, color 0.15s',
                          }}
                        />
                      ))}
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        style={{ fontSize: 12, color: '#E8705A', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      >
                        ⚠ {error}
                      </motion.p>
                    )}

                    <div className="flex flex-col" style={{ gap: 8 }}>
                      <button
                        type="button"
                        onClick={submitSendOTP}
                        disabled={isPending}
                        className="text-sm transition-colors underline underline-offset-4"
                        style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                      >
                        Didn&apos;t receive a code? Resend
                      </button>
                      <button
                        type="button"
                        onClick={goBackToPhone}
                        className="text-sm transition-colors"
                        style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                      >
                        Change phone number
                      </button>
                    </div>
                  </div>
                </div>

                {/* OTP sticky footer CTA */}
                <div
                  className="absolute bottom-0 left-0 w-full flex justify-center"
                  style={{ padding: 32, background: 'rgba(23,34,17,0.4)', backdropFilter: 'blur(20px)', borderTop: '1px solid #304724' }}
                >
                  <motion.button
                    type="button"
                    onClick={() => runVerifyOTP(otp)}
                    disabled={isPending || otp.length < 6}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-3 font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      padding: '16px 48px', borderRadius: 9999,
                      background: '#F5A800', color: '#172211',
                      boxShadow: '0 0 30px rgba(245,168,0,0.3)',
                    }}
                    onMouseEnter={e => { if (!isPending && otp.length >= 6) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  >
                    <span>{isPending ? 'Verifying…' : 'Verify & enter'}</span>
                    {!isPending && <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>}
                  </motion.button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Phone-view sticky CTA footer */}
      <AnimatePresence>
        {view === 'phone' && (
          <motion.footer
            className="fixed bottom-0 left-0 w-full"
            style={{ zIndex: 50, padding: '16px 24px', background: 'rgba(7,7,10,0.92)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: E }}
          >
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <motion.button
                type="button"
                onClick={submitSendOTP}
                disabled={isPending || phone.length < 10}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 font-display font-black tracking-[-0.02em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  padding: '16px 24px', fontSize: 15, borderRadius: 0,
                  background: phone.length >= 10 ? '#E8705A' : 'rgba(232,112,90,0.4)',
                  color: '#07070A',
                }}
              >
                {isPending ? 'Sending…' : 'Send code'}
                {!isPending && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>}
              </motion.button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* OTP-view floating nav */}
      <AnimatePresence>
        {view === 'otp' && (
          <motion.nav
            className="fixed top-0 left-0 w-full pointer-events-none"
            style={{ padding: '32px 48px', display: 'flex', alignItems: 'center', zIndex: 10 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: E }}
          >
            <button
              className="pointer-events-auto flex items-center gap-2 transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}
              onClick={goBackToPhone}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              <span>Back</span>
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </motion.div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
