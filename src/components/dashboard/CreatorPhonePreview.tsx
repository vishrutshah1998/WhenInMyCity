'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import { DEFAULT_PROFILE_THEME } from '@/types/theme'
import BlockRenderer from '@/components/profile/BlockRenderer'

// ─── Types ────────────────────────────────────────────────────────────────────

type LayoutPresetId = 'boarding-pass' | 'poster' | 'editorial' | 'minimal' | 'reel' | 'corporate' | 'stage' | 'zine'

export interface CreatorPhonePreviewProps {
  profile: UserProfile
  blocks:  PageBlock[]
  events?: Event[]
  theme?:  ProfileTheme
}

interface SubProps {
  profile: UserProfile
  blocks:  PageBlock[]
  events:  Event[]
  theme:   ProfileTheme
  accent:  string
}

// ─── Accent map (verbatim from PublicProfilePage.tsx) ─────────────────────────

const ACCENT_MAP: Record<ProfileTheme['colorScheme'], string> = {
  default:     '#E8572A', midnight:    '#818CF8', ocean:       '#22D3EE',
  forest:      '#6EE7B7', blush:       '#E11D48', sand:        '#B45309',
  pista:       '#2D7A4F', gulaal:      '#E8342A', neel:        '#F5A800',
  turmeric:    '#F5A800', steel:       '#5B8DEF', sienna:      '#C04A00',
  indigo:      '#818CF8', aurora:      '#D946EF', sage:        '#3D7F53',
  mint:        '#0C8B6B', electric:    '#00E5FF', velvet:      '#8B2340',
  nightforest: '#7EC8A0', parchment:   '#4A3728', gallery:     '#1A1A1A',
  terracotta:  '#C4552A',
}

const LIGHT_SCHEMES = new Set(['blush', 'sand', 'parchment', 'gallery'])

function resolveLayout(theme: ProfileTheme): LayoutPresetId {
  const lp = theme.layoutPreset
  if (lp === 'boarding-pass' || lp === 'poster' || lp === 'editorial' || lp === 'minimal'
   || lp === 'reel' || lp === 'corporate' || lp === 'stage' || lp === 'zine') return lp
  return 'boarding-pass'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function initial(name: string) { return (name ?? '?')[0].toUpperCase() }

// ─── Shared mini WIMC header ──────────────────────────────────────────────────

function MiniHeader({ accent, username, city, light }: { accent: string; username: string; city: string; light?: boolean }) {
  const text = light ? 'rgba(0,0,0,0.7)' : accent
  const muted = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'
  const border = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const bg = light ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.5)'
  return (
    <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: bg, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: text, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.3px' }}>WIMC</span>
      <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        @{username} · {city}
      </span>
    </div>
  )
}

// ─── Shared blocks wrapper ────────────────────────────────────────────────────

function BlocksSection({ blocks, theme, accent, bg, text, textMuted, surface }: {
  blocks: PageBlock[]; theme: ProfileTheme; accent: string
  bg: string; text: string; textMuted: string; surface: string
}) {
  const visible = blocks.filter(b => b.is_visible)
  if (!visible.length) return null
  return (
    <div style={{
      padding: '12px 14px 24px',
      '--pp-bg': bg,
      '--pp-primary': accent,
      '--pp-text': text,
      '--pp-text-muted': textMuted,
      '--pp-surface': surface,
    } as React.CSSProperties}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(b => <BlockRenderer key={b.id} block={b} theme={theme} isPreview />)}
      </div>
    </div>
  )
}

// ─── 1. BOARDING-PASS ─────────────────────────────────────────────────────────

function BoardingPassPreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#121212'
  const text = '#F2F0EF'
  const textMuted = 'rgba(242,240,239,0.45)'
  const border = `${accent}40`
  const surface = '#1E1E1E'
  const MONO = "'JetBrains Mono', monospace"
  const DISPLAY = "'Archivo Black', 'Arial Black', sans-serif"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%', fontFamily: DISPLAY }}>
      <MiniHeader accent={accent} username={profile.username} city={profile.city ?? ''} />

      {/* Paper card */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{
          position: 'relative',
          background: '#FAF7F0',
          border: '2px dashed rgba(0,0,0,0.15)',
          paddingBottom: 24,
          clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 8px), 97% 100%, 92% calc(100% - 9px), 86% 100%, 79% calc(100% - 7px), 73% 100%, 66% calc(100% - 9px), 60% 100%, 53% calc(100% - 8px), 47% 100%, 40% calc(100% - 9px), 33% 100%, 27% calc(100% - 7px), 21% 100%, 15% calc(100% - 9px), 9% 100%, 4% calc(100% - 8px), 0% 100%)',
        }}>
          {/* Accent left bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }} />

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 0 18px' }}>
            <span style={{ fontSize: 8, fontFamily: MONO, color: 'rgba(26,17,8,0.5)', textTransform: 'uppercase', letterSpacing: '0.18em', lineHeight: 1 }}>
              BOARDING NOW · CULTURE PASS · {(profile.city ?? '').toUpperCase()}
            </span>
            <span style={{ fontSize: 8, fontFamily: MONO, color: 'rgba(26,17,8,0.4)', lineHeight: 1, flexShrink: 0 }}>
              № {profile.id.slice(-6).toUpperCase()}
            </span>
          </div>

          {/* Name */}
          <div style={{ padding: '8px 14px 0 18px' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#1A1108', lineHeight: 0.9, textTransform: 'uppercase', letterSpacing: '-0.04em' }}>
              {profile.display_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 10, fontFamily: MONO, color: 'rgba(26,17,8,0.4)' }}>@{profile.username}</span>
            </div>
          </div>

          {/* Stats */}
          {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
            <div style={{ display: 'flex', gap: 16, padding: '10px 18px 0', borderTop: '1px dashed rgba(26,17,8,0.12)', marginTop: 10 }}>
              {profile.cumulative_events_hosted > 0 && (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1A1108', lineHeight: 1 }}>{profile.cumulative_events_hosted}</div>
                  <div style={{ fontSize: 7, fontFamily: MONO, color: 'rgba(26,17,8,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>EVENTS</div>
                </div>
              )}
              {profile.cumulative_unique_attendees > 0 && (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1A1108', lineHeight: 1 }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 7, fontFamily: MONO, color: 'rgba(26,17,8,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>ATTENDEES</div>
                </div>
              )}
            </div>
          )}

          {/* Avatar — overlapping bottom-right */}
          <div style={{ position: 'absolute', bottom: -28, right: 14, zIndex: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid #FAF7F0', overflow: 'hidden', background: '#e0d8cc' }}>
              {profile.avatar_url
                ? <Image src={profile.avatar_url} alt={profile.display_name} width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'rgba(26,17,8,0.3)' }}>{initial(profile.display_name)}</div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Perforated divider */}
      <div style={{ height: 8, background: bg, marginTop: 28 }} />
      <div style={{ height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)', margin: '0 14px' }} />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Bio */}
        {profile.bio && (
          <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{profile.bio}</p>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 7, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>■ UPCOMING</div>
            {events.slice(0, 2).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: surface, borderLeft: `3px solid ${accent}`, marginBottom: 5 }}>
                <span style={{ fontSize: 9, fontFamily: MONO, color: accent, flexShrink: 0, minWidth: 32 }}>{fmtDate(ev.starts_at)}</span>
                <span style={{ fontSize: 10, color: text, lineHeight: 1.2 }}>{ev.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />

      {/* Footer band */}
      <div style={{ background: accent, overflow: 'hidden', padding: '4px 0' }}>
        <div style={{ fontSize: 8, fontFamily: MONO, color: bg, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '0 16px', whiteSpace: 'nowrap' }}>
          WHENINMYCITY.COM/{profile.username} · {(profile.city ?? '').toUpperCase()} ·&nbsp;
          WHENINMYCITY.COM/{profile.username} · {(profile.city ?? '').toUpperCase()} ·
        </div>
      </div>
    </div>
  )
}

// ─── 2. POSTER ────────────────────────────────────────────────────────────────

function PosterPreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#14130E'
  const text = '#E7E2D8'
  const textMuted = 'rgba(231,226,216,0.5)'
  const surface = '#1E1D18'
  const MONO = "'JetBrains Mono', monospace"
  const DISPLAY = "'Archivo Black', 'Arial Black', sans-serif"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%', fontFamily: DISPLAY }}>
      {/* Full-bleed hero with accent background */}
      <div style={{ position: 'relative', background: accent, minHeight: 190, overflow: 'hidden' }}>
        {/* WIMC stamp top */}
        <div style={{ position: 'absolute', top: 10, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.85)', fontFamily: MONO, letterSpacing: '0.15em' }}>WIMC</span>
          <span style={{ fontSize: 8, fontFamily: MONO, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{profile.city}</span>
        </div>

        {/* Avatar centered */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.25)', overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.display_name} width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>{initial(profile.display_name)}</div>
            }
          </div>
        </div>

        {/* Name */}
        <div style={{ textAlign: 'center', padding: '8px 12px 14px' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', textTransform: 'uppercase', lineHeight: 0.88, letterSpacing: '-0.04em' }}>
            {profile.display_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7 }}>✦</span>
            <span style={{ fontSize: 8, fontFamily: MONO, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
              {(profile.city ?? '').toUpperCase()} · {new Date().getFullYear()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7 }}>✦</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {profile.bio && (
          <p style={{ fontSize: 11, lineHeight: 1.5, color: textMuted, margin: 0 }}>{profile.bio}</p>
        )}

        {/* Stats */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div style={{ display: 'flex', gap: 16, borderTop: `1px solid ${accent}30`, paddingTop: 10 }}>
            {profile.cumulative_events_hosted > 0 && (
              <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>{profile.cumulative_events_hosted}</div>
                <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>EVENTS</div>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>ATTENDEES</div>
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 7, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>UPCOMING</div>
            {events.slice(0, 2).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: `1px solid ${accent}20` }}>
                <span style={{ fontSize: 9, fontFamily: MONO, color: accent, flexShrink: 0 }}>{fmtDate(ev.starts_at)}</span>
                <span style={{ fontSize: 10, color: text, lineHeight: 1.3 }}>{ev.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />
    </div>
  )
}

// ─── 3. EDITORIAL ─────────────────────────────────────────────────────────────

function EditorialPreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#FAFAF8'
  const text = '#111111'
  const textMuted = 'rgba(17,17,17,0.45)'
  const border = 'rgba(17,17,17,0.12)'
  const surface = '#F0EFED'
  const MONO = "'JetBrains Mono', monospace"
  const DISPLAY = "'Playfair Display', Georgia, serif"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%' }}>
      <MiniHeader accent={accent} username={profile.username} city={profile.city ?? ''} light />

      {/* Masthead */}
      <div style={{ padding: '10px 14px', borderBottom: `2px solid ${text}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
          <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            WHEN IN MY CITY · {(profile.city ?? '').toUpperCase()}
          </span>
          <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            {new Date().getFullYear()}
          </span>
        </div>
      </div>

      {/* Main identity: name left, avatar right */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: `1px solid ${border}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: text, lineHeight: 0.88, letterSpacing: '-0.03em', fontFamily: DISPLAY }}>
            {profile.display_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 9, fontFamily: MONO, color: textMuted }}>@{profile.username}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: accent, flexShrink: 0 }} />
            <span style={{ fontSize: 8, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{profile.city}</span>
          </div>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: '50%', border: `2px solid ${border}`, overflow: 'hidden', background: surface, flexShrink: 0 }}>
          {profile.avatar_url
            ? <Image src={profile.avatar_url} alt={profile.display_name} width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: textMuted }}>{initial(profile.display_name)}</div>
          }
        </div>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Bio */}
        {profile.bio && (
          <p style={{ fontSize: 11, lineHeight: 1.6, color: textMuted, margin: 0, fontStyle: 'italic', fontFamily: DISPLAY }}>{profile.bio}</p>
        )}

        {/* Stats */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div style={{ display: 'flex', gap: 20, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
            {profile.cumulative_events_hosted > 0 && (
              <div>
                <span style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: DISPLAY }}>{profile.cumulative_events_hosted}</span>
                <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, marginLeft: 5, textTransform: 'uppercase' }}>Events</span>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div>
                <span style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: DISPLAY }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</span>
                <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, marginLeft: 5, textTransform: 'uppercase' }}>Attendees</span>
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 5 }}>Upcoming</div>
            {events.slice(0, 3).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderBottom: `1px solid ${border}` }}>
                <span style={{ fontSize: 9, fontFamily: MONO, color: textMuted, flexShrink: 0, minWidth: 28 }}>
                  {new Date(ev.starts_at).getDate()}/{new Date(ev.starts_at).getMonth() + 1}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: text, lineHeight: 1.2 }}>{ev.title}</span>
                <span style={{ fontSize: 9, fontFamily: MONO, color: accent, flexShrink: 0 }}>
                  {ev.ticket_price === 0 ? 'FREE' : `₹${(ev.ticket_price / 100).toLocaleString('en-IN')}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />
    </div>
  )
}

// ─── 4. MINIMAL ───────────────────────────────────────────────────────────────

function MinimalPreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#FAFAFA'
  const text = '#1A1A1A'
  const textMuted = 'rgba(26,26,26,0.45)'
  const border = 'rgba(26,26,26,0.10)'
  const surface = '#F0F0F0'
  const MONO = "'JetBrains Mono', monospace"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%' }}>
      <MiniHeader accent={accent} username={profile.username} city={profile.city ?? ''} light />

      {/* Centered identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 16px', borderBottom: `1px solid ${border}`, gap: 10 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${surface}`, overflow: 'hidden', background: surface, boxShadow: `0 0 0 2px ${border}` }}>
          {profile.avatar_url
            ? <Image src={profile.avatar_url} alt={profile.display_name} width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: textMuted }}>{initial(profile.display_name)}</div>
          }
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: text, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{profile.display_name}</div>
          <p style={{ fontSize: 9, fontFamily: MONO, color: textMuted, marginTop: 3 }}>@{profile.username}</p>
        </div>

        {/* Category pill */}
        <span style={{ fontSize: 9, fontFamily: MONO, padding: '4px 12px', background: `${accent}15`, color: accent, border: `1px solid ${accent}30`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {profile.city ?? 'Creator'}
        </span>

        {profile.bio && (
          <p style={{ fontSize: 11, color: textMuted, textAlign: 'center', lineHeight: 1.5, maxWidth: 280, margin: 0 }}>{profile.bio}</p>
        )}
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Stats */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
            {profile.cumulative_events_hosted > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: accent }}>{profile.cumulative_events_hosted}</div>
                <div style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', marginTop: 2 }}>Events</div>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: accent }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', marginTop: 2 }}>Attendees</div>
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Upcoming</div>
            {events.slice(0, 3).map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                <span style={{ fontSize: 11, color: text }}>{ev.title}</span>
                <span style={{ fontSize: 9, fontFamily: MONO, color: textMuted, flexShrink: 0, marginLeft: 8 }}>{fmtDate(ev.starts_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />
    </div>
  )
}

// ─── 5. REEL ──────────────────────────────────────────────────────────────────

function ReelPreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#050A10'
  const text = 'rgba(255,255,255,0.92)'
  const textMuted = 'rgba(255,255,255,0.40)'
  const border = `${accent}25`
  const surface = '#0C1828'
  const MONO = "'JetBrains Mono', monospace"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%' }}>
      {/* Gradient hero */}
      <div style={{ position: 'relative', height: 200, background: `linear-gradient(160deg, #050A10 0%, #0A1828 50%, #050A10 100%)`, overflow: 'hidden' }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -10, left: -10, width: 100, height: 100, background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* WIMC top */}
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 14px', zIndex: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: accent, fontFamily: MONO, letterSpacing: '0.15em' }}>WIMC</span>
          <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase' }}>{profile.city}</span>
        </div>

        {/* Avatar centered with glow ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, gap: 8 }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(0,0,0,0.3)', boxShadow: `0 0 0 3px ${accent}, 0 0 32px ${accent}70`, background: surface }}>
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.display_name} width={76} height={76} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: accent }}>{initial(profile.display_name)}</div>
            }
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: text, letterSpacing: '-0.02em', lineHeight: 1 }}>{profile.display_name}</div>
            <div style={{ fontSize: 8, fontFamily: MONO, color: textMuted, marginTop: 4 }}>@{profile.username} · {profile.city}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Bio */}
        {profile.bio && (
          <p style={{ fontSize: 11, lineHeight: 1.5, color: textMuted, margin: 0 }}>{profile.bio}</p>
        )}

        {/* Stats */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div style={{ display: 'flex', gap: 16 }}>
            {profile.cumulative_events_hosted > 0 && (
              <div style={{ background: surface, border: `1px solid ${border}`, padding: '8px 12px', flex: 1, textAlign: 'center', boxShadow: `0 0 8px ${accent}10` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: accent, lineHeight: 1 }}>{profile.cumulative_events_hosted}</div>
                <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', marginTop: 3 }}>EVENTS</div>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div style={{ background: surface, border: `1px solid ${border}`, padding: '8px 12px', flex: 1, textAlign: 'center', boxShadow: `0 0 8px ${accent}10` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: accent, lineHeight: 1 }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', marginTop: 3 }}>ATTENDEES</div>
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 7, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 1, background: accent, display: 'inline-block' }} />
              UPCOMING
              <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}40, transparent)`, display: 'inline-block' }} />
            </div>
            {events.slice(0, 2).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                <div style={{ background: `${accent}15`, border: `1px solid ${accent}50`, padding: '4px 7px', textAlign: 'center', minWidth: 34, flexShrink: 0, boxShadow: `0 0 8px ${accent}15` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: accent, lineHeight: 1 }}>{new Date(ev.starts_at).getDate()}</div>
                  <div style={{ fontSize: 6, fontFamily: MONO, color: accent, textTransform: 'uppercase' }}>{new Date(ev.starts_at).toLocaleString('en-IN', { month: 'short' })}</div>
                </div>
                <span style={{ fontSize: 10, color: text, lineHeight: 1.2 }}>{ev.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />

      {/* Glow footer */}
      <div style={{ background: accent, overflow: 'hidden', padding: '4px 0' }}>
        <div style={{ fontSize: 8, fontFamily: MONO, color: bg, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '0 14px', whiteSpace: 'nowrap' }}>
          CREATOR · WHENINMYCITY · {(profile.city ?? '').toUpperCase()} ·&nbsp;
          CREATOR · WHENINMYCITY · {(profile.city ?? '').toUpperCase()} ·
        </div>
      </div>
    </div>
  )
}

// ─── 6. CORPORATE ─────────────────────────────────────────────────────────────

function CorporatePreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#071724'
  const bgCard = '#0F2D45'
  const text = '#D0EEFF'
  const textMuted = 'rgba(208,238,255,0.45)'
  const border = `${accent}25`
  const surface = '#0A1D2E'
  const MONO = "'JetBrains Mono', monospace"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header card */}
      <div style={{ background: bgCard, borderBottom: `1px solid ${border}`, padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: accent, fontFamily: MONO }}>WIMC</span>
          <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase' }}>{profile.city}</span>
        </div>

        {/* Avatar + info */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, border: `1px solid ${border}`, overflow: 'hidden', background: surface, flexShrink: 0 }}>
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.display_name} width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: textMuted }}>{initial(profile.display_name)}</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{profile.display_name}</div>
            <div style={{ fontSize: 9, fontFamily: MONO, color: textMuted, marginTop: 3 }}>@{profile.username}{profile.city ? ` · ${profile.city}` : ''}</div>
            <span style={{ display: 'inline-block', marginTop: 5, fontSize: 8, fontFamily: MONO, padding: '2px 8px', background: `${accent}15`, color: accent, border: `1px solid ${accent}30`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Creator
            </span>
            {profile.bio && (
              <p style={{ fontSize: 10, color: textMuted, lineHeight: 1.4, marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${border}` }}>
            {profile.cumulative_events_hosted > 0 && (
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>{profile.cumulative_events_hosted}</span>
                <span style={{ fontSize: 9, fontFamily: MONO, color: textMuted, marginLeft: 5, textTransform: 'uppercase' }}>Events</span>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</span>
                <span style={{ fontSize: 9, fontFamily: MONO, color: textMuted, marginLeft: 5, textTransform: 'uppercase' }}>Attendees</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 11, color: accent }}>event</span>
              <span style={{ fontSize: 8, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>UPCOMING</span>
            </div>
            {events.slice(0, 3).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: bgCard, border: `1px solid ${border}`, marginBottom: 4 }}>
                <div style={{ background: accent, color: bg, padding: '3px 6px', textAlign: 'center', minWidth: 32, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{new Date(ev.starts_at).getDate()}</div>
                  <div style={{ fontSize: 6, fontFamily: MONO, textTransform: 'uppercase' }}>{new Date(ev.starts_at).toLocaleString('en-IN', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 11, color: accent, flexShrink: 0 }}>chevron_right</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />
    </div>
  )
}

// ─── 7. STAGE ─────────────────────────────────────────────────────────────────

function StagePreview({ profile, blocks, events, theme, accent }: SubProps) {
  const bg = '#0C0508'
  const text = '#F5E8EC'
  const textMuted = 'rgba(245,232,236,0.45)'
  const border = `${accent}35`
  const surface = '#1C0A12'
  const MONO = "'JetBrains Mono', monospace"
  const SERIF = "'Georgia', 'Times New Roman', serif"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%', fontFamily: SERIF }}>
      {/* WIMC strip */}
      <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 9, fontFamily: MONO, color: accent, letterSpacing: '0.15em' }}>WIMC</span>
        <span style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase' }}>{profile.city}</span>
      </div>

      {/* Ornamental header */}
      <div style={{ textAlign: 'center', padding: '18px 14px 14px', borderBottom: `1px solid ${border}` }}>
        {/* Top rule with ✦ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${accent}50)` }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.2em' }}>✦ CREATOR ✦</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${accent}50)` }} />
        </div>

        {/* Name centered */}
        <div style={{ fontSize: 30, fontWeight: 700, color: text, lineHeight: 0.95, letterSpacing: '0.02em', fontStyle: 'italic' }}>
          {profile.display_name}
        </div>

        {/* Small avatar below name */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: `2px solid ${accent}40`, overflow: 'hidden', background: surface }}>
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.display_name} width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: textMuted }}>{initial(profile.display_name)}</div>
            }
          </div>
        </div>

        <div style={{ fontSize: 8, fontFamily: MONO, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          @{profile.username}
        </div>

        {profile.bio && (
          <p style={{ fontSize: 11, color: textMuted, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>{profile.bio}</p>
        )}

        {/* Bottom ornamental rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${border})` }} />
          <span style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{profile.city}</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${border})` }} />
        </div>
      </div>

      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Events as programme */}
        {events.length > 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 8, fontFamily: MONO, color: accent, textTransform: 'uppercase', letterSpacing: '0.2em' }}>— PROGRAMME —</span>
            </div>
            {events.slice(0, 3).map((ev, i) => (
              <div key={ev.id} style={{ padding: '7px 0', borderBottom: `1px solid ${border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 7, fontFamily: MONO, color: accent, marginBottom: 2, letterSpacing: '0.1em' }}>{fmtDate(ev.starts_at)}</div>
                <div style={{ fontSize: 11, color: text, fontStyle: i % 2 === 0 ? 'italic' : 'normal', letterSpacing: '0.02em' }}>{ev.title}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div style={{ display: 'flex', gap: 16, borderTop: `1px solid ${border}`, paddingTop: 10, justifyContent: 'center' }}>
            {profile.cumulative_events_hosted > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{profile.cumulative_events_hosted}</div>
                <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', marginTop: 2 }}>EVENTS</div>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', marginTop: 2 }}>ATTENDEES</div>
              </div>
            )}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />
    </div>
  )
}

// ─── 8. ZINE ──────────────────────────────────────────────────────────────────

function ZinePreview({ profile, blocks, events, theme, accent }: SubProps) {
  const isLight = LIGHT_SCHEMES.has(theme.colorScheme)
  const bg = isLight ? '#F5F0E8' : '#0A0A0A'
  const text = isLight ? '#0A0A0A' : '#F0EDE8'
  const textMuted = isLight ? 'rgba(10,10,10,0.4)' : 'rgba(240,237,232,0.4)'
  const border = isLight ? '#0A0A0A' : '#F0EDE8'
  const surface = isLight ? '#E8E2D8' : '#1A1A1A'
  const MONO = "'JetBrains Mono', monospace"
  const DISPLAY = "'Archivo Black', 'Arial Black', sans-serif"

  return (
    <div style={{ background: bg, color: text, minHeight: '100%', fontFamily: DISPLAY }}>
      {/* Heavy top border + label strip */}
      <div style={{ borderBottom: `3px solid ${border}`, padding: '8px 12px 7px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.22em' }}>
            ISSUE NO.1 · WHENINMYCITY.COM
          </span>
          <span style={{ fontSize: 8, fontFamily: MONO, color: text, textTransform: 'uppercase' }}>{(profile.city ?? '').toUpperCase()}</span>
        </div>
      </div>

      {/* Massive name */}
      <div style={{ padding: '10px 12px 6px', borderBottom: `3px solid ${border}` }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: text, lineHeight: 0.85, textTransform: 'uppercase', letterSpacing: '-0.04em' }}>
          {profile.display_name}
        </div>
      </div>

      {/* Bottom strip: avatar + bio */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderBottom: `2px solid ${border}`, alignItems: 'flex-start' }}>
        {profile.avatar_url && (
          <div style={{ width: 52, height: 52, border: `2px solid ${border}`, overflow: 'hidden', flexShrink: 0, filter: 'grayscale(1) contrast(1.1)' }}>
            <Image src={profile.avatar_url} alt={profile.display_name} width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 8, fontFamily: MONO, padding: '2px 6px', background: accent, color: isLight ? '#fff' : bg, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-block', marginBottom: 4 }}>
            {profile.city ?? 'CREATOR'}
          </span>
          {profile.bio && (
            <p style={{ fontSize: 9, fontFamily: MONO, color: textMuted, lineHeight: 1.4, margin: 0 }}>{profile.bio}</p>
          )}
          <p style={{ fontSize: 8, fontFamily: MONO, color: textMuted, marginTop: 3 }}>@{profile.username}</p>
        </div>
      </div>

      <div style={{ padding: '10px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Stats as raw rows */}
        {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
          <div>
            {profile.cumulative_events_hosted > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${text}20` }}>
                <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>EVENTS HOSTED</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: text }}>{profile.cumulative_events_hosted}</span>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${text}20` }}>
                <span style={{ fontSize: 8, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>ATTENDEES</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: text }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5, borderBottom: `2px solid ${border}`, paddingBottom: 4 }}>
              UPCOMING ·
            </div>
            {events.slice(0, 2).map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: `1px solid ${text}15` }}>
                <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 6 }}>
                  <div style={{ fontSize: 10, color: text, fontWeight: 900, lineHeight: 1.1 }}>{ev.title}</div>
                  <div style={{ fontSize: 7, fontFamily: MONO, color: textMuted, marginTop: 2 }}>{fmtDate(ev.starts_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BlocksSection blocks={blocks} theme={theme} accent={accent} bg={bg} text={text} textMuted={textMuted} surface={surface} />
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function CreatorPreviewContent(props: SubProps) {
  switch (resolveLayout(props.theme)) {
    case 'poster':        return <PosterPreview    {...props} />
    case 'editorial':     return <EditorialPreview {...props} />
    case 'minimal':       return <MinimalPreview   {...props} />
    case 'reel':          return <ReelPreview      {...props} />
    case 'corporate':     return <CorporatePreview {...props} />
    case 'stage':         return <StagePreview     {...props} />
    case 'zine':          return <ZinePreview      {...props} />
    case 'boarding-pass':
    default:              return <BoardingPassPreview {...props} />
  }
}

// ─── Main export: self-contained phone frame ──────────────────────────────────

export default function CreatorPhonePreview({ profile, blocks, events = [], theme }: CreatorPhonePreviewProps) {
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

  const resolvedTheme: ProfileTheme = theme ?? DEFAULT_PROFILE_THEME
  const accent = ACCENT_MAP[resolvedTheme.colorScheme] ?? '#E8572A'
  const PHONE_H = 760

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' }}
    >
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        height: `${(PHONE_H * scale).toFixed(0)}px`,
        width: 375,
        flexShrink: 0,
      }}>
        <div style={{
          width: 375,
          height: PHONE_H,
          overflow: 'hidden',
          borderRadius: 44,
          border: '10px solid #1e1e24',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.07)',
        }}>
          {/* Status bar */}
          <div style={{ height: 36, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 110, height: 26, background: '#000', borderRadius: '0 0 18px 18px' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', zIndex: 1 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, zIndex: 1 }}>
              <svg viewBox="0 0 20 14" style={{ width: 15, height: 11, fill: '#fff', opacity: 0.9 }}>
                <rect x="0" y="4" width="3" height="10" rx="1" />
                <rect x="4.5" y="2.5" width="3" height="11.5" rx="1" />
                <rect x="9" y="1" width="3" height="13" rx="1" />
                <rect x="13.5" y="0" width="3" height="14" rx="1" />
              </svg>
              <svg viewBox="0 0 24 16" style={{ width: 14, height: 10, fill: '#fff', opacity: 0.9 }}>
                <path d="M12 3C8.14 3 4.66 4.61 2.19 7.18L0 5C3.05 1.88 7.31 0 12 0s8.95 1.88 12 5l-2.19 2.18C19.34 4.61 15.86 3 12 3z"/>
                <path d="M12 9c-2.05 0-3.91.79-5.3 2.07L4.5 8.87C6.47 7.07 9.11 6 12 6s5.53 1.07 7.5 2.87l-2.2 2.2C15.91 9.79 14.05 9 12 9z"/>
                <circle cx="12" cy="15" r="2.5"/>
              </svg>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 21, height: 10, border: '1.5px solid rgba(255,255,255,0.9)', borderRadius: 3, display: 'flex', alignItems: 'center', padding: '0 1px' }}>
                  <div style={{ height: 6, width: 14, background: 'rgba(255,255,255,0.9)', borderRadius: 1 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ height: PHONE_H - 36, overflowY: 'auto', overflowX: 'hidden' }}>
            <CreatorPreviewContent
              profile={profile}
              blocks={blocks}
              events={events}
              theme={resolvedTheme}
              accent={accent}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
