'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface CompleteViewProps {
  username: string
  displayName: string
  city: string
  avatarUrl: string | null
}

export default function CompleteView({ username, displayName, city, avatarUrl }: CompleteViewProps) {
  const router = useRouter()
  const firstName = displayName.split(' ')[0]

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body overflow-hidden">
      <div className="flex flex-col min-h-screen max-w-md mx-auto relative overflow-hidden w-full">
        {/* Progress bar — full */}
        <header className="pt-6 px-6 z-10">
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full w-full bg-primary rounded-full" />
          </div>
        </header>

        {/* Confetti decorations */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
          <div className="absolute top-[10%] left-[20%] w-3 h-3 bg-secondary rotate-45 rounded-sm" />
          <div className="absolute top-[15%] right-[25%] w-2 h-4 bg-primary rotate-12" />
          <div className="absolute top-[40%] left-[10%] w-4 h-2 bg-tertiary -rotate-12 rounded-full" />
          <div className="absolute top-[30%] right-[15%] w-3 h-3 bg-secondary rotate-45" />
          <div className="absolute top-[60%] left-[25%] w-2 h-5 bg-primary -rotate-45" />
          <div className="absolute top-[50%] right-[30%] w-4 h-4 bg-tertiary rounded-full opacity-60" />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center z-10 pt-4 pb-8">
          {/* Heading */}
          <div className="mb-8 space-y-3">
            <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
              You&apos;re all set, {firstName}! 🎉
            </h1>
            <p className="text-on-surface-variant font-medium leading-relaxed font-body">
              Your WIMC page is ready. Let&apos;s make it yours.
            </p>
          </div>

          {/* Profile preview card */}
          <div className="w-full max-w-xs relative group mb-12" style={{ aspectRatio: '3/4' }}>
            {/* Background layer */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-gradient-to-br from-surface-container to-surface-container-high">
              {/* Gradient overlay always shown */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            {/* Top-left avatar */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border-2 border-white/20 overflow-hidden glass">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/60" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info overlay */}
            <div className="absolute bottom-6 left-6 right-6 glass bg-surface-container-high/60 p-4 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-primary font-headline font-bold text-sm tracking-tight">Verified Resident</span>
              </div>
              <h3 className="text-on-surface font-headline font-extrabold text-xl">{displayName}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">location_on</span>
                <span className="text-on-surface-variant text-xs font-medium font-body">{city}</span>
              </div>
            </div>

            {/* LIVE / NEW badge */}
            <div className="absolute -top-4 -right-4 bg-primary text-white w-20 h-20 rounded-full flex flex-col items-center justify-center rotate-12 shadow-2xl border-4 border-background">
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">LIVE</span>
              <span className="text-lg font-headline font-black">NEW</span>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => router.push(`/${username}`)}
              className="w-full py-4 px-6 bg-primary text-white font-headline font-bold rounded-lg shadow-[0_8px_20px_rgba(232,87,42,0.3)] active:scale-95 transition-all duration-150"
            >
              Go to my page
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 px-6 bg-surface-container-high text-on-surface font-headline font-semibold rounded-lg hover:bg-surface-container-highest transition-colors active:scale-95 border border-white/5"
            >
              Set up dashboard
            </button>
          </div>
        </main>

        {/* Footer decoration */}
        <footer className="py-8 px-6 flex justify-center opacity-20">
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
        </footer>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
