'use client'

// =============================================================================
// WIMC — Reveal artifact: Explorer membership ticket stub (720×320 landscape).
// A transit-pass/event-ticket feel — a colored stub (left) perforated from the
// cream ID body (right).
// =============================================================================

import { CroppedPhotoSlot, DecorativeBarcode, PostmarkSeal, PunchHole } from './primitives'
import { cityCode, initials, ticketNumber } from './utils'

const WIDTH = 720
const HEIGHT = 320
const PAGE_BG = '#EFE7D8'

const CREAM       = '#FBF3E7'
const INK         = '#201A12'
const SKY         = '#4FB8E8'
const POSTAL_RED  = '#D8432E'
const SKY_TINT    = 'rgba(79,184,232,0.12)'
const GOLD_TINT   = 'rgba(255,197,61,0.15)'
const TEXT_3      = '#8A8070'
const STUB_W      = 220

export function ExplorerTicket({
  displayName,
  photoUrl,
  city,
  memberSinceLabel,
  favoriteCategory,
  accountId,
}: {
  displayName: string
  photoUrl?: string | null
  city: string
  memberSinceLabel: string
  favoriteCategory?: string | null
  accountId: string
}) {
  const code = cityCode(city)

  return (
    <div
      className="wimc-artifact-reveal"
      style={{
        position: 'relative', width: WIDTH, height: HEIGHT, display: 'flex',
        background: CREAM, color: INK, borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(32,26,18,0.12)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
    >
      {/* Left stub */}
      <div style={{
        width: STUB_W, flexShrink: 0, background: SKY, color: '#FFFFFF',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '0 16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.2em', color: 'rgba(255,255,255,0.85)',
        }}>
          Member pass
        </span>
        <PostmarkSeal size={108} color="#FFFFFF" label={code} />
        <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
          {city || 'Your city'}
        </span>
      </div>

      {/* Perforation */}
      <div style={{ position: 'relative', width: 0, borderLeft: '2px dashed rgba(32,26,18,0.22)' }}>
        <PunchHole size={20} color={PAGE_BG} style={{ top: -10, left: -10 }} />
        <PunchHole size={20} color={PAGE_BG} style={{ bottom: -10, left: -10 }} />
      </div>

      {/* Right body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Luggage-tag stripe */}
        <div style={{ display: 'flex', gap: 3, padding: '0 24px', marginTop: 16 }} aria-hidden>
          {['#FF6B35', '#FFC53D', '#1F8A70', '#6B4EFF', '#D8432E'].map(c => (
            <div key={c} style={{ flex: 1, height: 5, borderRadius: 3, background: c }} />
          ))}
        </div>

        <div style={{ padding: '18px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '0.18em', color: POSTAL_RED, margin: '0 0 6px',
            }}>
              Explorer pass
            </p>
            <h1 style={{
              fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, fontSize: 34, lineHeight: 1.05,
              color: INK, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </h1>
          </div>
          <CroppedPhotoSlot
            photoUrl={photoUrl}
            fallbackInitials={initials(displayName)}
            width={96}
            height={96}
            borderRadius="50%"
            borderColor={POSTAL_RED}
            bg="rgba(216,67,46,0.08)"
            fg={INK}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '16px 24px 0' }}>
          <div style={{ background: SKY_TINT, borderRadius: 9999, padding: '6px 14px' }}>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10.5, color: '#2C4A8C' }}>
              Member since {memberSinceLabel}
            </span>
          </div>
          {favoriteCategory && (
            <div style={{ background: GOLD_TINT, borderRadius: 9999, padding: '6px 14px' }}>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10.5, color: '#8A6A00' }}>
                Favorite: {favoriteCategory}
              </span>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ padding: '0 24px 20px' }}>
          <DecorativeBarcode seed={accountId} count={25} height={40} />
          <p style={{
            fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10, letterSpacing: '0.15em',
            color: TEXT_3, margin: '8px 0 0',
          }}>
            WIMC · EXP · {ticketNumber(accountId)} · {code}
          </p>
        </div>
      </div>
    </div>
  )
}
