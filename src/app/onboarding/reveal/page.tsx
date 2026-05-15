'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { completeOnboarding } from '@/app/actions/onboarding'
import { INTEREST_TAGS } from '@/lib/constants/interests'

const E = [0.22, 1, 0.36, 1] as const
const LAVENDER = '#9B8FFF'

// ---------------------------------------------------------------------------
// Session data reader
// ---------------------------------------------------------------------------

interface PassData {
  displayName: string
  username:    string
  city:        string
  creatorType: string
  subTypes:    string[]
  interestTags: string[]
}

function readPassData(): PassData {
  try {
    const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as
      { displayName?: string; username?: string; creatorType?: string } | null
    const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || '{}') as
      { city?: string; subtypes?: string[]; interestTags?: string[] }

    return {
      displayName:  s1?.displayName ?? '',
      username:     s1?.username ?? '',
      city:         s2.city ?? sessionStorage.getItem('wimc_city') ?? '',
      creatorType:  s1?.creatorType ?? '',
      subTypes:     JSON.parse(sessionStorage.getItem('wimc_subtypes') || '[]'),
      interestTags: s2.interestTags ?? [],
    }
  } catch {
    return { displayName: '', username: '', city: '', creatorType: '', subTypes: [], interestTags: [] }
  }
}

// ---------------------------------------------------------------------------
// Boarding pass card
// ---------------------------------------------------------------------------

function BoardingPassCard({ data }: { data: PassData }) {
  const vibeText = data.subTypes.length > 0
    ? data.subTypes.slice(0, 2).join(' · ').toUpperCase()
    : 'CULTURE'
  const dateStr = new Date().toLocaleDateString('en-IN')
  const categoryLabel = data.creatorType.replace(/_/g, ' ').toUpperCase()
  const cityLabel = data.city.toUpperCase() || 'YOUR CITY'

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.2 }}
      style={{
        width: '100%',
        maxWidth: 420,
        background: '#09090E',
        border: `1px solid ${LAVENDER}28`,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: LAVENDER, opacity: 0.6 }} />

      {/* "WIMC PASS REVEAL" vertical text on right */}
      <div
        style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: `1px solid ${LAVENDER}15`,
          background: `${LAVENDER}05`,
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 6,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: `${LAVENDER}50`,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          WIMC PASS REVEAL
        </span>
      </div>

      {/* Top chrome strip */}
      <div
        style={{
          height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px 0 16px',
          background: `linear-gradient(90deg, ${LAVENDER}12 0%, transparent 60%)`,
          borderBottom: `1px solid ${LAVENDER}18`,
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
          WHEN IN MY CITY
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${LAVENDER}70` }}>
            CULTURE PASS
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', color: `${LAVENDER}45` }}>
            WIMC-001
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ paddingTop: 12, paddingLeft: 16, paddingRight: 28, paddingBottom: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* PASSENGER */}
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: `${LAVENDER}60`, marginBottom: 3 }}>
            PASSENGER
          </div>
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: 24,
              fontWeight: 900,
              color: '#F0EFF8',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.displayName || 'YOUR NAME'}
          </div>
        </div>

        {/* FROM · TO · CLASS */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'FROM',  value: 'WIMC' },
            { label: 'TO',    value: cityLabel },
            { label: 'CLASS', value: categoryLabel || 'CULTURE' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${LAVENDER}55`, marginBottom: 2 }}>
                {f.label}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 700, color: '#F0EFF8', lineHeight: 1.2, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>

        {/* VIBE */}
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${LAVENDER}55`, marginBottom: 2 }}>
            VIBE
          </div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 700, color: '#F0EFF8', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vibeText}
          </div>
        </div>

        {/* DATE · SEAT */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          {[
            { label: 'DATE', value: dateStr },
            { label: 'SEAT', value: 'FLOOR', accent: true },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${LAVENDER}55`, marginBottom: 2 }}>
                {f.label}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 700, color: f.accent ? LAVENDER : 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>
                {f.value}
              </div>
            </div>
          ))}
          {/* Barcode decoration */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 1.5, opacity: 0.18, alignSelf: 'flex-end' }}>
            {[3,1,2,1,3,2,1,2,1,3].map((w, i) => (
              <div key={i} style={{ width: w * 2, height: 22, background: LAVENDER }} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom stub with plane icon */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
          background: `${LAVENDER}08`,
          borderTop: `1px dashed ${LAVENDER}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px 0 16px',
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: `${LAVENDER}80` }}>
          ADMIT ONE · {cityLabel}.IN · CULTURE PASS
        </span>
        {/* Plane icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill={LAVENDER} style={{ opacity: 0.6, flexShrink: 0 }}>
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function RevealPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'loading' | 'reveal'>('loading')
  const [passData, setPassData] = useState<PassData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Phase 1 → Phase 2 after 1500ms
  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as { displayName?: string } | null
      if (!s1?.displayName) { router.replace('/onboarding/screen-1'); return }
      const city = sessionStorage.getItem('wimc_city')
        || JSON.parse(sessionStorage.getItem('wimc_s2') || '{}')?.city
      if (!city) { router.replace('/onboarding/screen-4'); return }
    } catch { /* ignore */ }

    const data = readPassData()
    setPassData(data)
    const t = setTimeout(() => setPhase('reveal'), 1500)
    return () => clearTimeout(t)
  }, [router])

  function handleSkipToComplete() {
    if (!passData) return
    startTransition(async () => {
      // Ensure at least 3 interest tags for schema validation
      const tags = passData.interestTags.length >= 3
        ? passData.interestTags
        : [
            ...passData.interestTags,
            ...INTEREST_TAGS
              .filter(t => !passData.interestTags.includes(t.id))
              .slice(0, 3 - passData.interestTags.length)
              .map(t => t.id),
          ]

      const platforms: string[] = JSON.parse(sessionStorage.getItem('wimc_platforms') || '[]')
      const socialLinks = platforms.map(id => ({ platform: id, url: '' }))

      const result = await completeOnboarding({
        displayName:  passData.displayName,
        username:     passData.username,
        creatorType:  passData.creatorType as Parameters<typeof completeOnboarding>[0]['creatorType'],
        subTypes:     passData.subTypes,
        city:         passData.city,
        interestTags: tags,
        socialLinks,
        bio:          undefined,
        colorScheme:  undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/onboarding/complete')
    })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {/* Phase 1: Loader */}
        {phase === 'loading' && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              background: '#07070A',
            }}
          >
            {/* Postmark stamp animation */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ position: 'relative' }}
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" stroke={LAVENDER} strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
                <circle cx="40" cy="40" r="28" stroke={LAVENDER} strokeWidth="1.5" opacity="0.3" />
                <text x="40" y="36" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="700" letterSpacing="3" fill={LAVENDER} opacity="0.8">WHEN IN</text>
                <text x="40" y="47" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="700" letterSpacing="3" fill={LAVENDER} opacity="0.8">MY CITY</text>
                <text x="40" y="57" textAnchor="middle" fontFamily="monospace" fontSize="7" letterSpacing="2" fill={`${LAVENDER}60`}>2025</text>
              </svg>
            </motion.div>
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                color: '#9896B0',
                margin: 0,
                letterSpacing: '0.04em',
              }}
            >
              Stamping your pass…
            </p>
          </motion.div>
        )}

        {/* Phase 2: Pass reveal */}
        {phase === 'reveal' && passData && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            <div
              style={{
                maxWidth: 420,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Boarding pass */}
              <BoardingPassCard data={passData} />

              {/* Chat bubble */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: E, delay: 0.6 }}
                style={{
                  background: '#0D0D12',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '16px 20px',
                }}
              >
                <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700, color: '#F0EFF8', margin: 0, lineHeight: 1.4 }}>
                  Your pass is ready. Want to add a photo?
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#5C5A72', margin: '6px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  WIMC SYSTEM
                </p>
              </motion.div>

              {/* Error */}
              {error && (
                <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#FF6B6B', margin: 0, textAlign: 'center' }}>
                  {error}
                </p>
              )}

              {/* Two buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: E, delay: 0.8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => router.push('/onboarding/polish')}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: LAVENDER,
                    color: '#07070A',
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 900,
                    fontSize: 15,
                    borderRadius: 0,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Yes, quick!
                </button>
                <button
                  type="button"
                  onClick={handleSkipToComplete}
                  disabled={isPending}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#F0EFF8',
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: 0,
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: isPending ? 'default' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {isPending ? 'Creating your pass…' : "I'm in — take me there →"}
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
