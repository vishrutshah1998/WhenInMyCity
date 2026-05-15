'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getCategoryConfig, getCategoryColors } from '@/lib/constants/categories'
import type { CreatorType } from '@/types/database'

const E = [0.22, 1, 0.36, 1] as const
const NOT_DOING_EVENTS_ID = 'not_doing_events_yet'

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Screen5Page() {
  const router = useRouter()
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null)
  const [categoryLabel, setCategoryLabel] = useState('creator')
  const [cityLabel, setCityLabel] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    try {
      const city = sessionStorage.getItem('wimc_city')
        || JSON.parse(sessionStorage.getItem('wimc_s2') || '{}')?.city
      if (!city) { router.replace('/onboarding/screen-4'); return }
      setCityLabel(city.toUpperCase())

      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as
        { creatorType?: string; displayName?: string } | null
      const ct = s1?.creatorType as CreatorType | undefined

      if (!ct || ct === 'exploring') {
        router.replace('/onboarding/screen-6')
        return
      }

      const config = getCategoryConfig(ct)
      if (!config || !config.subTypes || config.subTypes.length === 0) {
        router.replace('/onboarding/screen-6')
        return
      }

      setCreatorType(ct)
      setCategoryLabel(config.label)
      setDisplayName(s1?.displayName ?? '')

      const role = sessionStorage.getItem('wimc_role') ?? ''
      setRoleLabel(role === 'creator' ? 'CREATOR' : role === 'business' ? 'BUSINESS' : 'EXPLORER')
    } catch {
      router.replace('/onboarding/screen-6')
    }
  }, [router])

  if (!creatorType) return null

  const config = getCategoryConfig(creatorType)!
  const colors = getCategoryColors(creatorType)
  const accent = colors.primary

  // All subtypes except the "not_yet" catch-all
  const subTypeTiles = config.subTypes
    .filter(s => s.id !== 'not_yet')
    .map(s => ({
      id:    s.id,
      label: s.label.toUpperCase(),
    }))

  const MAX = 3

  function handleSelect(id: string) {
    if (id === NOT_DOING_EVENTS_ID) {
      setSelected(prev => prev.includes(id) ? [] : [id])
      return
    }
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.includes(NOT_DOING_EVENTS_ID)) return [id]
      if (prev.length >= MAX) return prev
      return [...prev, id]
    })
  }

  function handleContinue() {
    if (selected.length === 0) return
    startTransition(async () => {
      sessionStorage.setItem('wimc_subtypes', JSON.stringify(selected))
      try {
        const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || '{}')
        sessionStorage.setItem('wimc_s2', JSON.stringify({ ...s2, subtypes: selected }))
      } catch { /* ignore */ }
      router.push('/onboarding/screen-6')
    })
  }

  const pickedCount = selected.includes(NOT_DOING_EVENTS_ID) ? 0 : selected.length

  // Short category name for the pass
  const catShort = categoryLabel.split(' ')[0].toUpperCase()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar: back + step */}
      <div
        style={{
          flexShrink: 0,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${accent}18`,
          background: `${accent}06`,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, fontWeight: 700,
            color: `${accent}88`,
            letterSpacing: '0.1em',
          }}
        >
          ← BACK
        </button>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.2em',
            color: `${accent}70`,
          }}
        >
          STEP 5 / 9
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Embedded boarding pass */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E }}
            style={{
              background: '#09090E',
              border: `1px solid ${accent}22`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Left accent bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent, opacity: 0.7 }} />

            <div style={{ padding: '12px 16px 12px 20px' }}>
              {/* Passenger (large) */}
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accent}60`, display: 'block', marginBottom: 3 }}>
                  PASSENGER
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontSize: 22,
                    fontWeight: 900,
                    color: '#F0EFF8',
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    display: 'block',
                  }}
                >
                  {displayName.toUpperCase() || 'YOUR NAME'}
                </span>
              </div>

              {/* Fields row */}
              <div style={{ display: 'flex', gap: 16, borderTop: `1px solid ${accent}14`, paddingTop: 10 }}>
                {[
                  { label: 'DEST',  value: cityLabel },
                  { label: 'ROLE',  value: roleLabel },
                  { label: 'CAT',   value: catShort },
                  { label: 'VIBE',  value: '——' },
                ].map(f => (
                  <div key={f.label}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accent}55`, display: 'block', marginBottom: 2 }}>
                      {f.label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 700, color: f.value === '——' ? '#3C3A52' : '#F0EFF8', lineHeight: 1 }}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Chat bubble */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.06 }}
            style={{
              background: '#0D0D12',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700, color: '#F0EFF8', margin: 0, lineHeight: 1.4 }}>
              What kind of {categoryLabel} are you into?
            </p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#5C5A72', margin: '6px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              WIMC SYSTEM
            </p>
          </motion.div>

          {/* Header row: SELECT VIBES + counter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: E, delay: 0.1 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
              SELECT VIBES
            </span>
            {pickedCount > 0 && (
              <motion.span
                key={pickedCount}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: accent }}
              >
                {pickedCount} OF {MAX} PICKED
              </motion.span>
            )}
          </motion.div>

          {/* All subtypes as flex-wrap tags */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.12 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            {subTypeTiles.map((tile, i) => {
              const isSel     = selected.includes(tile.id)
              const isDisabled = !isSel && pickedCount >= MAX && !selected.includes(NOT_DOING_EVENTS_ID)

              return (
                <motion.button
                  key={tile.id}
                  type="button"
                  onClick={() => !isDisabled && handleSelect(tile.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: isDisabled ? 0.35 : 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: E, delay: 0.04 * i }}
                  whileTap={{ scale: isSel ? 1 : 0.95 }}
                  style={{
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: isSel ? `${accent}18` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSel ? accent : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: 0,
                    cursor: isDisabled ? 'default' : 'pointer',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: isSel ? accent : 'rgba(255,255,255,0.65)',
                      transition: 'color 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tile.label}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>

          {/* NOT DOING EVENTS YET — centered text link */}
          <button
            type="button"
            onClick={() => handleSelect(NOT_DOING_EVENTS_ID)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: selected.includes(NOT_DOING_EVENTS_ID) ? '#F0EFF8' : 'rgba(255,255,255,0.25)',
                textDecoration: selected.includes(NOT_DOING_EVENTS_ID) ? 'underline' : 'none',
                transition: 'color 0.15s ease',
              }}
            >
              NOT DOING EVENTS YET
            </span>
          </button>
        </div>
      </div>

      {/* Sticky CTA */}
      <footer
        className="ob-cta-footer"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          padding: '14px 24px',
          background: 'rgba(7,7,10,0.92)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <motion.button
            type="button"
            onClick={handleContinue}
            disabled={selected.length === 0}
            whileTap={{ scale: selected.length > 0 ? 0.98 : 1 }}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: selected.length > 0 ? accent : `${accent}44`,
              color: '#07070A',
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: 15,
              borderRadius: 0,
              border: 'none',
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s ease',
            }}
          >
            CONTINUE →
          </motion.button>
        </div>
      </footer>
    </div>
  )
}
