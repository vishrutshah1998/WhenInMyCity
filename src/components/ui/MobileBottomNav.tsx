'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import type { BottomNavConfig, WorkspaceLink } from '@/lib/constants/bottomNavConfigs'

interface Props {
  config: BottomNavConfig
  // Keyed by the badgeKey values declared in the config's items array.
  badges?: Partial<Record<string, number>>
  // Other workspaces this user has access to (excludes the current one).
  workspaces?: WorkspaceLink[]
}

const NAV_HEIGHT = 56  // px — matches h-14 of the existing public BottomNav

export default function MobileBottomNav({ config, badges = {}, workspaces = [] }: Props) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Close sheet on navigation so deep links triggered outside the nav also dismiss it.
  useEffect(() => { setSheetOpen(false) }, [pathname])

  const { items, more, accent, bg, border, muted, badgeFg } = config

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: 'var(--font-jetbrains-mono), monospace',
    letterSpacing: '0.06em',
    fontWeight: 600,
    lineHeight: 1,
    marginTop: 3,
  }

  return (
    <>
      {/* ── Primary nav bar ───────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[55] flex"
        style={{
          height: NAV_HEIGHT,
          background: bg,
          borderTop: `1px solid ${border}`,
          // Extra height below the nav to cover iOS home indicator
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {items.map(item => {
          const active = isActive(item.href, item.exact)
          const badge  = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center"
              style={{
                color: active ? accent : muted,
                textDecoration: 'none',
                minHeight: 44,  // WCAG 2.5.8 minimum tap target
              }}
            >
              {/* Icon + badge wrapper */}
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 22,
                    fontVariationSettings: active
                      ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
                      : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                  }}
                >
                  {item.icon}
                </span>

                {badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -9,
                    minWidth: 16, height: 16,
                    background: accent,
                    color: badgeFg,
                    fontSize: 9, fontWeight: 700,
                    borderRadius: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    lineHeight: 1,
                  }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>

              <span style={labelStyle}>{item.label}</span>
            </Link>
          )
        })}

        {/* More tab */}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex-1 flex flex-col items-center justify-center"
          style={{
            color: muted,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 22,
              fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
            }}
          >
            more_horiz
          </span>
          <span style={labelStyle}>More</span>
        </button>
      </nav>

      {/* ── More bottom sheet ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Scrim */}
            <motion.div
              key="mobile-nav-backdrop"
              className="md:hidden fixed inset-0 z-[60]"
              style={{ background: '#000' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="mobile-nav-sheet"
              className="md:hidden fixed bottom-0 left-0 right-0 z-[61]"
              style={{
                background: bg,
                borderTop: `1px solid ${border}`,
                borderRadius: '16px 16px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div style={{
                  width: 36, height: 4, borderRadius: 2,
                  background: muted, opacity: 0.5,
                }} />
              </div>

              {/* Item grid — 4 columns to match the primary nav rhythm */}
              <div style={{
                padding: '4px 8px 0',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 2,
              }}>
                {more.map(item => {
                  // Exact equality in the More sheet — avoids false positives on prefix paths
                  const active = item.href ? pathname === item.href : false

                  const cellContent = (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 4, padding: '10px 4px', borderRadius: 8,
                      color: active ? accent : muted,
                      background: active
                        ? `color-mix(in srgb, ${accent} 12%, transparent)`
                        : 'transparent',
                      opacity: item.soon ? 0.35 : 1,
                      minHeight: 44,
                    }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 22,
                          fontVariationSettings: active
                            ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
                            : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                        textAlign: 'center',
                        lineHeight: 1.3,
                        maxWidth: 64,
                      }}>
                        {item.label}
                        {item.soon && (
                          <><br /><span style={{ fontSize: 7, opacity: 0.7 }}>SOON</span></>
                        )}
                      </span>
                    </div>
                  )

                  if (item.href && !item.soon) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        {cellContent}
                      </Link>
                    )
                  }
                  return <div key={item.label}>{cellContent}</div>
                })}
              </div>

              {/* Workspace switcher — only shown when the user has other workspaces */}
              {workspaces.length > 0 && (
                <div style={{ padding: '12px 16px 16px' }}>
                  <div style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: muted,
                    marginBottom: 8,
                  }}>
                    Switch workspace
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {workspaces.map(ws => (
                      <Link
                        key={ws.href}
                        href={ws.href}
                        onClick={() => setSheetOpen(false)}
                        style={{ textDecoration: 'none' }}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${ws.color}22`,
                          background: `${ws.color}0D`,
                          minHeight: 44,
                        }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18, color: ws.color, flexShrink: 0,
                              fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}
                          >
                            {ws.icon}
                          </span>
                          <span style={{
                            flex: 1,
                            fontSize: 13, fontWeight: 600,
                            color: ws.color,
                            fontFamily: 'var(--font-dm-sans), sans-serif',
                          }}>
                            {ws.label}
                          </span>
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16, color: muted, flexShrink: 0,
                              fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}
                          >
                            arrow_forward
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom padding when no workspace section */}
              {workspaces.length === 0 && (
                <div style={{ height: 16 }} />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
