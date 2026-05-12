/*
 * WimcLogo — renders public/logo.png cropped to just the stamp.
 *
 * Measured from the PNG (4000×2250, RGBA transparent background):
 *   Stamp bbox : (1666,793) → (2331,1458) — 665×665 px, perfectly square
 *   Stamp center: (1998.5,1125.5) = 49.96% × 50.02% ≈ center
 *   With 1.8% padding on each side: region = 809×809 px (20.225% of image width)
 *   background-size to fill container with padded region: 100/20.225 ≈ 494%
 *
 * The PNG background is fully transparent, so no blend-mode tricks needed.
 * For white variant: filter:invert(1) flips black strokes → white, alpha stays transparent.
 */

interface WimcLogoProps {
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  iconOnly?: boolean
}

const SIZES = {
  xs: 32,
  sm: 44,
  md: 60,
  lg: 88,
  xl: 112,
}

export function WimcLogo({
  color = 'currentColor',
  size = 'md',
  className = '',
}: WimcLogoProps) {
  const dim = SIZES[size]
  const isWhite = color === 'white' || color === '#fff' || color === '#ffffff'

  return (
    <div
      role="img"
      aria-label="When in my city"
      className={`select-none flex-shrink-0 ${className}`}
      style={{
        width: dim,
        height: dim,
        backgroundImage: "url('/logo.png')",
        backgroundSize: '494% auto',
        backgroundPosition: '49.96% 50.02%',
        backgroundRepeat: 'no-repeat',
        filter: isWhite ? 'invert(1)' : undefined,
      }}
    />
  )
}
