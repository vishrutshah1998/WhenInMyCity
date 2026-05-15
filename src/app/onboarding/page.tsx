'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const E = [0.22, 1, 0.36, 1] as const
const CORAL = '#E8705A'

export default function OnboardingWelcomePage() {
  const router = useRouter()

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0 }}
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: '0.06em',
            color: '#F0EFF8',
            textAlign: 'center',
          }}
        >
          WIMC
        </motion.div>

        {/* Boarding pass card — dark with coral accents */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: -3 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.2 }}
          style={{
            width: 300,
            height: 160,
            background: '#0F0E14',
            border: `1px solid ${CORAL}30`,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)`,
          }}
        >
          {/* Left accent bar */}
          <div
            style={{
              position: 'absolute',
              left: 0, top: 0, bottom: 0,
              width: 3,
              background: CORAL,
              opacity: 0.8,
            }}
          />

          {/* Diagonal stripe overlay */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 10px, transparent 10px, transparent 20px)',
            }}
          />

          {/* Top section */}
          <div style={{ position: 'relative', zIndex: 1, paddingLeft: 8 }}>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: CORAL,
                opacity: 0.8,
              }}
            >
              BOARDING NOW
            </div>
            <div
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: 26,
                fontWeight: 900,
                color: '#F0EFF8',
                letterSpacing: '-0.02em',
                marginTop: 4,
                lineHeight: 1,
              }}
            >
              CULTURE PASS
            </div>
          </div>

          {/* Bottom strip */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              borderTop: `1px dashed ${CORAL}30`,
              paddingTop: 10,
              paddingLeft: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.25em',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              INDIA · 2025
            </span>
            {/* Mini barcode */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, opacity: 0.3 }}>
              {[3, 1, 2, 1, 3, 2, 1, 2, 1, 3].map((w, i) => (
                <div key={i} style={{ width: w * 2, height: 24, background: CORAL, flexShrink: 0 }} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Chat bubble */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: E, delay: 0.6 }}
          style={{
            width: '100%',
            background: '#0D0D12',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 17,
              fontWeight: 600,
              color: '#F0EFF8',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Hey 👋 Let&apos;s make your WIMC pass.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 14,
              color: '#9896B0',
              margin: '6px 0 0',
              lineHeight: 1.5,
            }}
          >
            Takes about 30 seconds.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.9 }}
          style={{ width: '100%' }}
        >
          <button
            type="button"
            onClick={() => router.push('/onboarding/screen-1')}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: CORAL,
              color: '#07070A',
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: 15,
              borderRadius: 0,
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Let&apos;s go →
          </button>
        </motion.div>

        {/* Sign in */}
        <motion.button
          type="button"
          onClick={() => router.push('/signin')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.0 }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            color: '#5C5A72',
            padding: 0,
          }}
        >
          Already have a pass? Sign in
        </motion.button>
      </div>
    </div>
  )
}
