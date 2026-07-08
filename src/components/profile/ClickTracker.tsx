'use client'

import { useCallback } from 'react'
import { trackBlockAnalytics } from '@/app/actions/blocks'

interface ClickTrackerProps {
  blockId:   string
  creatorId: string
  children:  React.ReactNode
}

/**
 * Thin client wrapper that fires a fire-and-forget analytics event whenever
 * the visitor clicks anywhere inside the wrapped block.
 *
 * Uses `display: contents` so the wrapping <div> is invisible to layout —
 * no box is generated, existing block margins/paddings are unaffected.
 *
 * Rendering: this is a client component, but it can be rendered inside
 * server components (Next.js App Router allows this).
 */
export function ClickTracker({ blockId, creatorId, children }: ClickTrackerProps) {
  const handleClick = useCallback(() => {
    void trackBlockAnalytics('creator', creatorId, 'click', blockId)
  }, [blockId, creatorId])

  return (
    <div onClick={handleClick} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
