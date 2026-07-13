'use client'

// =============================================================================
// WIMC — Reveal artifact: Brand business card (360×210 landscape).
// Deliberately the odd one out: smaller, calmer, no torn edges/punch holes —
// a professional trade card, not a keepsake poster (Brands are an org, not a
// person).
//
// QR resolution: the mockup's QR grid was decorative. This ships a REAL QR
// encoding the brand's own profile URL (via the `qrcode` package, synchronous
// `create()` — no new async dependency surface) since a business card is
// exactly the kind of artifact someone photographs to actually scan, and a
// real code costs no more than a fake one. See PR description.
// =============================================================================

import { PostmarkSeal, DecorativeQR, CroppedPhotoSlot } from './primitives'

const WIDTH = 360
const HEIGHT = 210
const PURPLE = '#6B4EFF'
const CREAM = '#FBF3E7'
const POSTAL_BLUE = '#2C4A8C'
const TEXT_3 = '#8A8070'

export function BrandCard({
  name,
  tagline,
  profileUrl,
  logoUrl,
}: {
  name: string
  tagline?: string | null
  profileUrl: string
  logoUrl?: string | null
}) {
  const initial = (name.trim()[0] || '?').toUpperCase()
  const fullUrl = profileUrl.startsWith('http') ? profileUrl : `https://${profileUrl}`

  return (
    <div
      className="wimc-artifact-reveal"
      style={{
        position: 'relative', width: WIDTH, height: HEIGHT, display: 'flex',
        background: '#FFFFFF', color: '#201A12', borderRadius: 12, overflow: 'hidden',
        border: '1px solid rgba(32,26,18,0.12)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
    >
      {/* Left panel — diagonal cut */}
      <div style={{
        width: 118, flexShrink: 0, background: PURPLE,
        clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {logoUrl ? (
          <CroppedPhotoSlot
            photoUrl={logoUrl}
            fallbackInitials={initial}
            width={72}
            height={72}
            borderRadius="50%"
            borderColor={CREAM}
            bg="rgba(255,255,255,0.15)"
            fg={CREAM}
          />
        ) : (
          <PostmarkSeal size={72} color={CREAM} label={initial} labelFontSize={40} ringText={null} />
        )}
        <span style={{
          fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.18em', color: 'rgba(251,243,231,0.80)',
        }}>
          Brand
        </span>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 9.5, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: TEXT_3, margin: '0 0 4px',
            }}>
              Brand profile
            </p>
            <h1 style={{
              fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, fontSize: 21, lineHeight: 1.15,
              color: '#201A12', margin: 0,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {name}
            </h1>
          </div>
          <DecorativeQR value={fullUrl} real size={40} color={PURPLE} />
        </div>

        <div>
          {tagline && (
            <p style={{
              fontFamily: 'var(--font-dm-sans), sans-serif', fontStyle: 'italic', fontSize: 12,
              color: TEXT_3, lineHeight: 1.4, margin: '0 0 10px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {tagline}
            </p>
          )}
          <div style={{ borderTop: '1px solid rgba(32,26,18,0.10)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10.5, color: POSTAL_BLUE,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {profileUrl}
            </span>
            <span aria-hidden style={{
              width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${PURPLE}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: PURPLE }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
