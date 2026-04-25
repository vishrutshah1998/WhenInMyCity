'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function CompleteView() {
  const params = useSearchParams()
  const router = useRouter()

  const slug = params.get('slug') ?? ''
  const name = params.get('name') ?? 'your Adda'
  const firstName = name.split(' ')[0]

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body overflow-hidden">
      <div className="flex flex-col min-h-screen max-w-md mx-auto relative overflow-hidden w-full">
        {/* Progress bar — full */}
        <header className="pt-6 px-6 z-10">
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full w-full bg-primary rounded-full" />
          </div>
        </header>

        {/* Decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
          <div className="absolute top-[10%] left-[20%] w-3 h-3 bg-secondary rotate-45 rounded-sm" />
          <div className="absolute top-[15%] right-[25%] w-2 h-4 bg-primary rotate-12" />
          <div className="absolute top-[40%] left-[10%] w-4 h-2 bg-tertiary -rotate-12 rounded-full" />
          <div className="absolute top-[30%] right-[15%] w-3 h-3 bg-secondary rotate-45" />
          <div className="absolute top-[60%] left-[25%] w-2 h-5 bg-primary -rotate-45" />
          <div className="absolute top-[50%] right-[30%] w-4 h-4 bg-tertiary rounded-full opacity-60" />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center z-10 pt-4 pb-8">
          {/* Icon */}
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
            <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
          </div>

          <div className="mb-8 space-y-3">
            <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
              {firstName} is live! 🎉
            </h1>
            <p className="text-on-surface-variant font-medium leading-relaxed font-body">
              Your Adda is listed and open for booking requests. Your calendar has been seeded with the next 30 days.
            </p>
          </div>

          {/* Slug badge */}
          {slug && (
            <div className="w-full bg-surface-container-low rounded-xl p-4 mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl">link</span>
              <div className="text-left">
                <p className="text-xs text-on-surface-variant font-label font-semibold uppercase tracking-wider mb-0.5">Your venue page</p>
                <p className="font-headline font-bold text-on-surface">wheninmycity.com/adda/{slug}</p>
              </div>
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => router.push('/adda/dashboard')}
              className="w-full py-4 px-6 bg-primary text-white font-headline font-bold rounded-lg shadow-[0_8px_20px_rgba(232,87,42,0.3)] active:scale-95 transition-all duration-150"
            >
              Go to Adda Dashboard
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 px-6 bg-surface-container-high text-on-surface font-headline font-semibold rounded-lg hover:bg-surface-container-highest transition-colors active:scale-95 border border-white/5"
            >
              Back to Creator Dashboard
            </button>
          </div>
        </main>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}

export default function AddaOnboardingCompletePage() {
  return (
    <Suspense>
      <CompleteView />
    </Suspense>
  )
}
