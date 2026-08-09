'use client'

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// BookingConfirmedCelebration
// Brief in-place celebration overlay shown to whichever party (Venue or
// Maker) just completed the accept action that confirms a booking. Sized to
// whatever container it's dropped into (card, drawer) — not a full-viewport
// modal. Auto-dismisses via onDone after `autoDismissMs`, or immediately on
// clicking through.
// ---------------------------------------------------------------------------

interface Props {
  eventTitle: string
  subtitle?: string
  theme: 'dark' | 'light'
  onDone: () => void
  autoDismissMs?: number
}

const CONFETTI_COLORS = ['#E8705A', '#5DD9D0', '#F5A800', '#fafafa']

interface ConfettiSpec {
  angle: number
  distance: number
  size: number
  color: string
  delay: number
  duration: number
  rotate: number
}

function useConfetti(count: number): ConfettiSpec[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (360 / count) * i + (Math.random() * 30 - 15),
        distance: 60 + Math.random() * 50,
        size: 5 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: 0.15 + Math.random() * 0.15,
        duration: 0.6 + Math.random() * 0.3,
        rotate: Math.random() * 320 - 160,
      })),
    [count],
  )
}

const THEME = {
  dark: {
    backdrop: 'rgba(15,23,42,0.88)',
    card: 'var(--venue-bg-elevated)',
    border: 'var(--venue-border-default)',
    title: 'var(--venue-text-primary)',
    subtitle: 'var(--venue-text-secondary)',
    accent: 'var(--venue-success)',
    accentTint: 'rgba(16,185,129,0.14)',
    titleFont: 'var(--font-syne), system-ui, sans-serif',
    bodyFont: 'var(--font-inter), system-ui, sans-serif',
    buttonBg: 'var(--venue-success)',
    buttonText: '#052e22',
  },
  light: {
    backdrop: 'rgba(242,237,227,0.92)',
    card: 'var(--wimc-bg-elevated)',
    border: 'var(--wimc-border-default)',
    title: 'var(--wimc-text-primary)',
    subtitle: 'var(--wimc-text-secondary)',
    accent: 'var(--wimc-success)',
    accentTint: 'rgba(22,163,74,0.12)',
    titleFont: 'var(--font-syne), system-ui, sans-serif',
    bodyFont: 'var(--font-dm-sans), sans-serif',
    buttonBg: 'var(--wimc-success)',
    buttonText: '#ffffff',
  },
} as const

export default function BookingConfirmedCelebration({
  eventTitle,
  subtitle,
  theme,
  onDone,
  autoDismissMs = 2400,
}: Props) {
  const t = THEME[theme]
  const confetti = useConfetti(14)

  useEffect(() => {
    const timer = setTimeout(onDone, autoDismissMs)
    return () => clearTimeout(timer)
  }, [onDone, autoDismissMs])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          background: t.backdrop,
          backdropFilter: 'blur(6px)',
          borderRadius: 'inherit',
          padding: 24,
          textAlign: 'center',
        }}
      >
        {/* Confetti burst, centered behind the badge */}
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          {confetti.map((c, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                x: Math.cos((c.angle * Math.PI) / 180) * c.distance,
                y: Math.sin((c.angle * Math.PI) / 180) * c.distance,
                opacity: 0,
                rotate: c.rotate,
                scale: 0.6,
              }}
              transition={{ duration: c.duration, delay: c.delay, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: -64,
                left: 0,
                width: c.size,
                height: c.size,
                borderRadius: i % 3 === 0 ? '50%' : 2,
                background: c.color,
              }}
            />
          ))}
        </div>

        {/* Checkmark badge */}
        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: [0.7, 1.12, 1] }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: t.accentTint,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <motion.circle
              cx="18" cy="18" r="16"
              stroke={t.accent}
              strokeWidth="2.5"
              pathLength={1}
              initial={{ strokeDashoffset: 1 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ strokeDasharray: 1 }}
            />
            <motion.path
              d="M11 18.5L15.5 23L25 12.5"
              stroke={t.accent}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              pathLength={1}
              initial={{ strokeDashoffset: 1 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.3, delay: 0.35, ease: 'easeOut' }}
              style={{ strokeDasharray: 1 }}
            />
          </svg>
        </motion.div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3, ease: 'easeOut' }}
        >
          <div style={{ fontFamily: t.titleFont, fontWeight: 800, fontSize: 18, color: t.title, marginBottom: 4 }}>
            🎉 Booking Confirmed!
          </div>
          <div style={{ fontFamily: t.bodyFont, fontSize: 13.5, color: t.title, fontWeight: 600, maxWidth: 320 }}>
            {eventTitle}
          </div>
          {subtitle && (
            <div style={{ fontFamily: t.bodyFont, fontSize: 12.5, color: t.subtitle, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.5 }}
          onClick={onDone}
          style={{
            marginTop: 4,
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: t.buttonBg,
            color: t.buttonText,
            fontFamily: t.bodyFont,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Nice!
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}
