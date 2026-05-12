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

  // Steel — near-black warm bg + steel-blue accent (content creator)
  // Rebased from gold to steel blue to visually distinguish from turmeric
  steel: [
    '--color-primary: 91 141 239',
    '--color-on-primary: 255 255 255',
    '--color-primary-container: 30 50 110',
    '--color-on-primary-container: 195 215 255',
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
    '--color-outline: 130 150 190',
    '--color-outline-variant: 60 70 110',
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

  // Aurora — deep dark purple bg + fuchsia/magenta aurora glow (editorial / music)
  aurora: [
    '--color-primary: 217 70 239',
    '--color-on-primary: 58 0 66',
    '--color-primary-container: 110 20 140',
    '--color-on-primary-container: 240 190 255',
    '--color-background: 15 11 26',
    '--color-on-background: 245 238 255',
    '--color-surface: 15 11 26',
    '--color-on-surface: 245 238 255',
    '--color-on-surface-variant: 185 165 220',
    '--color-surface-container-lowest: 8 6 14',
    '--color-surface-container-low: 22 16 36',
    '--color-surface-container: 30 21 48',
    '--color-surface-container-high: 40 28 64',
    '--color-surface-container-highest: 52 36 82',
    '--color-outline: 155 100 185',
    '--color-outline-variant: 70 45 100',
  ].join(';'),

  // Sage — warm off-white bg + sage green accent (wellness / lifestyle)
  sage: [
    '--color-primary: 61 127 83',
    '--color-on-primary: 255 255 255',
    '--color-primary-container: 195 238 210',
    '--color-on-primary-container: 20 72 40',
    '--color-background: 244 247 242',
    '--color-on-background: 26 46 29',
    '--color-surface: 244 247 242',
    '--color-on-surface: 26 46 29',
    '--color-on-surface-variant: 90 120 96',
    '--color-surface-container-lowest: 252 255 250',
    '--color-surface-container-low: 234 242 232',
    '--color-surface-container: 224 234 222',
    '--color-surface-container-high: 214 226 212',
    '--color-surface-container-highest: 202 216 200',
    '--color-outline: 140 175 148',
    '--color-outline-variant: 195 220 198',
  ].join(';'),

  // Mint — pale mint bg + deep teal accent (health / community / modern)
  mint: [
    '--color-primary: 12 139 107',
    '--color-on-primary: 255 255 255',
    '--color-primary-container: 190 240 228',
    '--color-on-primary-container: 0 72 55',
    '--color-background: 239 249 246',
    '--color-on-background: 13 43 36',
    '--color-surface: 239 249 246',
    '--color-on-surface: 13 43 36',
    '--color-on-surface-variant: 72 125 110',
    '--color-surface-container-lowest: 248 254 252',
    '--color-surface-container-low: 228 245 240',
    '--color-surface-container: 218 238 232',
    '--color-surface-container-high: 206 230 224',
    '--color-surface-container-highest: 194 220 214',
    '--color-outline: 128 180 165',
    '--color-outline-variant: 186 225 214',
  ].join(';'),

  // Electric — near-black with electric cyan (club / EDM / DJ / night photographer)
  electric: [
    '--color-primary: 0 229 255',
    '--color-on-primary: 0 30 40',
    '--color-primary-container: 0 80 110',
    '--color-on-primary-container: 180 248 255',
    '--color-background: 8 12 16',
    '--color-on-background: 224 250 255',
    '--color-surface: 8 12 16',
    '--color-on-surface: 224 250 255',
    '--color-on-surface-variant: 120 190 210',
    '--color-surface-container-lowest: 4 7 10',
    '--color-surface-container-low: 12 20 28',
    '--color-surface-container: 16 28 38',
    '--color-surface-container-high: 22 38 52',
    '--color-surface-container-highest: 28 50 68',
    '--color-outline: 60 160 185',
    '--color-outline-variant: 20 70 90',
  ].join(';'),

  // Velvet — deep wine-dark background (theatre / comedy / spoken word / literary)
  velvet: [
    '--color-primary: 139 35 64',
    '--color-on-primary: 245 232 236',
    '--color-primary-container: 70 12 28',
    '--color-on-primary-container: 245 200 210',
    '--color-background: 12 5 8',
    '--color-on-background: 245 232 236',
    '--color-surface: 12 5 8',
    '--color-on-surface: 245 232 236',
    '--color-on-surface-variant: 200 150 165',
    '--color-surface-container-lowest: 8 3 5',
    '--color-surface-container-low: 22 8 14',
    '--color-surface-container: 30 12 18',
    '--color-surface-container-high: 40 16 24',
    '--color-surface-container-highest: 52 22 32',
    '--color-outline: 130 70 88',
    '--color-outline-variant: 60 28 38',
  ].join(';'),

  // Nightforest — near-black warm-green (evening wellness / mindfulness / candlelit yoga)
  nightforest: [
    '--color-primary: 126 200 160',
    '--color-on-primary: 6 14 8',
    '--color-primary-container: 20 60 35',
    '--color-on-primary-container: 190 240 210',
    '--color-background: 6 14 8',
    '--color-on-background: 212 245 226',
    '--color-surface: 6 14 8',
    '--color-on-surface: 212 245 226',
    '--color-on-surface-variant: 120 170 140',
    '--color-surface-container-lowest: 4 8 5',
    '--color-surface-container-low: 10 20 14',
    '--color-surface-container: 16 30 20',
    '--color-surface-container-high: 22 42 28',
    '--color-surface-container-highest: 28 55 36',
    '--color-outline: 80 140 105',
    '--color-outline-variant: 28 58 38',
  ].join(';'),

  // Parchment — warm aged-paper light (writer / academic / literary educator)
  parchment: [
    '--color-primary: 74 55 40',
    '--color-on-primary: 247 243 233',
    '--color-primary-container: 210 195 170',
    '--color-on-primary-container: 50 35 22',
    '--color-background: 247 243 233',
    '--color-on-background: 46 31 20',
    '--color-surface: 247 243 233',
    '--color-on-surface: 46 31 20',
    '--color-on-surface-variant: 130 110 88',
    '--color-surface-container-lowest: 255 252 245',
    '--color-surface-container-low: 240 234 220',
    '--color-surface-container: 228 220 202',
    '--color-surface-container-high: 218 208 188',
    '--color-surface-container-highest: 206 196 172',
    '--color-outline: 165 145 118',
    '--color-outline-variant: 210 198 178',
  ].join(';'),

  // Gallery — near-white wall with near-black primary (visual artist / designer)
  gallery: [
    '--color-primary: 26 26 26',
    '--color-on-primary: 250 250 250',
    '--color-primary-container: 200 200 200',
    '--color-on-primary-container: 10 10 10',
    '--color-background: 250 250 250',
    '--color-on-background: 10 10 10',
    '--color-surface: 250 250 250',
    '--color-on-surface: 10 10 10',
    '--color-on-surface-variant: 100 100 100',
    '--color-surface-container-lowest: 255 255 255',
    '--color-surface-container-low: 242 242 242',
    '--color-surface-container: 232 232 232',
    '--color-surface-container-high: 222 222 222',
    '--color-surface-container-highest: 210 210 210',
    '--color-outline: 160 160 160',
    '--color-outline-variant: 210 210 210',
  ].join(';'),

  // Terracotta — warm linen background with clay primary (local business / craft / pottery)
  terracotta: [
    '--color-primary: 196 85 42',
    '--color-on-primary: 255 255 255',
    '--color-primary-container: 255 220 200',
    '--color-on-primary-container: 100 35 15',
    '--color-background: 250 240 230',
    '--color-on-background: 44 26 14',
    '--color-surface: 250 240 230',
    '--color-on-surface: 44 26 14',
    '--color-on-surface-variant: 130 90 60',
    '--color-surface-container-lowest: 255 250 244',
    '--color-surface-container-low: 242 230 215',
    '--color-surface-container: 232 218 200',
    '--color-surface-container-high: 222 206 185',
    '--color-surface-container-highest: 210 192 168',
    '--color-outline: 168 115 80',
    '--color-outline-variant: 220 190 162',
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
  colorScheme: z.enum(['default', 'midnight', 'ocean', 'forest', 'blush', 'sand', 'pista', 'gulaal', 'neel', 'turmeric', 'steel', 'sienna', 'indigo', 'aurora', 'sage', 'mint', 'electric', 'velvet', 'nightforest', 'parchment', 'gallery', 'terracotta']),
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
export const PICKER_SCHEME_IDS = [
  'default', 'midnight', 'ocean', 'forest', 'blush', 'sand',
  'pista', 'gulaal', 'neel', 'turmeric', 'steel', 'sienna', 'indigo',
  'aurora', 'sage', 'mint',
  'electric', 'velvet', 'nightforest', 'parchment', 'gallery', 'terracotta',
] as const

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
    fontFamily: 'space-grotesk',
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
