'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAddaOnboardingStep } from '@/app/actions/adda-onboarding'

const AMENITIES: { id: string; label: string; icon: string }[] = [
  { id: 'projector',      label: 'Projector',       icon: 'connected_tv' },
  { id: 'pa_system',      label: 'PA System',       icon: 'speaker' },
  { id: 'natural_light',  label: 'Natural Light',   icon: 'wb_sunny' },
  { id: 'parking',        label: 'Parking',         icon: 'local_parking' },
  { id: 'accessible',     label: 'Accessible',      icon: 'accessible' },
  { id: 'wifi',           label: 'Wi-Fi',           icon: 'wifi' },
  { id: 'whiteboard',     label: 'Whiteboard',      icon: 'edit_square' },
  { id: 'kitchen',        label: 'Kitchen',         icon: 'kitchen' },
  { id: 'outdoor_space',  label: 'Outdoor Space',   icon: 'deck' },
  { id: 'ac',             label: 'Air Conditioning', icon: 'ac_unit' },
]

type PricingModel = 'fixed_rental' | 'door_split' | 'hybrid' | 'f_and_b_minimum'

const PRICING_MODELS: { id: PricingModel; label: string; desc: string }[] = [
  { id: 'fixed_rental',     label: 'Fixed Rental',        desc: 'Flat fee per day or session — predictable for both parties.' },
  { id: 'door_split',       label: 'Door Split',          desc: 'You share a % of ticket revenue — no upfront charge to the creator.' },
  { id: 'hybrid',           label: 'Hybrid',              desc: 'Smaller base rent + a smaller revenue share.' },
  { id: 'f_and_b_minimum',  label: 'F&B Minimum',         desc: 'No rental — the creator just guarantees a food/beverage spend.' },
]

export default function AddaStep3Page() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [pricingModel, setPricingModel] = useState<PricingModel | ''>('')

  // Pricing config fields (shown conditionally)
  const [fixedRentalRs, setFixedRentalRs] = useState('')
  const [doorSplitPct, setDoorSplitPct] = useState('')
  const [hybridRentalRs, setHybridRentalRs] = useState('')
  const [hybridSplitPct, setHybridSplitPct] = useState('')
  const [fAndBMinRs, setFAndBMinRs] = useState('')

  function toggleAmenity(id: string) {
    setSelectedAmenities((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id])
  }

  function handleContinue() {
    setError(null)
    if (!pricingModel) { setError('Please select a pricing model.'); return }

    const config: Record<string, number> = {}
    if (pricingModel === 'fixed_rental') {
      if (!fixedRentalRs) { setError('Please enter the rental amount.'); return }
      config.fixed_rental_paise = Math.round(parseFloat(fixedRentalRs) * 100)
    } else if (pricingModel === 'door_split') {
      if (!doorSplitPct) { setError('Please enter the revenue split percentage.'); return }
      config.door_split_percent = parseFloat(doorSplitPct)
    } else if (pricingModel === 'hybrid') {
      if (!hybridRentalRs || !hybridSplitPct) { setError('Please fill in both hybrid fields.'); return }
      config.hybrid_rental_paise  = Math.round(parseFloat(hybridRentalRs) * 100)
      config.hybrid_split_percent = parseFloat(hybridSplitPct)
    } else if (pricingModel === 'f_and_b_minimum') {
      if (!fAndBMinRs) { setError('Please enter the F&B minimum spend.'); return }
      config.f_and_b_minimum_paise = Math.round(parseFloat(fAndBMinRs) * 100)
    }

    startTransition(async () => {
      const result = await saveAddaOnboardingStep(3, {
        step: 3,
        amenities: selectedAmenities as never[],
        pricing_model: pricingModel,
        pricing_config: config,
      })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('adda_step3', JSON.stringify({ amenities: selectedAmenities, pricing_model: pricingModel, pricing_config: config }))
      router.push('/adda/onboarding/step-4')
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
          <div className="h-full bg-primary rounded-full" style={{ width: '75%' }} />
        </div>
        <p className="mt-2 text-xs text-on-surface-variant font-medium font-label">Step 3 of 4 — Amenities &amp; pricing</p>
      </div>

      <main className="flex-1 px-6 pt-8 pb-36 max-w-2xl mx-auto w-full space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Amenities &amp; pricing</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">Creators filter venues by amenities — the more complete, the better.</p>
        </div>

        {/* Amenities */}
        <div className="space-y-4">
          <h2 className="font-headline font-bold text-on-surface">Amenities <span className="font-normal text-on-surface-variant text-sm">(optional)</span></h2>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(({ id, label, icon }) => {
              const selected = selectedAmenities.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleAmenity(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold font-label transition-all active:scale-95 border ${
                    selected
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-surface-container-low border-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{icon}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Pricing model */}
        <div className="space-y-4">
          <h2 className="font-headline font-bold text-on-surface">Pricing model <span className="text-error">*</span></h2>
          <div className="space-y-3">
            {PRICING_MODELS.map(({ id, label, desc }) => {
              const selected = pricingModel === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPricingModel(id)}
                  className={`w-full text-left p-4 rounded-xl transition-all border-2 active:scale-[0.99] ${
                    selected
                      ? 'bg-surface-container-high border-primary'
                      : 'bg-surface-container-low border-transparent hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? 'bg-primary border-primary' : 'border-on-surface-variant'}`} />
                    <div>
                      <div className="font-headline font-bold text-on-surface text-sm">{label}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{desc}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Pricing config — shown conditionally */}
        {pricingModel === 'fixed_rental' && (
          <div className="space-y-2">
            <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Rental amount (₹) <span className="text-error">*</span></label>
            <input type="number" placeholder="e.g. 5000" value={fixedRentalRs} onChange={(e) => setFixedRentalRs(e.target.value)} min={0}
              className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none" />
            <p className="text-xs text-on-surface-variant/60 px-1">Per session or per day — clarify in your description.</p>
          </div>
        )}
        {pricingModel === 'door_split' && (
          <div className="space-y-2">
            <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Your share of ticket revenue (%) <span className="text-error">*</span></label>
            <input type="number" placeholder="e.g. 20" value={doorSplitPct} onChange={(e) => setDoorSplitPct(e.target.value)} min={0} max={100}
              className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none" />
          </div>
        )}
        {pricingModel === 'hybrid' && (
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="font-label text-xs font-semibold text-on-surface-variant px-1">Base rent (₹) <span className="text-error">*</span></label>
              <input type="number" placeholder="e.g. 2000" value={hybridRentalRs} onChange={(e) => setHybridRentalRs(e.target.value)} min={0}
                className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none" />
            </div>
            <div className="flex-1 space-y-2">
              <label className="font-label text-xs font-semibold text-on-surface-variant px-1">Revenue share (%) <span className="text-error">*</span></label>
              <input type="number" placeholder="e.g. 10" value={hybridSplitPct} onChange={(e) => setHybridSplitPct(e.target.value)} min={0} max={100}
                className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none" />
            </div>
          </div>
        )}
        {pricingModel === 'f_and_b_minimum' && (
          <div className="space-y-2">
            <label className="font-label text-sm font-semibold text-on-surface-variant px-1">Minimum F&amp;B spend (₹) <span className="text-error">*</span></label>
            <input type="number" placeholder="e.g. 10000" value={fAndBMinRs} onChange={(e) => setFAndBMinRs(e.target.value)} min={0}
              className="w-full px-5 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none" />
          </div>
        )}

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
