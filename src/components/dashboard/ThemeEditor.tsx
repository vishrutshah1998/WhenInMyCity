'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ProfileTheme } from '@/types/theme'
import type { PersonaKey } from '@/lib/constants/blocks'

// ---------------------------------------------------------------------------
// Color scheme definitions — used by the Color Scheme picker
// ---------------------------------------------------------------------------

type SchemeId = ProfileTheme['colorScheme']

interface ColorScheme {
  id: SchemeId
  label: string
  description: string
  bg: string
  surface: string
  primary: string
  text: string
  onPrimary: string
  light: boolean
}

const COLOR_SCHEMES: ColorScheme[] = [
  { id: 'default',  label: 'Ember',     description: 'Warm dark with terracotta',         bg: '#121212', surface: '#2C2C2C', primary: '#E8572A', text: '#F2F0EF', onPrimary: '#fff',     light: false },
  { id: 'midnight', label: 'Midnight',  description: 'Pitch black with electric indigo',  bg: '#080812', surface: '#14143A', primary: '#818CF8', text: '#E8E8FF', onPrimary: '#fff',     light: false },
  { id: 'ocean',    label: 'Ocean',     description: 'Deep navy with luminous cyan',       bg: '#071724', surface: '#0F2D45', primary: '#22D3EE', text: '#D0EEFF', onPrimary: '#00263A', light: false },
  { id: 'forest',   label: 'Forest',   description: 'Dark green with jade emerald',       bg: '#0F231A', surface: '#1B4332', primary: '#6EE7B7', text: '#D1FAE5', onPrimary: '#00352A', light: false },
  { id: 'blush',    label: 'Blossom',  description: 'Soft rose with vibrant crimson',     bg: '#FFF1F3', surface: '#FFE1E7', primary: '#E11D48', text: '#1C0714', onPrimary: '#fff',     light: true  },
  { id: 'sand',     label: 'Ivory',    description: 'Warm parchment with amber gold',     bg: '#FDFAF5', surface: '#F3ECD8', primary: '#B45309', text: '#1C150A', onPrimary: '#fff',     light: true  },
  { id: 'pista',    label: 'Pista',    description: 'Ink with pista green accent',        bg: '#1A1108', surface: '#2C1E0F', primary: '#2D7A4F', text: '#F7F2E8', onPrimary: '#F7F2E8', light: false },
  { id: 'gulaal',   label: 'Gulaal',   description: 'Ink with gulaal red accent',         bg: '#1A1108', surface: '#2C1E0F', primary: '#E8342A', text: '#F7F2E8', onPrimary: '#F7F2E8', light: false },
  { id: 'neel',     label: 'Neel',     description: 'Deep navy with turmeric gold',       bg: '#0B1420', surface: '#16203A', primary: '#F5A800', text: '#F7F2E8', onPrimary: '#0B1420', light: false },
  { id: 'turmeric', label: 'Turmeric', description: 'Ink with golden yellow accent',      bg: '#1A1108', surface: '#2C1E0F', primary: '#F5A800', text: '#F7F2E8', onPrimary: '#1A1108', light: false },
  { id: 'steel',    label: 'Steel',    description: 'Near-black with steel surface',      bg: '#14130E', surface: '#3D3D3D', primary: '#5B8DEF', text: '#E7E2D8', onPrimary: '#fff',     light: false },
  { id: 'sienna',   label: 'Sienna',   description: 'Ink with burnt sienna warmth',       bg: '#1A1108', surface: '#2C1E0F', primary: '#C04A00', text: '#F7F2E8', onPrimary: '#F7F2E8', light: false },
  { id: 'indigo',   label: 'Indigo',   description: 'Ink with electric indigo accent',    bg: '#1A1108', surface: '#24183A', primary: '#818CF8', text: '#F7F2E8', onPrimary: '#1A1108', light: false },
]

// ---------------------------------------------------------------------------
// Layout presets — each has a structurally different page layout
// ---------------------------------------------------------------------------

interface LayoutPreset {
  name: string
  tagline: string
  description: string
  preset: ProfileTheme
  previewBg: string
  previewPrimary: string
  previewText: string
  light: boolean
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: 'Reel',
    tagline: 'Made for the feed',
    description: 'Glowing avatar, gradient atmosphere — swipe-native and scroll-ready',
    preset: { layoutPreset: 'reel', colorScheme: 'midnight', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'nebula' },
    previewBg: '#080812', previewPrimary: '#818CF8', previewText: '#E8E8FF', light: false,
  },
  {
    name: 'Boarding Pass',
    tagline: 'The WIMC original',
    description: 'Ticket-stub header, culture-pass energy — instantly recognisable',
    preset: { layoutPreset: 'boarding-pass', colorScheme: 'default', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, heavyBorders: true },
    previewBg: '#1A1108', previewPrimary: '#E8572A', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Poster',
    tagline: 'Your name in lights',
    description: 'Full-bleed hero, bold type — built for performers who own the room',
    preset: { layoutPreset: 'poster', colorScheme: 'turmeric', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true },
    previewBg: '#1A1108', previewPrimary: '#F5A800', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Stage',
    tagline: 'Step into the spotlight',
    description: 'Programme-bill layout with ornamental rules — theatrical presence on any screen',
    preset: { layoutPreset: 'stage', colorScheme: 'velvet', fontFamily: 'playfair', backgroundStyle: 'solid' },
    previewBg: '#0C0508', previewPrimary: '#8B2340', previewText: '#F5E8EC', light: false,
  },
  {
    name: 'Editorial',
    tagline: 'Ink on the page',
    description: 'Magazine masthead, ruled lines — for writers, comedians and storytellers',
    preset: { layoutPreset: 'editorial', colorScheme: 'parchment', fontFamily: 'playfair', backgroundStyle: 'solid' },
    previewBg: '#F7F3E9', previewPrimary: '#4A3728', previewText: '#4A3728', light: true,
  },
  {
    name: 'Minimal',
    tagline: 'Let the work speak',
    description: 'Centred avatar, clean type — no noise, just you and your events',
    preset: { layoutPreset: 'minimal', colorScheme: 'gallery', fontFamily: 'inter', backgroundStyle: 'solid' },
    previewBg: '#FAFAFA', previewPrimary: '#1A1A1A', previewText: '#1A1A1A', light: true,
  },
]


// ---------------------------------------------------------------------------
// Persona-specific layout presets
// ---------------------------------------------------------------------------

const BRAND_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: 'Campaign Board',
    tagline: 'Bold campaign energy',
    description: 'Full-bleed hero, brand name front and centre',
    preset: { layoutPreset: 'poster', colorScheme: 'turmeric', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true },
    previewBg: '#1A1108', previewPrimary: '#F5A800', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Pitch Deck',
    tagline: 'Clean, credibility-first',
    description: 'Square logo, name + info card, trust-first layout',
    preset: { layoutPreset: 'corporate', colorScheme: 'ocean', fontFamily: 'inter', backgroundStyle: 'solid' },
    previewBg: '#071724', previewPrimary: '#22D3EE', previewText: '#D0EEFF', light: false,
  },
  {
    name: 'Creative Agency',
    tagline: 'Refined editorial',
    description: 'Magazine masthead, ruled lines, premium type',
    preset: { layoutPreset: 'editorial', colorScheme: 'parchment', fontFamily: 'playfair', backgroundStyle: 'solid' },
    previewBg: '#F7F3E9', previewPrimary: '#4A3728', previewText: '#4A3728', light: true,
  },
  {
    name: 'Startup',
    tagline: 'Energy and ambition',
    description: 'Gradient hero, glowing elements, bold presence',
    preset: { layoutPreset: 'reel', colorScheme: 'midnight', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'nebula' },
    previewBg: '#080812', previewPrimary: '#818CF8', previewText: '#E8E8FF', light: false,
  },
  {
    name: 'Clean Slate',
    tagline: 'Let the work speak',
    description: 'Centred name, category pill, nothing extra',
    preset: { layoutPreset: 'minimal', colorScheme: 'gallery', fontFamily: 'inter', backgroundStyle: 'solid' },
    previewBg: '#FAFAFA', previewPrimary: '#1A1A1A', previewText: '#1A1A1A', light: true,
  },
  {
    name: 'Brand Pass',
    tagline: 'The WIMC original',
    description: 'Culture pass card, collector energy, grid backdrop',
    preset: { layoutPreset: 'boarding-pass', colorScheme: 'neel', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, heavyBorders: true },
    previewBg: '#0B1420', previewPrimary: '#F5A800', previewText: '#F7F2E8', light: false,
  },
]

const VENUE_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: 'Showcase',
    tagline: 'Photo-forward',
    description: 'Full-bleed hero, let the space do the talking',
    preset: { layoutPreset: 'poster', colorScheme: 'steel', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true },
    previewBg: '#14130E', previewPrimary: '#5B8DEF', previewText: '#E7E2D8', light: false,
  },
  {
    name: 'Event House',
    tagline: 'Booking-forward',
    description: 'Events front & centre, clean professional layout',
    preset: { layoutPreset: 'corporate', colorScheme: 'ocean', fontFamily: 'inter', backgroundStyle: 'solid' },
    previewBg: '#071724', previewPrimary: '#22D3EE', previewText: '#D0EEFF', light: false,
  },
  {
    name: 'Community Venue',
    tagline: 'Warm & local',
    description: 'Ticket-stub energy, culture pass identity',
    preset: { layoutPreset: 'boarding-pass', colorScheme: 'default', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, heavyBorders: true },
    previewBg: '#121212', previewPrimary: '#E8572A', previewText: '#F2F0EF', light: false,
  },
  {
    name: 'Open Studio',
    tagline: 'Clean & minimal',
    description: 'Gallery-white space, every detail breathes',
    preset: { layoutPreset: 'minimal', colorScheme: 'gallery', fontFamily: 'inter', backgroundStyle: 'solid' },
    previewBg: '#FAFAFA', previewPrimary: '#1A1A1A', previewText: '#1A1A1A', light: true,
  },
  {
    name: 'Nightspot',
    tagline: 'Electric & bold',
    description: 'Dark glow, electric accents, nightlife energy',
    preset: { layoutPreset: 'reel', colorScheme: 'electric', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'nebula', dropShadow: 'natural' as const },
    previewBg: '#050A10', previewPrimary: '#00E5FF', previewText: '#E0F8FF', light: false,
  },
  {
    name: 'Heritage Hall',
    tagline: 'Elegant & theatrical',
    description: 'Ornamental rules, deep curtain backdrop, curated programme',
    preset: { layoutPreset: 'stage', colorScheme: 'velvet', fontFamily: 'playfair', backgroundStyle: 'solid', noiseBg: true },
    previewBg: '#0C0508', previewPrimary: '#C0365A', previewText: '#F5E8EC', light: false,
  },
]

const EXPLORER_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    name: 'Social Card',
    tagline: 'Share the vibe',
    description: 'Gradient hero, glowing avatar — shareable and scroll-native',
    preset: { layoutPreset: 'reel', colorScheme: 'midnight', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'nebula' },
    previewBg: '#080812', previewPrimary: '#818CF8', previewText: '#E8E8FF', light: false,
  },
  {
    name: 'City Pass',
    tagline: 'Culture passport',
    description: 'Ticket-stub identity card — screams local, screams WIMC',
    preset: { layoutPreset: 'boarding-pass', colorScheme: 'neel', fontFamily: 'archivo-black', backgroundStyle: 'solid' },
    previewBg: '#0B1420', previewPrimary: '#F5A800', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Street Poster',
    tagline: 'Own the wall',
    description: 'Bold full-bleed presence — for explorers who want to be seen',
    preset: { layoutPreset: 'poster', colorScheme: 'gulaal', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true },
    previewBg: '#1A1108', previewPrimary: '#E8342A', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Urban Journal',
    tagline: 'Story-led',
    description: 'Magazine masthead, parchment palette — for the culturally curious',
    preset: { layoutPreset: 'editorial', colorScheme: 'parchment', fontFamily: 'playfair', backgroundStyle: 'solid' },
    previewBg: '#F7F3E9', previewPrimary: '#4A3728', previewText: '#4A3728', light: true,
  },
  {
    name: 'Open Book',
    tagline: 'Clean discovery',
    description: 'Centred and calm — lets your taste and circles do the talking',
    preset: { layoutPreset: 'minimal', colorScheme: 'gallery', fontFamily: 'inter', backgroundStyle: 'solid' },
    previewBg: '#FAFAFA', previewPrimary: '#1A1A1A', previewText: '#1A1A1A', light: true,
  },
]

const PERSONA_PRESETS: Record<PersonaKey, LayoutPreset[]> = {
  creator:  LAYOUT_PRESETS,
  brand:    BRAND_LAYOUT_PRESETS,
  venue:     VENUE_LAYOUT_PRESETS,
  explorer: EXPLORER_LAYOUT_PRESETS,
}

// ---------------------------------------------------------------------------
// Font definitions
// ---------------------------------------------------------------------------

const FONTS: { id: ProfileTheme['fontFamily']; label: string; description: string; cssFamily: string }[] = [
  { id: 'inter',         label: 'Classic',  description: 'Clean & modern',      cssFamily: 'var(--font-inter), sans-serif'         },
  { id: 'playfair',      label: 'Elegant',  description: 'Refined & editorial', cssFamily: 'var(--font-playfair), serif'            },
  { id: 'space-grotesk', label: 'Bold',     description: 'Techy & expressive',  cssFamily: 'var(--font-space-grotesk), sans-serif'  },
  { id: 'archivo-black', label: 'Raw',      description: 'Loud display type',   cssFamily: 'var(--font-archivo-black), sans-serif'  },
]

// ---------------------------------------------------------------------------
// Background options
// ---------------------------------------------------------------------------

type BgStyle = ProfileTheme['backgroundStyle']
type PatternStyle = NonNullable<ProfileTheme['patternStyle']>
type PatternCombo = NonNullable<ProfileTheme['patternColorCombo']>

const BG_OPTIONS: { id: BgStyle; label: string; icon: string }[] = [
  { id: 'solid',   label: 'Solid',   icon: 'format_color_fill' },
  { id: 'pattern', label: 'Pattern', icon: 'texture'           },
  { id: 'aurora',  label: 'Aurora',  icon: 'auto_awesome'      },
]

// Convert a 6-digit hex colour + decimal alpha (0–1) to an rgba() string.
// Use this instead of hex-suffix notation (e.g. `${tx}82`) which incorrectly
// treats "82" as hex (= 51% opacity) rather than the intended decimal value.
function a(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const PATTERN_STYLES: { id: PatternStyle; label: string; preview: string }[] = [
  { id: 'dots',  label: 'Dots',  preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23ffffff' opacity='0.25'/%3E%3C/svg%3E")` },
  { id: 'grid',  label: 'Grid',  preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M20 0H0v20' fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='0.5'/%3E%3C/svg%3E")` },
  { id: 'waves', label: 'Waves', preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='24'%3E%3Cpath d='M0 12 C25 2,75 22,100 12' fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='1'/%3E%3C/svg%3E")` },
  { id: 'hex',   label: 'Hex',   preview: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='90'%3E%3Cpath d='M26,0 L52,15 L52,45 L26,60 L0,45 L0,15 Z M26,60 L26,90' fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='0.9'/%3E%3C/svg%3E")` },
]

const PATTERN_COMBOS: { id: PatternCombo; label: string; color: string }[] = [
  { id: 'default', label: 'Scheme', color: '#E8572A' },
  { id: 'warm',    label: 'Warm',   color: '#DC7835' },
  { id: 'cool',    label: 'Cool',   color: '#22D3EE' },
  { id: 'mono',    label: 'Mono',   color: '#888888' },
]

// ---------------------------------------------------------------------------
// ThemeEditor props
// ---------------------------------------------------------------------------

interface ThemeEditorProps {
  theme: ProfileTheme
  onThemeChange: (partial: Partial<ProfileTheme>) => void
  onThemeReplace: (theme: ProfileTheme) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  persona?: PersonaKey
}

// ---------------------------------------------------------------------------
// ColorPickerField
// ---------------------------------------------------------------------------

function hexLuminance(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length !== 6) return 0
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

function ColorPickerField({ value, defaultColor, onChange, onReset }: {
  value: string | undefined
  defaultColor: string
  isLight?: boolean
  onChange: (hex: string) => void
  onReset: () => void
}) {
  const [localHex, setLocalHex] = useState(value ?? '')

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
  const iconColor = hexLuminance(displayColor) > 140 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.90)'

  return (
    <div className="flex items-center gap-3">
      <label className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-white/20 cursor-pointer shrink-0">
        <input type="color" value={displayColor} onChange={handlePickerChange} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
        <div className="w-full h-full flex items-center justify-center" style={{ background: displayColor }}>
          <span className="material-symbols-outlined text-sm" style={{ color: iconColor }}>colorize</span>
        </div>
      </label>
      {value ? (
        <input type="text" value={localHex} onChange={handleTextChange} maxLength={7} spellCheck={false}
          className="flex-1 bg-transparent text-sm font-mono font-semibold text-on-surface border-b border-white/20 focus:border-white/50 outline-none pb-0.5 transition-colors" placeholder="#000000" />
      ) : (
        <p className="flex-1 text-sm font-semibold text-on-surface-variant">Scheme default</p>
      )}
      {value && (
        <button onClick={onReset} className="text-xs text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1 rounded shrink-0">Reset</button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubSection
// ---------------------------------------------------------------------------

function SubSection({ title, isOpen, onToggle, children }: {
  title: string; isOpen: boolean; onToggle: () => void; children: ReactNode
}) {
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
        <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>{title}</span>
        <span className={`material-symbols-outlined text-base transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.50)' }}>expand_more</span>
      </button>
      {isOpen && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ThemeEditor
// ---------------------------------------------------------------------------

type Section = 'presets' | 'color' | 'background' | 'font' | 'effects'

export default function ThemeEditor({ theme, onThemeChange, onThemeReplace, isDirty, isSaving, onSave, persona }: ThemeEditorProps) {
  const [openSection, setOpenSection] = useState<Section | null>('presets')

  const toggleSection = (section: Section) => {
    setOpenSection((prev) => (prev === section ? null : section))
  }

  const activeScheme = COLOR_SCHEMES.find((s) => s.id === theme.colorScheme) ?? COLOR_SCHEMES[0]
  const activePresets = PERSONA_PRESETS[persona ?? 'creator']

  function isActivePreset(lp: LayoutPreset) {
    const p = lp.preset
    // Layout must match first (undefined falls back to 'boarding-pass')
    if ((theme.layoutPreset ?? 'boarding-pass') !== (p.layoutPreset ?? 'boarding-pass')) return false
    return (
      theme.colorScheme === p.colorScheme &&
      theme.fontFamily === p.fontFamily &&
      theme.backgroundStyle === p.backgroundStyle &&
      (theme.backgroundStyle !== 'aurora'  || (theme.auroraStyle   ?? 'nebula')  === (p.auroraStyle   ?? 'nebula'))  &&
      (theme.backgroundStyle !== 'pattern' || (theme.patternStyle   ?? 'dots')   === (p.patternStyle   ?? 'dots'))   &&
      (theme.backgroundStyle !== 'pattern' || (theme.patternColorCombo ?? 'default') === (p.patternColorCombo ?? 'default')) &&
      !!theme.noiseBg      === !!p.noiseBg      &&
      !!theme.glassEffects === !!p.glassEffects &&
      !!theme.heavyBorders === !!p.heavyBorders &&
      (theme.dropShadow ?? 'off') === (p.dropShadow ?? 'off') &&
      (theme.solidColor  ?? '')   === (p.solidColor  ?? '')   &&
      (theme.fontColor   ?? '')   === (p.fontColor   ?? '')
    )
  }

  const hasActivePreset = activePresets.some(isActivePreset)

  return (
    <div className="overflow-hidden px-4 py-4">

      {/* ── Layout Presets ───────────────────────────────────────────────────── */}
      <SubSection title="Layout" isOpen={openSection === 'presets'} onToggle={() => toggleSection('presets')}>
        <p className="text-[11px] text-on-surface-variant mb-3 leading-relaxed -mt-1">
          Pick a page structure. Customise colour, font and effects below.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {activePresets.map((lp) => {
            const active = isActivePreset(lp)
            const fontCss = FONTS.find((f) => f.id === lp.preset.fontFamily)?.cssFamily ?? ''
            const p = lp.previewPrimary
            const bg = lp.previewBg
            const tx = lp.previewText

            // Each card shows a distinct structural diagram of its layout.
            // All opacities use the a() helper (decimal 0–1), NOT hex-suffix notation.
            let diagram: React.ReactNode
            const layoutId = lp.preset.layoutPreset

            if (layoutId === 'boarding-pass') {
              diagram = (
                <div className="absolute inset-0" style={{ background: bg }}>
                  {/* Cream ticket stub */}
                  <div style={{ position: 'absolute', top: 7, left: 5, right: 18, bottom: 12, background: '#FAF7F0', borderRadius: 2, border: '1px dashed rgba(0,0,0,0.18)' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, background: p }} />
                    <div style={{ position: 'absolute', top: 5, left: 6, right: 5, height: 2, background: 'rgba(0,0,0,0.14)', borderRadius: 1 }} />
                    <div style={{ position: 'absolute', top: 11, left: 6, width: '55%', height: 7, background: 'rgba(0,0,0,0.58)', borderRadius: 1 }} />
                    <div style={{ position: 'absolute', top: 24, left: 5, right: 5, borderTop: '1px dashed rgba(0,0,0,0.20)' }} />
                    <div style={{ position: 'absolute', bottom: 5, left: 6, display: 'flex', gap: 2 }}>
                      {[11,7,13,6,9].map((w,i) => <div key={i} style={{ width: w, height: 2.5, background: 'rgba(0,0,0,0.18)', borderRadius: 1 }} />)}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 7, right: 3, width: 20, height: 20, borderRadius: '50%', background: p, border: '2.5px solid #FAF7F0', opacity: 0.90 }} />
                  <div style={{ position: 'absolute', bottom: 4, left: 8, width: 10, height: 4, background: p, borderRadius: 1, opacity: 0.75 }} />
                </div>
              )
            } else if (layoutId === 'poster') {
              diagram = (
                <div className="absolute inset-0" style={{ background: bg }}>
                  {/* Full-bleed primary hero */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 43, background: p }}>
                    <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.25)' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 10, background: 'rgba(255,255,255,0.88)', borderRadius: 1 }} />
                  </div>
                  <div style={{ position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 2, background: a(p, 0.35), borderRadius: 1 }} />
                  <div style={{ position: 'absolute', bottom: 7, left: 6, right: 6 }}>
                    <div style={{ height: 3.5, background: a(p, 0.22), borderRadius: 1, marginBottom: 3 }} />
                    <div style={{ height: 3.5, background: a(p, 0.14), borderRadius: 1, width: '65%' }} />
                  </div>
                </div>
              )
            } else if (layoutId === 'editorial') {
              diagram = (
                <div className="absolute inset-0" style={{ background: bg }}>
                  <div style={{ position: 'absolute', top: 10, left: 6, right: 6, height: 1.5, background: a(tx, 0.75) }} />
                  <div style={{ position: 'absolute', top: 14, left: 6, width: '38%', height: 2, background: a(tx, 0.30), borderRadius: 1 }} />
                  {/* Big name left */}
                  <div style={{ position: 'absolute', top: 20, left: 6, width: '58%', height: 15, background: a(tx, 0.82), borderRadius: 1 }} />
                  <div style={{ position: 'absolute', top: 22, right: 8, width: 16, height: 16, borderRadius: '50%', background: a(tx, 0.18), border: `1.5px solid ${a(tx, 0.38)}` }} />
                  <div style={{ position: 'absolute', top: 39, left: 6, width: '28%', height: 2, background: a(tx, 0.30), borderRadius: 1 }} />
                  <div style={{ position: 'absolute', bottom: 14, left: 6, right: 6, height: 1, background: a(tx, 0.30) }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 6, width: '60%', height: 2, background: a(tx, 0.22), borderRadius: 1 }} />
                </div>
              )
            } else if (layoutId === 'minimal') {
              diagram = (
                <div className="absolute inset-0 flex flex-col items-center" style={{ background: bg }}>
                  <div style={{ marginTop: 7, width: 18, height: 18, borderRadius: '50%', border: `2px solid ${a(tx, 0.38)}`, background: a(tx, 0.18) }} />
                  <div style={{ marginTop: 5, width: '52%', height: 5, background: a(tx, 0.78), borderRadius: 1 }} />
                  <div style={{ marginTop: 3, width: '30%', height: 2, background: a(tx, 0.32), borderRadius: 1 }} />
                  <div style={{ marginTop: 5, width: '40%', height: 6, borderRadius: 6, background: a(p, 0.50) }} />
                  <div style={{ marginTop: 5, width: '68%', height: 2, background: a(tx, 0.22), borderRadius: 1 }} />
                  <div style={{ marginTop: 2, width: '50%', height: 2, background: a(tx, 0.16), borderRadius: 1 }} />
                </div>
              )
            } else if (layoutId === 'reel') {
              diagram = (
                <div className="absolute inset-0 flex flex-col items-center" style={{ background: bg }}>
                  {/* Glowing avatar — the signature element, no separate gradient layer */}
                  <div style={{ marginTop: 8, width: 22, height: 22, borderRadius: '50%', background: p, border: `2.5px solid ${bg}`, boxShadow: `0 0 0 2.5px ${p}, 0 0 12px ${a(p, 0.60)}` }} />
                  {/* Name */}
                  <div style={{ marginTop: 7, width: '52%', height: 5, background: a(tx, 0.82), borderRadius: 1 }} />
                  {/* Pill */}
                  <div style={{ marginTop: 4, width: '40%', height: 5, borderRadius: 5, background: a(p, 0.55) }} />
                  {/* Handle */}
                  <div style={{ marginTop: 3, width: '28%', height: 2, background: a(tx, 0.30), borderRadius: 1 }} />
                  {/* Content card */}
                  <div style={{ marginTop: 6, width: '80%', height: 8, borderRadius: 4, background: a(tx, 0.10), border: `1px solid ${a(p, 0.40)}` }} />
                </div>
              )
            } else if (layoutId === 'corporate') {
              diagram = (
                <div className="absolute inset-0" style={{ background: bg }}>
                  {/* Square headshot + info row */}
                  <div style={{ position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 3, background: a(tx, 0.16), border: `1px solid ${a(tx, 0.32)}` }} />
                  <div style={{ position: 'absolute', top: 8, left: 34, right: 6 }}>
                    <div style={{ height: 5, background: a(tx, 0.78), borderRadius: 1, width: '65%' }} />
                    <div style={{ height: 2, background: a(tx, 0.30), borderRadius: 1, marginTop: 3, width: '45%' }} />
                    <div style={{ height: 4, marginTop: 3, width: 36, borderRadius: 2, background: a(p, 0.40) }} />
                  </div>
                  <div style={{ position: 'absolute', top: 34, left: 6, right: 6, height: 1, background: a(tx, 0.16) }} />
                  {/* Table rows: date | name | price */}
                  {[40, 48, 56].map((top, i) => (
                    <div key={i} style={{ position: 'absolute', top, left: 6, right: 6, display: 'flex', alignItems: 'center', gap: 3.5 }}>
                      <div style={{ width: 8, height: 5, background: p, opacity: 0.82, borderRadius: 1 }} />
                      <div style={{ flex: 1, height: 2, background: a(tx, 0.24), borderRadius: 1 }} />
                      <div style={{ width: 12, height: 2, background: a(p, 0.65), borderRadius: 1 }} />
                    </div>
                  ))}
                </div>
              )
            } else if (layoutId === 'stage') {
              diagram = (
                <div className="absolute inset-0 flex flex-col items-center" style={{ background: bg }}>
                  {/* Ornamental rule */}
                  <div style={{ marginTop: 8, width: '76%', height: 1.5, background: a(tx, 0.68) }} />
                  {/* Large centred name */}
                  <div style={{ marginTop: 4, width: '72%', height: 14, background: a(tx, 0.90), borderRadius: 1 }} />
                  {/* Small avatar */}
                  <div style={{ marginTop: 4, width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${a(tx, 0.48)}`, background: a(tx, 0.16) }} />
                  {/* Pill */}
                  <div style={{ marginTop: 3, width: '36%', height: 5, borderRadius: 5, background: p, opacity: 0.82 }} />
                  {/* Ornamental rule */}
                  <div style={{ marginTop: 5, width: '76%', height: 1.5, background: a(tx, 0.68) }} />
                  <div style={{ marginTop: 4, width: '55%', height: 2, background: a(tx, 0.28), borderRadius: 1 }} />
                </div>
              )
            } else {
              // zine — thick bar, massive name block, square avatar bottom-left
              diagram = (
                <div className="absolute inset-0" style={{ background: bg }}>
                  {/* Thick top rule */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3.5, background: tx }} />
                  <div style={{ position: 'absolute', top: 7, left: 5, width: '55%', height: 2, background: a(tx, 0.28), borderRadius: 1 }} />
                  {/* Massive name block */}
                  <div style={{ position: 'absolute', top: 12, left: 5, right: 5, height: 26, background: a(tx, 0.92), borderRadius: 1 }} />
                  <div style={{ position: 'absolute', top: 42, left: 5, right: 5, height: 1.5, background: a(tx, 0.28) }} />
                  {/* Square avatar */}
                  <div style={{ position: 'absolute', top: 47, left: 5, width: 14, height: 14, border: `1.5px solid ${a(tx, 0.58)}` }} />
                  <div style={{ position: 'absolute', top: 49, left: 24, right: 5 }}>
                    <div style={{ height: 2.5, background: a(p, 0.80), borderRadius: 1, width: '52%' }} />
                    <div style={{ height: 2, background: a(tx, 0.28), borderRadius: 1, marginTop: 3, width: '75%' }} />
                  </div>
                </div>
              )
            }

            return (
              <button
                key={lp.name}
                onClick={() => onThemeReplace(lp.preset)}
                title={lp.description}
                className="relative flex flex-col rounded-xl overflow-hidden border-2 transition-all text-left group"
                style={{
                  borderColor: active ? p : (lp.light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.13)'),
                  boxShadow: active
                    ? `0 0 0 2px ${p}40`
                    : lp.light
                      ? '0 2px 12px rgba(0,0,0,0.28)'
                      : 'none',
                }}
              >
                {/* Structural layout diagram */}
                <div className="h-16 w-full relative overflow-hidden">
                  {diagram}
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow z-10" style={{ background: p }}>
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke={lp.light ? '#000' : '#fff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Label */}
                <div className="px-2.5 py-2" style={{ background: lp.light ? lp.previewBg : 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[11px] font-bold leading-tight" style={{ color: lp.light ? '#1a1a1a' : 'rgba(255,255,255,0.92)', fontFamily: fontCss }}>{lp.name}</p>
                  <p className="text-[9px] mt-0.5 opacity-55" style={{ color: lp.light ? '#1a1a1a' : 'rgba(255,255,255,0.92)' }}>{lp.tagline}</p>
                </div>
              </button>
            )
          })}
        </div>
        {/* Custom indicator */}
        {!hasActivePreset && (
          <div className="mt-2.5 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>tune</span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.50)' }}>Custom — modified from preset</span>
          </div>
        )}
      </SubSection>

      {/* ── "Customise" section divider ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Customise</span>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── Colour ──────────────────────────────────────────────────────────── */}
      <SubSection title="Colour" isOpen={openSection === 'color'} onToggle={() => toggleSection('color')}>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_SCHEMES.map((cs) => {
            const active = theme.colorScheme === cs.id
            return (
              <button
                key={cs.id}
                onClick={() => onThemeChange({ colorScheme: cs.id })}
                title={cs.description}
                className="relative flex flex-col rounded-xl overflow-hidden border-2 transition-all"
                style={{
                  borderColor: active ? cs.primary : 'transparent',
                  boxShadow: active ? `0 0 0 2px ${cs.primary}50` : 'none',
                }}
              >
                <div className="h-14 w-full relative" style={{ background: cs.bg }}>
                  <div className="absolute bottom-0 left-0 right-0 h-5" style={{ background: cs.surface }} />
                  <div className="absolute bottom-1.5 left-1.5 w-5 h-2 rounded-full" style={{ background: cs.primary }} />
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow" style={{ background: cs.primary }}>
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke={cs.onPrimary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5 text-left" style={{ background: cs.surface }}>
                  <p className="text-[11px] font-bold truncate" style={{ color: cs.text }}>{cs.label}</p>
                  <p className="text-[9px] leading-none mt-0.5 truncate opacity-70" style={{ color: cs.text }}>{cs.light ? 'Light' : 'Dark'}</p>
                </div>
              </button>
            )
          })}
        </div>
      </SubSection>

      {/* ── Background ──────────────────────────────────────────────────────── */}
      <SubSection title="Background" isOpen={openSection === 'background'} onToggle={() => toggleSection('background')}>
        <div className="flex gap-2 mb-4">
          {BG_OPTIONS.map((bg) => {
            const active = theme.backgroundStyle === bg.id
            return (
              <button key={bg.id} onClick={() => onThemeChange({ backgroundStyle: bg.id })}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all"
                style={{ borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)', background: active ? `${activeScheme.primary}18` : 'rgba(255,255,255,0.03)' }}
              >
                <span className="material-symbols-outlined text-xl" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.55)' }}>{bg.icon}</span>
                <span className="text-[10px] font-bold" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.55)' }}>{bg.label}</span>
              </button>
            )
          })}
        </div>

        {theme.backgroundStyle === 'solid' && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <ColorPickerField value={theme.solidColor} defaultColor={activeScheme.bg} isLight={activeScheme.light}
              onChange={(hex) => onThemeChange({ solidColor: hex })} onReset={() => onThemeChange({ solidColor: undefined })} />
          </div>
        )}

        {theme.backgroundStyle === 'pattern' && (
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Style</p>
              <div className="grid grid-cols-4 gap-2">
                {PATTERN_STYLES.map((ps) => {
                  const active = (theme.patternStyle ?? 'dots') === ps.id
                  return (
                    <button key={ps.id} onClick={() => onThemeChange({ patternStyle: ps.id })}
                      className="flex flex-col items-center gap-1.5 rounded-lg overflow-hidden border-2 transition-all"
                      style={{ borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)' }}
                    >
                      <div className="w-full h-10" style={{ background: `${ps.preview}, ${activeScheme.bg}`, backgroundSize: ps.id === 'waves' ? '100px 24px' : ps.id === 'hex' ? '52px 90px' : '20px 20px' }} />
                      <span className="text-[9px] font-bold pb-1" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.55)' }}>{ps.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Colour</p>
              <div className="flex gap-2">
                {PATTERN_COMBOS.map((pc) => {
                  const active = (theme.patternColorCombo ?? 'default') === pc.id
                  const swatchColor = pc.id === 'default' ? activeScheme.primary : pc.color
                  return (
                    <button key={pc.id} onClick={() => onThemeChange({ patternColorCombo: pc.id })}
                      className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg border-2 transition-all"
                      style={{ borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)' }}
                    >
                      <div className="w-5 h-5 rounded-full" style={{ background: swatchColor }} />
                      <span className="text-[9px] font-bold" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.55)' }}>{pc.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {theme.backgroundStyle === 'aurora' && (
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'nebula', label: 'Nebula', icon: 'blur_on' },
              { id: 'mesh',   label: 'Mesh',   icon: 'gradient' },
              { id: 'rays',   label: 'Rays',   icon: 'wb_sunny' },
              { id: 'ripple', label: 'Ripple', icon: 'water_drop' },
            ] as const).map((opt) => {
              const active = (theme.auroraStyle ?? 'nebula') === opt.id
              return (
                <button key={opt.id} onClick={() => onThemeChange({ auroraStyle: opt.id })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
                  style={{ borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)', background: active ? `${activeScheme.primary}18` : 'rgba(255,255,255,0.03)' }}
                >
                  <span className="material-symbols-outlined text-lg" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.5)' }}>{opt.icon}</span>
                  <span className="text-sm font-medium" style={{ color: active ? activeScheme.primary : 'rgba(255,255,255,0.7)' }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </SubSection>

      {/* ── Font ────────────────────────────────────────────────────────────── */}
      <SubSection title="Font" isOpen={openSection === 'font'} onToggle={() => toggleSection('font')}>
        <div className="space-y-2 mb-4">
          {FONTS.map((font) => {
            const active = theme.fontFamily === font.id
            return (
              <button key={font.id} onClick={() => onThemeChange({ fontFamily: font.id })}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left"
                style={{ borderColor: active ? activeScheme.primary : 'rgba(255,255,255,0.08)', background: active ? `${activeScheme.primary}15` : 'rgba(255,255,255,0.03)' }}
              >
                <div>
                  <span className="text-sm font-bold block" style={{ fontFamily: font.cssFamily, color: 'rgba(255,255,255,0.90)' }}>{font.label}</span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{font.description}</span>
                </div>
                {active && <span className="material-symbols-outlined text-sm" style={{ color: activeScheme.primary }}>check_circle</span>}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>Font colour</p>
        <ColorPickerField value={theme.fontColor} defaultColor={activeScheme.text} isLight={activeScheme.light}
          onChange={(hex) => onThemeChange({ fontColor: hex })} onReset={() => onThemeChange({ fontColor: undefined })} />
      </SubSection>

      {/* ── Effects ─────────────────────────────────────────────────────────── */}
      <SubSection title="Effects" isOpen={openSection === 'effects'} onToggle={() => toggleSection('effects')}>
        <div className="rounded-xl border border-white/8 bg-white/3 divide-y divide-white/5">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-semibold text-on-surface">Liquid Glass</p>
            <button onClick={() => onThemeChange({ glassEffects: !theme.glassEffects })}
              className="relative w-11 h-6 rounded-full transition-all shrink-0"
              style={{ background: theme.glassEffects ? activeScheme.primary : 'rgba(255,255,255,0.15)' }}
              role="switch" aria-checked={!!theme.glassEffects}
            >
              <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: theme.glassEffects ? '1.375rem' : '0.25rem' }} />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-semibold text-on-surface">Noise Texture</p>
            <button onClick={() => onThemeChange({ noiseBg: !theme.noiseBg })}
              className="relative w-11 h-6 rounded-full transition-all shrink-0"
              style={{ background: theme.noiseBg ? activeScheme.primary : 'rgba(255,255,255,0.15)' }}
              role="switch" aria-checked={!!theme.noiseBg}
            >
              <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: theme.noiseBg ? '1.375rem' : '0.25rem' }} />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-semibold text-on-surface">Heavy Borders</p>
            <button onClick={() => onThemeChange({ heavyBorders: !theme.heavyBorders })}
              className="relative w-11 h-6 rounded-full transition-all shrink-0"
              style={{ background: theme.heavyBorders ? activeScheme.primary : 'rgba(255,255,255,0.15)' }}
              role="switch" aria-checked={!!theme.heavyBorders}
            >
              <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: theme.heavyBorders ? '1.375rem' : '0.25rem' }} />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-semibold text-on-surface">Drop Shadow</p>
            <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
              {(['off', 'natural', 'thicc'] as const).map((opt) => {
                const active = (theme.dropShadow ?? 'off') === opt
                const label = opt === 'off' ? 'Flat' : opt
                return (
                  <button key={opt} onClick={() => onThemeChange({ dropShadow: opt })}
                    className="px-3 py-1.5 text-xs font-medium transition-all capitalize"
                    style={{ background: active ? activeScheme.primary : 'rgba(255,255,255,0.07)', color: active ? activeScheme.onPrimary : 'rgba(255,255,255,0.6)' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </SubSection>

      {/* ── Save ────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <button onClick={onSave} disabled={!isDirty || isSaving}
          className="w-full py-3 rounded-xl font-headline font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: isDirty ? activeScheme.primary : 'rgba(255,255,255,0.08)', color: isDirty ? activeScheme.onPrimary : 'rgba(255,255,255,0.55)' }}
        >
          {isSaving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
          ) : isDirty ? (
            <><span className="material-symbols-outlined text-lg">save</span>Save theme</>
          ) : (
            <><span className="material-symbols-outlined text-lg">check_circle</span>Saved</>
          )}
        </button>
      </div>

    </div>
  )
}
