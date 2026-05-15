'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CREATOR_CATEGORIES, EXPLORING_OPTION } from '@/lib/constants/categories'
import { generateUsernameFromName, saveOnboardingScreen } from '@/app/actions/onboarding'
import type { Screen1Data } from '@/types/onboarding'

const E = [0.22, 1, 0.36, 1] as const
const ACCENT = '#E8705A'

// ---------------------------------------------------------------------------
// Short display labels for each category
// ---------------------------------------------------------------------------

const SHORT_LABELS: Record<string, string> = {
  music:                  'Music',
  comedy_theatre:         'Comedy',
  art_design:             'Art',
  video_content:          'Video',
  teaching_coaching:      'Education',
  lifestyle_wellness:     'Lifestyle',
  business_brand:         'Business',
  professional_portfolio: 'Portfolio',
  community_impact:       'Community',
  exploring:              'Explore',
}

// ---------------------------------------------------------------------------
// Tile data
// ---------------------------------------------------------------------------

type CategoryTile = { id: string; label: string; emoji: string }

const ALL_TILES: CategoryTile[] = [
  ...CREATOR_CATEGORIES.map(c => ({
    id:    c.id,
    label: SHORT_LABELS[c.id] ?? c.label,
    emoji: c.emoji,
  })),
  {
    id:    EXPLORING_OPTION.id,
    label: SHORT_LABELS[EXPLORING_OPTION.id] ?? EXPLORING_OPTION.label,
    emoji: EXPLORING_OPTION.emoji,
  },
]

// Chat bubble text by role
const BUBBLE_TEXT: Record<string, string> = {
  creator:   'Pick your lane.',
  business:  'What kind of business?',
  exploring: "What's your scene?",
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Screen3Page() {
  const router = useRouter()
  const [role, setRole] = useState('creator')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as { displayName?: string } | null
      if (!s1?.displayName) { router.replace('/onboarding/screen-1'); return }
      const savedRole = sessionStorage.getItem('wimc_role')
      if (!savedRole) { router.replace('/onboarding/screen-2'); return }
      setRole(savedRole)
    } catch { /* ignore */ }
  }, [router])

  function handleTileSelect(catId: string) {
    if (selectedId) return
    setSelectedId(catId)

    startTransition(async () => {
      await new Promise<void>(r => setTimeout(r, 400))

      let s1: { displayName?: string; username?: string } | null = null
      try { s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') } catch { /* ignore */ }

      const displayName   = s1?.displayName ?? ''
      const existingUsername = s1?.username ?? ''
      const finalUsername = existingUsername || await generateUsernameFromName(displayName)

      await saveOnboardingScreen(1, {
        displayName,
        username:    finalUsername,
        creatorType: catId as Screen1Data['creatorType'],
      })

      sessionStorage.setItem(
        'wimc_s1',
        JSON.stringify({ displayName, username: finalUsername, creatorType: catId }),
      )

      router.push('/onboarding/screen-4')
    })
  }

  const bubbleText = BUBBLE_TEXT[role] ?? 'Pick your lane.'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Chat bubble */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: `${ACCENT}14`,
              border: `1px solid ${ACCENT}28`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18,
            }}
          >
            🎟️
          </div>
          <div
            style={{
              flex: 1,
              background: '#0D0D12',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700, color: '#F0EFF8', margin: 0, lineHeight: 1.4 }}>
              {bubbleText}
            </p>
          </div>
        </motion.div>

        {/* Category grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E, delay: 0.08 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {ALL_TILES.map((cat, i) => {
            const isSelected = selectedId === cat.id
            const isDisabled = selectedId !== null && !isSelected
            const isLastOdd  = i === ALL_TILES.length - 1 && ALL_TILES.length % 3 !== 0

            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => handleTileSelect(cat.id)}
                disabled={!!selectedId}
                whileTap={{ scale: isSelected ? 1 : 0.96 }}
                style={{
                  gridColumn:     isLastOdd ? 'span 2' : 'span 1',
                  height:         88,
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            6,
                  padding:        '0 8px',
                  background:     isSelected ? `${ACCENT}14` : '#0D0D12',
                  border:         `1px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                  borderRadius:   0,
                  cursor:         selectedId ? 'default' : 'pointer',
                  opacity:        isDisabled ? 0.3 : 1,
                  position:       'relative',
                  transition:     'background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease',
                }}
              >
                {/* Checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{
                      position:   'absolute',
                      top: 6, right: 6,
                      width: 16, height: 16,
                      borderRadius: '50%',
                      background: ACCENT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}

                <span style={{ fontSize: 24, lineHeight: 1 }}>{cat.emoji}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize:   12,
                    fontWeight: 700,
                    color:      isSelected ? ACCENT : 'rgba(255,255,255,0.7)',
                    textAlign:  'center',
                    lineHeight: 1.3,
                    transition: 'color 0.18s ease',
                  }}
                >
                  {cat.label}
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
