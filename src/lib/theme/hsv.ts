/**
 * hsv.ts — theme recommendation engine
 *
 * Given a creator category, returns the 8 colour swatches in preference order:
 * the most on-brand swatch first, the rest following a perceptual distance sort
 * so the picker feels curated rather than random.
 *
 * Nothing here touches the DOM. Pure data → data.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Swatch {
  hex:    string
  scheme: string
}

// ─── Full swatch list (must stay in sync with C9/page.tsx SWATCHES) ───────────

export const ALL_SWATCHES: readonly Swatch[] = [
  { hex: '#E8705A', scheme: 'default'  },
  { hex: '#9B8FFF', scheme: 'indigo'   },
  { hex: '#F5A800', scheme: 'neel'     },
  { hex: '#5DD9D0', scheme: 'ocean'    },
  { hex: '#4ADE80', scheme: 'forest'   },
  { hex: '#F472B6', scheme: 'blush'    },
  { hex: '#60A5FA', scheme: 'midnight' },
  { hex: '#FCD34D', scheme: 'turmeric' },
] as const

// ─── Category → recommended scheme ────────────────────────────────────────────
//
// Derived from CATEGORY_COLOURS in design-tokens.ts.
// Each entry maps a V2 category ID to the scheme that best represents it,
// followed by a preferred secondary and a full fallback order.

const CATEGORY_SCHEME_ORDER: Record<string, string[]> = {
  // coral categories
  music:              ['default', 'blush',    'neel',     'indigo',  'ocean',   'forest', 'midnight', 'turmeric'],
  comedy_theatre:     ['default', 'blush',    'neel',     'indigo',  'ocean',   'forest', 'midnight', 'turmeric'],
  teaching_coaching:  ['default', 'indigo',   'midnight', 'ocean',   'neel',    'forest', 'blush',    'turmeric'],
  dance:              ['default', 'blush',    'neel',     'indigo',  'ocean',   'forest', 'midnight', 'turmeric'],
  podcasts:           ['default', 'midnight', 'indigo',   'ocean',   'neel',    'blush',  'forest',   'turmeric'],
  writing:            ['default', 'midnight', 'indigo',   'blush',   'ocean',   'neel',   'forest',   'turmeric'],
  theatre:            ['default', 'blush',    'neel',     'turmeric','indigo',  'ocean',  'forest',   'midnight'],
  education:          ['default', 'indigo',   'midnight', 'ocean',   'neel',    'forest', 'blush',    'turmeric'],
  // teal categories
  art_design:         ['ocean',   'indigo',   'blush',    'default', 'midnight','forest', 'neel',     'turmeric'],
  photo:              ['ocean',   'midnight', 'indigo',   'default', 'blush',   'forest', 'neel',     'turmeric'],
  // lavender categories
  video_content:      ['indigo',  'midnight', 'ocean',    'default', 'blush',   'forest', 'neel',     'turmeric'],
  photography:        ['indigo',  'ocean',    'midnight', 'default', 'blush',   'forest', 'neel',     'turmeric'],
  tech:               ['indigo',  'midnight', 'ocean',    'default', 'forest',  'neel',   'blush',    'turmeric'],
  // amber categories
  lifestyle:          ['neel',    'turmeric', 'forest',   'default', 'blush',   'ocean',  'indigo',   'midnight'],
  lifestyle_wellness: ['neel',    'turmeric', 'forest',   'blush',   'default', 'ocean',  'indigo',   'midnight'],
  events:             ['neel',    'turmeric', 'default',  'blush',   'forest',  'ocean',  'indigo',   'midnight'],
  business_brand:     ['neel',    'turmeric', 'indigo',   'midnight','default', 'ocean',  'forest',   'blush'],
  // neutral/grey categories — no strong colour signal, fall back gracefully
  professional_portfolio: ['midnight', 'indigo', 'ocean', 'default', 'neel', 'forest', 'blush', 'turmeric'],
  community_impact:       ['forest',   'ocean',  'indigo','default', 'neel', 'blush',  'midnight', 'turmeric'],
}

const DEFAULT_ORDER = ['default', 'indigo', 'neel', 'ocean', 'forest', 'blush', 'midnight', 'turmeric']

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns ALL_SWATCHES reordered so the most on-brand swatch for `category`
 * comes first. The array always has exactly 8 entries (no duplicates, no gaps).
 *
 * Example:
 *   recommendScheme('art_design')
 *   // → [{ hex: '#5DD9D0', scheme: 'ocean' }, { hex: '#9B8FFF', scheme: 'indigo' }, …]
 */
export function recommendScheme(category: string | null | undefined): Swatch[] {
  const key   = (category ?? '').toLowerCase().trim()
  const order = CATEGORY_SCHEME_ORDER[key] ?? DEFAULT_ORDER

  // Build a scheme → Swatch lookup for O(1) access
  const byScheme = new Map(ALL_SWATCHES.map(s => [s.scheme, s]))

  const ordered: Swatch[] = []
  // First: swatches in preferred order
  for (const scheme of order) {
    const sw = byScheme.get(scheme)
    if (sw) ordered.push(sw)
  }
  // Then: any swatches not mentioned in the order list (safety net)
  for (const sw of ALL_SWATCHES) {
    if (!ordered.find(s => s.scheme === sw.scheme)) ordered.push(sw)
  }

  return ordered
}

/**
 * Returns just the single best-match swatch for a category.
 * Equivalent to recommendScheme(category)[0].
 */
export function getTopSwatch(category: string | null | undefined): Swatch {
  return recommendScheme(category)[0]
}
