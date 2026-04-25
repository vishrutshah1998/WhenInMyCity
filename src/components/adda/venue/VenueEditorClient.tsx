'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { AddaProfile } from '@/types/database'
import type { VenueFormState, PhotoItem, PricingRule, IncludedItem } from './types'
import { saveVenueDetails } from '@/app/actions/adda-venue'
import PhotoManagerSection from './PhotoManagerSection'
import SpaceDetailsSection from './SpaceDetailsSection'
import AmenitiesSection from './AmenitiesSection'
import PricingRulesSection from './PricingRulesSection'
import HouseRulesSection from './HouseRulesSection'
import VenuePreviewPanel from './VenuePreviewPanel'

// ─── Defaults ─────────────────────────────────────────────────────────────────

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

const DEFAULT_INCLUDED_ITEMS: IncludedItem[] = [
  { id: 'inc-1', name: 'Basic setup & cleanup', included: true },
  { id: 'inc-2', name: 'Wi-Fi access',           included: true },
  { id: 'inc-3', name: 'Parking',                 included: false },
  { id: 'inc-4', name: 'Equipment operator',       included: false },
]

// ─── State initializer ────────────────────────────────────────────────────────

function initState(adda: AddaProfile): VenueFormState {
  const config = (adda.pricing_config ?? {}) as Record<string, unknown>

  const photos: PhotoItem[] = []
  if (adda.cover_image_url) {
    photos.push({
      id: 'cover-0',
      url: adda.cover_image_url,
      alt_text: adda.name,
      is_cover: true,
    })
  }
  ;(adda.gallery_images ?? []).forEach((url, i) => {
    photos.push({
      id: `gallery-${i}`,
      url,
      alt_text: `${adda.name} photo ${i + 1}`,
      is_cover: false,
    })
  })

  return {
    photos,
    name: adda.name,
    adda_type: adda.adda_type ?? [],
    description: adda.description ?? '',
    capacity_min: adda.capacity_min ?? null,
    capacity_max: adda.capacity_max ?? null,
    parking_details:      (config.parking_details      as string)  ?? '',
    accessibility_notes:  (config.accessibility_notes  as string)  ?? '',
    amenities:            adda.amenities                            ?? [],
    pricing_model:        adda.pricing_model,
    pricing_rules:       (config.pricing_rules         as PricingRule[]) ?? DEFAULT_PRICING_RULES,
    house_rules:         (config.house_rules            as string)  ?? '',
    included_items:      (config.included_items         as IncludedItem[]) ?? DEFAULT_INCLUDED_ITEMS,
    cancellation_policy: (config.cancellation_policy   as 'flexible' | 'moderate' | 'strict') ?? 'moderate',
  }
}

// ─── Save status types ────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  adda: AddaProfile
  slug: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VenueEditorClient({ adda, slug }: Props) {
  const [state, setState] = useState<VenueFormState>(() => initState(adda))
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender   = useRef(true)

  // ── Patch helper ───────────────────────────────────────────────────────────

  function patch<K extends keyof VenueFormState>(key: K, value: VenueFormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  // ── Autosave debounce ──────────────────────────────────────────────────────

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
        const result = await saveVenueDetails(adda.id, state)
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
    }, 1000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [state, isDirty]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save status label ──────────────────────────────────────────────────────

  function SaveIndicator() {
    if (saveStatus === 'idle' && !isDirty) return null

    if (saveStatus === 'saving' || isDirty) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--adda-amber)',
            animation: 'pulse 1.2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 11, color: 'var(--adda-amber)',
            fontFamily: 'var(--font-inter), sans-serif',
          }}>
            Saving…
          </span>
        </div>
      )
    }

    if (saveStatus === 'saved') {
      return (
        <span style={{
          fontSize: 11, color: 'var(--adda-success)',
          fontFamily: 'var(--font-inter), sans-serif',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
          {savedAt
            ? `Saved ${savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            : 'All changes saved'}
        </span>
      )
    }

    if (saveStatus === 'error') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, color: '#ef4444',
            fontFamily: 'var(--font-inter), sans-serif',
          }}>
            Couldn&apos;t save
          </span>
          <button
            onClick={async () => {
              setSaveStatus('saving')
              try {
                const result = await saveVenueDetails(adda.id, state)
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
            }}
            style={{
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: 10, fontWeight: 700,
              fontFamily: 'var(--font-inter), sans-serif',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    return null
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ── Sticky topbar ───────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 56,
        background: 'rgba(10, 10, 10, 0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--adda-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', gap: 16,
      }}>
        {/* Left: heading */}
        <h1 style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 700, fontSize: 15,
          color: 'var(--adda-text-primary)', margin: 0,
          flexShrink: 0,
        }}>
          My Venue
        </h1>

        {/* Centre: edit toggle + save indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
          {/* Edit / Done toggle */}
          <button
            onClick={() => setIsEditing(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              background: isEditing ? 'var(--adda-amber)' : 'var(--adda-bg-elevated)',
              border: isEditing ? 'none' : '1px solid var(--adda-border-default)',
              color: isEditing ? '#000' : 'var(--adda-text-secondary)',
              fontWeight: 600, fontSize: 12,
              fontFamily: 'var(--font-inter), sans-serif',
              cursor: 'pointer', transition: 'all 160ms ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {isEditing ? 'check' : 'edit'}
            </span>
            {isEditing ? 'Done Editing' : 'Edit'}
          </button>

          {/* Autosave indicator */}
          <AnimatePresence mode="wait">
            <motion.div
              key={saveStatus + String(isDirty)}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SaveIndicator />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: preview link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <Link
            href={`/adda/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12.5, fontWeight: 600,
              color: 'var(--adda-amber)', textDecoration: 'none',
              fontFamily: 'var(--font-inter), sans-serif',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
          >
            Preview as creator
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          </Link>
        </div>
      </header>

      {/* ── Body: editor + preview ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 'calc(100vh - 56px)' }}>

        {/* ── Editor column (60%) ────────────────────────────────────────────── */}
        <div style={{
          flex: '0 0 60%',
          padding: '28px 32px 80px',
          borderRight: '1px solid var(--adda-border-subtle)',
          maxWidth: '60%',
          boxSizing: 'border-box',
        }}>
          {/* Editing mode banner */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  marginBottom: 20,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(245,166,35,0.08)',
                  border: '1px solid rgba(245,166,35,0.2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, color: 'var(--adda-amber)',
                  fontFamily: 'var(--font-inter), sans-serif',
                  overflow: 'hidden',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit_note</span>
                You&apos;re editing. Changes save automatically. The preview updates in real time.
              </motion.div>
            )}
          </AnimatePresence>

          <PhotoManagerSection
            photos={state.photos}
            onChange={v => patch('photos', v)}
            isEditing={isEditing}
          />

          <SpaceDetailsSection
            state={{
              name:                 state.name,
              adda_type:            state.adda_type,
              description:          state.description,
              capacity_min:         state.capacity_min,
              capacity_max:         state.capacity_max,
              parking_details:      state.parking_details,
              accessibility_notes:  state.accessibility_notes,
            }}
            onChange={(key, value) => patch(key, value as never)}
            isEditing={isEditing}
          />

          <AmenitiesSection
            amenities={state.amenities}
            onChange={v => patch('amenities', v)}
            isEditing={isEditing}
          />

          <PricingRulesSection
            pricingRules={state.pricing_rules}
            pricingModel={state.pricing_model}
            onChange={v => patch('pricing_rules', v)}
            isEditing={isEditing}
          />

          <HouseRulesSection
            houseRules={state.house_rules}
            includedItems={state.included_items}
            cancellationPolicy={state.cancellation_policy}
            onChangeRules={v => patch('house_rules', v)}
            onChangeItems={v => patch('included_items', v)}
            onChangePolicy={v => patch('cancellation_policy', v)}
            isEditing={isEditing}
          />
        </div>

        {/* ── Preview column (40%) ───────────────────────────────────────────── */}
        <div style={{
          flex: '0 0 40%',
          padding: '28px 24px',
          boxSizing: 'border-box',
        }}>
          <div style={{ position: 'sticky', top: 56 + 16 }}>
            <VenuePreviewPanel state={state} />
          </div>
        </div>

      </div>
    </>
  )
}
