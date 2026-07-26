'use client'

// =============================================================================
// WIMC — Reveal artifact: Explorer membership card (680×428 ≈ 1.589:1, the
// ISO/IEC 7810 ID-1 physical card ratio, rendered at a larger design
// resolution so ScaledStage — which only ever scales *down*, never up — has
// room to actually reach ~50% of a desktop viewport width). Single-panel
// card face — the postmark seal doubles as the card's "chip," the
// luggage-tag stripe as its security strip, and the decorative barcode as a
// signature footer — so it still reads as WIMC's postal/ticket artifact
// vocabulary, just card-shaped instead of the wide boarding-pass-stub
// layout used previously.
// =============================================================================

import { CroppedPhotoSlot, DecorativeBarcode, PostmarkSeal } from './primitives'
import { cityCode, initials, ticketNumber } from './utils'

const WIDTH = 680
const HEIGHT = 428

const CREAM       = '#FBF3E7'
const INK         = '#201A12'
const SKY         = '#4FB8E8'
const POSTAL_RED  = '#D8432E'
const SKY_TINT    = 'rgba(79,184,232,0.12)'
const GOLD_TINT   = 'rgba(255,197,61,0.15)'
const TEXT_3      = '#8A8070'
const MONO        = 'var(--font-jetbrains-mono), monospace'
const SYNE        = 'var(--font-syne), sans-serif'
const STRIPE_COLORS = ['#FF6B35', '#FFC53D', '#1F8A70', '#6B4EFF', '#D8432E']

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
        position: 'relative', width: WIDTH, height: HEIGHT, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        background: CREAM, color: INK, borderRadius: 28, overflow: 'hidden',
        border: '1px solid rgba(32,26,18,0.12)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        padding: '28px 32px 25px',
      }}
    >
      {/* Header: eyebrow + postmark seal (the card's "chip") */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontFamily: MONO, fontSize: 14, textTransform: 'uppercase',
            letterSpacing: '0.18em', color: POSTAL_RED, margin: '0 0 5px',
          }}>
            Explorer pass
          </p>
          <p style={{
            fontFamily: MONO, fontSize: 13, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: TEXT_3, margin: 0,
          }}>
            When in my city
          </p>
        </div>
        <PostmarkSeal size={70} color={SKY} label={code} ringText={null} labelFontSize={30} />
      </div>

      {/* Luggage-tag stripe */}
      <div style={{ display: 'flex', gap: 4, margin: '20px 0' }} aria-hidden>
        {STRIPE_COLORS.map(c => (
          <div key={c} style={{ flex: 1, height: 6, borderRadius: 3, background: c }} />
        ))}
      </div>

      {/* Main: photo + name/city */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minHeight: 0 }}>
        <CroppedPhotoSlot
          photoUrl={photoUrl}
          fallbackInitials={initials(displayName)}
          width={90}
          height={90}
          borderRadius="50%"
          borderColor={POSTAL_RED}
          bg="rgba(216,67,46,0.08)"
          fg={INK}
        />
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: SYNE, fontWeight: 800, fontSize: 33, lineHeight: 1.1,
            color: INK, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 14, color: TEXT_3, margin: 0 }}>
            {city || 'Your city'}
          </p>
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ background: SKY_TINT, borderRadius: 9999, padding: '6px 15px' }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: '#2C4A8C' }}>
            Member since {memberSinceLabel}
          </span>
        </div>
        {favoriteCategory && (
          <div style={{ background: GOLD_TINT, borderRadius: 9999, padding: '6px 15px' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: '#8A6A00' }}>
              Favorite: {favoriteCategory}
            </span>
          </div>
        )}
      </div>

      {/* Footer: barcode signature strip */}
      <div>
        <DecorativeBarcode seed={accountId} count={36} height={33} gap={2} />
        <p style={{
          fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em',
          color: TEXT_3, margin: '9px 0 0',
        }}>
          WIMC · EXP · {ticketNumber(accountId)} · {code}
        </p>
      </div>
    </div>
  )
}
