'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { generateUsernameFromName } from '@/app/actions/onboarding'

const E = [0.22, 1, 0.36, 1] as const
const ACCENT = '#E8705A'

export default function Screen1Page() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [isPending, startTransition]  = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as
        { displayName?: string; username?: string } | null
      if (s1?.displayName) setDisplayName(s1.displayName)
      if (s1?.username)    setUsername(s1.username)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function handleNameChange(value: string) {
    setDisplayName(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length >= 2) {
      timerRef.current = setTimeout(async () => {
        const suggested = await generateUsernameFromName(value.trim())
        setUsername(suggested)
      }, 800)
    } else {
      setUsername('')
    }
  }

  function handleAdvance() {
    if (displayName.trim().length < 2 || isPending) return
    startTransition(async () => {
      const finalUsername = username || await generateUsernameFromName(displayName.trim())
      sessionStorage.setItem(
        'wimc_s1',
        JSON.stringify({ displayName: displayName.trim(), username: finalUsername }),
      )
      router.push('/onboarding/screen-2')
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdvance()
  }

  const isValid = displayName.trim().length >= 2

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 24px 88px',
      }}
    >
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
        {/* Chat bubble with icon */}
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
              background: `${ACCENT}18`,
              border: `1px solid ${ACCENT}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18,
            }}
          >
            ✉️
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
              What should we call you?
            </p>
          </div>
        </motion.div>

        {/* Hint text */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: E, delay: 0.06 }}
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            color: '#5C5A72',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          e.g. Aryan, Jazz Jaipur, The Indore Poet
        </motion.p>

        {/* Ticket-chrome input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E, delay: 0.1 }}
          style={{
            border: `1px solid ${ACCENT}28`,
            background: `${ACCENT}04`,
            overflow: 'hidden',
          }}
        >
          {/* Two-column header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              borderBottom: `1px solid ${ACCENT}14`,
              background: `${ACCENT}08`,
            }}
          >
            <div style={{ padding: '7px 16px', borderRight: `1px solid ${ACCENT}14` }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: `${ACCENT}88` }}>
                YOUR NAME
              </span>
            </div>
            <div style={{ padding: '7px 16px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: `${ACCENT}55` }}>
                DISPLAY NAME
              </span>
            </div>
          </div>

          {/* Input */}
          <input
            type="text"
            placeholder="Type your name…"
            value={displayName}
            onChange={e => handleNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={80}
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '14px 16px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 20,
              fontWeight: 600,
              color: '#F0EFF8',
              caretColor: ACCENT,
              display: 'block',
            }}
            className="placeholder-[#3C3A52]"
          />
        </motion.div>

        {/* URL + helper */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: E, delay: 0.16 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: username ? ACCENT : `${ACCENT}44`,
              letterSpacing: '0.04em',
              transition: 'color 0.2s ease',
            }}
          >
            wimcity.in/{username || '[username]'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 12,
              color: '#5C5A72',
              lineHeight: 1.4,
            }}
          >
            You can change this anytime.
          </span>
        </motion.div>

        {/* Bottom tag line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: E, delay: 0.24 }}
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            color: '#9896B0',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          This is how your fans and venues will know you.
        </motion.p>
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
            onClick={handleAdvance}
            disabled={!isValid || isPending}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: isValid ? ACCENT : `${ACCENT}44`,
              color: '#07070A',
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: 15,
              borderRadius: 0,
              border: 'none',
              cursor: isValid ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s ease',
            }}
          >
            {isPending ? 'Saving…' : 'NEXT →'}
          </motion.button>
        </div>
      </footer>
    </div>
  )
}
