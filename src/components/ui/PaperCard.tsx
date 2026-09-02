import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

// "Paper cutout" card shell — part of the vintage-postal motif kit alongside
// TornEdge/RubberStamp/Pushpin. Hard flat offset shadow is a plain 0-blur
// box-shadow (`Npx Npx 0 0 <color>`) rather than an absolute-positioned
// pseudo-layer — box-shadow with blur=0 already renders a crisp, unblurred
// rectangle that follows border-radius on its own, so no extra layer/
// stacking-context is needed.

interface PaperCardProps {
  children:    ReactNode
  href?:       string
  /** Border + offset-shadow color. Default matches the locked paper-cutout reference. */
  borderColor?: string
  /** Card corner radius. Reference uses 16-18px depending on card weight. */
  radius?:     number
  /** Offset distance for the hard shadow, in px. Reference uses 6. */
  offset?:     number
  background?: string
  padding?:    string | number
  className?:  string
  style?:      CSSProperties
}

export default function PaperCard({
  children, href,
  borderColor = '#201A12',
  radius = 16,
  offset = 6,
  background = '#FFFFFF',
  padding,
  className = '',
  style,
}: PaperCardProps) {
  const cardStyle: CSSProperties = {
    display: 'block',
    background,
    border: `2px solid ${borderColor}`,
    borderRadius: radius,
    boxShadow: `${offset}px ${offset}px 0 0 ${borderColor}`,
    padding,
    textDecoration: 'none',
    ...style,
  }

  if (href) {
    return (
      <Link href={href} className={className} style={cardStyle}>
        {children}
      </Link>
    )
  }

  return (
    <div className={className} style={cardStyle}>
      {children}
    </div>
  )
}
