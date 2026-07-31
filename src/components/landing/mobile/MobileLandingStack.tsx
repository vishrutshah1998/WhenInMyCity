'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { buildHorizTearClip } from '@/lib/ticketTear'
import { MobileHeader } from './MobileHeader'
import { MobileTicketChrome, HEADER_H, stubHeight } from './MobileTicketChrome'
import { EntryPassFace } from './EntryPassFace'
import { CreatorPassFace } from './CreatorPassFace'
import { RoleSelectFace } from './RoleSelectFace'
import { TICKET_META, ROLE_MAKERS_PROPS, ROLE_VENUES_PROPS } from './data'

const N = TICKET_META.length
const THRESH = 130

type TearState = 'idle' | 'flying' | 'entering'

function MobileTicketSection({ index, tearP }: { index: number; tearP: MotionValue<number> }) {
  const meta = TICKET_META[index]
  const stubH = stubHeight(meta)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: meta.bg, overflow: 'hidden' }}>
      <MobileTicketChrome meta={meta} tearP={tearP} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: stubH, paddingTop: HEADER_H, overflow: 'hidden' }}>
        {index === 0 && <EntryPassFace />}
        {index === 1 && <CreatorPassFace />}
        {index === 2 && <RoleSelectFace {...ROLE_MAKERS_PROPS} />}
        {index === 3 && <RoleSelectFace {...ROLE_VENUES_PROPS} />}
      </div>
    </div>
  )
}

function DotRail({ active, onDotClick }: { active: number; onDotClick: (i: number) => void }) {
  return (
    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 7, zIndex: 40 }}>
      {TICKET_META.map((meta, i) => (
        <button key={i} onClick={() => onDotClick(i)} aria-label={`Go to card ${i + 1}`}
          style={{ width: 6, height: i === active ? 22 : 8, borderRadius: 3, background: i === active ? meta.accent : 'rgba(32,26,18,0.18)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)' }} />
      ))}
    </div>
  )
}

export function MobileLandingStack() {
  const [active, setActive] = useState(0)
  const [previewTarget, setPreviewTarget] = useState<number | null>(null)
  const [tearState, setTearState] = useState<TearState>('idle')

  const isAnimRef = useRef(false)
  const accRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirRef = useRef<1 | -1>(1)
  const touchYRef = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const perfYRef = useRef(95)

  const tearP = useMotionValue(0)
  const zeroP = useMotionValue(0)
  const currentClipPath = useTransform(tearP, (v: number) => buildHorizTearClip(v, perfYRef.current))
  const driftX = useTransform(tearP, [0, 1], [0, 8])
  const driftY = useTransform(tearP, [0, 1], [0, -6])

  // Perf-line y-position as % of stage height — depends on the active card's stub height
  // (Card 4's tall footer stub), so recompute on active change too, not just resize.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const stubH = stubHeight(TICKET_META[active])
    const update = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) perfYRef.current = ((h - stubH) / h) * 100
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [active])

  // Prevent page scroll behind the stage while this experience is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const doTear = useCallback(async (target: number) => {
    if (isAnimRef.current || target < 0 || target >= N || target === active) return
    isAnimRef.current = true
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    dirRef.current = target > active ? 1 : -1

    if (dirRef.current > 0) {
      setPreviewTarget(target)
      const cv = tearP.get()
      setTearState('flying')
      if (cv < 0.98) animate(tearP, 1, { duration: Math.max(0.06, (1 - cv) * 0.16), ease: [0.5, 0, 1, 1] })
      await new Promise<void>((r) => setTimeout(r, 420))
    } else {
      setPreviewTarget(target)
      await new Promise<void>((r) => setTimeout(r, 420))
    }

    tearP.set(0)
    accRef.current = 0
    setActive(target)
    setPreviewTarget(null)
    setTearState('entering')

    await new Promise<void>((r) => setTimeout(r, 220))
    setTearState('idle')
    isAnimRef.current = false
  }, [active, tearP])

  const onDelta = useCallback((dy: number) => {
    if (isAnimRef.current) return
    const prevAcc = accRef.current
    accRef.current = Math.max(-THRESH, Math.min(THRESH, accRef.current + dy))

    if (accRef.current > 0 && active < N - 1) {
      if (prevAcc <= 0) { dirRef.current = 1; setPreviewTarget(active + 1) }
      tearP.set(accRef.current / THRESH)
    } else if (accRef.current < 0 && active > 0) {
      if (prevAcc >= 0) { dirRef.current = -1; setPreviewTarget(active - 1) }
      tearP.set(0)
    } else {
      tearP.set(0)
      setPreviewTarget(null)
    }

    if (accRef.current >= THRESH) {
      accRef.current = 0
      if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
      doTear(active + 1)
      return
    }
    if (accRef.current <= -THRESH) {
      accRef.current = 0
      if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
      doTear(active - 1)
      return
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      accRef.current = 0
      setPreviewTarget(null)
      animate(tearP, 0, { duration: 0.36, ease: [0.34, 1.2, 0.4, 1] })
    }, 380)
  }, [active, doTear, tearP])

  function handleWheel(e: React.WheelEvent) {
    onDelta(e.deltaY)
  }
  function handleTouchStart(e: React.TouchEvent) {
    touchYRef.current = e.touches[0].clientY
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (isAnimRef.current) return
    const y = e.touches[0].clientY
    const dy = (touchYRef.current - y) * 0.6
    touchYRef.current = y
    onDelta(dy)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') doTear(active + 1)
      if (e.key === 'ArrowUp') doTear(active - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, doTear])

  return (
    <div className="bg-vib-cream text-vib-ink" style={{ height: '100dvh', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <MobileHeader />

      <div style={{ flex: 1, background: '#F3E8D6', padding: 8, position: 'relative', overflow: 'hidden' }}>
        <div
          ref={stageRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 18px 40px rgba(32,26,18,0.16), 0 0 0 1px rgba(32,26,18,0.06)', userSelect: 'none' }}
        >
          {/* Preview layer */}
          {previewTarget !== null && (dirRef.current < 0 ? (
            <motion.div
              initial={{ y: '-116%', x: '6%', rotateX: 20, rotate: -2, scale: 0.92, opacity: 0.55 }}
              animate={{ y: 0, x: 0, rotateX: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.42, ease: [0.44, 0, 0.82, 1] }}
              style={{ position: 'absolute', inset: 0, zIndex: 3, transformPerspective: 900 }}
            >
              <MobileTicketSection index={previewTarget} tearP={zeroP} />
            </motion.div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <MobileTicketSection index={previewTarget} tearP={zeroP} />
            </div>
          ))}

          {/* Current ticket */}
          <motion.div
            key={active}
            initial={false}
            style={{ position: 'absolute', inset: 0, zIndex: 2, clipPath: currentClipPath, transformPerspective: 900, x: driftX, y: driftY }}
            animate={
              tearState === 'flying'
                ? { y: '-116%', x: '6%', rotateX: 20, rotate: -2, scale: 0.92, opacity: 0.5 }
                : { y: 0, x: 0, rotateX: 0, rotate: 0, scale: 1, opacity: 1 }
            }
            transition={tearState === 'flying' ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          >
            <MobileTicketSection index={active} tearP={tearP} />
          </motion.div>

          {/* Swipe hint — card 1, idle only */}
          {active === 0 && tearState === 'idle' && previewTarget === null && (
            <motion.div
              className="absolute pointer-events-none"
              style={{ bottom: 46, left: '50%', translateX: '-50%', zIndex: 40 }}
              initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ delay: 1.8, duration: 0.8 }}
            >
              <motion.span
                style={{ display: 'block', width: 16, height: 16, borderRight: '2px solid #201A12', borderBottom: '2px solid #201A12', transform: 'rotate(45deg)' }}
                animate={{ y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}

          <DotRail active={active} onDotClick={doTear} />
        </div>
      </div>
    </div>
  )
}
