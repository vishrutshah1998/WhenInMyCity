import Link from 'next/link'
import type { Event } from '@/types/database'

// Shared between dashboard/page.tsx (desktop) and CreatorHomeMobile.tsx (the
// carousel's Home slot) — kept in their own module rather than exported from
// page.tsx directly, since Next.js's App Router only permits a small set of
// recognized named exports (metadata, generateMetadata, …) from a page.tsx
// file; anything else fails the generated route-type check.

// Perforated divider used on ticket/boarding-pass cards
export const PERF_STYLE: React.CSSProperties = {
  width: 1,
  flexShrink: 0,
  background: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, rgba(26,39,68,0.18) 4px, rgba(26,39,68,0.18) 8px)',
}

export function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    day:   d.getDate().toString(),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year:  d.getFullYear().toString(),
  }
}

// Compact rupee display for headline stat — matches the paise() format in payouts pages.
export function formatPaiseCompact(p: number): string {
  const r = p / 100
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`
  if (r >= 1000)   return `₹${(r / 1000).toFixed(1)}k`
  return '₹' + Math.round(r).toLocaleString('en-IN')
}

export function formatPaiseFull(p: number): string {
  return '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── EventTicket ───────────────────────────────────────────────────────────────
// Inspired by: stamp perforations, concert ticket stubs

export function EventTicket({ ev, soldCount = 0 }: { ev: Event; soldCount?: number }) {
  const { day, month, year } = fmtDate(ev.starts_at)
  return (
    <Link
      href={`/dashboard/events/${ev.id}/manage`}
      style={{ display: 'flex', textDecoration: 'none', borderBottom: '1px solid rgba(26,39,68,0.07)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(26,39,68,0.02)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      {/* Left date stamp — coral */}
      <div style={{
        width: 64, flexShrink: 0, background: '#E8705A',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px 8px',
      }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1, fontFamily: 'var(--font-syne)' }}>{day}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: 1, marginTop: 2 }}>{month}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 1 }}>{year}</span>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1A2744', fontFamily: 'var(--font-dm-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {ev.title}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(26,39,68,0.45)', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📍 {ev.venue_name}
        </p>
      </div>

      {/* Perforated divider */}
      <div style={PERF_STYLE} />

      {/* Stub — ticket count */}
      <div style={{
        width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '14px 10px',
        background: 'rgba(26,39,68,0.025)',
      }}>
        <span style={{ fontSize: 9, color: 'rgba(26,39,68,0.4)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', marginBottom: 4 }}>SOLD</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#E8705A', fontFamily: 'var(--font-syne)', lineHeight: 1 }}>
          {soldCount}{ev.capacity ? `/${ev.capacity}` : ''}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'rgba(26,39,68,0.25)', marginTop: 4 }}>chevron_right</span>
      </div>
    </Link>
  )
}
