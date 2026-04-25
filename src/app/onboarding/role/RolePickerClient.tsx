'use client'

import { useRouter } from 'next/navigation'

export default function RolePickerClient() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">

      {/* Header */}
      <header className="w-full flex items-center justify-center px-6 py-4">
        <div className="brand-text text-primary text-xl">
          WHEN <span className="brand-script text-2xl">in</span> MY{' '}
          <span className="brand-script text-2xl">city</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">

          <div className="mb-10 text-center">
            <h1 className="font-headline font-bold text-3xl text-on-surface tracking-tight mb-3">
              Welcome to WIMC
            </h1>
            <p className="text-on-surface-variant font-medium">
              What would you like to do?
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push('/onboarding/screen-1')}
              className="w-full flex items-center gap-4 p-5 bg-surface-container-low border-2 border-primary/30 rounded-2xl text-left hover:border-primary hover:bg-surface-container-high transition-all duration-200 active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-2xl">mic</span>
              </div>
              <div className="flex-1">
                <div className="font-headline font-bold text-on-surface text-lg">Host Events</div>
                <div className="text-on-surface-variant text-sm">
                  Create your creator page and sell tickets
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>

            <button
              onClick={() => router.push('/onboarding/explorer')}
              className="w-full flex items-center gap-4 p-5 bg-surface-container-low border-2 border-outline-variant/30 rounded-2xl text-left hover:border-primary hover:bg-surface-container-high transition-all duration-200 active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-2xl">explore</span>
              </div>
              <div className="flex-1">
                <div className="font-headline font-bold text-on-surface text-lg">Discover Events</div>
                <div className="text-on-surface-variant text-sm">
                  Find and attend events near you
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          </div>

          <p className="mt-10 text-center text-on-surface-variant text-xs leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary font-bold hover:underline">Privacy Policy</a>
          </p>
        </div>
      </main>

      {/* Background glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-40 -mt-20" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -ml-20 -mb-20" />
      </div>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
