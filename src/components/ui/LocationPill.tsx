'use client'

// City switcher trigger pill. Two interaction variants share one external
// interface (activeCity/onSelect + the accent/muted/border/hover styling
// props) and are both always mounted, gated purely by Tailwind lg: classes —
// same "both mounted, CSS hides one" convention ExploreClient.tsx already
// uses for MobileHeader/DesktopHeader, rather than a useIsMobile() check
// (which has a known first-paint flash — see CLAUDE.md Known Debt).
//
// - Below lg: a vaul bottom sheet (LocationSheet). Structure mirrors
//   CountryCodeSelect.tsx's CountryCodeSheet (Drawer.Root/Trigger/Portal/
//   Content) — a thumb-reach pattern appropriate for mobile.
// - At lg and up: an anchored dropdown (LocationDropdown). No existing
//   Radix/headlessui dependency and no floating-anchored precedent in this
//   codebase — CitySelect.tsx's desktop panel is the closest hand-rolled
//   precedent (relative wrapper + document `mousedown` outside-click
//   listener) but flows inline rather than floating, so it's adapted here
//   with `position: absolute` instead of built from scratch.
//
// City list comes from the shared CITIES constant (src/lib/constants/
// interests.ts) — already the source of truth for city selection across the
// app (onboarding, admin, CitySelect, etc.) — rather than a new duplicate
// list, so adding a third city later only means editing that one array.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Drawer } from 'vaul'
import { CITIES, type City } from '@/lib/constants/interests'

interface LocationPillProps {
  activeCity: string
  onSelect: (city: string) => void
  accentColor?: string   // selected row background
  accentText?: string    // selected row text color (sits on accentColor)
  mutedText?: string     // trigger pill text/icon color
  borderColor?: string
  /** 'solid' (default, mobile dashboard) or 'dashed' (desktop guest marketing header). */
  borderStyle?: 'solid' | 'dashed'
  /** Border/text color on hover — omit (default) for no hover effect, matching the
   *  original mobile pill's behavior. Desktop's marketing header passes both to
   *  reproduce its old two-button toggle's hover:border-solid hover:text-white treatment. */
  hoverBorderColor?: string
  hoverTextColor?: string
}

const DEFAULT_ACCENT_COLOR = '#9B8FFF'
const DEFAULT_ACCENT_TEXT  = '#07070A'
const DEFAULT_MUTED_TEXT   = 'rgba(26,17,8,0.45)'
const DEFAULT_BORDER_COLOR = 'rgba(26,17,8,0.15)'
const DEFAULT_BORDER_STYLE = 'solid' as const

export default function LocationPill(props: LocationPillProps) {
  return (
    <>
      <div className="lg:hidden">
        <LocationSheet {...props} />
      </div>
      <div className="hidden lg:block">
        <LocationDropdown {...props} />
      </div>
    </>
  )
}

// ─── Shared trigger pill + row look ────────────────────────────────────────

function triggerButtonStyle(
  hovered: boolean,
  { mutedText, borderColor, borderStyle, hoverBorderColor, hoverTextColor }: Required<Pick<LocationPillProps, 'mutedText' | 'borderColor' | 'borderStyle'>> & Pick<LocationPillProps, 'hoverBorderColor' | 'hoverTextColor'>,
): CSSProperties {
  const isHoverActive = hovered && (hoverBorderColor !== undefined || hoverTextColor !== undefined)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 11px',
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: isHoverActive ? 'solid' : borderStyle,
    borderColor: isHoverActive ? (hoverBorderColor ?? borderColor) : borderColor,
    background: 'transparent',
    color: isHoverActive ? (hoverTextColor ?? mutedText) : mutedText,
    fontFamily: 'var(--font-jetbrains-mono), monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    transition: 'color 0.15s, border-color 0.15s, border-style 0.15s',
  }
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CityRow({
  city, isSel, onClick, accentColor, accentText,
}: { city: City; isSel: boolean; onClick: () => void; accentColor: string; accentText: string }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSel}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors"
      style={{ background: isSel ? accentColor : 'transparent', color: isSel ? accentText : '#e5e1e6' }}
    >
      <span style={{ fontSize: 18 }}>{city.emoji}</span>
      <span className="flex-1 text-sm font-semibold">{city.name}</span>
      {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>}
    </button>
  )
}

// ─── Below lg: vaul bottom sheet ────────────────────────────────────────────

function LocationSheet({
  activeCity,
  onSelect,
  accentColor = DEFAULT_ACCENT_COLOR,
  accentText  = DEFAULT_ACCENT_TEXT,
  mutedText   = DEFAULT_MUTED_TEXT,
  borderColor = DEFAULT_BORDER_COLOR,
  borderStyle = DEFAULT_BORDER_STYLE,
  hoverBorderColor,
  hoverTextColor,
}: LocationPillProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  function select(city: string) {
    setOpen(false)
    if (city !== activeCity) onSelect(city)
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label="Switch city"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={triggerButtonStyle(hovered, { mutedText, borderColor, borderStyle, hoverBorderColor, hoverTextColor })}
        >
          {activeCity.toUpperCase()}
          <ChevronDown />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[101] bg-[#1b1b1f] border-t border-[#57423e] outline-none max-h-[75vh] flex flex-col">
          <Drawer.Title className="sr-only">Switch city</Drawer.Title>
          <Drawer.Handle style={{ marginTop: 12, marginBottom: 8, background: '#57423e' }} />
          <div className="overflow-y-auto pb-6">
            {CITIES.map((c) => (
              <CityRow key={c.id} city={c} isSel={c.name === activeCity} onClick={() => select(c.name)} accentColor={accentColor} accentText={accentText} />
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// ─── At lg and up: anchored dropdown ────────────────────────────────────────

function LocationDropdown({
  activeCity,
  onSelect,
  accentColor = DEFAULT_ACCENT_COLOR,
  accentText  = DEFAULT_ACCENT_TEXT,
  mutedText   = DEFAULT_MUTED_TEXT,
  borderColor = DEFAULT_BORDER_COLOR,
  borderStyle = DEFAULT_BORDER_STYLE,
  hoverBorderColor,
  hoverTextColor,
}: LocationPillProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function select(city: string) {
    setOpen(false)
    if (city !== activeCity) onSelect(city)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Switch city"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={triggerButtonStyle(hovered, { mutedText, borderColor, borderStyle, hoverBorderColor, hoverTextColor })}
      >
        {activeCity.toUpperCase()}
        <ChevronDown />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Switch city"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 160,
            background: '#1b1b1f',
            borderWidth: 1,
            borderStyle,
            borderColor,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 100,
          }}
        >
          {CITIES.map((c) => (
            <CityRow key={c.id} city={c} isSel={c.name === activeCity} onClick={() => select(c.name)} accentColor={accentColor} accentText={accentText} />
          ))}
        </div>
      )}
    </div>
  )
}
