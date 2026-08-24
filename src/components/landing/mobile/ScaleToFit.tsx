'use client'

import { useLayoutEffect, useRef, useState } from 'react'

// Shrinks (never enlarges) a card's fixed-size content to whatever height/width the
// ticket stage actually has, so a card never needs its own internal scroll — the only
// scroll in the mobile landing stack should be swiping between cards. Measures the
// unscaled natural size of `children` (transform doesn't affect layout box, so
// scrollHeight/scrollWidth stay accurate even while a scale is already applied) against
// the available container box, and re-measures on resize (rotation, browser chrome
// show/hide, font load reflow).
export function ScaleToFit({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const measure = () => {
      const availH = outer.clientHeight
      const availW = outer.clientWidth
      const naturalH = inner.scrollHeight
      const naturalW = inner.scrollWidth
      if (availH <= 0 || availW <= 0 || naturalH <= 0 || naturalW <= 0) return
      setScale(Math.min(1, availH / naturalH, availW / naturalW))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={outerRef}
      style={{
        height: '100%', width: '100%', overflow: 'hidden', position: 'relative',
        display: center ? 'flex' : undefined,
        alignItems: center ? 'center' : undefined,
        justifyContent: center ? 'center' : undefined,
      }}
    >
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: center ? 'center center' : 'top center', width: '100%' }}>
        {children}
      </div>
    </div>
  )
}
