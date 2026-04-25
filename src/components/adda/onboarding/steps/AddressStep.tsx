'use client'

import { useState, useRef, useEffect } from 'react'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import usePlacesAutocomplete from 'use-places-autocomplete'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'
import type { OnboardingAnswers } from '@/lib/adda/onboarding/machine'

interface PlaceDetails {
  formattedAddress: string
  lat: number
  lng: number
  city: string
  state: string
  pincode: string
  googlePlaceId: string
  googleName: string
  phone: string
  website: string
  existingRating: number | null
  openingHours: unknown
}

// Narrowest type we need from the autocomplete suggestion objects
interface Suggestion {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

type Phase = 'idle' | 'loadingDetails' | 'confirming'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export default function AddressStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const [phase, setPhase] = useState<Phase>('idle')
  const [details, setDetails] = useState<PlaceDetails | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualStreet, setManualStreet] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualPincode, setManualPincode] = useState('')
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    callbackName: 'initPlacesForAdda',
    requestOptions: { componentRestrictions: { country: 'in' } },
    debounce: 350,
  })

  const suggestions = data as Suggestion[]
  const showDropdown = status === 'OK' && suggestions.length > 0 && phase === 'idle'

  useEffect(() => { setHighlightedIdx(-1) }, [status])

  async function selectSuggestion(placeId: string, description: string) {
    clearSuggestions()
    setValue(description, false)
    setPhase('loadingDetails')

    try {
      const res = await fetch(`/api/adda/places/details?placeId=${encodeURIComponent(placeId)}`)
      if (!res.ok) throw new Error('fetch failed')
      const d = await res.json() as PlaceDetails
      setDetails(d)
      setPhase('confirming')
    } catch {
      setPhase('idle')
    }
  }

  function confirm() {
    if (!details) return
    const extras: Partial<OnboardingAnswers> = {
      lat: details.lat,
      lng: details.lng,
      city: details.city,
      state: details.state,
      pincode: details.pincode,
      googlePlaceId: details.googlePlaceId,
      googleName: details.googleName,
      phone: details.phone || undefined,
      website: details.website || undefined,
      existingRating: details.existingRating ?? undefined,
    }
    handleAnswer('address', details.formattedAddress, details.formattedAddress, extras)
  }

  function searchAgain() {
    setPhase('idle')
    setDetails(null)
    setValue('', false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function submitManual() {
    const street = manualStreet.trim()
    const city = manualCity.trim()
    const pincode = manualPincode.trim()
    if (!street || !city) return
    const addr = [street, city, pincode].filter(Boolean).join(', ')
    handleAnswer('address', addr, addr, {
      city,
      pincode: pincode || undefined,
    })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault()
      const s = suggestions[highlightedIdx]
      if (s) selectSuggestion(s.place_id, s.description)
    } else if (e.key === 'Escape') {
      clearSuggestions()
    }
  }

  const canGoBack = snapshot.can({ type: 'BACK' })
  const manualReady = manualStreet.trim().length > 0 && manualCity.trim().length > 0

  return (
    <>
      {MAPS_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&callback=initPlacesForAdda`}
          strategy="afterInteractive"
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Search input — only when not yet confirming */}
        {phase !== 'confirming' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', maxWidth: '82%', width: '100%' }}>
              <input
                ref={inputRef}
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!ready || phase === 'loadingDetails'}
                placeholder={ready ? 'Start typing your venue address…' : 'Loading…'}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px 4px 14px 14px',
                  background: 'var(--adda-amber-tint)',
                  border: '1px solid var(--adda-amber-border)',
                  color: 'var(--adda-text-primary)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: 18,
                  outline: 'none',
                  caretColor: 'var(--adda-amber)',
                  opacity: phase === 'loadingDetails' ? 0.55 : 1,
                  boxSizing: 'border-box',
                  transition: 'opacity 150ms ease',
                }}
              />

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.ul
                    role="listbox"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: 'var(--adda-bg-elevated)',
                      border: '1px solid var(--adda-border-default)',
                      borderRadius: 12,
                      boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                      padding: '4px 0',
                      listStyle: 'none',
                      margin: 0,
                      zIndex: 50,
                      overflow: 'hidden',
                    }}
                  >
                    {suggestions.map((s, idx) => (
                      <li
                        key={s.place_id}
                        role="option"
                        aria-selected={idx === highlightedIdx}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        onClick={() => selectSuggestion(s.place_id, s.description)}
                        style={{
                          height: 44,
                          padding: '0 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          background: idx === highlightedIdx ? 'var(--adda-bg-hover)' : 'transparent',
                          transition: 'background 80ms ease',
                        }}
                      >
                        <span style={{
                          fontSize: 14,
                          color: 'var(--adda-text-primary)',
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {s.structured_formatting.main_text}
                        </span>
                        <span style={{
                          fontSize: 12,
                          color: 'var(--adda-text-muted)',
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {s.structured_formatting.secondary_text}
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Typing indicator while fetching details */}
        {phase === 'loadingDetails' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              background: 'var(--adda-bg-elevated)',
              border: '1px solid var(--adda-border-subtle)',
              borderRadius: '4px 14px 14px 14px',
              alignSelf: 'flex-start',
            }}
          >
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                style={{
                  display: 'block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--adda-amber)',
                }}
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
            <span style={{
              fontSize: 13,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Let me look that up…
            </span>
          </motion.div>
        )}

        {/* Confirmation bubble with map preview */}
        {phase === 'confirming' && details && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{
              display: 'inline-block',
              maxWidth: '88%',
              padding: '12px 14px',
              borderRadius: '4px 14px 14px 14px',
              background: 'var(--adda-bg-elevated)',
              border: '1px solid var(--adda-border-subtle)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            {/* Static map preview */}
            {MAPS_KEY && (
              <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${details.lat},${details.lng}&zoom=16&size=280x120&markers=color:orange%7C${details.lat},${details.lng}&key=${MAPS_KEY}`}
                  alt="Map preview of selected venue location"
                  width={280}
                  height={120}
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              </div>
            )}

            <p style={{
              fontSize: 14,
              color: 'var(--adda-text-secondary)',
              lineHeight: 1.55,
              marginBottom: 12,
            }}>
              Found it —{' '}
              <strong style={{ color: 'var(--adda-text-primary)' }}>
                {details.formattedAddress}
              </strong>
              . Is this right?
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={confirm}
                style={{
                  padding: '7px 14px',
                  borderRadius: 100,
                  background: 'var(--adda-amber)',
                  color: '#000',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Yes, that's it ✓
              </button>
              <button
                onClick={searchAgain}
                style={{
                  padding: '7px 14px',
                  borderRadius: 100,
                  background: 'transparent',
                  color: 'var(--adda-text-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  border: '1px solid var(--adda-border-default)',
                  cursor: 'pointer',
                }}
              >
                Search again
              </button>
            </div>
          </motion.div>
        )}

        {/* Manual fallback link */}
        {!showManual && phase !== 'confirming' && (
          <button
            onClick={() => setShowManual(true)}
            style={{
              alignSelf: 'flex-start',
              padding: '4px 0',
              background: 'transparent',
              border: 'none',
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(113,113,122,0.4)',
            }}
          >
            Can't find it? Enter address manually
          </button>
        )}

        {/* Manual address form */}
        <AnimatePresence>
          {showManual && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {[
                { placeholder: 'Street address', value: manualStreet, onChange: setManualStreet },
                { placeholder: 'City',           value: manualCity,   onChange: setManualCity   },
                { placeholder: 'Pincode',        value: manualPincode,onChange: setManualPincode },
              ].map(f => (
                <input
                  key={f.placeholder}
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={e => f.onChange(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--adda-bg-elevated)',
                    border: '1px solid var(--adda-border-default)',
                    color: 'var(--adda-text-primary)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              ))}
              <button
                onClick={submitManual}
                disabled={!manualReady}
                style={{
                  alignSelf: 'flex-end',
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: manualReady ? 'var(--adda-amber)' : 'var(--adda-bg-hover)',
                  color: manualReady ? '#000' : 'var(--adda-text-muted)',
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  border: 'none',
                  cursor: manualReady ? 'pointer' : 'default',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
              >
                Use this address →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {canGoBack && phase !== 'confirming' && (
          <button
            onClick={() => send({ type: 'BACK' })}
            style={{
              alignSelf: 'flex-start',
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← Go back
          </button>
        )}
      </div>
    </>
  )
}
