import { z } from 'zod'

// CSS custom-property overrides per colour scheme.
// Each entry is a semicolon-separated list of "--var: r g b" declarations.
// An empty string means "use the :root defaults".
export const COLOR_SCHEME_VARS: Record<string, string> = {
  default: '',

  midnight: [
    '--color-primary: 129 140 248',
    '--color-on-primary: 0 0 40',
    '--color-primary-container: 45 37 150',
    '--color-on-primary-container: 196 202 255',
    '--color-background: 8 8 18',
    '--color-on-background: 232 232 255',
    '--color-surface: 8 8 18',
    '--color-on-surface: 232 232 255',
    '--color-on-surface-variant: 148 145 175',
    '--color-surface-container-lowest: 4 4 12',
    '--color-surface-container-low: 14 14 36',
    '--color-surface-container: 20 20 52',
    '--color-surface-container-high: 28 28 72',
    '--color-surface-container-highest: 38 38 92',
    '--color-outline: 110 107 145',
    '--color-outline-variant: 50 48 90',
  ].join(';'),

  ocean: [
    '--color-primary: 34 211 238',
    '--color-on-primary: 0 38 56',
    '--color-primary-container: 0 75 107',
    '--color-on-primary-container: 176 232 255',
    '--color-background: 7 23 36',
    '--color-on-background: 208 238 255',
    '--color-surface: 7 23 36',
    '--color-on-surface: 208 238 255',
    '--color-on-surface-variant: 120 168 200',
    '--color-surface-container-lowest: 4 14 22',
    '--color-surface-container-low: 10 32 52',
    '--color-surface-container: 15 45 69',
    '--color-surface-container-high: 20 58 88',
    '--color-surface-container-highest: 26 72 108',
    '--color-outline: 80 140 175',
    '--color-outline-variant: 20 60 90',
  ].join(';'),

  forest: [
    '--color-primary: 110 231 183',
    '--color-on-primary: 0 53 38',
    '--color-primary-container: 0 90 66',
    '--color-on-primary-container: 167 255 221',
    '--color-background: 10 26 20',
    '--color-on-background: 209 250 229',
    '--color-surface: 10 26 20',
    '--color-on-surface: 209 250 229',
    '--color-on-surface-variant: 120 175 148',
    '--color-surface-container-lowest: 5 15 12',
    '--color-surface-container-low: 15 40 30',
    '--color-surface-container: 22 58 44',
    '--color-surface-container-high: 30 78 58',
    '--color-surface-container-highest: 40 98 74',
    '--color-outline: 90 140 115',
    '--color-outline-variant: 30 70 52',
  ].join(';'),

  blush: [
    '--color-primary: 225 29 72',
    '--color-on-primary: 255 255 255',
    '--color-primary-container: 255 225 232',
    '--color-on-primary-container: 136 0 44',
    '--color-background: 255 241 244',
    '--color-on-background: 28 7 20',
    '--color-surface: 255 241 244',
    '--color-on-surface: 28 7 20',
    '--color-on-surface-variant: 130 60 80',
    '--color-surface-container-lowest: 255 252 253',
    '--color-surface-container-low: 255 232 238',
    '--color-surface-container: 252 218 228',
    '--color-surface-container-high: 248 202 216',
    '--color-surface-container-highest: 242 185 202',
    '--color-outline: 190 110 130',
    '--color-outline-variant: 225 182 196',
  ].join(';'),

  sand: [
    '--color-primary: 180 83 9',
    '--color-on-primary: 255 255 255',
    '--color-primary-container: 254 243 199',
    '--color-on-primary-container: 92 51 0',
    '--color-background: 253 250 245',
    '--color-on-background: 28 21 10',
    '--color-surface: 253 250 245',
    '--color-on-surface: 28 21 10',
    '--color-on-surface-variant: 130 110 72',
    '--color-surface-container-lowest: 255 253 248',
    '--color-surface-container-low: 244 238 224',
    '--color-surface-container: 236 228 210',
    '--color-surface-container-high: 226 218 198',
    '--color-surface-container-highest: 214 205 184',
    '--color-outline: 175 148 100',
    '--color-outline-variant: 215 198 162',
  ].join(';'),

  // Pista — ink bg with pista green accent (workshop / craft)
  pista: [
    '--color-primary: 45 122 79',
    '--color-on-primary: 247 242 232',
    '--color-primary-container: 18 60 36',
    '--color-on-primary-container: 167 230 195',
    '--color-background: 26 17 8',
    '--color-on-background: 247 242 232',
    '--color-surface: 26 17 8',
    '--color-on-surface: 247 242 232',
    '--color-on-surface-variant: 160 190 170',
    '--color-surface-container-lowest: 16 10 4',
    '--color-surface-container-low: 34 22 10',
    '--color-surface-container: 44 30 15',
    '--color-surface-container-high: 56 38 20',
    '--color-surface-container-highest: 70 48 28',
    '--color-outline: 80 140 105',
    '--color-outline-variant: 40 72 54',
  ].join(';'),

  // Gulaal — ink bg with gulaal red accent (visual artist / painter)
  gulaal: [
    '--color-primary: 232 52 42',
    '--color-on-primary: 247 242 232',
    '--color-primary-container: 100 20 16',
    '--color-on-primary-container: 255 200 196',
    '--color-background: 26 17 8',
    '--color-on-background: 247 242 232',
    '--color-surface: 26 17 8',
    '--color-on-surface: 247 242 232',
    '--color-on-surface-variant: 200 160 155',
    '--color-surface-container-lowest: 16 10 4',
    '--color-surface-container-low: 34 22 10',
    '--color-surface-container: 44 30 15',
    '--color-surface-container-high: 56 38 20',
    '--color-surface-container-highest: 70 48 28',
    '--color-outline: 175 90 85',
    '--color-outline-variant: 80 35 30',
  ].join(';'),

  // Neel — deep navy bg with turmeric gold accent (musician / performer)
  neel: [
    '--color-primary: 245 168 0',
    '--color-on-primary: 11 20 32',
    '--color-primary-container: 90 62 0',
    '--color-on-primary-container: 255 220 120',
    '--color-background: 11 20 32',
    '--color-on-background: 247 242 232',
    '--color-surface: 11 20 32',
    '--color-on-surface: 247 242 232',
    '--color-on-surface-variant: 160 155 120',
    '--color-surface-container-lowest: 6 12 20',
    '--color-surface-container-low: 16 28 46',
    '--color-surface-container: 22 38 60',
    '--color-surface-container-high: 30 50 76',
    '--color-surface-container-highest: 40 62 92',
    '--color-outline: 180 140 40',
    '--color-outline-variant: 70 56 16',
  ].join(';'),

  // Turmeric — ink bg with turmeric gold accent (comedian / speaker)
  turmeric: [
    '--color-primary: 245 168 0',
    '--color-on-primary: 26 17 8',
    '--color-primary-container: 90 62 0',
    '--color-on-primary-container: 255 220 120',
    '--color-background: 26 17 8',
    '--color-on-background: 247 242 232',
    '--color-surface: 26 17 8',
    '--color-on-surface: 247 242 232',
    '--color-on-surface-variant: 180 165 120',
    '--color-surface-container-lowest: 16 10 4',
    '--color-surface-container-low: 34 22 10',
    '--color-surface-container: 44 30 15',
    '--color-surface-container-high: 56 38 20',
    '--color-surface-container-highest: 70 48 28',
    '--color-outline: 180 140 40',
    '--color-outline-variant: 75 58 16',
  ].join(';'),

  // Steel — near-black warm bg + steel-gray surface + gold accent (content creator)
  // Based on the content-creator design with #14130E bg and #3D3D3D steel surface
  steel: [
    '--color-primary: 245 168 0',
    '--color-on-primary: 20 19 14',
    '--color-primary-container: 90 62 0',
    '--color-on-primary-container: 255 220 120',
    '--color-background: 20 19 14',
    '--color-on-background: 231 226 216',
    '--color-surface: 20 19 14',
    '--color-on-surface: 231 226 216',
    '--color-on-surface-variant: 215 196 172',
    '--color-surface-container-lowest: 15 14 9',
    '--color-surface-container-low: 29 28 22',
    '--color-surface-container: 33 32 26',
    '--color-surface-container-high: 61 61 61',
    '--color-surface-container-highest: 75 74 68',
    '--color-outline: 159 142 121',
    '--color-outline-variant: 82 69 51',
  ].join(';'),

  // Sienna — ink bg + burnt-sienna primary (food & lifestyle)
  // Based on the food-creator design with #8B3A00 hero and ink bg
  sienna: [
    '--color-primary: 192 74 0',
    '--color-on-primary: 247 242 232',
    '--color-primary-container: 139 58 0',
    '--color-on-primary-container: 255 210 175',
    '--color-background: 26 17 8',
    '--color-on-background: 247 242 232',
    '--color-surface: 26 17 8',
    '--color-on-surface: 247 242 232',
    '--color-on-surface-variant: 210 180 155',
    '--color-surface-container-lowest: 16 10 4',
    '--color-surface-container-low: 34 22 10',
    '--color-surface-container: 50 30 15',
    '--color-surface-container-high: 65 40 20',
    '--color-surface-container-highest: 82 52 28',
    '--color-outline: 160 100 60',
    '--color-outline-variant: 85 48 20',
  ].join(';'),

  // Indigo — ink bg + electric indigo accent (musician / performer)
  // Warm ink background unlike midnight's cool near-black, with indigo primary
  indigo: [
    '--color-primary: 129 140 248',
    '--color-on-primary: 26 17 8',
    '--color-primary-container: 55 45 160',
    '--color-on-primary-container: 210 215 255',
    '--color-background: 26 17 8',
    '--color-on-background: 247 242 232',
    '--color-surface: 26 17 8',
    '--color-on-surface: 247 242 232',
    '--color-on-surface-variant: 185 175 215',
    '--color-surface-container-lowest: 16 10 4',
    '--color-surface-container-low: 26 18 38',
    '--color-surface-container: 36 26 52',
    '--color-surface-container-high: 48 36 68',
    '--color-surface-container-highest: 62 48 88',
    '--color-outline: 130 120 175',
    '--color-outline-variant: 58 46 95',
  ].join(';'),
}

/** Parse a COLOR_SCHEME_VARS entry into React inline style props. */
export function schemeToStyle(colorScheme: string): React.CSSProperties {
  const vars = COLOR_SCHEME_VARS[colorScheme] ?? ''
  if (!vars) return {}
  return Object.fromEntries(
    vars.split(';').filter(Boolean).map((entry) => {
      const idx = entry.indexOf(':')
      return [entry.slice(0, idx).trim(), entry.slice(idx + 1).trim()]
    })
  ) as React.CSSProperties
}

export const ProfileThemeSchema = z.object({
  colorScheme: z.enum(['default', 'midnight', 'ocean', 'forest', 'blush', 'sand', 'pista', 'gulaal', 'neel', 'turmeric', 'steel', 'sienna', 'indigo']),
  fontFamily: z.enum(['inter', 'playfair', 'space-grotesk', 'archivo-black']),
  backgroundStyle: z.enum(['solid', 'pattern', 'aurora']),
  solidColor: z.string().optional(),
  patternStyle: z.enum(['dots', 'grid', 'waves', 'hex']).optional(),
  patternColorCombo: z.enum(['default', 'warm', 'cool', 'mono']).optional(),
  auroraStyle: z.enum(['nebula', 'mesh', 'rays', 'ripple']).optional(),
  fontColor: z.string().optional(),
  glassEffects: z.boolean().optional(),
  dropShadow: z.enum(['off', 'thicc', 'natural']).optional(),
  noiseBg: z.boolean().optional(),
  heavyBorders: z.boolean().optional(),
})

export type ProfileTheme = z.infer<typeof ProfileThemeSchema>

export const DEFAULT_PROFILE_THEME: ProfileTheme = {
  colorScheme: 'default',
  fontFamily: 'inter',
  backgroundStyle: 'solid',
}

/**
 * The 6 schemes visible in the theme picker.
 * If a user's saved colorScheme is one of these, it was an explicit choice and
 * should be respected even if their creator_type changes.
 * Vernacular category schemes are NOT in this list — they're auto-assigned.
 */
export const PICKER_SCHEME_IDS = ['default', 'midnight', 'ocean', 'forest', 'blush', 'sand'] as const

/**
 * Per-creator-category default themes — one bespoke look per creator type.
 * Not surfaced in the theme picker; applied automatically from creator_type.
 *
 * Category → scheme:
 *   content_creation  → steel    (near-black + steel-gray surface + gold)
 *   comedy_open_mic   → turmeric (ink + turmeric gold + red accents)
 *   food_lifestyle    → sienna   (ink + burnt sienna)
 *   music_performance → indigo   (ink + electric indigo)
 *   art_design        → gulaal   (ink + gulaal red)
 *   workshops_teaching→ pista    (ink + pista green)
 */
export const CREATOR_DEFAULT_THEMES: Record<string, ProfileTheme> = {
  content_creation: {
    colorScheme: 'steel',
    fontFamily: 'archivo-black',
    backgroundStyle: 'solid',
    noiseBg: true,
    heavyBorders: true,
  },
  comedy_open_mic: {
    colorScheme: 'turmeric',
    fontFamily: 'archivo-black',
    backgroundStyle: 'solid',
    noiseBg: true,
    heavyBorders: true,
  },
  food_lifestyle: {
    colorScheme: 'sienna',
    fontFamily: 'archivo-black',
    backgroundStyle: 'solid',
    noiseBg: true,
  },
  music_performance: {
    colorScheme: 'indigo',
    fontFamily: 'archivo-black',
    backgroundStyle: 'solid',
    noiseBg: true,
  },
  art_design: {
    colorScheme: 'gulaal',
    fontFamily: 'archivo-black',
    backgroundStyle: 'solid',
    noiseBg: true,
  },
  workshops_teaching: {
    colorScheme: 'pista',
    fontFamily: 'archivo-black',
    backgroundStyle: 'solid',
    noiseBg: true,
    heavyBorders: true,
  },
}

/**
 * Resolves the active theme for a creator.
 *
 * Rules:
 * 1. If the saved theme uses a picker scheme (one the user explicitly chose),
 *    return it as-is — the user's customisation is respected.
 * 2. Otherwise (no theme saved, or it's a category-auto scheme that may be
 *    stale after a creator_type change) — derive from the current creator_type.
 * 3. If there's no category mapping either, fall back to DEFAULT_PROFILE_THEME.
 */
export function resolveTheme(raw: unknown, creatorType?: string): ProfileTheme {
  const result = ProfileThemeSchema.safeParse(raw)
  if (result.success && (PICKER_SCHEME_IDS as readonly string[]).includes(result.data.colorScheme)) {
    return result.data
  }
  return (creatorType ? CREATOR_DEFAULT_THEMES[creatorType] : undefined) ?? DEFAULT_PROFILE_THEME
}
