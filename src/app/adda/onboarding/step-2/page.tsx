'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAddaOnboardingStep } from '@/app/actions/adda-onboarding'

const ADDA_TYPES: { id: string; label: string; icon: string }[] = [
  { id: 'cafe',           label: 'Café',            icon: 'coffee' },
  { id: 'coworking',      label: 'Coworking',       icon: 'laptop_mac' },
  { id: 'gallery',        label: 'Gallery',         icon: 'palette' },
  { id: 'community_hall', label: 'Community Hall',  icon: 'groups' },
  { id: 'rooftop',        label: 'Rooftop',         icon: 'roofing' },
  { id: 'garden',         label: 'Garden',          icon: 'park' },
  { id: 'studio',         label: 'Studio',          icon: 'mic' },
  { id: 'library',        label: 'Library',         icon: 'menu_book' },
  { id: 'restaurant',     label: 'Restaurant',      icon: 'restaurant' },
]

type AddaType = 'cafe' | 'coworking' | 'gallery' | 'community_hall' | 'rooftop' | 'garden' | 'studio' | 'library' | 'restaurant'

export default function AddaStep2Page() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [selectedTypes, setSelectedTypes] = useState<AddaType[]>([])
  const [capacityMin, setCapacityMin] = useState('')
  const [capacityMax, setCapacityMax] = useState('')

  function toggleType(id: AddaType) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  function handleContinue() {
    setError(null)
    if (selectedTypes.length === 0) { setError('Please select at least one venue type.'); return }

    const capMin = capacityMin ? parseInt(capacityMin, 10) : undefined
    const capMax = capacityMax ? parseInt(capacityMax, 10) : undefined

    if (capMin !== undefined && capMax !== undefined && capMax < capMin) {
      setError('Maximum capacity must be greater than or equal to minimum capacity.')
      return
    }

    startTransition(async () => {
      const result = await saveAddaOnboardingStep(2, {
        step: 2,
        adda_type: selectedTypes,
        capacity_min: capMin,
        capacity_max: capMax,
        capacity_configurations: [],
      })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('adda_step2', JSON.stringify({ adda_type: selectedTypes, capacity_min: capMin, capacity_max: capMax, capacity_configurations: [] }))
      router.push('/adda/onboarding/step-3')
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
          <div className="h-full bg-primary rounded-full" style={{ width: '50%' }} />
        </div>
        <p className="mt-2 text-xs text-on-surface-variant font-medium font-label">Step 2 of 4 — Venue type &amp; capacity</p>
      </div>

      <main className="flex-1 px-6 pt-8 pb-36 max-w-2xl mx-auto w-full space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">What kind of space is it?</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">Select all types that apply — creators will filter by these.</p>
        </div>

        {/* Venue type grid */}
        <div className="grid grid-cols-3 gap-3">
          {ADDA_TYPES.map(({ id, label, icon }) => {
            const selected = selectedTypes.includes(id as AddaType)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleType(id as AddaType)}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl aspect-square transition-all duration-200 active:scale-95 border-2 ${
                  selected
                    ? 'bg-surface-container-high border-primary text-primary'
                    : 'bg-surface-container-low border-transparent text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                  </div>
                )}
                <span className="material-symbols-outlined text-3xl mb-2">{icon}</span>
                <span className="font-label text-xs font-semibold text-center leading-tight">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Capacity */}
        <div className="space-y-4">
          <h2 className="font-headline font-bold text-on-surface text-lg">Capacity <span className="font-normal text-on-surface-variant text-sm">(optional)</span></h2>
          <p className="text-on-surface-variant text-sm">Helps creators know if your space fits their audience.</p>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="font-label text-xs font-semibold text-on-surface-variant px-1">Minimum</label>
              <input
                type="number"
                placeholder="e.g. 10"
                value={capacityMin}
                onChange={(e) => setCapacityMin(e.target.value)}
                min={1}
                className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="font-label text-xs font-semibold text-on-surface-variant px-1">Maximum</label>
              <input
                type="number"
                placeholder="e.g. 80"
                value={capacityMax}
                onChange={(e) => setCapacityMax(e.target.value)}
                min={1}
                className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              />
            </div>
          </div>
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
