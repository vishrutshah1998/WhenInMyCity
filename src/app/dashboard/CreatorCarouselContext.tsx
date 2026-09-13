'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CreatorCarouselProps } from './CreatorCarousel'

type CarouselSlotProps = Omit<CreatorCarouselProps, 'defaultIndex'>

interface ContextValue {
  carouselProps: CarouselSlotProps | null
  setCarouselProps: (props: CarouselSlotProps | null) => void
}

const CreatorCarouselContext = createContext<ContextValue | null>(null)

// Lets dashboard/page.tsx (the sole owner of the Supabase fetch that feeds
// CreatorCarousel's slots) publish its computed props for CreatorCarouselSlot
// — a genuine layout-level sibling of .dash-content, same placement as
// PersonaNavGate — to render. Replaces an earlier portal-based approach.
// No data is fetched or re-derived here; this is purely a pass-through so
// the carousel's `position: fixed` nav can escape .dash-content's mount-
// animation containing-block trap without page.tsx's client fetch moving.
export function CreatorCarouselProvider({ children }: { children: ReactNode }) {
  const [carouselProps, setCarouselProps] = useState<CarouselSlotProps | null>(null)
  const value = useMemo(() => ({ carouselProps, setCarouselProps }), [carouselProps])
  return (
    <CreatorCarouselContext.Provider value={value}>
      {children}
    </CreatorCarouselContext.Provider>
  )
}

function useCreatorCarouselContext() {
  const ctx = useContext(CreatorCarouselContext)
  if (!ctx) throw new Error('useCreatorCarouselContext must be used within CreatorCarouselProvider')
  return ctx
}

// Read side, used by CreatorCarouselSlot.
export function useCreatorCarouselProps() {
  return useCreatorCarouselContext().carouselProps
}

// Write side — mount this (with no visual output) wherever the real props
// are computed (dashboard/page.tsx) instead of rendering the carousel
// in place. A dedicated component (rather than a useEffect call inline in
// page.tsx's own render) so the effect's mount/unmount lifecycle is tied to
// whether page.tsx has actually reached the point of having real props to
// publish (e.g. past its own loading gate) — page.tsx conditionally
// rendering this component is fine; it's still each mounted instance's own
// hooks that must stay unconditional, not page.tsx's.
export function CreatorCarouselPublisher(props: CarouselSlotProps) {
  console.log('[CC] publisher mounted')
  const { setCarouselProps } = useCreatorCarouselContext()
  useEffect(() => {
    console.log('[CC] publishing props:', props)
    setCarouselProps(props)
    return () => setCarouselProps(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props])
  return null
}
