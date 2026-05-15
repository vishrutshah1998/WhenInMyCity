'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const E = [0.22, 1, 0.36, 1] as const

type OnboardingRole = 'creator' | 'business' | 'exploring'

const TILES: {
  role: OnboardingRole
  emoji: string
  label: string
  description: string
  accent: string
  tip: string
}[] = [
  {
    role:        'creator',
    emoji:       '🎬',
    label:       'CREATOR',
    description: 'I make stuff — music, art, events, content.',
    accent:      '#E8705A',
    tip:         "Nice. Let's find your scene. 🔥",
  },
  {
    role:        'business',
    emoji:       '🏢',
    label:       'BUSINESS',
    description: 'I run a brand, café, studio, or shop.',
    accent:      '#60A5FA',
    tip:         "Got it. Let's set up your space.",
  },
  {
    role:        'exploring',
    emoji:       '✨',
    label:       'JUST EXPLORING',
    description: "I'm here to discover what's happening.",
    accent:      '#34D399',
    tip:         "Cool. You'll see what's on in your city.",
  },
]

// Current time formatted as HH:MM AM/PM
function getTimeStr() {
  const d = new Date()
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`
}

export default function Screen2Page() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null)
  const [timeStr] = useState(getTimeStr)

  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as { displayName?: string } | null
      if (!s1?.displayName) router.replace('/onboarding/screen-1')
    } catch { /* ignore */ }
  }, [router])

  function handleTileSelect(role: OnboardingRole) {
    if (selectedRole) return
    setSelectedRole(role)
    setTimeout(() => {
      sessionStorage.setItem('wimc_role', role)
      sessionStorage.setItem('wimc_persona', role)
      router.push('/onboarding/screen-3')
    }, 500)
  }

  const selectedTile = TILES.find(t => t.role === selectedRole)

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
        {/* Chat bubble with icon + timestamp */}
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
              background: 'rgba(232,112,90,0.12)',
              border: '1px solid rgba(232,112,90,0.25)',
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
              You&apos;re here as a…
            </p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#5C5A72', margin: '6px 0 0', letterSpacing: '0.08em' }}>
              {timeStr}
            </p>
          </div>
        </motion.div>

        {/* Role tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TILES.map((tile, i) => {
            const isSelected = selectedRole === tile.role
            const isDisabled = selectedRole !== null && !isSelected

            return (
              <motion.button
                key={tile.role}
                type="button"
                onClick={() => handleTileSelect(tile.role)}
                disabled={!!selectedRole}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: isDisabled ? 0.3 : 1, y: 0 }}
                transition={{ duration: 0.4, ease: E, delay: 0.06 * i }}
                whileTap={{ scale: isSelected ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  height: 76,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '0 18px',
                  background: isSelected ? `${tile.accent}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? tile.accent : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 0,
                  cursor: selectedRole ? 'default' : 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'background 0.18s ease, border-color 0.18s ease',
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{tile.emoji}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontSize: 14,
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      color: isSelected ? tile.accent : '#F0EFF8',
                      transition: 'color 0.18s ease',
                      lineHeight: 1.2,
                    }}
                  >
                    {tile.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 13,
                      color: '#5C5A72',
                      marginTop: 3,
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tile.description}
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{
                      position: 'absolute',
                      top: 10, right: 12,
                      width: 20, height: 20,
                      borderRadius: '50%',
                      background: tile.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Reactive tip */}
        <AnimatePresence>
          {selectedTile && (
            <motion.p
              key={selectedTile.role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: E, delay: 0.2 }}
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 14,
                color: selectedTile.accent,
                margin: 0,
                paddingLeft: 4,
                lineHeight: 1.5,
              }}
            >
              {selectedTile.tip}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
