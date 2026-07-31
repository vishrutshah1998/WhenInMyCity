'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { WimcWordmark } from '@/components/WimcWordmark'

export const MOBILE_HEADER_H = 46

const BAR: React.CSSProperties = { position: 'absolute', left: 0, right: 0, height: 2, background: '#201A12', borderRadius: 1 }

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)

  return (
    <div style={{ position: 'relative', flexShrink: 0, zIndex: 50 }}>
      <div style={{
        height: MOBILE_HEADER_H, flexShrink: 0,
        background: 'rgba(251,243,231,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(32,26,18,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px',
      }}>
        <Link href="/" aria-label="When in My City" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <WimcWordmark color="black" height={18} />
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          style={{ width: 22, height: 16, position: 'relative', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <motion.span style={{ ...BAR, top: 0 }} animate={open ? { top: 7, rotate: 45 } : { top: 0, rotate: 0 }} transition={{ duration: 0.25 }} />
          <motion.span style={{ ...BAR, top: 7 }} animate={{ opacity: open ? 0 : 1 }} transition={{ duration: 0.2 }} />
          <motion.span style={{ ...BAR, top: 14 }} animate={open ? { top: 7, rotate: -45 } : { top: 14, rotate: 0 }} transition={{ duration: 0.25 }} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#FBF3E7', borderBottom: '1px solid rgba(32,26,18,0.1)',
              boxShadow: '0 12px 24px rgba(32,26,18,0.1)',
            }}
          >
            {([
              { label: 'Mission', href: '/mission' },
              { label: 'Growth', href: '/growth' },
              { label: 'Explore', href: '/explore' },
            ] as const).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 20px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: '#58503F',
                  borderTop: '1px solid rgba(32,26,18,0.06)', textDecoration: 'none',
                }}>
                {item.label}
              </Link>
            ))}

            <button
              onClick={() => setDiscoverOpen((v) => !v)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 20px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: '#58503F',
                borderTop: '1px solid rgba(32,26,18,0.06)', background: 'none', border: 'none',
                borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(32,26,18,0.06)',
                cursor: 'pointer',
              }}>
              Discover
              <span style={{ fontSize: 8, transform: discoverOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </button>
            <AnimatePresence>
              {discoverOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', background: 'rgba(32,26,18,0.03)' }}>
                  <Link href="/hall-of-lights" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px 11px 32px', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D8432E', textDecoration: 'none' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>auto_awesome</span>
                    Hall of Lights
                  </Link>
                  <Link href="/map-of-legends" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px 13px 32px', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1F8A70', textDecoration: 'none' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_city</span>
                    Map of Legends
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ padding: '10px 20px 14px' }}>
              <Link href="/signin" onClick={() => setOpen(false)} style={{
                display: 'block', textAlign: 'center', background: '#201A12', color: '#FBF3E7',
                padding: 10, fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
              }}>
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
