'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConnectedCalendar {
  id: string
  name: string
  color: string
  enabled: boolean
}

// Mock state — replace with OAuth session check
const MOCK_CALENDARS: ConnectedCalendar[] = [
  { id: 'primary',  name: 'Personal (primary)',    color: '#4285f4', enabled: true  },
  { id: 'work',     name: 'Work',                  color: '#34a853', enabled: true  },
  { id: 'venue',    name: 'Venue events',           color: '#f59e0b', enabled: false },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function GoogleSyncDrawer({ open, onClose }: Props) {
  const [isConnected, setIsConnected] = useState(false)
  const [calendars, setCalendars] = useState<ConnectedCalendar[]>(MOCK_CALENDARS)
  const [lastSynced] = useState<Date | null>(isConnected ? new Date(Date.now() - 4 * 60_000) : null)

  function toggleCalendar(id: string) {
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c))
  }

  function handleConnect() {
    // TODO: initiate Google OAuth flow
    setIsConnected(true)
  }

  function handleDisconnect() {
    setIsConnected(false)
  }

  function formatLastSynced(date: Date): string {
    const diffMs = Date.now() - date.getTime()
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
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
              background: 'var(--adda-bg-surface)',
              borderLeft: '1px solid var(--adda-border-subtle)',
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
              borderBottom: '1px solid var(--adda-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--adda-text-primary)', margin: 0, lineHeight: 1.2 }}>
                  Google Calendar Sync
                </h2>
                <p style={{ fontSize: 12, color: 'var(--adda-text-muted)', margin: '4px 0 0' }}>
                  Sync your personal calendar to block out time automatically
                </p>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'var(--adda-bg-overlay)',
                color: 'var(--adda-text-muted)', cursor: 'pointer',
                display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
              }}>×</button>
            </div>

            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {!isConnected ? (
                /* ── Not connected ─────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', paddingTop: 20 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 14,
                    background: 'var(--adda-bg-overlay)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    {/* Google "G" logo simplified */}
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>

                  <div>
                    <p style={{ fontSize: 13, color: 'var(--adda-text-secondary)', lineHeight: 1.6, margin: '0 0 4px' }}>
                      Connect Google Calendar to automatically block out times when you&apos;re busy — creators won&apos;t be able to request those slots.
                    </p>
                  </div>

                  <button onClick={handleConnect} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 8,
                    background: 'var(--adda-amber)', color: '#000',
                    border: 'none', fontWeight: 700, fontSize: 14,
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    cursor: 'pointer', width: '100%', justifyContent: 'center',
                  }}>
                    Connect Google Calendar
                  </button>

                  <p style={{ fontSize: 11, color: 'var(--adda-text-muted)', lineHeight: 1.5, margin: 0 }}>
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
                    {lastSynced && (
                      <span style={{ fontSize: 11, color: 'var(--adda-text-muted)' }}>
                        Last synced {formatLastSynced(lastSynced)}
                      </span>
                    )}
                  </div>

                  {/* Calendar list */}
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--adda-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Calendars
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {calendars.map(cal => (
                        <div key={cal.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: 'var(--adda-bg-elevated)',
                          border: '1px solid var(--adda-border-subtle)',
                        }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: 3,
                            background: cal.color, flexShrink: 0,
                          }} />
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--adda-text-primary)' }}>
                            {cal.name}
                          </span>
                          {/* Toggle */}
                          <button
                            onClick={() => toggleCalendar(cal.id)}
                            aria-label={cal.enabled ? `Disable ${cal.name}` : `Enable ${cal.name}`}
                            style={{
                              flexShrink: 0, width: 36, height: 20, borderRadius: 10,
                              background: cal.enabled ? 'var(--adda-amber)' : 'var(--adda-bg-overlay)',
                              border: 'none', cursor: 'pointer', position: 'relative',
                              transition: 'background 150ms ease',
                            }}
                          >
                            <span style={{
                              display: 'block', position: 'absolute', top: 2,
                              left: cal.enabled ? 18 : 2, width: 16, height: 16,
                              borderRadius: '50%', background: '#fff',
                              transition: 'left 150ms ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What gets synced note */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 9,
                    background: 'var(--adda-bg-elevated)',
                    border: '1px solid var(--adda-border-subtle)',
                  }}>
                    <p style={{ fontSize: 12, color: 'var(--adda-text-muted)', lineHeight: 1.55, margin: 0 }}>
                      Events from enabled calendars appear as <span style={{ color: '#10b981', fontWeight: 600 }}>emerald</span> read-only blocks on your calendar.
                      Creators cannot book these times.
                    </p>
                  </div>

                  {/* Disconnect */}
                  <button
                    onClick={handleDisconnect}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '6px 0',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--adda-danger)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: 12,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(239,68,68,0.4)',
                    }}
                  >
                    Disconnect Google Calendar
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
