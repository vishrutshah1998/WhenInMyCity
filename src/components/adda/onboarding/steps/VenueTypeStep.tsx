'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'

const VENUE_OPTIONS = [
  { value: 'studio_gallery',  emoji: '🏛', label: 'Studio / Gallery',    descriptor: 'Photography, art, creative work' },
  { value: 'cafe',            emoji: '☕', label: 'Café / Restaurant',    descriptor: 'Coffee shops, eateries with private areas' },
  { value: 'rooftop_terrace', emoji: '🌇', label: 'Rooftop / Terrace',   descriptor: 'Outdoor or semi-outdoor elevated spaces' },
  { value: 'coworking_office',emoji: '💼', label: 'Co-working / Office', descriptor: 'Meeting rooms, boardrooms, open desks' },
  { value: 'event_hall',      emoji: '🎪', label: 'Event Hall',          descriptor: 'Banquet halls, auditoriums, performance venues' },
  { value: 'other',           emoji: '✨', label: 'Other / Unique',      descriptor: 'Parks, heritage buildings, unusual spaces' },
] as const

export default function VenueTypeStep() {
  const { handleAnswer } = useOnboarding()
  const [selected, setSelected] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  function handleSelect(value: string, label: string) {
    if (locked) return
    setSelected(value)
    setLocked(true)
    setTimeout(() => {
      handleAnswer('venueType', value, label)
    }, 400)
  }

  return (
    <>
      <div className="venue-type-grid">
        {VENUE_OPTIONS.map(opt => (
          <VenueCard
            key={opt.value}
            opt={opt}
            isSelected={selected === opt.value}
            dimmed={locked && selected !== opt.value}
            onSelect={handleSelect}
          />
        ))}
      </div>
      <style>{`
        .venue-type-grid {
          display: grid;
          grid-template-columns: repeat(3, 140px);
          gap: 10px;
        }
        @media (max-width: 640px) {
          .venue-type-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  )
}

function VenueCard({
  opt,
  isSelected,
  dimmed,
  onSelect,
}: {
  opt: typeof VENUE_OPTIONS[number]
  isSelected: boolean
  dimmed: boolean
  onSelect: (value: string, label: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      onClick={() => onSelect(opt.value, opt.label)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={isSelected ? { scale: [1, 0.97, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        width: '100%',
        height: 120,
        borderRadius: 12,
        background: isSelected ? 'var(--adda-amber-tint)' : 'var(--adda-bg-elevated)',
        border: isSelected
          ? '1.5px solid var(--adda-amber)'
          : `1px solid ${hovered ? 'var(--adda-amber-border)' : 'var(--adda-border-default)'}`,
        cursor: dimmed ? 'default' : 'pointer',
        opacity: dimmed ? 0.4 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        padding: '12px 8px',
        position: 'relative',
        transition: 'border 150ms ease, background 150ms ease, opacity 200ms ease',
        outline: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--adda-amber)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <span style={{ fontSize: 9, color: '#000', fontWeight: 800, lineHeight: 1 }}>✓</span>
        </motion.div>
      )}

      <span style={{ fontSize: 30, lineHeight: 1 }}>{opt.emoji}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--adda-text-primary)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {opt.label}
      </span>
      <span style={{
        fontSize: 11,
        color: 'var(--adda-text-muted)',
        textAlign: 'center',
        lineHeight: 1.35,
      }}>
        {opt.descriptor}
      </span>
    </motion.button>
  )
}
