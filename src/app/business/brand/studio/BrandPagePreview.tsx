'use client'

import { useRef, useEffect, useState } from 'react'
import type { PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockRenderer from '@/components/profile/BlockRenderer'
import { deriveBrandColors, BrandHeroDispatcher } from '@/components/brand/BrandHeroes'

const GOAL_LABELS: Record<string, string> = {
  reach_creators: 'Reach creators', host_collabs: 'Host collabs',
  sponsor_events: 'Sponsor events', build_community: 'Build community', grow_brand: 'Grow brand',
}

// ─── Phone chrome ─────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 375,
      background: '#000',
      borderRadius: 44,
      border: '10px solid #222',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10, paddingTop: 10, pointerEvents: 'none' }}>
        <div style={{ width: 120, height: 28, background: '#000', borderRadius: '0 0 20px 20px' }} />
      </div>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0', fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', zIndex: 5, pointerEvents: 'none' }}>
        <span>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.9 }}>
          <svg viewBox="0 0 20 14" style={{ width: 16, height: 11, fill: '#fff' }}>
            <rect x="0" y="4" width="3" height="10" rx="1" />
            <rect x="4.5" y="2.5" width="3" height="11.5" rx="1" />
            <rect x="9" y="1" width="3" height="13" rx="1" />
            <rect x="13.5" y="0" width="3" height="14" rx="1" />
            <rect x="17.5" y="1" width="2.5" height="12" rx="1" opacity="0.3" />
          </svg>
          <svg viewBox="0 0 24 16" style={{ width: 15, height: 10, fill: '#fff' }}>
            <path d="M12 3C8.14 3 4.66 4.61 2.19 7.18L0 5C3.05 1.88 7.31 0 12 0s8.95 1.88 12 5l-2.19 2.18C19.34 4.61 15.86 3 12 3z"/>
            <path d="M12 9c-2.05 0-3.91.79-5.3 2.07L4.5 8.87C6.47 7.07 9.11 6 12 6s5.53 1.07 7.5 2.87l-2.2 2.2C15.91 9.79 14.05 9 12 9z"/>
            <circle cx="12" cy="15" r="2.5"/>
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <div style={{ width: 22, height: 11, border: '1.5px solid #fff', borderRadius: 3, display: 'flex', alignItems: 'center', padding: '0 1px', gap: 1 }}>
              <div style={{ height: 7, width: 15, background: '#fff', borderRadius: 1.5 }} />
            </div>
          </div>
        </div>
      </div>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BrandPagePreviewProps {
  displayName:         string
  username:            string
  city:                string
  businessCategories:  string[]
  avatarUrl?:          string | null
  contactWhatsapp?:    string | null
  // Live content state
  bio:                 string
  wimcGoals:           string[]
  targetAudience:      string[]
  contactEmail:        string
  websiteUrl:          string
  instagramHandle:     string
  // Live blocks + theme
  blocks:              PageBlock[]
  pageTheme:           ProfileTheme
}



// ─── Preview content (mobile layout, matches BrandPublicPage mobile section) ────

function BrandPreviewContent(props: BrandPagePreviewProps) {
  const theme      = deriveBrandColors(props.businessCategories, props.pageTheme)
  const categories = (props.businessCategories ?? []).filter(Boolean)
  const goals      = props.wimcGoals.filter(Boolean)
  const visibleBlocks = props.blocks.filter(b => b.is_visible)
  const primaryCat = categories[0] ?? 'BRAND'
  const marqueeText = `VERIFIED BRAND · OPEN FOR PARTNERSHIPS · ${props.displayName?.toUpperCase()} · WHENINMYCITY ·`

  const waUrl = props.contactWhatsapp
    ? `https://wa.me/${props.contactWhatsapp.replace(/\D/g, '').replace(/^(?!91)/, '91')}`
    : null

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100%' }}>

      {/* ── Mini header ─────────────────────────────────────────────────── */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: `1px solid ${theme.border}`,
        background: `${theme.bg}f0`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: theme.primary, fontFamily: 'var(--font-syne), sans-serif', letterSpacing: '-0.5px' }}>
          WIMC
        </span>
        <div style={{ display: 'flex', gap: 12, color: theme.primary }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: theme.primary }}>share</span>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: theme.primary }}>more_vert</span>
        </div>
      </div>

      {/* ── Layout-specific hero ─────────────────────────────────────────── */}
      <BrandHeroDispatcher
        theme={theme}
        displayName={props.displayName}
        city={props.city}
        categories={categories}
        avatarUrl={props.avatarUrl}
        waUrl={waUrl}
        layoutPreset={props.pageTheme.layoutPreset ?? 'boarding-pass'}
      />

      {/* ── Editorial header ─────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 8 }}>
          {primaryCat} · {props.city}
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px', color: theme.text, fontFamily: 'var(--font-syne), sans-serif' }}>
          {props.displayName}
        </div>
      </div>

      {/* ── OUR BRIEF panel ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: theme.bgCard }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: theme.primary, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 6 }}>
            OUR BRIEF
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.4, color: theme.text, margin: 0, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            {props.bio || 'We are open for creative partnerships.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end', flexShrink: 0 }}>
          {([1, 0.6, 0.3] as const).map((opacity, i) => (
            <div key={i} style={{ width: 8, height: 8, background: theme.primary, opacity }} />
          ))}
          <div style={{ fontSize: 8, color: theme.primary, fontFamily: 'var(--font-jetbrains-mono), monospace', marginTop: 4 }}>
            QUOTA: 0/3
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {([['0', 'CREATORS\nPARTNERED'], ['0', 'EVENTS\nBACKED'], [props.city ? '1' : '0', 'CITIES']] as const).map(([val, label]) => (
            <div key={label} style={{ borderLeft: `3px solid ${theme.primary}`, paddingLeft: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: theme.primary, fontFamily: 'var(--font-syne), sans-serif' }}>{val}</div>
              <div style={{ fontSize: 8, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginTop: 3, whiteSpace: 'pre-line' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', background: theme.primary, color: theme.bg,
            fontFamily: 'var(--font-syne), sans-serif', fontWeight: 900, fontSize: 13,
            border: 'none', cursor: 'pointer', boxShadow: `3px 3px 0 rgba(0,0,0,0.3)`,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>handshake</span>
            PARTNER WITH US
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', background: 'transparent', color: theme.primary,
            fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 12,
            border: `1px solid ${theme.primary}`, cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person_add</span>
            FOLLOW
          </button>
        </div>

        {/* Open Collaborations */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 22, color: theme.text, fontFamily: 'var(--font-abril), serif', borderBottom: `2px solid ${theme.primary}`, paddingBottom: 2 }}>
              Open Collaborations
            </div>
            <div style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
              0 MATCHES
            </div>
          </div>
          <div style={{ border: `2px dashed ${theme.border}`, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: theme.textMuted, opacity: 0.5 }}>group_add</span>
            <div style={{ fontSize: 9, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginTop: 6 }}>
              NO MATCHES IN {props.city?.toUpperCase()} YET
            </div>
          </div>
        </div>

        {/* Goals */}
        {goals.length > 0 && (
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 8 }}>
              WE&apos;RE LOOKING FOR
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {goals.map(g => (
                <span key={g} style={{
                  fontSize: 9, fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase',
                  padding: '5px 10px', border: `1px solid ${theme.primaryDim}`,
                  color: theme.primary, background: theme.primaryBg,
                }}>
                  {GOAL_LABELS[g] ?? g.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Get in touch */}
        {(waUrl || props.contactEmail || props.websiteUrl || props.instagramHandle) && (
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 8 }}>
              GET IN TOUCH
            </div>
            <div style={{ borderTop: `1px solid ${theme.border}` }}>
              {waUrl && <ContactRow icon="chat" label="WHATSAPP" color={theme.primary} border={theme.border} />}
              {props.contactEmail && <ContactRow icon="alternate_email" label="EMAIL" color={theme.text} border={theme.border} />}
              {props.websiteUrl && <ContactRow icon="language" label="WEBSITE" color={theme.text} border={theme.border} />}
              {props.instagramHandle && <ContactRow icon="photo_camera" label="INSTAGRAM" color={theme.text} border={theme.border} />}
            </div>
          </div>
        )}

      </div>

      {/* ── What We Work In — full-bleed ─────────────────────────────────── */}
      <div style={{ background: theme.bgCard, padding: '16px', marginTop: 20 }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.3em', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 8 }}>
          WHAT WE WORK IN
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {categories.length > 0 ? (
            categories.map((cat, i) => (
              <span key={cat} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: theme.primary, fontFamily: 'var(--font-syne), sans-serif', fontWeight: 900, fontSize: 26 }}>{cat}</span>
                {i < categories.length - 1 && (
                  <span style={{ color: theme.textMuted, fontFamily: 'var(--font-syne), sans-serif', fontWeight: 900, fontSize: 26, margin: '0 4px' }}>/</span>
                )}
              </span>
            ))
          ) : (
            <span style={{ color: theme.primary, fontFamily: 'var(--font-syne), sans-serif', fontWeight: 900, fontSize: 26 }}>BRAND</span>
          )}
        </div>
      </div>

      {/* ── Archive Collabs ───────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ fontSize: 22, color: theme.text, fontFamily: 'var(--font-abril), serif' }}>Archive Collabs</div>
          <div style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>SCROLL →</div>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, paddingBottom: 8, scrollbarWidth: 'none' }}>
          {(['POP-UP EVENT', 'CITY COLLAB', 'BRAND TAKEOVER'] as const).map((name, i) => (
            <div key={i} style={{ minWidth: 160, padding: '10px 12px', flexShrink: 0, background: theme.bgCard, borderLeft: `3px solid ${theme.primary}` }}>
              <div style={{ fontSize: 8, color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 6 }}>
                WIMC × COLLAB_0{i + 1}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: theme.text, fontFamily: 'var(--font-syne), sans-serif' }}>{name}</div>
              <div style={{ fontSize: 8, color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginTop: 4 }}>
                {props.city?.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Marquee — primary color band ─────────────────────────────────── */}
      <div style={{ background: theme.primary, overflow: 'hidden', padding: '4px 0' }}>
        <div className="animate-brand-marquee" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          <span style={{ flexShrink: 0, fontSize: 9, textTransform: 'uppercase', color: theme.bg, fontFamily: 'var(--font-jetbrains-mono), monospace', paddingRight: 32 }}>
            {marqueeText}
          </span>
          <span style={{ flexShrink: 0, fontSize: 9, textTransform: 'uppercase', color: theme.bg, fontFamily: 'var(--font-jetbrains-mono), monospace', paddingRight: 32 }}>
            {marqueeText}
          </span>
        </div>
      </div>

      {/* ── Blocks ───────────────────────────────────────────────────────── */}
      {visibleBlocks.length > 0 && (
        <div
          style={{
            padding: '20px 16px 48px',
            '--pp-bg':         theme.bg,
            '--pp-primary':    theme.primary,
            '--pp-text':       theme.text,
            '--pp-text-muted': theme.textMuted,
            '--pp-surface':    theme.bgCard,
          } as React.CSSProperties}
        >
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 10 }}>
            MORE FROM {props.displayName?.toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} theme={props.pageTheme} isPreview />
            ))}
          </div>
        </div>
      )}

      {!visibleBlocks.length && (
        <div style={{ padding: '20px 16px 48px' }}>
          <div style={{ padding: '16px', border: `1px dashed ${theme.border}`, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.textMuted, opacity: 0.4 }}>add_box</span>
            <p style={{ margin: '6px 0 0', fontSize: 9, color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
              Add blocks in the Blocks tab
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

function ContactRow({ icon, label, color, border }: { icon: string; label: string; color: string; border: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: `1px solid ${border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, color, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', color }}>
          {label}
        </span>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color, opacity: 0.5 }}>arrow_forward_ios</span>
    </div>
  )
}

// ─── Main export: scaled phone frame ─────────────────────────────────────────

export default function BrandPagePreview(props: BrandPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.85)

  useEffect(() => {
    if (!containerRef.current) return
    const PHONE_W = 375
    const PADDING = 48
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0
      setScale(Math.min(0.9, (w - PADDING) / PHONE_W))
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const PHONE_H = 760

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '24px 0 24px',
        overflow: 'hidden',
      }}
    >
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        height: `${(PHONE_H * scale).toFixed(0)}px`,
        width: 375,
        flexShrink: 0,
      }}>
        <div style={{ width: 375, height: PHONE_H, overflow: 'hidden', borderRadius: 44, border: '10px solid #1e1e24', boxShadow: '0 24px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
          {/* Status bar */}
          <div style={{
            height: 36, background: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 110, height: 26, background: '#000', borderRadius: '0 0 18px 18px' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', zIndex: 1 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, zIndex: 1 }}>
              <span style={{ fontSize: 11, color: '#fff' }}>▌▌▌</span>
              <span style={{ fontSize: 11, color: '#fff' }}>WiFi</span>
              <span style={{ fontSize: 11, color: '#fff' }}>⬛</span>
            </div>
          </div>
          {/* Page content */}
          <div style={{ height: PHONE_H - 36, overflowY: 'auto', overflowX: 'hidden' }}>
            <BrandPreviewContent {...props} />
          </div>
        </div>
      </div>

      {/* Preview label */}
      <div style={{
        marginTop: 12,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A800' }} />
        <span style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          Live Preview · wheninmycity.com/{props.city?.toLowerCase().replace(/\s+/g, '-')}/{props.username}
        </span>
      </div>
    </div>
  )
}
