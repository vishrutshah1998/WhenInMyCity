'use client'

import { useState } from 'react'
import { THEMES, getTheme } from './themes'

interface ThemePickerProps {
  activeThemeId: string
  onThemeChange: (id: string) => void
  disabled?: boolean
}

export function ThemePicker({ activeThemeId, onThemeChange, disabled = false }: ThemePickerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const activeTheme = getTheme(activeThemeId)

  function shuffleTheme() {
    const others = THEMES.filter((t) => t.id !== activeThemeId)
    const next = others[Math.floor(Math.random() * others.length)]
    onThemeChange(next.id)
  }

  return (
    <div className={`relative flex gap-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Left pill — theme selector */}
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-[#2A1800] md:bg-[#1E1E1E] hover:bg-[#332000] md:hover:bg-[#252525] transition-colors"
      >
        {/* Swatch preview */}
        <div
          className="rounded flex-shrink-0"
          style={{ width: 36, height: 28, ...activeTheme.swatch }}
        />

        {/* Labels */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-[10px] text-[#555] uppercase tracking-widest leading-none mb-0.5">Theme</p>
          <p className="text-[14px] text-white font-medium leading-none truncate">{activeTheme.name}</p>
        </div>

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 text-[#555] transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Right pill — shuffle */}
      <button
        type="button"
        onClick={shuffleTheme}
        title="Random theme"
        className="w-11 flex items-center justify-center rounded-[10px] bg-[#2A1800] md:bg-[#1E1E1E] hover:bg-[#332000] md:hover:bg-[#252525] transition-colors"
      >
        {/* Shuffle icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 3 21 3 21 8"/>
          <line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/>
          <line x1="15" y1="15" x2="21" y2="21"/>
        </svg>
      </button>

      {/* Dropdown popover */}
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-50 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onThemeChange(t.id); setDropdownOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-colors ${
                  t.id === activeThemeId ? 'bg-white/5' : ''
                }`}
              >
                <div
                  className="rounded flex-shrink-0"
                  style={{ width: 32, height: 24, ...t.swatch }}
                />
                <span className="text-sm text-white font-medium">{t.name}</span>
                {t.id === activeThemeId && (
                  <svg className="ml-auto" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="#E8572A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

