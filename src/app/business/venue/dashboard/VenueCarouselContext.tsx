'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { VenueCarouselProps } from './VenueCarousel'

type CarouselSlotProps = Omit<VenueCarouselProps, 'defaultIndex'>

interface ContextValue {
  carouselProps: CarouselSlotProps | null
  setCarouselProps: (props: CarouselSlotProps | null) => void
}

const VenueCarouselContext = createContext<ContextValue | null>(null)

// Lets dashboard/page.tsx (the sole owner of the venue-dashboard fetch that
// feeds VenueCarousel's slots) publish its computed props for
// VenueCarouselSlot — a genuine layout-level sibling of .dash-content, same
// placement as PersonaNavGate — to render. Mirrors CreatorCarouselContext.tsx
// exactly: this is purely a pass-through so the carousel's `position: fixed`
// nav can escape .dash-content's mount-animation containing-block trap
// without page.tsx's data fetch moving.
export function VenueCarouselProvider({ children }: { children: ReactNode }) {
  const [carouselProps, setCarouselProps] = useState<CarouselSlotProps | null>(null)
  const value = useMemo(() => ({ carouselProps, setCarouselProps }), [carouselProps])
  return (
    <VenueCarouselContext.Provider value={value}>
      {children}
    </VenueCarouselContext.Provider>
  )
}

function useVenueCarouselContext() {
  const ctx = useContext(VenueCarouselContext)
  if (!ctx) throw new Error('useVenueCarouselContext must be used within VenueCarouselProvider')
  return ctx
}

// Read side, used by VenueCarouselSlot.
export function useVenueCarouselProps() {
  return useVenueCarouselContext().carouselProps
}

// Write side — mount this (with no visual output) wherever the real props
// are computed (venue/dashboard/page.tsx) instead of rendering the carousel
// in place.
export function VenueCarouselPublisher(props: CarouselSlotProps) {
  const { setCarouselProps } = useVenueCarouselContext()
  useEffect(() => {
    setCarouselProps(props)
    return () => setCarouselProps(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props])
  return null
}
