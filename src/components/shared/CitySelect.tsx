'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CITIES, type City } from '@/lib/constants/interests'

const RESULTS_CAP = 8

interface CityPanelTheme {
  accent?: string
  /** Text color for the selected row (sits on the accent background). */
  accentText?: string
  /** Text color for city names on unselected rows. */
  text?: string
  /** Text color for the state label on unselected rows. */
  muted?: string
  /** Background of the keyboard/mouse-highlighted row. */
  hoverBg?: string
  /** Divider line between rows. */
  borderColor?: string
}

const DEFAULT_THEME: Required<CityPanelTheme> = {
  accent: '#FFB4A6',
  accentText: '#1A2744',
  text: '#F0EFF8',
  muted: 'rgba(240,239,248,0.35)',
  hoverBg: 'rgba(255,255,255,0.06)',
  borderColor: 'rgba(255,255,255,0.06)',
}

interface CitySelectProps {
  /** Currently selected city name, or '' if none. */
  value: string
  /**
   * Fires with the picked City on selection (desktop click/keyboard or the
   * mobile native <select>), or with null when the user types away from the
   * currently-selected value (mirrors each onboarding step's prior
   * "clear selection while searching" behaviour).
   */
  onChange: (city: City | null) => void
  placeholder?: string
  /** Show the top cities immediately (no typing required) — used by the
   *  onboarding steps; profile settings leaves this off so the list only
   *  appears once the user starts searching. */
  dropdownWhenEmpty?: boolean
  /** Colors for the dropdown panel rows — defaults match the dark onboarding
   *  screens; pass overrides for a light-background context. */
  theme?: CityPanelTheme
  inputClassName?: string
  inputStyle?: CSSProperties
  selectClassName?: string
  selectStyle?: CSSProperties
  panelClassName?: string
  panelStyle?: CSSProperties
  id?: string
  ariaLabel?: string
  autoFocus?: boolean
  /** Notified whenever the desktop dropdown panel opens/closes — lets callers
   *  hide supplementary content (e.g. a tagline) while the list is open. */
  onOpenChange?: (open: boolean) => void
}

const DEFAULT_PANEL_STYLE: CSSProperties = {
  marginTop: 4,
  background: '#09090E',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.50)',
  overflow: 'hidden',
  maxHeight: 288,
  overflowY: 'auto',
}

const DEFAULT_INPUT_STYLE: CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid rgba(255,255,255,0.15)',
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 900,
  fontSize: 28,
  color: '#F0EFF8',
  outline: 'none',
  paddingBottom: 8,
}

function groupByState(cities: City[]): [string, City[]][] {
  const map = new Map<string, City[]>()
  for (const c of cities) {
    if (!map.has(c.state)) map.set(c.state, [])
    map.get(c.state)!.push(c)
  }
  return [...map.entries()]
}

export function CitySelect({
  value,
  onChange,
  placeholder = 'Search your city…',
  dropdownWhenEmpty = false,
  theme,
  inputClassName,
  inputStyle,
  selectClassName,
  selectStyle,
  panelClassName,
  panelStyle,
  id,
  ariaLabel,
  autoFocus,
  onOpenChange,
}: CitySelectProps) {
  const t = { ...DEFAULT_THEME, ...theme }
  const isMobile = useIsMobile()
  const [query, setQuery] = useState(value)
  const [open, setOpenState] = useState(dropdownWhenEmpty && !value)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  function setOpen(next: boolean) {
    setOpenState(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    setQuery(value)
    if (value) setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dropdownWhenEmpty ? CITIES.slice(0, RESULTS_CAP) : []
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    ).slice(0, RESULTS_CAP)
  }, [query, dropdownWhenEmpty])

  useEffect(() => { setHighlighted(0) }, [filtered])

  function select(city: City) {
    onChange(city)
    setQuery(city.name)
    setOpen(false)
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    setOpen(true)
    if (value && next !== value) onChange(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const city = filtered[highlighted]
      if (city) select(city)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (isMobile) {
    const selectedId = CITIES.find((c) => c.name === value)?.id ?? ''
    const resolvedClassName = selectClassName ?? inputClassName
    const resolvedStyle = selectStyle ?? inputStyle ?? (resolvedClassName ? undefined : DEFAULT_INPUT_STYLE)
    return (
      <select
        id={id}
        aria-label={ariaLabel ?? placeholder}
        value={selectedId}
        onChange={(e) => {
          const city = CITIES.find((c) => c.id === e.target.value)
          if (city) onChange(city)
        }}
        className={resolvedClassName}
        style={resolvedStyle}
      >
        <option value="" disabled>{placeholder}</option>
        {groupByState(CITIES).map(([state, cities]) => (
          <optgroup key={state} label={state}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        style={inputStyle ?? (inputClassName ? undefined : DEFAULT_INPUT_STYLE)}
      />

      {open && filtered.length > 0 && (
        <div role="listbox" className={panelClassName} style={panelClassName ? panelStyle : (panelStyle ?? DEFAULT_PANEL_STYLE)}>
          {filtered.map((city, i) => {
            const isSel = city.name === value
            const isHighlighted = i === highlighted
            return (
              <div
                key={city.id}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => select(city)}
                style={{
                  padding: '12px 16px',
                  background: isSel ? t.accent : isHighlighted ? t.hoverBg : 'transparent',
                  borderBottom: `1px solid ${t.borderColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{city.emoji}</span>
                  <span style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: isSel ? t.accentText : t.text }}>
                    {city.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: isSel ? `${t.accentText}80` : t.muted }}>
                    {city.state}
                  </span>
                </div>
                {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: t.accentText }}>check</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
