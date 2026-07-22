'use client'

// =============================================================================
// WIMC — Reveal artifact: Creator event poster (480×720 portrait).
// "Here's a preview of what your event poster will look like" — seeded from
// signup answers, not a real listing (a brand-new Creator hasn't hosted yet).
// =============================================================================

import {
  PaperTexture, PostmarkSeal, PunchHole, SparkGlyph, WavyUnderline,
  CroppedPhotoSlot, tornEdgeClipPath,
} from './primitives'
import { cityCode, initials } from './utils'
import { profileUrl } from '@/lib/profile-url'

const WIDTH = 480
const HEIGHT = 720
const PAGE_BG = '#EFE7D8' // matches the onboarding reveal screen background — punch holes read as true holes

const m = {
  bg: '#FF6B35', fg: '#FFFFFF', accent: '#201A12',
  chipBg: 'rgba(255,255,255,0.20)', chipFg: '#FFFFFF',
  sub: 'rgba(255,255,255,0.78)', dash: 'rgba(255,255,255,0.45)',
  blob: 'rgba(255,255,255,0.18)', blob2: 'rgba(32,26,18,0.10)',
}

export function CreatorPoster({
  displayName,
  city,
  tags,
  photoUrl,
  handle,
}: {
  displayName: string
  city: string
  tags: string[]
  photoUrl?: string | null
  handle: string
}) {
  const textureVariant = 'light'
  const nameLines = displayName.split(/\s+/).reduce<string[]>((lines, word) => {
    if (lines.length === 0) return [word]
    const first = lines[0]
    if (lines.length === 1 && first.length < 10) return [first, word]
    lines[lines.length - 1] = `${lines[lines.length - 1]} ${word}`
    return lines
  }, [])
  const topTags = tags.slice(0, 3)
  const rotations = [-3, 2, -2]

  return (
    <div
      className="wimc-artifact-reveal"
      style={{
        position: 'relative', width: WIDTH, height: HEIGHT, overflow: 'hidden',
        background: m.bg, color: m.fg,
        clipPath: tornEdgeClipPath(HEIGHT),
        fontFamily: 'var(--font-dm-sans), sans-serif',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <PaperTexture variant={textureVariant} />

      {/* Decorative blobs */}
      <div aria-hidden style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: m.blob }} />
      <div aria-hidden style={{ position: 'absolute', bottom: -90, left: -90, width: 260, height: 260, borderRadius: '50%', background: m.blob2 }} />

      <PunchHole size={16} color={PAGE_BG} style={{ top: 40, left: 40 }} />
      <PunchHole size={16} color={PAGE_BG} style={{ top: 40, right: 40 }} />
      <SparkGlyph size={22} color={m.accent} style={{ position: 'absolute', top: 28, right: 28 }} />

      <div style={{ position: 'relative', padding: '56px 32px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12, textTransform: 'uppercase',
              letterSpacing: '0.2em', color: m.sub, margin: '0 0 10px',
            }}>
              Your event poster · preview
            </p>
            <h1 style={{
              fontFamily: 'var(--font-syne), sans-serif', fontWeight: 800, fontSize: 54, lineHeight: 0.98,
              letterSpacing: '-0.02em', color: m.fg, margin: 0,
            }}>
              {nameLines.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)}
            </h1>
            <div style={{ margin: '8px 0' }}><WavyUnderline variant="creator" color={m.accent} /></div>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 700, fontSize: 14,
              textTransform: 'uppercase', color: m.accent, margin: 0,
            }}>
              {city || 'Your city'}
            </p>
          </div>

          <CroppedPhotoSlot
            photoUrl={photoUrl}
            fallbackInitials={initials(displayName)}
            width={120}
            height={150}
            borderRadius="75px 75px 6px 6px"
            borderColor={m.accent}
            bg={m.chipBg}
            fg={m.fg}
          />
        </div>

        {/* Tag chips */}
        {topTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
            {topTags.map((tag, i) => (
              <span
                key={tag}
                style={{
                  display: 'inline-block', padding: '6px 16px', borderRadius: 9999,
                  background: m.chipBg, color: m.chipFg,
                  fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, fontWeight: 600,
                  transform: `rotate(${rotations[i % rotations.length]}deg)`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Handwritten callout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 22 }}>
          <span style={{ fontFamily: 'var(--font-caveat), cursive', fontSize: 28, color: m.fg }}>
            your first event starts here
          </span>
          <SparkGlyph size={16} color={m.accent} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div style={{
          borderTop: `1px dashed ${m.dash}`, padding: '20px 0 32px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <PostmarkSeal size={76} color={m.accent} label={cityCode(city)} subLabel="TBD" />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: 16, color: m.fg, margin: '0 0 2px' }}>
              @{handle}
            </p>
            <p style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 11.5, color: m.sub, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              wheninmycity.com{profileUrl(city, handle)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
