'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import type { AddaProfile, PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockRenderer from '@/components/profile/BlockRenderer'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AddaPagePreviewProps {
  adda:             AddaProfile
  tagline:          string
  eventPreferences: string[]
  highlights:       string[]
  contactWhatsapp:  string
  instagramHandle:  string
  blocks:           PageBlock[]
  pageTheme:        ProfileTheme
  upcomingEvents:   { id: string; title: string; starts_at: string }[]
}

// ─── Layout-specific color palettes ──────────────────────────────────────────

type LayoutId = 'poster' | 'corporate' | 'boarding-pass' | 'minimal' | 'reel' | 'stage'

interface Palette {
  bg: string; bgCard: string; bgPanel: string
  primary: string; text: string; textMuted: string; border: string
  font: string; mono: string
}

const PALETTES: Record<LayoutId, Palette> = {
  poster: {
    bg: '#14130E', bgCard: '#1E1D18', bgPanel: '#3D3D3D',
    primary: '#5B8DEF', text: '#E7E2D8', textMuted: 'rgba(231,226,216,0.5)', border: 'rgba(91,141,239,0.25)',
    font: "'Archivo Black', 'Arial Black', sans-serif", mono: "'JetBrains Mono', monospace",
  },
  corporate: {
    bg: '#071724', bgCard: '#0F2D45', bgPanel: '#0A1D2E',
    primary: '#22D3EE', text: '#D0EEFF', textMuted: 'rgba(208,238,255,0.5)', border: 'rgba(34,211,238,0.2)',
    font: "'Inter', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
  },
  'boarding-pass': {
    bg: '#07070A', bgCard: '#0D0B0A', bgPanel: '#1A2744',
    primary: '#5DD9D0', text: '#F0EFF8', textMuted: 'rgba(152,150,176,1)', border: 'rgba(93,217,208,0.3)',
    font: "'Archivo Black', 'Arial Black', sans-serif", mono: "'JetBrains Mono', monospace",
  },
  minimal: {
    bg: '#FAFAFA', bgCard: '#F0F0F0', bgPanel: '#E4E4E4',
    primary: '#1A1A1A', text: '#1A1A1A', textMuted: 'rgba(26,26,26,0.45)', border: 'rgba(26,26,26,0.12)',
    font: "'Inter', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
  },
  reel: {
    bg: '#050A10', bgCard: '#0C1828', bgPanel: '#101E30',
    primary: '#00E5FF', text: '#E0F8FF', textMuted: 'rgba(224,248,255,0.4)', border: 'rgba(0,229,255,0.2)',
    font: "'Space Grotesk', sans-serif", mono: "'JetBrains Mono', monospace",
  },
  stage: {
    bg: '#0C0508', bgCard: '#1C0A12', bgPanel: '#28101C',
    primary: '#C0365A', text: '#F5E8EC', textMuted: 'rgba(245,232,236,0.5)', border: 'rgba(192,54,90,0.3)',
    font: "'Georgia', 'Times New Roman', serif", mono: "'JetBrains Mono', monospace",
  },
}

function resolveLayout(theme: ProfileTheme): LayoutId {
  const lp = theme.layoutPreset
  if (lp === 'poster' || lp === 'corporate' || lp === 'boarding-pass' || lp === 'minimal' || lp === 'reel' || lp === 'stage') return lp
  return 'boarding-pass'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function typeLabel(types: string[] | null): string {
  if (!types || types.length === 0) return 'SPACE'
  return types[0].replace(/_/g, ' ').toUpperCase()
}

function typeIcon(types: string[] | null): string {
  const t = (types?.[0] ?? '').toLowerCase()
  if (t.includes('studio'))  return 'tune'
  if (t.includes('bar'))     return 'local_bar'
  if (t.includes('rooftop')) return 'rooftop_dining'
  if (t.includes('garden') || t.includes('outdoor')) return 'park'
  if (t.includes('gallery')) return 'palette'
  if (t.includes('library')) return 'menu_book'
  if (t.includes('cowork'))  return 'laptop'
  if (t.includes('cafe'))    return 'coffee'
  return 'location_city'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── 1. SHOWCASE (poster/steel) ───────────────────────────────────────────────
// Full-bleed hero image, name as giant bold text at bottom of hero

function ShowcasePreview({ adda, tagline, eventPreferences, highlights, blocks, pageTheme, upcomingEvents }: AddaPagePreviewProps) {
  const p = PALETTES.poster
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  return (
    <div style={{ background: p.bg, color: p.text, minHeight: '100%', fontFamily: p.font }}>
      {/* Mini header */}
      <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: p.bg, borderBottom: `1px solid ${p.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: p.primary, fontFamily: p.mono, letterSpacing: '-0.3px' }}>WIMC</span>
        <span style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{adda.city ?? 'YOUR CITY'}</span>
      </div>

      {/* Hero — full-bleed cover, name overlaid */}
      <div style={{ position: 'relative', height: 200, background: p.bgPanel, overflow: 'hidden' }}>
        {adda.cover_image_url ? (
          <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.65 }} unoptimized />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${p.bgCard} 0%, ${p.bgPanel} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: p.border }}>{typeIcon(adda.adda_type)}</span>
          </div>
        )}
        {/* Gradient overlay — heavy at bottom */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${p.bg} 0%, rgba(20,19,14,0.4) 55%, transparent 100%)` }} />

        {/* Type badge top-left */}
        <div style={{ position: 'absolute', top: 10, left: 12, background: p.primary, color: '#fff', padding: '3px 8px', fontSize: 8, fontFamily: p.mono, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 9 }}>{typeIcon(adda.adda_type)}</span>
          {typeLabel(adda.adda_type)}
        </div>

        {/* Venue name at bottom */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: p.text, lineHeight: 0.9, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>{adda.name}</div>
          {tagline && <div style={{ fontSize: 10, color: p.textMuted, marginTop: 5, fontFamily: p.mono, fontStyle: 'italic' }}>{tagline}</div>}
        </div>
      </div>

      {/* Quick info strip */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${p.border}` }}>
        {[
          { label: 'CAPACITY', value: adda.capacity_max ? `${adda.capacity_max}` : '—' },
          { label: 'CITY', value: adda.city ?? '—' },
          { label: 'TYPE', value: typeLabel(adda.adda_type) },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, padding: '8px 10px', borderRight: `1px solid ${p.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: p.primary, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {highlights.filter(Boolean).length > 0 && (
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>✦ WHAT MAKES IT SPECIAL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {highlights.filter(Boolean).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 8px', background: p.bgCard, border: `1px solid ${p.border}` }}>
                <span style={{ color: p.primary, fontSize: 9, flexShrink: 0 }}>▸</span>
                <span style={{ fontSize: 10, color: p.text, lineHeight: 1.4 }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best for */}
      {eventPreferences.length > 0 && (
        <div style={{ padding: '10px 12px 0' }}>
          <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>BEST FOR</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {eventPreferences.map((ep) => (
              <span key={ep} style={{ fontSize: 8, fontFamily: p.mono, textTransform: 'uppercase', padding: '2px 7px', border: `1px solid ${p.primary}40`, color: p.primary, background: `${p.primary}12` }}>{ep}</span>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {upcomingEvents.length > 0 && (
        <div style={{ padding: '10px 12px 0' }}>
          <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>UPCOMING EVENTS</div>
          {upcomingEvents.slice(0, 2).map((ev) => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${p.border}` }}>
              <span style={{ fontSize: 10, fontFamily: p.mono, color: p.primary, flexShrink: 0, minWidth: 36 }}>{fmtDate(ev.starts_at)}</span>
              <span style={{ fontSize: 11, color: p.text, lineHeight: 1.2 }}>{ev.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Blocks */}
      {visibleBlocks.length > 0 && (
        <div style={{ padding: '10px 12px 24px', '--pp-bg': p.bg, '--pp-primary': p.primary, '--pp-text': p.text, '--pp-text-muted': p.textMuted, '--pp-surface': p.bgCard } as React.CSSProperties}>
          <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>MORE FROM THIS SPACE</div>
          {visibleBlocks.map((block) => <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />)}
        </div>
      )}
    </div>
  )
}

// ─── 2. EVENT HOUSE (corporate/ocean) ────────────────────────────────────────
// Upcoming events front & centre, professional navy feel

function EventHousePreview({ adda, tagline, eventPreferences, highlights, blocks, pageTheme, upcomingEvents }: AddaPagePreviewProps) {
  const p = PALETTES.corporate
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  return (
    <div style={{ background: p.bg, color: p.text, minHeight: '100%', fontFamily: p.font }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', background: p.bgCard, borderBottom: `1px solid ${p.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: p.primary, fontFamily: p.mono }}>WIMC</span>
          <span style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase' }}>{adda.city}</span>
        </div>
        {/* Venue card */}
        <div style={{ background: p.bgPanel, border: `1px solid ${p.border}`, padding: '10px 12px' }}>
          <div style={{ fontSize: 8, color: p.primary, fontFamily: p.mono, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{typeLabel(adda.adda_type)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: p.text, lineHeight: 1.1 }}>{adda.name}</div>
          {tagline && <div style={{ fontSize: 9, color: p.textMuted, marginTop: 4, fontStyle: 'italic' }}>{tagline}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 9, fontFamily: p.mono, color: p.primary }}>{adda.capacity_max ? `${adda.capacity_max} CAP` : '—'}</span>
            <span style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted }}>·</span>
            <span style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted }}>{adda.city}</span>
          </div>
        </div>
      </div>

      {/* Upcoming events — the focal section */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12, color: p.primary }}>event</span>
          <span style={{ fontSize: 9, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>UPCOMING EVENTS</span>
        </div>
        {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((ev) => (
          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: p.bgCard, border: `1px solid ${p.border}`, marginBottom: 4 }}>
            <div style={{ background: p.primary, color: p.bg, padding: '3px 6px', textAlign: 'center', minWidth: 36, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{new Date(ev.starts_at).getDate()}</div>
              <div style={{ fontSize: 7, fontFamily: p.mono, textTransform: 'uppercase' }}>{new Date(ev.starts_at).toLocaleString('en-IN', { month: 'short' })}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: p.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
              <div style={{ fontSize: 8, color: p.textMuted, fontFamily: p.mono, marginTop: 2 }}>
                {new Date(ev.starts_at).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: p.primary, flexShrink: 0 }}>chevron_right</span>
          </div>
        )) : (
          <div style={{ padding: '12px', border: `1px dashed ${p.border}`, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: p.textMuted, fontFamily: p.mono }}>No upcoming events yet</span>
          </div>
        )}
      </div>

      {/* What We Host */}
      {eventPreferences.length > 0 && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>BEST SUITED FOR</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {eventPreferences.map((ep) => (
              <span key={ep} style={{ fontSize: 8, fontFamily: p.mono, padding: '2px 7px', border: `1px solid ${p.primary}50`, color: p.primary, textTransform: 'uppercase' }}>{ep}</span>
            ))}
          </div>
        </div>
      )}

      {/* Highlights as info rows */}
      {highlights.filter(Boolean).length > 0 && (
        <div style={{ padding: '0 14px 10px', borderTop: `1px solid ${p.border}` }}>
          <div style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '10px 0 6px' }}>SPACE HIGHLIGHTS</div>
          {highlights.filter(Boolean).map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingBottom: 5, borderBottom: `1px solid ${p.border}40` }}>
              <span style={{ color: p.primary, fontSize: 10, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 10, color: p.textMuted, lineHeight: 1.4 }}>{h}</span>
            </div>
          ))}
        </div>
      )}

      {/* Blocks */}
      {visibleBlocks.length > 0 && (
        <div style={{ padding: '10px 14px 24px', '--pp-bg': p.bg, '--pp-primary': p.primary, '--pp-text': p.text, '--pp-text-muted': p.textMuted, '--pp-surface': p.bgCard } as React.CSSProperties}>
          <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>MORE FROM THIS SPACE</div>
          {visibleBlocks.map((block) => <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />)}
        </div>
      )}
    </div>
  )
}

// ─── 3. COMMUNITY ADDA (boarding-pass/default) ───────────────────────────────
// Ticket-stub energy, warm orange on dark, culture pass vibe

function CommunityAddaPreview({ adda, tagline, eventPreferences, highlights, blocks, pageTheme, upcomingEvents, contactWhatsapp }: AddaPagePreviewProps) {
  const p = PALETTES['boarding-pass']
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  const waLink = contactWhatsapp ? `https://wa.me/${contactWhatsapp.replace(/\D/g, '').replace(/^(?!91)/, '91')}` : '#'
  return (
    <div style={{ background: p.bg, color: p.text, minHeight: '100%', fontFamily: p.font }}>
      {/* Mini header */}
      <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: '#080808', borderBottom: `1px dashed ${p.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: p.primary, fontFamily: p.mono }}>WIMC</span>
        <span style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{adda.city ?? 'YOUR CITY'}</span>
      </div>

      {/* Cover image */}
      <div style={{ position: 'relative', height: 120, background: p.bgPanel, overflow: 'hidden' }}>
        {adda.cover_image_url ? (
          <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.5 }} unoptimized />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: p.border }}>{typeIcon(adda.adda_type)}</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${p.bg} 0%, rgba(18,18,18,0.3) 100%)` }} />
      </div>

      {/* Ticket-stub header */}
      <div style={{ background: p.bgCard, borderTop: `2px dashed ${p.primary}60`, borderBottom: `2px dashed ${p.primary}60`, padding: '10px 14px', margin: '0' }}>
        <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 3 }}>
          WHEN IN MY CITY PRESENTS
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: p.text, lineHeight: 0.95, textTransform: 'uppercase' }}>{adda.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ background: p.primary, color: '#fff', fontSize: 7, fontFamily: p.mono, padding: '2px 6px', textTransform: 'uppercase', fontWeight: 700 }}>{typeLabel(adda.adda_type)}</span>
          {adda.capacity_max && <span style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted }}>UP TO {adda.capacity_max} PEOPLE</span>}
        </div>
        {tagline && <div style={{ fontSize: 10, color: p.textMuted, marginTop: 5, fontStyle: 'italic', borderLeft: `2px solid ${p.primary}`, paddingLeft: 8 }}>{tagline}</div>}
      </div>

      {/* Perforated divider */}
      <div style={{ height: 10, background: p.bg, borderTop: `1px dashed ${p.border}`, borderBottom: `1px dashed ${p.border}`, margin: '0' }} />

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Best for */}
        {eventPreferences.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>■ BEST FOR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {eventPreferences.map((ep) => (
                <span key={ep} style={{ fontSize: 8, fontFamily: p.mono, textTransform: 'uppercase', padding: '3px 8px', background: `${p.primary}15`, border: `1px solid ${p.primary}40`, color: p.primary }}>{ep}</span>
              ))}
            </div>
          </div>
        )}

        {/* Highlights */}
        {highlights.filter(Boolean).length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>■ WHAT MAKES IT SPECIAL</div>
            {highlights.filter(Boolean).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingBottom: 6 }}>
                <span style={{ color: p.primary, fontSize: 10, flexShrink: 0, marginTop: 1 }}>✦</span>
                <span style={{ fontSize: 10, color: p.text, lineHeight: 1.4 }}>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>■ MORE FROM THIS SPACE</div>
            {upcomingEvents.slice(0, 2).map((ev) => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: p.bgCard, borderLeft: `3px solid ${p.primary}`, marginBottom: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: p.primary, flexShrink: 0 }}>event</span>
                <div>
                  <div style={{ fontSize: 11, color: p.text, fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ fontSize: 8, color: p.textMuted, fontFamily: p.mono, marginTop: 1 }}>{fmtDate(ev.starts_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Blocks */}
        {visibleBlocks.length > 0 && (
          <div style={{ '--pp-bg': p.bg, '--pp-primary': p.primary, '--pp-text': p.text, '--pp-text-muted': p.textMuted, '--pp-surface': p.bgCard } as React.CSSProperties}>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>MORE FROM THIS SPACE</div>
            {visibleBlocks.map((block) => <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />)}
          </div>
        )}

        {/* WhatsApp CTA */}
        {contactWhatsapp && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: p.primary, color: '#fff', textDecoration: 'none', fontFamily: p.mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: '2px solid rgba(255,255,255,0.2)', marginTop: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>
            ENQUIRE VIA WHATSAPP
          </a>
        )}
      </div>
    </div>
  )
}

// ─── 4. OPEN STUDIO (minimal/gallery) ────────────────────────────────────────
// White background, clean Inter type, gallery-white aesthetic

function OpenStudioPreview({ adda, tagline, eventPreferences, highlights, blocks, pageTheme, upcomingEvents }: AddaPagePreviewProps) {
  const p = PALETTES.minimal
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  return (
    <div style={{ background: p.bg, color: p.text, minHeight: '100%', fontFamily: p.font }}>
      {/* Minimal header */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${p.border}` }}>
        <span style={{ fontSize: 10, fontFamily: p.mono, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>WIMC</span>
        <span style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase' }}>{adda.city}</span>
      </div>

      {/* Cover — muted, not dominant */}
      {adda.cover_image_url && (
        <div style={{ position: 'relative', height: 100, overflow: 'hidden', borderBottom: `1px solid ${p.border}` }}>
          <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', filter: 'grayscale(30%)' }} unoptimized />
        </div>
      )}

      {/* Centered venue name */}
      <div style={{ padding: '20px 16px 12px', textAlign: 'center', borderBottom: `1px solid ${p.border}` }}>
        <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>{typeLabel(adda.adda_type)}</div>
        <div style={{ fontSize: 22, fontWeight: 300, color: p.text, letterSpacing: '-0.3px', lineHeight: 1.1 }}>{adda.name}</div>
        {tagline && <div style={{ fontSize: 10, color: p.textMuted, marginTop: 6 }}>{tagline}</div>}
        <div style={{ width: 32, height: 1, background: p.primary, margin: '10px auto 0' }} />
      </div>

      {/* Location + capacity pill row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${p.border}` }}>
        {[adda.city, adda.capacity_max ? `Up to ${adda.capacity_max}` : null].filter(Boolean).map((val) => (
          <span key={val} style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{val}</span>
        ))}
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Best for — horizontal pills */}
        {eventPreferences.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Perfect for</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {eventPreferences.map((ep) => (
                <span key={ep} style={{ fontSize: 9, padding: '3px 8px', border: `1px solid ${p.border}`, color: p.text, textTransform: 'capitalize' }}>{ep.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {/* Highlights — clean list */}
        {highlights.filter(Boolean).length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Highlights</div>
            {highlights.filter(Boolean).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${p.border}` }}>
                <span style={{ fontSize: 10, color: p.primary, flexShrink: 0 }}>—</span>
                <span style={{ fontSize: 10, color: p.text }}>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Events — minimal list style */}
        {upcomingEvents.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Upcoming</div>
            {upcomingEvents.slice(0, 3).map((ev) => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${p.border}` }}>
                <span style={{ fontSize: 11, color: p.text }}>{ev.title}</span>
                <span style={{ fontSize: 9, fontFamily: p.mono, color: p.textMuted, flexShrink: 0, marginLeft: 8 }}>{fmtDate(ev.starts_at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Blocks */}
        {visibleBlocks.length > 0 && (
          <div style={{ '--pp-bg': p.bg, '--pp-primary': p.primary, '--pp-text': p.text, '--pp-text-muted': p.textMuted, '--pp-surface': p.bgCard } as React.CSSProperties}>
            {visibleBlocks.map((block) => <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 5. NIGHTSPOT (reel/electric) ────────────────────────────────────────────
// Electric cyan on near-black, glow effects, nightlife energy

function NightspotPreview({ adda, tagline, eventPreferences, highlights, blocks, pageTheme, upcomingEvents, contactWhatsapp }: AddaPagePreviewProps) {
  const p = PALETTES.reel
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  const waLink = contactWhatsapp ? `https://wa.me/${contactWhatsapp.replace(/\D/g, '').replace(/^(?!91)/, '91')}` : '#'
  return (
    <div style={{ background: p.bg, color: p.text, minHeight: '100%', fontFamily: p.font }}>

      {/* Gradient hero */}
      <div style={{ position: 'relative', height: 190, background: `linear-gradient(160deg, #050A10 0%, #0A1828 50%, #050A10 100%)`, overflow: 'hidden' }}>
        {adda.cover_image_url && (
          <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.2, mixBlendMode: 'luminosity' }} unoptimized />
        )}
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, background: `radial-gradient(circle, ${p.primary}25 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, background: `radial-gradient(circle, ${p.primary}15 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* WIMC header overlay */}
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 14px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: p.primary, fontFamily: p.mono, letterSpacing: '0.2em' }}>WIMC</span>
          <span style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase' }}>{adda.city}</span>
        </div>

        {/* Type chip */}
        <div style={{ position: 'absolute', top: 32, left: 14 }}>
          <span style={{ background: `${p.primary}20`, border: `1px solid ${p.primary}60`, color: p.primary, fontSize: 8, fontFamily: p.mono, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{typeLabel(adda.adda_type)}</span>
        </div>

        {/* Venue name with glow */}
        <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: p.primary, lineHeight: 0.95, textShadow: `0 0 30px ${p.primary}60, 0 0 60px ${p.primary}25`, textTransform: 'uppercase' }}>{adda.name}</div>
          {tagline && <div style={{ fontSize: 9, color: p.textMuted, marginTop: 5 }}>{tagline}</div>}
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Upcoming events with glow date chips */}
        {upcomingEvents.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 1, background: p.primary, display: 'inline-block' }} />
              UPCOMING
              <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${p.primary}40, transparent)`, display: 'inline-block' }} />
            </div>
            {upcomingEvents.slice(0, 3).map((ev) => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${p.border}` }}>
                <div style={{ background: `${p.primary}15`, border: `1px solid ${p.primary}50`, padding: '4px 7px', textAlign: 'center', minWidth: 38, flexShrink: 0, boxShadow: `0 0 8px ${p.primary}20` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.primary, lineHeight: 1 }}>{new Date(ev.starts_at).getDate()}</div>
                  <div style={{ fontSize: 6, fontFamily: p.mono, color: p.primary, textTransform: 'uppercase' }}>{new Date(ev.starts_at).toLocaleString('en-IN', { month: 'short' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: p.text, fontWeight: 500, lineHeight: 1.2 }}>{ev.title}</div>
                  <div style={{ fontSize: 8, color: p.textMuted, fontFamily: p.mono, marginTop: 2 }}>
                    {new Date(ev.starts_at).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Best for — electric bordered chips */}
        {eventPreferences.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: p.mono, color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>THIS SPACE IS FOR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {eventPreferences.map((ep) => (
                <span key={ep} style={{ fontSize: 8, fontFamily: p.mono, padding: '3px 8px', border: `1px solid ${p.primary}40`, color: p.primary, textTransform: 'uppercase', background: `${p.primary}08` }}>{ep}</span>
              ))}
            </div>
          </div>
        )}

        {/* Highlights */}
        {highlights.filter(Boolean).length > 0 && (
          <div>
            {highlights.filter(Boolean).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${p.border}40` }}>
                <span style={{ color: p.primary, fontSize: 8, flexShrink: 0, marginTop: 2, textShadow: `0 0 6px ${p.primary}` }}>▸</span>
                <span style={{ fontSize: 10, color: p.textMuted, lineHeight: 1.4 }}>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Blocks */}
        {visibleBlocks.length > 0 && (
          <div style={{ '--pp-bg': p.bg, '--pp-primary': p.primary, '--pp-text': p.text, '--pp-text-muted': p.textMuted, '--pp-surface': p.bgCard } as React.CSSProperties}>
            {visibleBlocks.map((block) => <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />)}
          </div>
        )}

        {/* Glowing CTA */}
        {contactWhatsapp && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'transparent', color: p.primary, textDecoration: 'none', fontFamily: p.mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: `1px solid ${p.primary}`, boxShadow: `0 0 14px ${p.primary}30, inset 0 0 14px ${p.primary}08` }}>
            BOOK THIS SPACE →
          </a>
        )}
      </div>
    </div>
  )
}

// ─── 6. HERITAGE HALL (stage/velvet) ─────────────────────────────────────────
// Deep wine-dark, ornamental rules, centered Playfair type, theatrical

function HeritageHallPreview({ adda, tagline, eventPreferences, highlights, blocks, pageTheme, upcomingEvents }: AddaPagePreviewProps) {
  const p = PALETTES.stage
  const visibleBlocks = blocks.filter((b) => b.is_visible)
  return (
    <div style={{ background: p.bg, color: p.text, minHeight: '100%', fontFamily: p.font }}>

      {/* Cover — dark overlay */}
      <div style={{ position: 'relative', height: 120, background: p.bgPanel, overflow: 'hidden' }}>
        {adda.cover_image_url ? (
          <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.35 }} unoptimized />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${p.bgCard} 0%, ${p.bgPanel} 100%)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${p.bg} 0%, transparent 60%)` }} />

        {/* WIMC header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: p.primary, letterSpacing: '0.15em' }}>WIMC</span>
          <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.textMuted, textTransform: 'uppercase' }}>{adda.city}</span>
        </div>
      </div>

      {/* Ornamental header */}
      <div style={{ textAlign: 'center', padding: '14px 14px 10px', borderBottom: `1px solid ${p.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${p.primary}60)` }} />
          <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.primary, textTransform: 'uppercase', letterSpacing: '0.2em' }}>✦ {typeLabel(adda.adda_type)} ✦</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${p.primary}60)` }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: p.text, lineHeight: 1, letterSpacing: '0.5px', fontStyle: 'italic' }}>{adda.name}</div>
        {tagline && <div style={{ fontSize: 9, color: p.textMuted, marginTop: 6, letterSpacing: '0.05em' }}>{tagline}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${p.border})` }} />
          <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", color: p.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{adda.city}</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${p.border})` }} />
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* PROGRAMME — events as dated entries */}
        {upcomingEvents.length > 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.primary, textTransform: 'uppercase', letterSpacing: '0.2em' }}>— PROGRAMME —</span>
            </div>
            {upcomingEvents.slice(0, 3).map((ev, i) => (
              <div key={ev.id} style={{ padding: '8px 0', borderBottom: `1px solid ${p.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.primary, marginBottom: 3, letterSpacing: '0.1em' }}>{fmtDate(ev.starts_at)}</div>
                <div style={{ fontSize: 12, color: p.text, fontStyle: i % 2 === 0 ? 'italic' : 'normal', letterSpacing: '0.02em' }}>{ev.title}</div>
              </div>
            ))}
          </div>
        )}

        {/* Hosted events / event prefs */}
        {eventPreferences.length > 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.primary, textTransform: 'uppercase', letterSpacing: '0.2em' }}>— HOSTED EVENTS —</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
              {eventPreferences.map((ep) => (
                <span key={ep} style={{ fontSize: 9, padding: '3px 8px', border: `1px solid ${p.primary}40`, color: p.textMuted, textTransform: 'capitalize' }}>{ep.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {/* Highlights as elegant rows */}
        {highlights.filter(Boolean).length > 0 && (
          <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.primary, textTransform: 'uppercase', letterSpacing: '0.2em' }}>— FACILITIES —</span>
            </div>
            {highlights.filter(Boolean).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${p.border}50`, alignItems: 'flex-start' }}>
                <span style={{ color: p.primary, fontSize: 9, flexShrink: 0, marginTop: 1 }}>·</span>
                <span style={{ fontSize: 10, color: p.textMuted, lineHeight: 1.4, fontStyle: 'italic' }}>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Blocks */}
        {visibleBlocks.length > 0 && (
          <div style={{ '--pp-bg': p.bg, '--pp-primary': p.primary, '--pp-text': p.text, '--pp-text-muted': p.textMuted, '--pp-surface': p.bgCard } as React.CSSProperties}>
            {visibleBlocks.map((block) => <BlockRenderer key={block.id} block={block} theme={pageTheme} isPreview />)}
          </div>
        )}

        {/* Enquire CTA */}
        <div style={{ textAlign: 'center', padding: '12px 0', borderTop: `1px solid ${p.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, background: p.border }} />
            <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: p.primary, letterSpacing: '0.15em', textTransform: 'uppercase' }}>ENQUIRE</span>
            <div style={{ flex: 1, height: 1, background: p.border }} />
          </div>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: p.textMuted, letterSpacing: '0.05em' }}>wheninmycity.com/adda/{adda.slug}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function AddaPreviewContent(props: AddaPagePreviewProps) {
  const layout = resolveLayout(props.pageTheme)
  switch (layout) {
    case 'poster':        return <ShowcasePreview      {...props} />
    case 'corporate':     return <EventHousePreview    {...props} />
    case 'minimal':       return <OpenStudioPreview    {...props} />
    case 'reel':          return <NightspotPreview     {...props} />
    case 'stage':         return <HeritageHallPreview  {...props} />
    case 'boarding-pass':
    default:              return <CommunityAddaPreview {...props} />
  }
}

// ─── Main export: scaled phone frame ─────────────────────────────────────────

export default function AddaPagePreview(props: AddaPagePreviewProps) {
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
    <div
      ref={containerRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 0', overflow: 'hidden' }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', height: `${(PHONE_H * scale).toFixed(0)}px`, width: 375, flexShrink: 0 }}>
        <div style={{ width: 375, height: PHONE_H, overflow: 'hidden', borderRadius: 44, border: '10px solid #1e1e24', boxShadow: '0 24px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
          {/* Status bar */}
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
            <AddaPreviewContent {...props} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DD9D0' }} />
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          Live Preview · wheninmycity.com/adda/{props.adda.slug}
        </span>
      </div>
    </div>
  )
}
