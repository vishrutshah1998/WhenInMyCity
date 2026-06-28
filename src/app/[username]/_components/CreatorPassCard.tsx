'use client'

import { useRef, useCallback } from 'react'

export default function CreatorPassCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ry = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 2
    const rx = -((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 2
    el.style.transform = `rotate(-1deg) perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
  }, [])

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'rotate(-1deg)'
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative border-2 p-6 mb-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-default"
      style={{ backgroundColor: 'var(--t-card, #FAF7F0)', borderColor: 'var(--t-text, #1A2744)', transform: 'rotate(-1deg)', willChange: 'transform' }}
    >
      {children}
    </div>
  )
}
