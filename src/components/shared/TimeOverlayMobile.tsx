'use client'

import { useState, useRef, useEffect } from 'react'
import { Drawer } from 'vaul'

// ── Time overlay (mobile — dual scroll-wheel) ─────────────────────────────────

export function fmt2(n: number) { return String(n).padStart(2, '0') }

export const WHEEL_ITEM_H     = 44
const WHEEL_VISIBLE    = 5
export const WHEEL_PAD        = Math.floor(WHEEL_VISIBLE / 2) * WHEEL_ITEM_H

export const WHEEL_TIME_SLOTS: { h12: number; m: number }[] =
  Array.from({ length: 12 }, (_, i) => i + 1).flatMap(h12 => [0, 15, 30, 45].map(m => ({ h12, m })))
export const WHEEL_AMPM_SLOTS = ['AM', 'PM'] as const

export function to24Hour(h12: number, m: number, ampm: 'AM' | 'PM'): [number, number] {
  const h = ampm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12)
  return [h, m]
}
export function to12Hour(h: number): { h12: number; ampm: 'AM' | 'PM' } {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 === 0 ? 12 : h % 12
  return { h12, ampm }
}

export function WheelColumn<T>({ items, initialIndex, onSettle, render, widthClass }: {
  items: T[]
  initialIndex: number
  onSettle: (index: number) => void
  render: (item: T) => React.ReactNode
  widthClass: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(initialIndex * WHEEL_ITEM_H)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: initialIndex * WHEEL_ITEM_H })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const top = e.currentTarget.scrollTop
    setScrollTop(top)
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const nearest = Math.max(0, Math.min(items.length - 1, Math.round(top / WHEEL_ITEM_H)))
      onSettle(nearest)
    }, 120)
  }

  function selectIndex(i: number) {
    ref.current?.scrollTo({ top: i * WHEEL_ITEM_H, behavior: 'smooth' })
  }

  const centerFloat = scrollTop / WHEEL_ITEM_H

  return (
    <div ref={ref} onScroll={handleScroll} className={`no-scrollbar overflow-y-scroll ${widthClass}`}
         style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE, scrollSnapType: 'y mandatory' }}>
      <div style={{ height: WHEEL_PAD }} />
      {items.map((item, i) => {
        const dist    = Math.abs(i - centerFloat)
        const opacity = Math.max(0.15, 1 - dist * 0.35)
        const scale   = Math.max(0.72, 1 - dist * 0.14)
        return (
          <div key={i} onClick={() => selectIndex(i)}
               style={{ height: WHEEL_ITEM_H, scrollSnapAlign: 'center', opacity, transform: `scale(${scale})` }}
               className="flex items-center justify-center cursor-pointer select-none">
            {render(item)}
          </div>
        )
      })}
      <div style={{ height: WHEEL_PAD }} />
    </div>
  )
}

export function TimeOverlayMobile({ onConfirm, onClose }: { onConfirm: (h: number, m: number) => void; onClose: () => void }) {
  const { h12: initH12, ampm: initAmpm } = to12Hour(19)
  const initTimeIndex = WHEEL_TIME_SLOTS.findIndex(s => s.h12 === initH12 && s.m === 0)
  const initAmpmIndex = WHEEL_AMPM_SLOTS.indexOf(initAmpm)

  const [timeIndex, setTimeIndex] = useState(initTimeIndex)
  const [ampmIndex, setAmpmIndex] = useState(initAmpmIndex)

  const slot = WHEEL_TIME_SLOTS[timeIndex]
  const ampm = WHEEL_AMPM_SLOTS[ampmIndex]

  function handleConfirm() {
    const [h, m] = to24Hour(slot.h12, slot.m, ampm)
    onConfirm(h, m)
    onClose()
  }

  return (
    <Drawer.Root open modal dismissible onOpenChange={o => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[101] bg-[#FAF7F0] border-t-2 border-[#1A2744] p-5 outline-none">
          <Drawer.Handle style={{ marginBottom: 12 }} />
          <div className="flex items-center justify-between mb-6">
            <Drawer.Title style={{ fontFamily: 'var(--font-barlow)' }} className="text-[#1A2744] text-[24px] font-bold uppercase tracking-wide">SELECT TIME</Drawer.Title>
            <button onClick={onClose} className="text-[#1A2744] p-2.5 text-[24px] leading-none">×</button>
          </div>

          <div className="relative flex items-center justify-center gap-2 mb-6">
            {/* Center highlight band */}
            <div className="absolute left-0 right-0 border-y border-[#1A2744]/15 pointer-events-none"
                 style={{ top: WHEEL_PAD, height: WHEEL_ITEM_H }} />
            <WheelColumn items={WHEEL_TIME_SLOTS} initialIndex={initTimeIndex} onSettle={setTimeIndex} widthClass="w-32"
                         render={s => (
                           <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#1A2744] text-[22px] font-bold tracking-wide">
                             {s.h12}:{fmt2(s.m)}
                           </span>
                         )} />
            <WheelColumn items={[...WHEEL_AMPM_SLOTS]} initialIndex={initAmpmIndex} onSettle={setAmpmIndex} widthClass="w-20"
                         render={a => (
                           <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#1A2744] text-[18px] font-bold tracking-widest">
                             {a}
                           </span>
                         )} />
          </div>

          <button onClick={handleConfirm}
                  className="w-full bg-[#E8705A] text-white py-3 hover:brightness-110 transition-all"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
            CONFIRM TIME
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
