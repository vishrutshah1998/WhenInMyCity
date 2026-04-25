'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeAddaOnboarding } from '@/app/actions/adda-onboarding'
import type { CompleteAddaInput } from '@/app/actions/adda-onboarding'

function loadStepData(): Partial<CompleteAddaInput> {
  if (typeof window === 'undefined') return {}
  try {
    const s1 = JSON.parse(sessionStorage.getItem('adda_step1') || '{}')
    const s2 = JSON.parse(sessionStorage.getItem('adda_step2') || '{}')
    const s3 = JSON.parse(sessionStorage.getItem('adda_step3') || '{}')
    return { ...s1, ...s2, ...s3 }
  } catch {
    return {}
  }
}

export default function AddaStep4Page() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')

  function handleSubmit() {
    setError(null)

    const saved = loadStepData()

    if (!saved.name || !saved.city || !saved.address || !saved.adda_type?.length || !saved.pricing_model) {
      setError('Some earlier answers are missing. Please go back and complete all steps.')
      return
    }

    const whatsappClean = whatsapp.trim() || undefined
    const emailClean    = email.trim() || undefined
    const igClean       = instagram.trim().replace(/^@/, '') || undefined

    startTransition(async () => {
      const result = await completeAddaOnboarding({
        name:                    saved.name!,
        description:             saved.description,
        city:                    saved.city!,
        neighbourhood:           saved.neighbourhood,
        address:                 saved.address!,
        lat:                     saved.lat,
        lng:                     saved.lng,
        adda_type:               saved.adda_type!,
        capacity_min:            saved.capacity_min,
        capacity_max:            saved.capacity_max,
        capacity_configurations: saved.capacity_configurations ?? [],
        amenities:               saved.amenities ?? [],
        pricing_model:           saved.pricing_model!,
        pricing_config:          saved.pricing_config ?? {},
        contact_whatsapp:        whatsappClean,
        contact_email:           emailClean,
        instagram_handle:        igClean,
      })

      if (result.error) { setError(result.error); return }

      // Clear sessionStorage
      sessionStorage.removeItem('adda_step1')
      sessionStorage.removeItem('adda_step2')
      sessionStorage.removeItem('adda_step3')

      router.push(`/adda/onboarding/complete?slug=${encodeURIComponent(result.slug)}&name=${encodeURIComponent(saved.name!)}`)
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      <header className="w-full flex items-center justify-between px-6 py-4">
        <button onClick={() => router.back()} className="flex items-center text-primary">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="brand-text text-primary text-xl">List your Adda</span>
        <div className="w-6" />
      </header>

      <div className="w-full px-6 pt-2">
        <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" />
        </div>
        <p className="mt-2 text-xs text-on-surface-variant font-medium font-label">Step 4 of 4 — Contact details</p>
      </div>

      <main className="flex-1 px-6 pt-8 pb-36 max-w-2xl mx-auto w-full space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">How can creators reach you?</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">All fields are optional — add at least one so creators can get in touch.</p>
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">WhatsApp number</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-lg" style={{ verticalAlign: 'middle' }}>chat</span>
            </span>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full pl-12 pr-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Email address</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-lg" style={{ verticalAlign: 'middle' }}>mail</span>
            </span>
            <input
              type="email"
              placeholder="hello@yourvenue.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
          </div>
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Instagram handle</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-headline font-bold text-primary">@</span>
            <input
              type="text"
              placeholder="yourvenuepage"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
              maxLength={30}
              className="w-full pl-10 pr-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
          </div>
        </div>

        {/* Summary card */}
        <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/10 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="font-headline font-bold text-sm">Ready to publish</span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Clicking &ldquo;List my Adda&rdquo; creates your public venue profile and seeds your availability calendar for the next 30 days. You can add photos and update details from your Adda dashboard.
          </p>
        </div>

        {error && <p className="text-error text-sm font-medium">{error}</p>}
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-4 px-6 bg-primary text-on-primary font-headline font-bold rounded-lg shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating your Adda…' : 'List my Adda'}
            <span className="material-symbols-outlined text-lg">storefront</span>
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
