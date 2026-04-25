'use client'

interface Props {
  children: React.ReactNode
  /** Amber text segments surrounded by ** are highlighted: "Your best month was **October**" */
  className?: string
}

/**
 * Amber insight banner. Wrap key data in <strong> or **bold** to amber-highlight.
 * Every chart section has one of these to answer "so what?" for the owner.
 */
export default function InsightCard({ children }: Props) {
  return (
    <div
      style={{
        background: 'var(--adda-amber-tint)',
        border: '1px solid var(--adda-amber-border)',
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 16,
      }}
    >
      <span
        aria-hidden
        style={{
          color: 'var(--adda-amber)',
          fontSize: 13,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        ◆
      </span>
      <span
        style={{
          fontSize: 13,
          color: 'var(--adda-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          lineHeight: 1.55,
        }}
      >
        {children}
      </span>
    </div>
  )
}

/** Inline amber emphasis — use inside InsightCard */
export function Amber({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ color: 'var(--adda-amber)', fontWeight: 600 }}>
      {children}
    </strong>
  )
}
