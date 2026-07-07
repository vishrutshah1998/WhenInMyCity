'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import type { PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockRenderer from '@/components/profile/BlockRenderer'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg:       '#1A2744',
  bgCard:   '#243156',
  bgPanel:  '#1F2E50',
  lavender: '#9B8FFF',
  lavDim:   'rgba(155,143,255,0.25)',
  lavBg:    'rgba(155,143,255,0.10)',
  text:     'rgba(255,255,255,0.90)',
  textMuted:'rgba(255,255,255,0.40)',
  border:   'rgba(155,143,255,0.15)',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ExplorerPagePreviewProps {
  displayName:    string
  bio:            string
  city:           string
  interestTags:   string[]
  instagramHandle:string
  avatarUrl?:     string | null
  username?:      string | null
  blocks:         PageBlock[]
  pageTheme:      ProfileTheme
}

// ─── Preview content ─────────────────────────────────────────────────────────

function ExplorerPreviewContent(props: ExplorerPagePreviewProps) {
  const { displayName, bio, city, interestTags, instagramHandle, avatarUrl, username, blocks, pageTheme } = props
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  const initial = displayName?.[0]?.toUpperCase() ?? 'E'

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100%', fontFamily: INTER }}>

      {/* ── Mini header ──────────────────────────────────────────────────── */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${T.border}`, background: 'rgba(26,39,68,0.95)' }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: T.lavender, fontFamily: MONO, letterSpacing: '-0.3px' }}>WIMC</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: T.lavender }}>share</span>
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: T.lavender }}>more_vert</span>
        </div>
      </div>

      {/* ── Hero identity section ─────────────────────────────────────────── */}
      <div style={{ padding: '24px 16px 20px', background: T.bgPanel, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {/* Avatar */}
          <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: '50%', border: `2px solid ${T.lavender}`, overflow: 'hidden', background: T.bgCard }}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName} width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${T.lavender}20` }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: T.lavender, fontFamily: MONO }}>{initial}</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1, marginBottom: 4, letterSpacing: '-0.5px' }}>
              {displayName || 'Your Name'}
            </div>
            {city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12, color: T.lavender }}>location_on</span>
                <span style={{ fontSize: 10, color: T.textMuted, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          {([['0', 'EVENTS\nATTENDED'], ['0', 'VENUES\nVISITED'], [interestTags.length.toString(), 'INTERESTS']] as const).map(([val, label]) => (
            <div key={label} style={{ borderLeft: `2px solid ${T.lavender}`, paddingLeft: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, color: T.lavender, fontFamily: MONO }}>{val}</div>
              <div style={{ fontSize: 7, textTransform: 'uppercase', color: T.textMuted, fontFamily: MONO, marginTop: 2, whiteSpace: 'pre-line' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Editorial name block ──────────────────────────────────────────── */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.textMuted, fontFamily: MONO, marginBottom: 6 }}>
          EXPLORER · {city || 'YOUR CITY'}
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: '-1.5px', color: T.text }}>
          {displayName || 'Your Name'}
        </div>
        {username && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, background: T.lavBg, border: `1px solid ${T.border}`, padding: '3px 8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 9, color: T.lavender }}>link</span>
            <span style={{ fontSize: 8, fontFamily: MONO, color: T.lavender }}>wheninmycity.com/{username}</span>
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Bio */}
        {bio ? (
          <div>
            <div style={{ fontSize: 16, fontWeight: 400, color: T.text, fontFamily: 'var(--font-abril), serif', marginBottom: 8 }}>About</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: `${T.text}85`, margin: 0 }}>{bio}</p>
          </div>
        ) : (
          <EmptyHint label="Add a bio in the Content tab" />
        )}

        {/* Interest tags */}
        {interestTags.length > 0 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 400, color: T.text, fontFamily: 'var(--font-abril), serif', marginBottom: 10 }}>Interests</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {interestTags.map((tag) => (
                <span key={tag} style={{ fontSize: 10, fontFamily: MONO, padding: '5px 10px', border: `1px solid ${T.lavDim}`, color: T.lavender, background: T.lavBg, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {tag.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {instagramHandle && (
          <div style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.lavender }}>photo_camera</span>
                <span style={{ fontSize: 12, fontFamily: MONO, color: T.text }}>@{instagramHandle}</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: T.textMuted }}>arrow_forward_ios</span>
            </div>
          </div>
        )}

        {/* Blocks */}
        {visibleBlocks.length > 0 ? (
          <div style={{ '--pp-bg': T.bg, '--pp-primary': T.lavender, '--pp-text': T.text, '--pp-text-muted': T.textMuted, '--pp-surface': T.bgCard } as React.CSSProperties}>
            <div style={{ fontSize: 16, fontWeight: 400, color: T.text, fontFamily: 'var(--font-abril), serif', marginBottom: 10 }}>Links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />
              ))}
            </div>
          </div>
        ) : (
          <EmptyHint label="Add blocks in the Blocks tab" />
        )}

      </div>

      {/* ── Marquee ───────────────────────────────────────────────────────── */}
      <div style={{ background: T.lavender, overflow: 'hidden', padding: '4px 0' }}>
        <div className="animate-brand-marquee" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          <span style={{ flexShrink: 0, fontSize: 9, textTransform: 'uppercase', color: T.bg, fontFamily: MONO, paddingRight: 32 }}>
            EXPLORER · WHENINMYCITY · {city?.toUpperCase() || 'YOUR CITY'} · VERIFIED MEMBER ·&nbsp;
          </span>
          <span style={{ flexShrink: 0, fontSize: 9, textTransform: 'uppercase', color: T.bg, fontFamily: MONO, paddingRight: 32 }}>
            EXPLORER · WHENINMYCITY · {city?.toUpperCase() || 'YOUR CITY'} · VERIFIED MEMBER ·&nbsp;
          </span>
        </div>
      </div>

    </div>
  )
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div style={{ padding: '12px 14px', border: `1px dashed ${T.border}`, textAlign: 'center' }}>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: MONO }}>{label}</span>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ExplorerPagePreview(props: ExplorerPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.85)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setScale(Math.min(0.9, (w - 48) / 375))
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const PHONE_H = 760

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 0', overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', height: `${(PHONE_H * scale).toFixed(0)}px`, width: 375, flexShrink: 0 }}>
        <div style={{ width: 375, height: PHONE_H, overflow: 'hidden', borderRadius: 44, border: '10px solid #1e1e24', boxShadow: '0 24px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
          <div style={{ height: 36, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 110, height: 26, background: '#000', borderRadius: '0 0 18px 18px' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', zIndex: 1 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, zIndex: 1 }}>
              <span style={{ fontSize: 11, color: '#fff' }}>▌▌▌</span>
              <span style={{ fontSize: 11, color: '#fff' }}>WiFi</span>
              <span style={{ fontSize: 11, color: '#fff' }}>⬛</span>
            </div>
          </div>
          <div style={{ height: PHONE_H - 36, overflowY: 'auto', overflowX: 'hidden' }}>
            <ExplorerPreviewContent {...props} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9B8FFF' }} />
        <span style={{ fontSize: 10, fontFamily: MONO, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          Live Preview · wheninmycity.com/{props.username ?? 'you'}
        </span>
      </div>
    </div>
  )
}
