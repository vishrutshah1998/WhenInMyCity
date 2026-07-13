'use client'

// =============================================================================
// WIMC — Reveal artifact: Venue notice/bulletin poster (480×720 portrait).
// A fresh, from-scratch design (not ported from any other venue-notice screen)
// — reads as an ad for the venue pinned to a community corkboard.
// =============================================================================

import {
  PaperTexture, PunchHole, WavyUnderline, CroppedPhotoSlot, PerforatedDivider,
  tornEdgeClipPath,
} from './primitives'
import { initials } from './utils'

const WIDTH = 480
const HEIGHT = 720
const PAGE_BG = '#EFE7D8'

const CREAM_2      = '#F3E8D6'
const INK          = '#201A12'
const GOLD         = '#FFC53D'
const POSTAL_BLUE  = '#2C4A8C'
const POSTAL_RED   = '#D8432E'
const TEAL         = '#1F8A70'
const TEXT_2       = '#58503F'
const TEXT_3       = '#8A8070'
const BORDER       = 'rgba(32,26,18,0.12)'

const TAG_TINTS = [
  { bg: 'rgba(79,184,232,0.12)', fg: '#2C4A8C' },
  { bg: 'rgba(255,197,61,0.15)', fg: '#8A6A00' },
  { bg: 'rgba(255,107,53,0.12)', fg: '#B94A22' },
]

function HalftoneStrip() {
  return (
    <div
      aria-hidden
      style={{
        height: 6, margin: '18px 0',
        backgroundImage: `radial-gradient(circle, rgba(32,26,18,0.30) 1px, transparent 1px)`,
        backgroundSize: '6px 6px',
      }}
    />
  )
}

export function VenuePoster({
  name,
  photoUrl,
  tags,
  address,
  hostName,
  profileUrl,
}: {
  name: string
  photoUrl?: string | null
  tags: string[]
  address: string
  hostName?: string | null
  profileUrl: string
}) {
  const topTags = tags.slice(0, 3)
  const rotations = [-3, 2, -2]

  return (
    <div
      className="wimc-artifact-reveal"
      style={{
        position: 'relative', width: WIDTH, height: HEIGHT, overflow: 'hidden',
        background: CREAM_2, color: INK,
        clipPath: tornEdgeClipPath(HEIGHT),
        fontFamily: 'var(--font-dm-sans), sans-serif',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <PaperTexture variant="dark" />

      {/* Decorative blobs */}
      <div aria-hidden style={{ position: 'absolute', top: -90, left: -90, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,197,61,0.15)' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: -90, right: -90, width: 260, height: 260, borderRadius: '50%', background: 'rgba(107,78,255,0.10)' }} />

      <PunchHole size={16} color={PAGE_BG} style={{ top: 40, left: 40 }} />
      <PunchHole size={16} color={PAGE_BG} style={{ top: 40, right: 40 }} />

      {/* Pushpin — the one documented exception to "no shadows/bevels" */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          width: 22, height: 22, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #FFE9A8 0%, ${GOLD} 45%, #C98F00 100%)`,
          boxShadow: '0 3px 6px rgba(32,26,18,0.35), inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 2px rgba(0,0,0,0.25)',
          zIndex: 5,
        }}
      />
      {/* Washi tape strips flanking the pin */}
      <div aria-hidden style={{ position: 'absolute', top: 6, left: '38%', width: 46, height: 16, background: `${POSTAL_RED}55`, transform: 'rotate(-8deg)', zIndex: 4 }} />
      <div aria-hidden style={{ position: 'absolute', top: 6, left: '58%', width: 46, height: 16, background: `${TEAL}55`, transform: 'rotate(8deg)', zIndex: 4 }} />

      <div style={{ position: 'relative', padding: '56px 28px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: POSTAL_RED, margin: '0 0 8px',
            }}>
              Community bulletin
            </p>
            <p style={{
              fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, fontSize: 22,
              letterSpacing: '0.02em', color: INK, margin: 0,
            }}>
              NOW HOSTING AT
            </p>
          </div>
          <CroppedPhotoSlot
            photoUrl={photoUrl}
            fallbackInitials={initials(name)}
            width={104}
            height={132}
            borderRadius="52px 52px 6px 6px"
            borderColor={GOLD}
            bg="rgba(32,26,18,0.06)"
            fg={INK}
          />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, fontSize: 44, lineHeight: 1.0,
          letterSpacing: '-0.02em', color: INK, margin: '18px 0 0',
        }}>
          {name}
        </h1>
        <div style={{ margin: '8px 0 18px' }}><WavyUnderline variant="venue" color={POSTAL_BLUE} /></div>

        {/* Tag chips */}
        {topTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {topTags.map((tag, i) => {
              const tint = TAG_TINTS[i % TAG_TINTS.length]
              return (
                <span
                  key={tag}
                  style={{
                    display: 'inline-block', padding: '6px 16px', borderRadius: 9999,
                    background: tint.bg, color: tint.fg,
                    fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, fontWeight: 600,
                    transform: `rotate(${rotations[i % rotations.length]}deg)`,
                  }}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        )}

        <HalftoneStrip />

        {/* Address + host */}
        <div style={{ paddingBottom: 14, borderBottom: `1px dashed ${BORDER}` }}>
          <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12.5, color: TEXT_2, margin: '0 0 4px' }}>
            {address || 'Address coming soon'}
          </p>
          {hostName && (
            <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12.5, color: TEXT_3, margin: 0 }}>
              Hosted by {hostName}
            </p>
          )}
        </div>

        {/* Handwritten callout */}
        <p style={{ fontFamily: 'var(--font-caveat), cursive', fontSize: 26, color: POSTAL_BLUE, margin: '16px 0 0' }}>
          pin it up, tell a friend
        </p>

        <div style={{ flex: 1 }} />

        {/* Footer — 5 tear-off tabs */}
        <div style={{ display: 'flex', height: 64, borderTop: `1px dashed ${BORDER}` }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {i > 0 && <PerforatedDivider orientation="vertical" color={BORDER} style={{ position: 'absolute', left: 0 }} />}
              <span style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 9.5, color: TEXT_3,
                writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap',
              }}>
                {profileUrl}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
