'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ProfileTheme } from '@/types/theme'

// ---------------------------------------------------------------------------
// Color scheme definitions
// ---------------------------------------------------------------------------

type SchemeId = ProfileTheme['colorScheme']

interface ColorScheme {
  id: SchemeId
  label: string
  description: string
  bg: string
  surface: string
  primary: string
  text: string        // text color on bg (for swatch label)
  onPrimary: string   // text color on primary chip
  light: boolean      // is this a light theme?
}

const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    label: 'Ember',
    description: 'Warm dark with terracotta',
    bg: '#121212',
    surface: '#2C2C2C',
    primary: '#E8572A',
    text: '#F2F0EF',
    onPrimary: '#fff',
    light: false,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Pitch black with electric indigo',
    bg: '#080812',
    surface: '#14143A',
    primary: '#818CF8',
    text: '#E8E8FF',
    onPrimary: '#fff',
    light: false,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep navy with luminous cyan',
    bg: '#071724',
    surface: '#0F2D45',
    primary: '#22D3EE',
    text: '#D0EEFF',
    onPrimary: '#00263A',
    light: false,
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Dark green with jade emerald',
    bg: '#0F231A',
    surface: '#1B4332',
    primary: '#6EE7B7',
    text: '#D1FAE5',
    onPrimary: '#00352A',
    light: false,
  },
  {
    id: 'blush',
    label: 'Blossom',
    description: 'Soft rose with vibrant crimson',
    bg: '#FFF1F3',
    surface: '#FFE1E7',
    primary: '#E11D48',
    text: '#1C0714',
    onPrimary: '#fff',
    light: true,
  },
  {
    id: 'sand',
    label: 'Ivory',
    description: 'Warm parchment with amber gold',
    bg: '#FDFAF5',
    surface: '#F3ECD8',
    primary: '#B45309',
    text: '#1C150A',
    onPrimary: '#fff',
    light: true,
  },
]

// ---------------------------------------------------------------------------
// Font definitions
// ---------------------------------------------------------------------------

const FONTS: { id: ProfileTheme['fontFamily']; label: string; description: string; cssFamily: string }[] = [
  { id: 'inter',          label: 'Classic',    description: 'Clean & modern',       cssFamily: 'var(--font-inter), sans-serif'          },
  { id: 'playfair',       label: 'Elegant',    description: 'Refined & editorial',  cssFamily: 'var(--font-playfair), serif'             },
  { id: 'space-grotesk',  label: 'Bold',       description: 'Techy & expressive',   cssFamily: 'var(--font-space-grotesk), sans-serif'   },
  { id: 'archivo-black',  label: 'Raw',        description: 'Loud display type',    cssFamily: 'var(--font-archivo-black), sans-serif'   },
]

// ---------------------------------------------------------------------------
// Background options
// ---------------------------------------------------------------------------

type BgStyle = ProfileTheme['backgroundStyle']
type PatternStyle = NonNullable<ProfileTheme['patternStyle']>
type PatternCombo = NonNullable<ProfileTheme['patternColorCombo']>

interface BgOption {
  id: BgStyle
  label: string
  icon: string
  description: string
}

const BG_OPTIONS: BgOption[] = [
  { id: 'solid',   label: 'Solid',    icon: 'format_color_fill', description: 'Pick any colour' },
  { id: 'pattern', label: 'Pattern',  icon: 'texture',           description: 'Geometric overlays' },
  { id: 'aurora',  label: 'Aurora',   icon: 'auto_awesome',      description: 'Flowing live gradient' },
]

const PATTERN_STYLES: { id: PatternStyle; label: string; preview: string }[] = [
  {
    id: 'dots',
    label: 'Dots',
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23ffffff' opacity='0.25'/%3E%3C/svg%3E")`,
  },
  {
    id: 'grid',
    label: 'Grid',
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M20 0H0v20' fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='0.5'/%3E%3C/svg%3E")`,
  },
  {
    id: 'waves',
    label: 'Waves',
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='24'%3E%3Cpath d='M0 12 C25 2,75 22,100 12' fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='1'/%3E%3C/svg%3E")`,
  },
  {
    id: 'hex',
    label: 'Hex',
    preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='90'%3E%3Cpath d='M26,0 L52,15 L52,45 L26,60 L0,45 L0,15 Z M26,60 L26,90' fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='0.9'/%3E%3C/svg%3E")`,
  },
]

const PATTERN_COMBOS: { id: PatternCombo; label: string; color: string }[] = [
  { id: 'default', label: 'Scheme',  color: '#E8572A' },
  { id: 'warm',    label: 'Warm',    color: '#DC7835' },
  { id: 'cool',    label: 'Cool',    color: '#22D3EE' },
  { id: 'mono',    label: 'Mono',    color: '#888888' },
]

// ---------------------------------------------------------------------------
// ThemeEditor component
// ---------------------------------------------------------------------------

interface ThemeEditorProps {
  theme: ProfileTheme
  onThemeChange: (partial: Partial<ProfileTheme>) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
}

// Metadata for vernacular schemes (not in picker, but needed to style the editor
// when a creator has a category-auto theme active)
const VERNACULAR_SCHEME_META: Partial<Record<string, Pick<ColorScheme, 'primary' | 'onPrimary' | 'bg' | 'light'>>> = {
  pista:    { primary: '#2D7A4F', onPrimary: '#F7F2E8', bg: '#1A1108', light: false },
  gulaal:   { primary: '#E8342A', onPrimary: '#F7F2E8', bg: '#1A1108', light: false },
  neel:     { primary: '#F5A800', onPrimary: '#0B1420', bg: '#0B1420', light: false },
  turmeric: { primary: '#F5A800', onPrimary: '#1A1108', bg: '#1A1108', light: false },
  steel:    { primary: '#F5A800', onPrimary: '#14130E', bg: '#14130E', light: false },
  sienna:   { primary: '#C04A00', onPrimary: '#F7F2E8', bg: '#1A1108', light: false },
  indigo:   { primary: '#818CF8', onPrimary: '#1A1108', bg: '#1A1108', light: false },
}

// ---------------------------------------------------------------------------
// Shared colour picker field
// ---------------------------------------------------------------------------

function ColorPickerField({
  value,
  defaultColor,
  isLight,
  onChange,
  onReset,
}: {
  value: string | undefined
  defaultColor: string
  isLight: boolean
  onChange: (hex: string) => void
  onReset: () => void
}) {
  const [localHex, setLocalHex] = useState(value ?? '')

  // Stay in sync when the native picker updates the value via props
  useEffect(() => {
    if (value !== undefined) setLocalHex(value)
  }, [value])

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value
    setLocalHex(hex)
    onChange(hex)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setLocalHex(raw)
    const hex = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onChange(hex)
  }

  const displayColor = value ?? defaultColor

  return (
    <div className="flex items-center gap-3">
      {/* Swatch — opens native colour picker */}
      <label className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-white/20 cursor-pointer shrink-0">
        <input
          type="color"
          value={displayColor}
          onChange={handlePickerChange}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: displayColor }}
        >
          <span
            className="material-symbols-outlined text-sm"
            style={{ color: isLight ? '#00000080' : '#ffffff80' }}
          >
            colorize
          </span>
        </div>
      </label>

      {value ? (
        /* Custom colour active — editable hex input */
        <input
          type="text"
          value={localHex}
          onChange={handleTextChange}
          maxLength={7}
          spellCheck={false}
          className="flex-1 bg-transparent text-sm font-mono font-semibold text-on-surface border-b border-white/20 focus:border-white/50 outline-none pb-0.5 transition-colors"
          placeholder="#000000"
        />
      ) : (
        <p className="flex-1 text-sm font-semibold text-on-surface-variant">Scheme default</p>
      )}

      {value && (
        <button
          onClick={onReset}
          className="text-xs text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1 rounded shrink-0"
        >
          Reset
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-section disclosure component
// ---------------------------------------------------------------------------

function SubSection({ title, isOpen, onToggle, children }: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold text-on-surface">{title}</span>
        <span className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

export default function ThemeEditor({ theme, onThemeChange, isDirty, isSaving, onSave }: ThemeEditorProps) {
  const [openSection, setOpenSection] = useState<'color' | 'background' | 'font' | 'effects' | null>('color')

  const toggleSection = (section: 'color' | 'background' | 'font' | 'effects') => {
    setOpenSection((prev) => (prev === section ? null : section))
  }

  const activeScheme = COLOR_SCHEMES.find((s) => s.id === theme.colorScheme)
    ?? { ...COLOR_SCHEMES[0], ...(VERNACULAR_SCHEME_META[theme.colorScheme] ?? {}) }

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-white/5">
      <div>

          {/* ── Color Scheme ──────────────────────────────────────────── */}
          <SubSection title="Color Scheme" isOpen={openSection === 'color'} onToggle={() => toggleSection('color')}>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_SCHEMES.map((cs) => {
                const active = theme.colorScheme === cs.id
                return (
                  <button
                    key={cs.id}
                    onClick={() => onThemeChange({ colorScheme: cs.id })}
                    title={cs.description}
                    className="relative flex flex-col rounded-xl overflow-hidden border-2 transition-all group"
                    style={{
                      borderColor: active ? cs.primary : 'transparent',
                      boxShadow: active ? `0 0 0 2px ${cs.primary}50` : 'none',
                    }}
                  >
                    {/* Colour preview block */}
                    <div
                      className="h-14 w-full relative"
                      style={{ background: cs.bg }}
                    >
                      {/* Surface strip */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-5"
                        style={{ background: cs.surface }}
                      />
                      {/* Primary chip */}
                      <div
                        className="absolute bottom-1.5 left-1.5 w-5 h-2 rounded-full"
                        style={{ background: cs.primary }}
                      />
                      {/* Selected check */}
                      {active && (
                        <div
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
                          style={{ background: cs.primary }}
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke={cs.onPrimary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Label */}
                    <div
                      className="px-2 py-1.5 text-left"
                      style={{ background: cs.surface }}
                    >
                      <p
                        className="text-[11px] font-bold truncate"
                        style={{ color: cs.text }}
                      >
                        {cs.label}
                      </p>
                      <p
                        className="text-[9px] leading-none mt-0.5 truncate opacity-70"
                        style={{ color: cs.text }}
                      >
                        {cs.light ? 'Light' : 'Dark'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </SubSection>

          {/* ── Background ────────────────────────────────────────────── */}
          <SubSection title="Background" isOpen={openSection === 'background'} onToggle={() => toggleSection('background')}>
            {/* Three top-level options */}
            <div className="flex gap-2 mb-4">
              {BG_OPTIONS.map((bg) => {
                const active = theme.backgroundStyle === bg.id
                return (
                  <button
                    key={bg.id}
                    onClick={() => onThemeChange({ backgroundStyle: bg.id })}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)',
                      background: active ? `${activeScheme.primary}18` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ color: active ? activeScheme.primary : 'var(--md-sys-color-on-surface-variant)' }}
                    >
                      {bg.icon}
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: active ? activeScheme.primary : 'var(--md-sys-color-on-surface-variant)' }}
                    >
                      {bg.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Solid — color picker */}
            {theme.backgroundStyle === 'solid' && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <ColorPickerField
                  value={theme.solidColor}
                  defaultColor={activeScheme.bg}
                  isLight={activeScheme.light}
                  onChange={(hex) => onThemeChange({ solidColor: hex })}
                  onReset={() => onThemeChange({ solidColor: undefined })}
                />
              </div>
            )}

            {/* Pattern — style + color combo */}
            {theme.backgroundStyle === 'pattern' && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
                {/* Pattern style */}
                <div>
                  <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Style</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PATTERN_STYLES.map((ps) => {
                      const active = (theme.patternStyle ?? 'dots') === ps.id
                      return (
                        <button
                          key={ps.id}
                          onClick={() => onThemeChange({ patternStyle: ps.id })}
                          className="flex flex-col items-center gap-1.5 rounded-lg overflow-hidden border-2 transition-all"
                          style={{
                            borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <div
                            className="w-full h-10"
                            style={{
                              background: `${ps.preview}, ${activeScheme.bg}`,
                              backgroundSize: ps.id === 'waves' ? '100px 24px' : ps.id === 'hex' ? '52px 90px' : '20px 20px',
                            }}
                          />
                          <span
                            className="text-[9px] font-bold pb-1"
                            style={{ color: active ? activeScheme.primary : 'var(--md-sys-color-on-surface-variant)' }}
                          >
                            {ps.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Color combo */}
                <div>
                  <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Colour</p>
                  <div className="flex gap-2">
                    {PATTERN_COMBOS.map((pc) => {
                      const active = (theme.patternColorCombo ?? 'default') === pc.id
                      const swatchColor = pc.id === 'default' ? activeScheme.primary : pc.color
                      return (
                        <button
                          key={pc.id}
                          onClick={() => onThemeChange({ patternColorCombo: pc.id })}
                          className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg border-2 transition-all"
                          style={{ borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)' }}
                        >
                          <div className="w-5 h-5 rounded-full" style={{ background: swatchColor }} />
                          <span
                            className="text-[9px] font-bold"
                            style={{ color: active ? activeScheme.primary : 'var(--md-sys-color-on-surface-variant)' }}
                          >
                            {pc.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Aurora — style picker */}
            {theme.backgroundStyle === 'aurora' && (
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'nebula', label: 'Nebula',  icon: 'blur_on' },
                  { id: 'mesh',   label: 'Mesh',    icon: 'gradient' },
                  { id: 'rays',   label: 'Rays',    icon: 'wb_sunny' },
                  { id: 'ripple', label: 'Ripple',  icon: 'water_drop' },
                ] as const).map((opt) => {
                  const active = (theme.auroraStyle ?? 'nebula') === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => onThemeChange({ auroraStyle: opt.id })}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)',
                        background: active ? `${activeScheme.primary}18` : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <span className="material-symbols-outlined text-lg" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.5)' }}>{opt.icon}</span>
                      <span className="text-sm font-medium" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.7)' }}>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </SubSection>

          {/* ── Font ──────────────────────────────────────────────────── */}
          <SubSection title="Font" isOpen={openSection === 'font'} onToggle={() => toggleSection('font')}>
            <div className="space-y-2 mb-4">
              {FONTS.map((font) => {
                const active = theme.fontFamily === font.id
                return (
                  <button
                    key={font.id}
                    onClick={() => onThemeChange({ fontFamily: font.id })}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left"
                    style={{
                      borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)',
                      background: active ? `${activeScheme.primary}15` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div>
                      <span
                        className="text-sm font-bold block"
                        style={{
                          fontFamily: font.cssFamily,
                          color: 'var(--md-sys-color-on-surface)',
                        }}
                      >
                        {font.label}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                        {font.description}
                      </span>
                    </div>
                    {active && (
                      <span className="material-symbols-outlined text-sm" style={{ color: activeScheme.primary }}>
                        check_circle
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Font colour */}
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Font colour</p>
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <ColorPickerField
                value={theme.fontColor}
                defaultColor={activeScheme.text}
                isLight={activeScheme.light}
                onChange={(hex) => onThemeChange({ fontColor: hex })}
                onReset={() => onThemeChange({ fontColor: undefined })}
              />
            </div>
          </SubSection>

          {/* ── Effects ───────────────────────────────────────────────── */}
          <SubSection title="Effects" isOpen={openSection === 'effects'} onToggle={() => toggleSection('effects')}>
            <div className="rounded-xl border border-white/8 bg-white/3 divide-y divide-white/5">

              {/* Glass effects */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-on-surface">Liquid Glass</p>
                </div>
                <button
                  onClick={() => onThemeChange({ glassEffects: !theme.glassEffects })}
                  className="relative w-11 h-6 rounded-full transition-all shrink-0"
                  style={{ background: theme.glassEffects ? activeScheme.primary : 'rgba(255,255,255,0.15)' }}
                  role="switch"
                  aria-checked={!!theme.glassEffects}
                >
                  <span
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: theme.glassEffects ? '1.375rem' : '0.25rem' }}
                  />
                </button>
              </div>

              {/* Drop Shadow */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <p className="text-sm font-semibold text-on-surface">Drop Shadow</p>
                <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
                  {(['off', 'natural', 'thicc'] as const).map((opt) => {
                    const active = (theme.dropShadow ?? 'off') === opt
                    const label = opt === 'off' ? 'Flat' : opt
                    return (
                      <button
                        key={opt}
                        onClick={() => onThemeChange({ dropShadow: opt })}
                        className="px-3 py-1.5 text-xs font-medium transition-all capitalize"
                        style={{
                          background: active ? activeScheme.primary : 'rgba(255,255,255,0.07)',
                          color: active ? activeScheme.onPrimary : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </SubSection>

          {/* ── Save button ───────────────────────────────────────────── */}
          <div className="px-5 py-4">
            <button
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className="w-full py-3 rounded-xl font-headline font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: isDirty ? activeScheme.primary : 'rgba(255,255,255,0.08)',
                color: isDirty ? activeScheme.onPrimary : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : isDirty ? (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Save theme
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Saved
                </>
              )}
            </button>
          </div>
        </div>
    </div>
  )
}
