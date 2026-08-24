'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, useSpring, animate } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { buildPerfTearClip, buildFlyAwayKeyframes, buildOvershootAnim } from '@/lib/ticketTear'
import type { FlyAwayKeyframes } from '@/lib/ticketTear'
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
    <div style={{ position: 'relative', width: '100%', height: '100%', background: meta.bg, overflow: 'hidden', borderRadius: 16 }}>
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
  // Once a gesture pushes past the last/first card, lock out the rest of THAT gesture
  // rather than just zeroing the accumulator — a single large reversal delta (trackpad/
  // touch momentum settling as the gesture ends) can otherwise cross the full threshold
  // in one shot from a resting accRef, with nothing to tell it apart from a deliberate
  // swipe the other way. Cleared on a fresh touchstart or once input goes quiet.
  const boundaryLockRef = useRef(false)
  // Timestamp of the last completed tear, paired with dirRef (the direction it just
  // traveled). A sustained multi-card swipe keeps crossing threshold in the SAME
  // direction and must never be blocked — but a delta arriving shortly after a tear
  // that points the OPPOSITE way (trackpad momentum overshoot/deceleration artifact,
  // not a deliberate change of mind) gets a brief cooldown before it's allowed to
  // count, anywhere in the stack, not just at the first/last card.
  const lastTearAtRef = useRef(0)
  // Real trackpad momentum scrolling commonly keeps delivering wheel events for
  // several hundred ms — sometimes over a second — after the fingers actually lift.
  // 550ms was measured (via [TEAR] debug logging) to be too short: a swipe strong
  // enough to complete two tears back-to-back can still have enough decelerating
  // reverse-direction energy in its tail to cross threshold again after 550ms, firing
  // a real (undesired) reversal tear — not a rendering bug, just too-short a cooldown
  // for this trackpad's actual momentum curve. 1400ms comfortably outlasts that decay;
  // a genuine deliberate reversal (re-gripping and swiping back) takes longer than
  // that anyway, so this costs nothing for real intentional direction changes.
  const REVERSAL_COOLDOWN_MS = 1400
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks recedePreview's delayed setPreviewTarget(null) so it can be cancelled if a
  // fresh gesture sets a NEW previewTarget before the old recede's timer fires —
  // otherwise that stale timeout would wipe out the new, legitimately in-progress
  // preview out from under it a moment later.
  const recedeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirRef = useRef<1 | -1>(1)
  const touchYRef = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  // Stage's real rendered size (px) + perf-line y (px) — updated below
  const dimsRef = useRef({ w: 0, h: 0, perfY: 0 })
  const flyAwayRef = useRef<FlyAwayKeyframes>(buildFlyAwayKeyframes())

  const tearP = useMotionValue(0)
  const zeroP = useMotionValue(0)
  const currentClipPath = useTransform(tearP, (v: number) =>
    buildPerfTearClip(v, dimsRef.current.w, dimsRef.current.h, dimsRef.current.perfY, 18, 3)
  )
  const driftX = useTransform(tearP, [0, 1], [0, 8])
  const driftY = useTransform(tearP, [0, 1], [0, -6])

  // Backward-preview progress (0 = hidden off-screen top, 1 = fully in place). The RAW
  // value tracks actual scroll/touch accumulation 1:1 (see onDelta) — the same "reveal
  // proportional to how far you've dragged" treatment forward already gets via
  // tearP/currentClipPath. Before this, the preview card played its FULL entrance the
  // instant the gesture started (time-based, not scroll-based), so it visually looked
  // "arrived" after just a small nudge — long before the THRESH accumulator actually
  // committed. That mismatch is what every "card flashed then reversed" report in this
  // investigation turned out to be: the user reasonably stopped scrolling once it
  // looked done, the gesture never reached threshold, and the idle-timer cancelled it.
  //
  // The visuals below are driven off a SPRING following previewP, not previewP
  // directly. A raw 1:1 binding tracks scroll honestly during the drag (good), but
  // also means a single fast, decisive swipe reveals the card in however long that
  // swipe took — which can be much quicker than forward's fixed ~420ms flying
  // animation, making backward feel abrupt/instant by comparison even though nothing
  // is actually broken. The spring still follows previewP closely enough during a
  // normal-paced drag to give honest live feedback, but when previewP jumps to 1 fast
  // (a quick decisive swipe), the spring keeps settling toward it for its own natural
  // duration — giving backward the same kind of deliberate, comparable-weight arrival
  // motion forward has, without reintroducing the "looks done before threshold"
  // mismatch (previewP itself, which gates the commit, is unaffected).
  const previewP = useMotionValue(0)
  const previewPSpring = useSpring(previewP, { stiffness: 300, damping: 30, mass: 0.9 })
  // clamp:false lets the commit-time overshoot (previewP animated past 1, see doTear)
  // actually extrapolate past the settled pose instead of being clipped back to it.
  const clampOff = { clamp: false }
  const previewY = useTransform(previewPSpring, [0, 1], ['-116%', '0%'], clampOff)
  const previewX = useTransform(previewPSpring, [0, 1], ['6%', '0%'], clampOff)
  const previewRotateX = useTransform(previewPSpring, [0, 1], [20, 0], clampOff)
  const previewRotate = useTransform(previewPSpring, [0, 1], [-2, 0], clampOff)
  const previewScale = useTransform(previewPSpring, [0, 1], [0.92, 1], clampOff)
  const previewOpacity = useTransform(previewPSpring, [0, 1], [0.55, 1], { clamp: true })

  // Perf-line y-position as % of stage height — depends on the active card's stub height
  // (Card 4's tall footer stub), so recompute on active change too, not just resize.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const stubH = stubHeight(TICKET_META[active])
    const update = () => {
      const { width: w, height: h } = el.getBoundingClientRect()
      if (h > 0 && w > 0) dimsRef.current = { w, h, perfY: h - stubH }
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
    const startedAt = Date.now()
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    if (recedeTimerRef.current) { clearTimeout(recedeTimerRef.current); recedeTimerRef.current = null }
    dirRef.current = target > active ? 1 : -1

    if (dirRef.current > 0) {
      setPreviewTarget(target)
      const cv = tearP.get()
      flyAwayRef.current = buildFlyAwayKeyframes()
      setTearState('flying')
      if (cv < 0.98) animate(tearP, 1, { duration: Math.max(0.06, (1 - cv) * 0.16), ease: [0.5, 0, 1, 1] })
      await new Promise<void>((r) => setTimeout(r, 420))
    } else {
      // previewP itself (the raw, ungated value) already tracks scroll/touch progress
      // 1:1 (see onDelta). On commit, overshoot it past 1 then settle at 1 — every
      // derived transform (previewY/X/rotateX/rotate/scale, see clampOff above)
      // overshoots proportionally for free, and starting from previewP's CURRENT value
      // handles both a live drag (already near 1) and a non-scroll trigger like
      // dot-rail click / arrow key (still at 0) in one motion. previewPSpring still
      // smooths the result, same as it already does for a fast scroll gesture.
      setPreviewTarget(target)
      const { duration, times, ease, overshoot } = buildOvershootAnim()
      animate(previewP, [previewP.get(), overshoot, 1], { duration, times, ease })
    }

    tearP.set(0)
    accRef.current = 0
    boundaryLockRef.current = false
    lastTearAtRef.current = Date.now()
    setActive(target)
    setTearState('entering')

    if (dirRef.current < 0) {
      // The Current layer now already shows this exact content at rest, so keeping
      // previewTarget mounted a bit longer is invisible in terms of WHAT's on screen —
      // it just gives the commit overshoot (started above) plus the spring's own lag
      // time to actually finish before being cut off mid-flight by an instant unmount.
      await new Promise<void>((r) => setTimeout(r, 520))
      previewP.set(0)
    }
    setPreviewTarget(null)

    // Forward always keeps input blocked for a fixed ~640ms (420ms flight + 220ms
    // settle) regardless of how "ready" it already was, so a single scroll's trailing
    // momentum has time to fully die before the next delta is accepted — that's why
    // one forward swipe reliably advances exactly one card. Backward's swap above can
    // now happen much faster (previewP is often already at 1 by the time threshold
    // crosses, so there's nothing left to visually wait for) — but if input unblocked
    // just as fast, the SAME gesture's leftover momentum could immediately clear a
    // second threshold, turning one swipe into two cards. Keep the fast visual swap
    // (that's the actual improvement), but hold input blocked for the same total
    // ~640ms window as forward regardless, so leftover momentum still has nowhere to
    // go. A genuinely separate next swipe (started after this window) is unaffected.
    const settleFloorMs = 640
    const elapsed = Date.now() - startedAt
    await new Promise<void>((r) => setTimeout(r, Math.max(220, settleFloorMs - elapsed)))
    setTearState('idle')
    isAnimRef.current = false
  }, [active, tearP, previewP])

  // Recede the backward preview instead of just cutting previewTarget to null
  // immediately — clearing it while the card is still fully or partially visible is
  // an instant snap that reads as "it flashed and reversed" (the same bug class fixed
  // for the idle-timeout cancel path). Retarget previewP back to 0 and let
  // previewPSpring (driving the visuals) carry it back out naturally, then drop the
  // target once it's had time to actually get there. Shared by every path that
  // abandons a backward gesture without completing it — not just idle-timeout, but
  // also boundaryLock/reversalCooldown absorbing a delta mid-gesture (reachable
  // whenever the input wobbles the other way before `active` has actually committed,
  // e.g. scrolling backward partway from the last card, then a slight forward flick
  // before releasing — active is still N-1 at that point, so it reads as pushing past
  // the boundary even though a backward preview is genuinely on screen).
  function recedePreview() {
    if (recedeTimerRef.current) { clearTimeout(recedeTimerRef.current); recedeTimerRef.current = null }
    const cv = previewP.get()
    previewP.set(0)
    if (cv > 0.02) {
      recedeTimerRef.current = setTimeout(() => { recedeTimerRef.current = null; setPreviewTarget(null) }, 400)
    } else {
      setPreviewTarget(null)
    }
  }

  const onDelta = useCallback((dy: number) => {
    if (isAnimRef.current) return
    // Any live input cancels a pending recede-clear from an earlier abandoned gesture
    // — otherwise that stale timeout could fire mid-way through a brand new gesture
    // and wipe out its legitimately-set previewTarget. recedePreview() below will set
    // its own fresh timer if this delta ends up abandoning the gesture again.
    if (recedeTimerRef.current) { clearTimeout(recedeTimerRef.current); recedeTimerRef.current = null }

    if (boundaryLockRef.current) {
      // Absorbing a "cluster" of activity around a boundary push — keep pushing the
      // quiet-window out on every event (not just the first) so a long sustained touch
      // near the boundary can't outlast a one-shot timer and go live again mid-touch.
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => { boundaryLockRef.current = false }, 380)
      return
    }

    const reversesLastTear = (dy > 0 && dirRef.current < 0) || (dy < 0 && dirRef.current > 0)
    if (reversesLastTear && Date.now() - lastTearAtRef.current < REVERSAL_COOLDOWN_MS) {
      // This delta points opposite to the direction we JUST tore in, too soon after
      // that tear to be a deliberate change of mind — almost certainly trackpad/touch
      // momentum overshoot as the previous gesture's motion decays. Absorb it rather
      // than let it start accumulating toward a tear back the way we came. A genuine
      // reversal still works once REVERSAL_COOLDOWN_MS has passed.
      accRef.current = 0
      tearP.set(0)
      recedePreview()
      return
    }

    if ((dy > 0 && active >= N - 1) || (dy < 0 && active <= 0)) {
      // This delta pushes past the last/first card. Lock out the rest of this cluster
      // of activity instead of just zeroing accRef: repeated retry swipes right at a
      // dead boundary (or a reversal late in one gesture as the finger relaxes) is
      // noise, not a deliberate swipe the other way, and must not accumulate toward a
      // tear. The lock only releases after a genuine pause — NOT on the next
      // touchstart, since at a boundary users retry with several quick separate
      // touches, not one continuous gesture; releasing on each touchstart would judge
      // every retry independently and let a single backward-leaning one slip through.
      boundaryLockRef.current = true
      accRef.current = 0
      tearP.set(0)
      recedePreview()
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => { boundaryLockRef.current = false }, 380)
      return
    }

    const prevAcc = accRef.current
    accRef.current = Math.max(-THRESH, Math.min(THRESH, accRef.current + dy))

    if (accRef.current > 0 && active < N - 1) {
      if (prevAcc <= 0) { dirRef.current = 1; setPreviewTarget(active + 1) }
      tearP.set(accRef.current / THRESH)
    } else if (accRef.current < 0 && active > 0) {
      if (prevAcc >= 0) { dirRef.current = -1; setPreviewTarget(active - 1) }
      tearP.set(0)
      // Drive the preview's entrance directly off how far this gesture has actually
      // accumulated toward threshold — see the previewP comment near its declaration.
      previewP.set(Math.min(1, -accRef.current / THRESH))
    } else {
      // accRef netted to exactly zero this event (a backward gesture's dy briefly
      // cancels out) — if a backward preview was genuinely visible a moment ago,
      // recede it properly rather than cutting it instantly.
      accRef.current = 0
      tearP.set(0)
      recedePreview()
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
      animate(tearP, 0, { duration: 0.36, ease: [0.34, 1.2, 0.4, 1] })
      recedePreview()
    }, 380)
  }, [active, doTear, tearP, previewP])

  // Walk up from the touch/wheel target to find a scrollable ancestor still inside the
  // stage — a safety net so that IF any nested content is ever internally scrollable
  // (none of EntryPassFace/CreatorPassFace/RoleSelectFace are anymore — their content is
  // scaled to fit via ScaleToFit instead — but e.g. PersonaShowcasePhone's inner persona
  // previews still are), it consumes its own drag instead of that gesture bubbling up
  // and accumulating toward a tear. Only once that inner scroll hits its edge should the
  // rest of the drag count toward swiping to the next/prev card.
  function findScrollableAncestor(target: EventTarget | null): HTMLElement | null {
    let el = target instanceof HTMLElement ? target : null
    while (el && el !== stageRef.current) {
      if (el.scrollHeight > el.clientHeight) {
        const overflowY = getComputedStyle(el).overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') return el
      }
      el = el.parentElement
    }
    return null
  }
  function deltaConsumedByInnerScroll(target: EventTarget | null, dy: number): boolean {
    const el = findScrollableAncestor(target)
    if (!el) return false
    // dy > 0 means the gesture wants to scroll further down; dy < 0 wants to scroll up.
    if (dy > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1
    if (dy < 0) return el.scrollTop > 1
    return false
  }

  function handleWheel(e: React.WheelEvent) {
    if (deltaConsumedByInnerScroll(e.target, e.deltaY)) return
    onDelta(e.deltaY)
  }
  function handleTouchStart(e: React.TouchEvent) {
    // Deliberately NOT clearing boundaryLockRef here. At a boundary, a user doesn't
    // make one continuous gesture — they make several quick separate swipe attempts
    // (each its own touchstart). If the lock cleared on every touchstart, each retry
    // would be judged purely on its own net finger motion, and any single retry whose
    // motion happened to lean backward (easy to happen when repeatedly poking at an
    // unresponsive edge) would fire a real reverse tear despite the user's intent
    // being "forward" every time. The lock only releases after a genuine pause (see
    // the idle-timeout clear in onDelta), so a real change-of-mind still works — it
    // just requires letting go for a moment first, not an instant re-swipe.
    touchYRef.current = e.touches[0].clientY
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (isAnimRef.current) return
    const y = e.touches[0].clientY
    const dy = (touchYRef.current - y) * 0.6
    touchYRef.current = y
    if (deltaConsumedByInnerScroll(e.target, dy)) return
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
          style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', overscrollBehavior: 'none', boxShadow: '0 18px 40px rgba(32,26,18,0.16), 0 0 0 1px rgba(32,26,18,0.06)', userSelect: 'none' }}
        >
          {/* Preview layer. Backward preview's position/scale/opacity is driven live off
              previewP, which onDelta keeps in lockstep with actual scroll/touch progress
              toward threshold (see previewP's declaration above) — so the card's visual
              state always reflects how close the gesture actually is to committing, both
              on the way in AND on the way back out if it's abandoned. Because of that,
              by the time previewTarget is ever cleared (either on commit, where previewP
              is already at 1 and the Current layer beneath already shows the identical
              settled content, or on idle-timeout cancel, where the idle timer animates
              previewP back to 0 BEFORE clearing the target — see onDelta), this element
              is already at its correct rest state and needs no exit-transition handling
              of its own; a plain conditional unmount is enough. */}
          {previewTarget !== null && (dirRef.current < 0 ? (
            <motion.div
              initial={false}
              style={{
                position: 'absolute', inset: 0, zIndex: 3, transformPerspective: 900,
                y: previewY, x: previewX, rotateX: previewRotateX, rotate: previewRotate,
                scale: previewScale, opacity: previewOpacity,
              }}
            >
              <MobileTicketSection index={previewTarget} tearP={zeroP} />
            </motion.div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <MobileTicketSection index={previewTarget} tearP={zeroP} />
            </div>
          ))}

          {/* Current ticket — no `key={active}`: the previewTarget layer above already
              mounted this same index a moment ago mid-tear, so keying on `active` here
              would force a needless unmount/remount right as the tear completes (and
              restart any mount-triggered image decode, producing a visible pop-in). */}
          <motion.div
            initial={false}
            style={{
              position: 'absolute', inset: 0, zIndex: 2, transformPerspective: 900,
              // clip-path is only ever meaningful mid-forward-tear (backward navigation
              // never touches tearP's visual effect at all — dirRef<0 leaves it at rest).
              // Binding it to a live derived motion value unconditionally means every
              // backward-accumulation wheel event (tearP.set(0), dozens per gesture per
              // the debug trace) still re-triggers Framer Motion's derived-value
              // recompute and a clip-path + transform re-apply on this element, even
              // though the value never changes — a known category of Chrome paint
              // glitch (stale compositor layer flashing) when clip-path is animated via
              // JS alongside transform on the same element. Static 'none' + zero
              // transform when idle/entering removes that churn entirely.
              clipPath: tearState === 'flying' ? currentClipPath : 'none',
              x: tearState === 'flying' ? driftX : 0,
              y: tearState === 'flying' ? driftY : 0,
            }}
            animate={
              tearState === 'flying'
                ? flyAwayRef.current.keyframes
                : { y: 0, x: 0, rotateX: 0, rotate: 0, scale: 1, opacity: 1 }
            }
            transition={tearState === 'flying' ? flyAwayRef.current.transition : { duration: 0 }}
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
