'use client'

// Shared 2-city toggle — generalizes the hardcoded Ahmedabad/Gandhinagar toggle
// previously duplicated between ExploreClient.tsx's MobileHeader and the new
// authenticated Explorer top bar. Deliberately fixed to WIMC's current Phase 0
// launch cities; not a general city picker (see CLAUDE.md launch scope).
const CITIES = ['Ahmedabad', 'Gandhinagar'] as const

// Matches the abbreviations MobileHeader already used — kept identical so the
// pill reads the same way it always has on /explore, just componentized.
const CITY_LABEL: Record<string, string> = {
  Ahmedabad: 'AHM',
  Gandhinagar: 'GNR',
}

interface LocationPillProps {
  activeCity: string
  onSelect: (city: string) => void
  accentColor?: string   // active segment background
  accentText?: string    // active segment text color
  mutedText?: string     // inactive segment text color
  borderColor?: string
}

export default function LocationPill({
  activeCity,
  onSelect,
  accentColor = '#9B8FFF',
  accentText  = '#07070A',
  mutedText   = 'rgba(26,17,8,0.45)',
  borderColor = 'rgba(26,17,8,0.15)',
}: LocationPillProps) {
  return (
    <div
      role="group"
      aria-label="Switch city"
      style={{
        display: 'inline-flex',
        borderRadius: 9999,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {CITIES.map((c, i) => {
        const active = activeCity === c
        return (
          <button
            key={c}
            type="button"
            title={c}
            aria-pressed={active}
            onClick={() => { if (!active) onSelect(c) }}
            style={{
              padding: '5px 11px',
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${borderColor}` : 'none',
              background: active ? accentColor : 'transparent',
              color: active ? accentText : mutedText,
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: active ? 'default' : 'pointer',
            }}
          >
            {CITY_LABEL[c] ?? c.slice(0, 3).toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
