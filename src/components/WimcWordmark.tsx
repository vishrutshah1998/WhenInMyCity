'use client'

import Image from 'next/image'

interface WimcWordmarkProps {
  color?: string
  height?: number
  className?: string
}

export function WimcWordmark({
  color = 'white',
  height = 36,
  className = '',
}: WimcWordmarkProps) {
  const width = Math.round(height * 3)
  const needsInvert = color === 'white' || color === '#fff' || color === '#ffffff'

  return (
    <Image
      src="/Online Logo.png"
      alt="When in My City"
      width={width}
      height={height}
      className={`select-none flex-shrink-0 ${className}`}
      style={{
        objectFit: 'contain',
        objectPosition: 'left center',
        filter: needsInvert ? 'invert(1)' : undefined,
      }}
      priority
    />
  )
}
