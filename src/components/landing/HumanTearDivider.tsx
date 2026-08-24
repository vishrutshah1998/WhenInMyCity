'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { buildTearEdgePath } from '@/lib/ticketTear'

// Shared between mission/page.tsx and growth/page.tsx — a scroll-driven section
// break styled as a hand-torn page, not a scissors cut. The two halves are solid-
// color polygons that share one jagged boundary (buildTearEdgePath, the same
// irregular rhythm used by the ticket-stack landing cards) and pull apart as the
// divider scrolls through view, exposing the torn edge instead of a straight cut.

const W = 400
const H = 56
const MID = H / 2
const AMP = 6.5
const EDGE = buildTearEdgePath(W, MID, AMP)
const EDGE_POINTS = EDGE.slice(2) // strip the leading "M " so it can follow an "L"

const TOP_FILL = `${EDGE} L ${W} 0 L 0 0 Z`
const BOTTOM_FILL = `M ${EDGE_POINTS} L ${W} ${H} L 0 ${H} Z`

export function HumanTearDivider({ accentColor = '#FF6B35', bg = '#FBF3E7' }: { accentColor?: string; bg?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.1'] })
  const pull = useTransform(scrollYProgress, [0.5, 0.95], [0, 1])
  const topY = useTransform(pull, (v) => v * -11)
  const botY = useTransform(pull, (v) => v * 11)

  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'relative', height: H, overflow: 'visible', zIndex: 10 }}>
      <motion.svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', y: topY }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <path d={TOP_FILL} fill={bg} />
        <path d={EDGE} fill="none" stroke={accentColor} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="1 5" strokeLinecap="round" />
      </motion.svg>
      <motion.svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', y: botY }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <path d={BOTTOM_FILL} fill={bg} />
        <path d={EDGE} fill="none" stroke={accentColor} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="1 5" strokeLinecap="round" />
      </motion.svg>
    </div>
  )
}
