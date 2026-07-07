'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AddaProfile } from '@/types/database'
import type { PricingRule } from '@/components/adda/venue/types'
import PricingRulesSection from '@/components/adda/venue/PricingRulesSection'
import { savePricingSettings } from '@/app/actions/adda-pricing'

// ─── Pricing model definitions ─────────────────────────────────────────────────

const PRICING_MODELS = [
  {
    key: 'fixed_rental',
    label: 'Fixed Rental',
    icon: 'receipt_long',
    description: 'Charge a flat hourly rate. Creators know exactly what they\'ll pay upfront.',
    bestFor: 'Coworking spaces, studios, galleries',
    color: '#5DD9D0',
  },
  {
    key: 'door_split',
    label: 'Door Split',
    icon: 'group',
    description: 'Earn a % of ticket revenue. No upfront cost for creators — lower barrier to book.',
    bestFor: 'Cafés, bars, restaurants with built-in audiences',
    color: '#F5A800',
  },
  {
    key: 'hybrid',
    label: 'Hybrid',
    icon: 'tune',
    description: 'Combine a reduced base hourly rate with a smaller revenue share. Best of both.',
    bestFor: 'Premium venues wanting floor + upside',
    color: '#9B8FFF',
  },
  {
    key: 'f_and_b_minimum',
    label: 'F&B Minimum',
    icon: 'restaurant',
    description: 'No rental fee — creators commit to a minimum food & beverage spend instead.',
    bestFor: 'Restaurants, rooftop bars, brewery taprooms',
    color: '#E8705A',
  },
]

const DEFAULT_PRICING_RULES: PricingRule[] = [
  {
    id: 'rule-std',
    name: 'Standard',
    rate_per_hour_paise: 150000,
    min_hours: 2,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    time_from: '00:00',
    time_to: '23:59',
    active: true,
  },
  {
    id: 'rule-wknd',
    name: 'Weekend Peak',
    rate_per_hour_paise: 200000,
    min_hours: 3,
    days: ['sat', 'sun'],
    time_from: '00:00',
    time_to: '23:59',
    active: true,
  },
]

// ─── Types ─────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  adda: AddaProfile
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PricingClient({ adda }: Props) {
  const config = (adda.pricing_config ?? {}) as Record<string, unknown>
  const initialRules = (config.pricing_rules as PricingRule[] | undefined) ?? DEFAULT_PRICING_RULES

  const [pricingModel, setPricingModel] = useState<string>(adda.pricing_model ?? 'fixed_rental')
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(initialRules)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const isFirstRender = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!isDirty) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('saving')

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await savePricingSettings(adda.id, pricingModel, pricingRules)
        if (result.success) {
          setSaveStatus('saved')
          setSavedAt(new Date())
          setIsDirty(false)
        } else {
          setSaveStatus('error')
        }
      } catch {
        setSaveStatus('error')
      }
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [pricingModel, pricingRules, isDirty]) // eslint-disable-line react-hooks/exhaustive-deps

  function setModel(key: string) {
    setPricingModel(key)
    setIsDirty(true)
  }

  function setRules(rules: PricingRule[]) {
    setPricingRules(rules)
    setIsDirty(true)
  }

  const activeModel = PRICING_MODELS.find(m => m.key === pricingModel) ?? PRICING_MODELS[0]

  return (
    <>
      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 56,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--venue-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', gap: 16,
      }}>
        <h1 style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 700, fontSize: 15,
          color: 'var(--venue-text-primary)', margin: 0,
        }}>
          Pricing
        </h1>

        {/* Save indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={saveStatus + String(isDirty)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {(saveStatus === 'saving' || isDirty) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--venue-amber)', animation: 'pulse 1.2s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--venue-amber)', fontFamily: 'var(--font-inter), sans-serif' }}>Saving…</span>
              </div>
            )}
            {saveStatus === 'saved' && !isDirty && (
              <span style={{ fontSize: 11, color: 'var(--venue-success)', fontFamily: 'var(--font-inter), sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                {savedAt ? `Saved ${savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'All changes saved'}
              </span>
            )}
            {saveStatus === 'error' && (
              <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-inter), sans-serif' }}>Couldn&apos;t save — check connection</span>
            )}
          </motion.div>
        </AnimatePresence>
      </header>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Section: Pricing Model */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--venue-text-primary)', margin: '0 0 4px' }}>
              How do you charge?
            </h2>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: 'var(--venue-text-muted)', margin: 0 }}>
              Your pricing model tells creators how booking this space works. You can change this at any time.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {PRICING_MODELS.map(model => {
              const selected = pricingModel === model.key
              return (
                <button
                  key={model.key}
                  onClick={() => setModel(model.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: 8, padding: '16px 18px', borderRadius: 12, textAlign: 'left',
                    background: selected ? `rgba(${model.color === '#5DD9D0' ? '93,217,208' : model.color === '#F5A800' ? '245,168,0' : model.color === '#9B8FFF' ? '155,143,255' : '232,112,90'},0.10)` : 'var(--venue-bg-elevated)',
                    border: selected ? `1.5px solid ${model.color}` : '1.5px solid var(--venue-border-subtle)',
                    cursor: 'pointer', transition: 'all 160ms ease',
                    position: 'relative',
                  }}
                >
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      width: 18, height: 18, borderRadius: '50%',
                      background: model.color, display: 'grid', placeItems: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#000', fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  )}

                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: selected ? model.color : 'var(--venue-bg-overlay)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: selected ? '#000' : 'var(--venue-text-muted)', fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0" }}>
                      {model.icon}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 14, color: selected ? 'var(--venue-text-primary)' : 'var(--venue-text-secondary)', marginBottom: 4 }}>
                      {model.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: 'var(--venue-text-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                      {model.description}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, background: 'var(--venue-bg-overlay)', border: '1px solid var(--venue-border-subtle)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'var(--venue-text-muted)' }}>lightbulb</span>
                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, color: 'var(--venue-text-muted)' }}>
                        {model.bestFor}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected model explanation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModel.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                marginTop: 14, padding: '12px 16px', borderRadius: 10,
                background: 'var(--venue-bg-elevated)',
                border: '1px solid var(--venue-border-subtle)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: activeModel.color, flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>info</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12.5, color: 'var(--venue-text-secondary)', lineHeight: 1.5 }}>
                {activeModel.key === 'fixed_rental' && 'Creators see your hourly rate and minimum hours before booking. Your earnings are predictable regardless of event attendance.'}
                {activeModel.key === 'door_split' && 'You earn a percentage of ticket revenue after the event. WIMC handles the split automatically from Razorpay payouts.'}
                {activeModel.key === 'hybrid' && 'Creators pay a reduced hourly base + a smaller revenue share. Set your base rate below — the split percentage is agreed per booking.'}
                {activeModel.key === 'f_and_b_minimum' && 'Creators agree to a minimum spend (e.g., ₹15,000 in food & drinks). You waive rental fees in exchange for guaranteed F&B revenue.'}
              </span>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--venue-border-subtle)', marginBottom: 32 }} />

        {/* Section: Hourly Rates (shown for fixed_rental and hybrid) */}
        {(pricingModel === 'fixed_rental' || pricingModel === 'hybrid') && (
          <section style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--venue-text-primary)', margin: '0 0 4px' }}>
                Hourly rates & rules
              </h2>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: 'var(--venue-text-muted)', margin: 0 }}>
                Set different rates for weekdays, weekends, or peak hours. The interactive preview below shows exactly what a creator would pay.
              </p>
            </div>
            <PricingRulesSection
              pricingRules={pricingRules}
              pricingModel={pricingModel}
              onChange={setRules}
              isEditing={true}
            />
          </section>
        )}

        {/* F&B model: show minimum spend note instead of rules */}
        {pricingModel === 'f_and_b_minimum' && (
          <section>
            <div style={{
              padding: '20px 24px', borderRadius: 12,
              background: 'var(--venue-bg-elevated)',
              border: '1px solid var(--venue-border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#E8705A', fontVariationSettings: "'FILL' 1" }}>restaurant</span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--venue-text-primary)' }}>
                  F&B minimum is agreed per booking
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: 'var(--venue-text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
                When a creator submits a booking proposal, they&apos;ll see your F&B minimum requirement and can counter-offer. Set the minimum in your booking response or counter-offer.
              </p>
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(232,112,90,0.08)',
                border: '1px solid rgba(232,112,90,0.2)',
                fontSize: 12, color: 'rgba(232,112,90,0.9)',
                fontFamily: 'var(--font-inter), sans-serif',
              }}>
                Tip: mention your typical F&B minimum (e.g., &quot;₹12,000 minimum&quot;) in your venue description so creators can plan ahead.
              </div>
            </div>
          </section>
        )}

        {/* Door split: show note */}
        {pricingModel === 'door_split' && (
          <section>
            <div style={{
              padding: '20px 24px', borderRadius: 12,
              background: 'var(--venue-bg-elevated)',
              border: '1px solid var(--venue-border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#F5A800', fontVariationSettings: "'FILL' 1" }}>group</span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--venue-text-primary)' }}>
                  Revenue split negotiated per booking
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: 'var(--venue-text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
                You&apos;ll propose your take (e.g., 30% of ticket revenue) when accepting or counter-offering a booking. WIMC handles the split automatically at payout.
              </p>
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(245,168,0,0.08)',
                border: '1px solid rgba(245,168,0,0.2)',
                fontSize: 12, color: 'rgba(245,168,0,0.9)',
                fontFamily: 'var(--font-inter), sans-serif',
              }}>
                Most venues using door split take 20–35%. Mention your typical split in your venue description to attract creators.
              </div>
            </div>
          </section>
        )}

      </div>
    </>
  )
}
