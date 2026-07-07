'use client'

import { useEffect, useRef } from 'react'
import { trackBlockAnalytics } from '@/app/actions/blocks'

interface VenueViewTrackerProps {
  addaId: string
}

/**
 * Fires a single fire-and-forget page-view analytics event when a Venue's
 * public page mounts. Renders nothing.
 *
 * The ref guard prevents a duplicate event from React StrictMode's
 * double-invoke-on-mount behaviour in development.
 */
export function VenueViewTracker({ addaId }: VenueViewTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    void trackBlockAnalytics('adda', addaId, 'view')
  }, [addaId])

  return null
}
