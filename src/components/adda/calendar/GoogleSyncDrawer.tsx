'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { initiateCalendarSync, disconnectCalendarSync } from '@/app/actions/adda-calendar'

interface Props {
  open: boolean
  onClose: () => void
  addaId: string
  initiallyConnected: boolean
}

export default function GoogleSyncDrawer({ open, onClose, initiallyConnected }: Props) {
  const [isConnected, setIsConnected] = useState(initiallyConnected)
  const [isPending, startTransition]  = useTransition()
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  function handleDisconnect() {
    setDisconnectError(null)
    startTransition(async () => {
      const result = await disconnectCalendarSync()
      if (result.error) {
        setDisconnectError(result.error)
      } else {
        setIsConnected(false)
      }
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 90 }}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 380,
              background: 'var(--venue-bg-surface)',
              borderLeft: '1px solid var(--venue-border-subtle)',
              zIndex: 91,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--venue-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--venue-text-primary)', margin: 0, lineHeight: 1.2 }}>
                  Google Calendar Sync
                </h2>
                <p style={{ fontSize: 12, color: 'var(--venue-text-muted)', margin: '4px 0 0' }}>
                  Sync your personal calendar to block out time automatically
                </p>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'var(--venue-bg-overlay)',
                color: 'var(--venue-text-muted)', cursor: 'pointer',
                display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
              }}>×</button>
            </div>

            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {!isConnected ? (
                /* ── Not connected ─────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', paddingTop: 20 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 14,
                    background: 'var(--venue-bg-overlay)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <GoogleLogo />
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--venue-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Connect Google Calendar to automatically block out times when you&apos;re busy — creators won&apos;t be able to request those slots.
                  </p>

                  {/* Server action form — triggers real Google OAuth redirect */}
                  <form action={initiateCalendarSync} style={{ width: '100%' }}>
                    <button
                      type="submit"
                      disabled={isPending}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 8,
                        background: 'var(--venue-amber)', color: '#000',
                        border: 'none', fontWeight: 700, fontSize: 14,
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.6 : 1,
                        width: '100%', justifyContent: 'center',
                      }}
                    >
                      {isPending ? 'Redirecting…' : 'Connect Google Calendar'}
                    </button>
                  </form>

                  <p style={{ fontSize: 11, color: 'var(--venue-text-muted)', lineHeight: 1.5, margin: 0 }}>
                    We only read calendar events — we never write to your Google Calendar.
                  </p>
                </div>
              ) : (
                /* ── Connected ─────────────────────────────────── */
                <>
                  {/* Status bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 9,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Connected</span>
                    </div>
                  </div>

                  {/* What gets synced note */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 9,
                    background: 'var(--venue-bg-elevated)',
                    border: '1px solid var(--venue-border-subtle)',
                  }}>
                    <p style={{ fontSize: 12, color: 'var(--venue-text-muted)', lineHeight: 1.55, margin: 0 }}>
                      Busy blocks from your Google Calendar appear as{' '}
                      <span style={{ color: '#10b981', fontWeight: 600 }}>emerald</span> read-only blocks
                      on your WIMC calendar. Creators cannot book these times.
                    </p>
                  </div>

                  {disconnectError && (
                    <p style={{ fontSize: 12, color: 'var(--venue-danger)', margin: 0 }}>
                      {disconnectError}
                    </p>
                  )}

                  {/* Disconnect */}
                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '6px 0',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--venue-danger)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: 12,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      opacity: isPending ? 0.6 : 1,
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(239,68,68,0.4)',
                    }}
                  >
                    {isPending ? 'Disconnecting…' : 'Disconnect Google Calendar'}
                  </button>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function GoogleLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
