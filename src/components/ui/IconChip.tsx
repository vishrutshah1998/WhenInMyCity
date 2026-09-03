import type { CSSProperties, ReactNode } from 'react'

// Paper-cutout icon chip — a fixed-size, flat-color square-ish badge that
// sits at the left edge of a PaperCard row. Bright per-category `color` is
// the caller's call (the locked reference specs one bright hue per card
// category, e.g. yellow/blue/pink/purple), not a fixed default.

interface IconChipProps {
  children:   ReactNode
  color:      string
  iconColor?: string
  size?:      number
  radius?:    number
  className?: string
  style?:     CSSProperties
}

export default function IconChip({
  children, color,
  iconColor = '#201A12',
  size = 42,
  radius = 12,
  className = '',
  style,
}: IconChipProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius,
        background: color,
        color: iconColor,
        display: 'grid',
        placeItems: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
