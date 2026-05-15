'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { saveOnboardingScreen } from '@/app/actions/onboarding'

const E = [0.22, 1, 0.36, 1] as const
const TEAL = '#5DD9D0'

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_COLOURS: Record<string, string> = {
  performance:  '#FB923C',
  arts:         '#F472B6',
  education:    '#A78BFA',
  lifestyle:    '#67E8F9',
  food_culture: '#FCD34D',
  outdoors:     '#86EFAC',
  tech:         '#60A5FA',
}

const INTEREST_CATEGORIES = [
  { id: 'performance',  label: '🎭 Performance' },
  { id: 'arts',         label: '🎨 Arts' },
  { id: 'education',    label: '📚 Education' },
  { id: 'lifestyle',    label: '🌿 Lifestyle' },
  { id: 'food_culture', label: '🍽️ Food & Culture' },
  { id: 'outdoors',     label: '⛰️ Outdoors' },
  { id: 'tech',         label: '💡 Tech' },
]

const SHOW_LIMIT = 8

// ---------------------------------------------------------------------------
// Chevron
// ---------------------------------------------------------------------------

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Screen6Page() {
  const router = useRouter()
  const [openCategory, setOpenCategory] = useState<string | null>('performance')

  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as { displayName?: string } | null
      if (!s1?.displayName) { router.replace('/onboarding/screen-1'); return }
      const city = sessionStorage.getItem('wimc_city')
        || JSON.parse(sessionStorage.getItem('wimc_s2') || '{}')?.city
      if (!city) { router.replace('/onboarding/screen-4'); return }
    } catch { /* ignore */ }
  }, [router])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()

  function toggleTag(id: string) {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  function toggleSection(id: string) {
    setOpenCategory(prev => (prev === id ? null : id))
  }

  function toggleExpand(id: string) {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleContinue() {
    startTransition(async () => {
      // Read accumulated s2 data (city, subtypes from earlier screens)
      let s2: { city?: string; subtypes?: string[] } = {}
      try {
        s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || '{}')
      } catch { /* ignore */ }

      const city     = s2.city ?? ''
      const subTypes = s2.subtypes ?? []

      // Persist locally always
      sessionStorage.setItem(
        'wimc_s2',
        JSON.stringify({ ...s2, interestTags: selectedTags }),
      )

      // Call server action only when Zod will accept it (city required, min 3 tags)
      if (city && selectedTags.length >= 3) {
        await saveOnboardingScreen(2, { subTypes, city, interestTags: selectedTags })
      }

      router.push('/onboarding/screen-7')
    })
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Selected tags strip                                                 */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {selectedTags.length > 0 && (
          <motion.div
            key="strip"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 44, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: E }}
            style={{
              flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                height: 44,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {/* Label */}
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEAL,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginRight: 4,
                }}
              >
                My picks [{selectedTags.length}]
              </span>

              {/* Chips */}
              {selectedTags.map(tagId => {
                const tag = INTEREST_TAGS.find(t => t.id === tagId)
                if (!tag) return null
                const colour = CATEGORY_COLOURS[tag.category] ?? TEAL
                return (
                  <motion.button
                    key={tagId}
                    type="button"
                    onClick={() => toggleTag(tagId)}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ duration: 0.15, ease: E }}
                    style={{
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '0 8px 0 9px',
                      background: `${colour}14`,
                      border: `1px solid ${colour}`,
                      borderRadius: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 11,
                        fontWeight: 500,
                        color: colour,
                        lineHeight: 1,
                      }}
                    >
                      {tag.emoji} {tag.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: `${colour}88`,
                        lineHeight: 1,
                        marginLeft: 2,
                      }}
                    >
                      ×
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Scrollable main content                                             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 88 }}>
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 24px 0',
            gap: 20,
          }}
        >
          {/* Chat bubble */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E }}
            style={{
              background: '#0D0D12',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700, color: '#F0EFF8', margin: 0, lineHeight: 1.4 }}>
              Tap the vibes that hit. Skip the rest.
            </p>
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: TEAL, margin: '4px 0 0', lineHeight: 1.5 }}>
              This shapes your discovery feed.
            </p>
          </motion.div>

          {/* Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: E, delay: 0.08 }}
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}
          >
            {INTEREST_CATEGORIES.map((cat, catIdx) => {
              const colour      = CATEGORY_COLOURS[cat.id] ?? TEAL
              const isOpen      = openCategory === cat.id
              const tags        = INTEREST_TAGS.filter(t => t.category === cat.id)
              const isExpanded  = expandedSections[cat.id]
              const visible     = isExpanded ? tags : tags.slice(0, SHOW_LIMIT)
              const hiddenCount = tags.length - SHOW_LIMIT
              const catSelected = selectedTags.filter(id =>
                tags.some(t => t.id === id),
              )

              return (
                <div key={cat.id}>
                  {/* Header row */}
                  <button
                    type="button"
                    onClick={() => toggleSection(cat.id)}
                    style={{
                      width: '100%',
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 16px',
                      background: isOpen ? `${colour}08` : 'transparent',
                      border: 'none',
                      borderBottom: catIdx < INTEREST_CATEGORIES.length - 1 || isOpen
                        ? '1px solid rgba(255,255,255,0.06)'
                        : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#F0EFF8',
                        }}
                      >
                        {cat.label}
                      </span>

                      {/* Count badge */}
                      {catSelected.length > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: colour,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#07070A',
                              lineHeight: 1,
                            }}
                          >
                            {catSelected.length}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    <div
                      style={{
                        color: isOpen ? colour : 'rgba(255,255,255,0.3)',
                        transition: 'color 0.18s ease',
                      }}
                    >
                      <Chevron open={isOpen} />
                    </div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          style={{
                            padding: '12px 16px 16px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            borderBottom: catIdx < INTEREST_CATEGORIES.length - 1
                              ? '1px solid rgba(255,255,255,0.06)'
                              : 'none',
                          }}
                        >
                          {visible.map(tag => {
                            const isSel = selectedTags.includes(tag.id)
                            return (
                              <motion.button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  height: 34,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '0 12px',
                                  background: isSel ? `${colour}14` : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${isSel ? colour : 'rgba(255,255,255,0.08)'}`,
                                  borderRadius: 0,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease, border-color 0.15s ease',
                                }}
                              >
                                <span style={{ fontSize: 14, lineHeight: 1 }}>{tag.emoji}</span>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-dm-sans)',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: isSel ? colour : '#9896B0',
                                    transition: 'color 0.15s ease',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {tag.label}
                                </span>
                              </motion.button>
                            )
                          })}

                          {/* See more / Show less */}
                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(cat.id)}
                              style={{
                                height: 34,
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 12px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: colour,
                                  letterSpacing: '0.06em',
                                }}
                              >
                                {isExpanded ? 'Show less' : `+ ${hiddenCount} more`}
                              </span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky CTA                                                          */}
      {/* ------------------------------------------------------------------ */}
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
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: TEAL,
              color: '#07070A',
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: 15,
              borderRadius: 0,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Continue →
          </motion.button>
        </div>
      </footer>
    </div>
  )
}
