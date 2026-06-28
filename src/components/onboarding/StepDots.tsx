'use client'

interface StepDotsProps {
  currentStep: number  // 1–9
  total?:      number  // defaults to 9 for legacy screens
  accent:      string
  isWarm?:     boolean
}

export function StepDots({ currentStep, total = 9, accent, isWarm = false }: StepDotsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => {
        const done    = s < currentStep
        const current = s === currentStep
        return (
          <div
            key={s}
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   done
                ? accent
                : current
                  ? (isWarm ? '#1A1A1A' : '#ffffff')
                  : isWarm ? 'rgba(26,26,26,0.18)' : 'rgba(255,255,255,0.2)',
              transition:   'background 200ms',
              flexShrink:   0,
            }}
          />
        )
      })}
    </div>
  )
}
