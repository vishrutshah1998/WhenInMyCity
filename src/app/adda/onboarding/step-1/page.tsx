'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAddaOnboardingStep } from '@/app/actions/adda-onboarding'
import { CITIES } from '@/lib/constants/interests'

export default function AddaStep1Page() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [neighbourhood, setNeighbourhood] = useState('')
  const [address, setAddress] = useState('')

  function handleContinue() {
    setError(null)
    if (!name.trim() || name.trim().length < 2) { setError('Venue name must be at least 2 characters.'); return }
    if (!city) { setError('Please select a city.'); return }
    if (!address.trim() || address.trim().length < 5) { setError('Please enter the full address.'); return }

    startTransition(async () => {
      const result = await saveAddaOnboardingStep(1, {
        step: 1,
        name: name.trim(),
        description: description.trim() || undefined,
        city,
        neighbourhood: neighbourhood.trim() || undefined,
        address: address.trim(),
      })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('adda_step1', JSON.stringify({ name: name.trim(), description: description.trim() || undefined, city, neighbourhood: neighbourhood.trim() || undefined, address: address.trim() }))
      router.push('/adda/onboarding/step-2')
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      <header className="w-full flex items-center justify-between px-6 py-4">
        <button onClick={() => router.push('/dashboard')} className="flex items-center text-primary">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="brand-text text-primary text-xl">List your Adda</span>
        <div className="w-6" />
      </header>

      <div className="w-full px-6 pt-2">
        <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '25%' }} />
        </div>
        <p className="mt-2 text-xs text-on-surface-variant font-medium font-label">Step 1 of 4 — Basic info</p>
      </div>

      <main className="flex-1 px-6 pt-8 pb-36 max-w-2xl mx-auto w-full space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Tell us about your venue</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">Creators will use this to discover and book your space.</p>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Venue name <span className="text-error">*</span></label>
          <input
            type="text"
            placeholder="e.g. The Hidden Courtyard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Description <span className="font-normal opacity-50">(optional)</span></label>
          <textarea
            placeholder="What makes your space special? Vibe, history, unique features…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none"
          />
          <p className="text-xs text-on-surface-variant/50 text-right px-1">{description.length}/1000</p>
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">City <span className="text-error">*</span></label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface outline-none"
          >
            <option value="">Select your city</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}, {c.state}</option>
            ))}
          </select>
        </div>

        {/* Neighbourhood */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Neighbourhood <span className="font-normal opacity-50">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Malviya Nagar, Koramangala…"
            value={neighbourhood}
            onChange={(e) => setNeighbourhood(e.target.value)}
            maxLength={100}
            className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Full address <span className="text-error">*</span></label>
          <textarea
            placeholder="Street address, landmark, pincode…"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none"
          />
        </div>

        {error && <p className="text-error text-sm font-medium">{error}</p>}
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={isPending}
            className="w-full py-4 px-6 bg-primary text-on-primary font-headline font-bold rounded-lg shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Continue'}
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
