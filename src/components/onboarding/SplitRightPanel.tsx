'use client'

import { useState, useEffect, useCallback } from 'react'
import { SK } from '@/lib/onboarding/session-keys'
import { CATEGORY_COLOURS } from '@/lib/onboarding/design-tokens'
import ProfilePreview from '@/app/onboarding/creator/_components/ProfilePreview'

// ── Boarding pass barcode strip ───────────────────────────────────────────────
const BARCODE = [3,1,4,2,1,3,1,2,4,1,3,2,1,4,2,1,3,4,1,2,3,1]

// ── Live snapshot of sessionStorage ─────────────────────────────────────────
function readSnapshot() {
  if (typeof window === 'undefined') return null
  try {
    return {
      persona:  sessionStorage.getItem(SK.persona) || '',
      // creator
      c_name:     sessionStorage.getItem(SK.c_name)     || '',
      c_username: sessionStorage.getItem(SK.c_username) || '',
      c_category: sessionStorage.getItem(SK.c_category) || '',
      c_city:     sessionStorage.getItem(SK.c_city)     || '',
      c_subtypes: JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') as string[],
      c_bio:      sessionStorage.getItem(SK.c_bio)      || '',
      // business
      b_name:     sessionStorage.getItem(SK.b_name)     || '',
      b_slug:     sessionStorage.getItem(SK.b_slug)     || '',
      b_city:     sessionStorage.getItem(SK.b_city)     || '',
      b_subpath:  sessionStorage.getItem(SK.b_subpath)  || '',
      v_types:    JSON.parse(sessionStorage.getItem(SK.v_types) || '[]') as string[],
      r_categories: JSON.parse(sessionStorage.getItem(SK.r_categories) || '[]') as string[],
      // explorer
      e_name:     sessionStorage.getItem(SK.e_name)     || '',
      e_username: sessionStorage.getItem(SK.e_username) || '',
      e_city:     sessionStorage.getItem(SK.e_city)     || '',
      e_scene:    sessionStorage.getItem(SK.e_scene)    || '',
    }
  } catch { return null }
}

type Snap = NonNullable<ReturnType<typeof readSnapshot>>

// ── Persona-specific right panel content ─────────────────────────────────────

function CreatorPreview({ snap, pathname }: { snap: Snap; pathname: string }) {
  const accent = CATEGORY_COLOURS[snap.c_category] || '#E8705A'
  const showFull = pathname.includes('/C8') || pathname.includes('/C9')
  const NAVY = '#1A2744'

  if (showFull || snap.c_name) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 32px' }}>
        <div style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'monospace' }}>
          CREATOR PASS
        </div>
        {/* Boarding pass card */}
        <div style={{
          width: '100%',
          maxWidth: 300,
          background: NAVY,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(26,39,68,0.20)',
          border: '1px solid rgba(26,39,68,0.12)',
        }}>
          {/* Left accent bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />

          {/* Header strip */}
          <div style={{
            padding: '8px 14px 6px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: `linear-gradient(90deg, ${accent}12, transparent 60%)`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.22em', color: `${accent}99`, textTransform: 'uppercase' }}>
              WHEN IN MY CITY
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 7.5, color: `${accent}55`, letterSpacing: '0.14em' }}>
              CREATOR PASS
            </span>
          </div>

          {/* Main content via ProfilePreview (compact) */}
          <div style={{ minHeight: 200 }}>
            <ProfilePreview
              displayName={snap.c_name || 'Your Name'}
              username={snap.c_username || 'yourname'}
              city={snap.c_city}
              category={snap.c_category}
              subTypes={snap.c_subtypes}
              bio={snap.c_bio || undefined}
            />
          </div>
        </div>

        {/* Perforated tear line */}
        <div style={{ width: '100%', maxWidth: 300, height: 1, background: 'repeating-linear-gradient(90deg, rgba(26,39,68,0.18), rgba(26,39,68,0.18) 4px, transparent 4px, transparent 8px)', margin: '0' }} />

        {/* Stub */}
        <div style={{
          width: '100%', maxWidth: 300,
          background: NAVY,
          padding: '8px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 8px 24px rgba(26,39,68,0.12)',
        }}>
          <div style={{ display: 'flex', gap: 2, height: 12, alignItems: 'center' }}>
            {BARCODE.map((w, i) => (
              <div key={i} style={{ width: w, height: '100%', background: 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 6, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            ADMIT ONE
          </span>
        </div>
      </div>
    )
  }

  // Before any data — show static editorial
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '40px 48px' }}>
      {[
        { word: 'YOUR',    color: 'rgba(26,39,68,0.18)', size: 'clamp(52px,6vw,84px)'  },
        { word: 'CREATOR', color: '#E8705A',              size: 'clamp(40px,4.5vw,64px)' },
        { word: 'PASS',    color: 'rgba(26,39,68,0.18)', size: 'clamp(52px,6vw,84px)'  },
        { word: 'AWAITS.', color: 'rgba(26,39,68,0.14)', size: 'clamp(36px,4vw,56px)'  },
      ].map(({ word, color, size }, i) => (
        <div key={i} style={{ fontFamily: 'var(--font-syne), Outfit, sans-serif', fontWeight: 900, fontSize: size, color, lineHeight: 1.0, letterSpacing: '-0.03em', userSelect: 'none' }}>
          {word}
        </div>
      ))}
    </div>
  )
}

function BusinessPreview({ snap }: { snap: Snap }) {
  const isVenue = snap.b_subpath === 'venue' || snap.v_types.length > 0
  const accent  = isVenue ? '#5DD9D0' : '#F5A800'
  const NAVY    = '#1A2744'
  const name    = snap.b_name || (isVenue ? 'Your Venue' : 'Your Brand')
  const slug    = snap.b_slug || 'yourspace'
  const city    = snap.b_city || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 32px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'monospace' }}>
        {isVenue ? 'VENUE CARD' : 'BRAND CARD'}
      </div>

      {/* Business card */}
      <div style={{
        width: '100%', maxWidth: 300,
        background: NAVY,
        padding: '0 0 0',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(26,39,68,0.20)',
        border: '1px solid rgba(26,39,68,0.12)',
      }}>
        {/* Accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />

        {/* Header */}
        <div style={{
          padding: '10px 14px 8px 14px',
          borderBottom: `1px solid ${accent}18`,
          background: `linear-gradient(90deg, ${accent}10, transparent 60%)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.22em', color: `${accent}99`, textTransform: 'uppercase' }}>
            WHEN IN MY CITY
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, color: `${accent}55`, letterSpacing: '0.14em' }}>
            {isVenue ? 'VENUE' : 'BRAND'}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 14px' }}>
          {/* Category badge */}
          <div style={{ display: 'inline-block', background: accent, padding: '2px 7px', marginBottom: 10 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 7.5, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isVenue ? (snap.v_types[0]?.toUpperCase() || 'SPACE') : (snap.r_categories[0]?.toUpperCase() || 'BRAND')}
            </span>
          </div>

          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 22, color: '#F0EFF8', textTransform: 'uppercase', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>
            @{slug}
          </div>
          {city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 10, color: accent }}>location_on</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8.5, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                {city.toUpperCase()}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            {[['0', 'EVENTS HOSTED'], ['0', 'BOOKINGS']].map(([val, lbl]) => (
              <div key={lbl} style={{ background: '#FAF7F0', padding: '5px 8px' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 16, color: NAVY, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 5.5, color: `${NAVY}66`, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Barcode stub */}
        <div style={{ borderTop: `1px dashed ${accent}25`, padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, height: 10, alignItems: 'center' }}>
            {BARCODE.map((w, i) => (
              <div key={i} style={{ width: w, height: '100%', background: 'rgba(255,255,255,0.20)' }} />
            ))}
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 5.5, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            WHENINMYCITY.COM
          </span>
        </div>
      </div>
    </div>
  )
}

function ExplorerPreview({ snap }: { snap: Snap }) {
  const ACCENT = '#9B8FFF'
  const NAVY   = '#1A2744'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 32px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(26,39,68,0.35)', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'monospace' }}>
        EXPLORER PASS
      </div>

      <div style={{
        width: '100%', maxWidth: 300,
        background: NAVY,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(26,39,68,0.20)',
        border: '1px solid rgba(26,39,68,0.12)',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: ACCENT }} />

        <div style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${ACCENT}18`,
          background: `linear-gradient(90deg, ${ACCENT}10, transparent 60%)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.22em', color: `${ACCENT}99`, textTransform: 'uppercase' }}>
            WHEN IN MY CITY
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 7.5, color: `${ACCENT}55`, letterSpacing: '0.14em' }}>
            EXPLORER
          </span>
        </div>

        <div style={{ padding: '16px 14px' }}>
          <div style={{ display: 'inline-block', background: ACCENT, padding: '2px 7px', marginBottom: 10 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 7.5, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {snap.e_scene?.toUpperCase() || 'EXPLORER'}
            </span>
          </div>

          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 22, color: '#F0EFF8', textTransform: 'uppercase', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {snap.e_name || 'YOUR NAME'}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.40)', marginBottom: 12 }}>
            @{snap.e_username || 'yourname'}
          </div>
          {snap.e_city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 10, color: ACCENT }}>explore</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8.5, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                {snap.e_city.toUpperCase()}
              </span>
            </div>
          )}

          <div style={{ background: '#FAF7F0', padding: '8px 10px', marginTop: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 6.5, letterSpacing: '0.18em', color: `${NAVY}55`, textTransform: 'uppercase', marginBottom: 4 }}>
              DISCOVERING IN
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 14, color: NAVY }}>
              {snap.e_city || 'Your City'}, INDIA
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px dashed ${ACCENT}25`, padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, height: 10, alignItems: 'center' }}>
            {BARCODE.map((w, i) => (
              <div key={i} style={{ width: w, height: '100%', background: 'rgba(255,255,255,0.20)' }} />
            ))}
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 5.5, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            WHENINMYCITY.COM
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SplitRightPanel({ pathname }: { pathname: string }) {
  const [snap, setSnap] = useState<Snap | null>(null)

  const refresh = useCallback(() => setSnap(readSnapshot()), [])

  useEffect(() => {
    refresh()
    window.addEventListener('storage', refresh)
    // Poll sessionStorage (same-tab writes don't fire storage events)
    const iv = setInterval(refresh, 800)
    return () => {
      window.removeEventListener('storage', refresh)
      clearInterval(iv)
    }
  }, [refresh])

  if (!snap) return null

  const persona = snap.persona
    || (pathname.startsWith('/onboarding/creator')  ? 'creator'
      : pathname.startsWith('/onboarding/business') ? 'business'
      : pathname.startsWith('/onboarding/explorer') ? 'explorer'
      : '')

  return (
    <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      {persona === 'creator'  && <CreatorPreview  snap={snap} pathname={pathname} />}
      {persona === 'business' && <BusinessPreview snap={snap} />}
      {persona === 'explorer' && <ExplorerPreview snap={snap} />}

      {/* Watermark step label */}
      <div style={{
        position: 'absolute', bottom: 20, right: 28,
        fontFamily: 'var(--font-syne), Outfit, sans-serif',
        fontWeight: 900,
        fontSize: 'clamp(48px, 6vw, 90px)',
        color: 'rgba(26,39,68,0.06)',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none',
      }}>
        {pathname.split('/').pop()?.toUpperCase()}
      </div>
    </div>
  )
}
