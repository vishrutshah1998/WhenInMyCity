// =============================================================================
// WIMC — HSV Color Recommendation Engine
//
// The three onboarding questions encode orthogonal HSV axes:
//   Hue        = creator type  (craft environment color)
//   Saturation = persona       (social positioning: bold / refined / soft)
//   Value      = interest tags (lived light conditions: dark / warm / natural / vivid)
//
// recommendScheme() finds the scheme whose HSV coordinate is nearest to the
// creator's three-axis reading, with Value dominating when its signal is strong.
// =============================================================================

import { INTEREST_TAGS } from '@/lib/constants/interests'

export type SaturationAxis = 'bold' | 'refined' | 'soft'
export type ValueCluster   = 'dark' | 'warm' | 'natural' | 'vivid' | 'mixed'

// ---------------------------------------------------------------------------
// Axis 1 — Hue: creator type → dominant hue angle (0°–360°)
// ---------------------------------------------------------------------------

export const CREATOR_TYPE_HUE: Record<string, number> = {
  music:                  240,  // indigo / electric violet
  comedy_theatre:         330,  // burgundy-wine / warm red
  art_design:              15,  // vermilion / gulaal red
  video_content:          210,  // steel blue
  teaching_coaching:      130,  // forest green
  lifestyle_wellness:     145,  // sage / natural green
  community_impact:        30,  // warm orange / festival
  business_brand:         215,  // cool professional blue
  professional_portfolio: 215,  // same — trust blue
  exploring:              175,  // teal cyan
}

// ---------------------------------------------------------------------------
// Axis 2 — Saturation: persona → presentation register
// ---------------------------------------------------------------------------

export const PERSONA_SATURATION: Record<string, SaturationAxis> = {
  creator:  'bold',
  business: 'refined',
  personal: 'soft',
}

// ---------------------------------------------------------------------------
// Axis 3 — Value: interest tags → photonic environment cluster
// getValueAxis aggregates the selected tags' valueCluster membership and
// returns the dominant cluster with a confidence ratio.
// Returns 'mixed' when no single cluster exceeds 45% of selected tags.
// ---------------------------------------------------------------------------

export function getValueAxis(tagIds: string[]): { cluster: ValueCluster; confidence: number } {
  if (tagIds.length === 0) return { cluster: 'mixed', confidence: 0 }

  const counts: Record<string, number> = { dark: 0, warm: 0, natural: 0, vivid: 0 }
  let matched = 0

  for (const id of tagIds) {
    const tag = INTEREST_TAGS.find((t) => t.id === id)
    if (tag) {
      counts[tag.valueCluster]++
      matched++
    }
  }

  if (matched === 0) return { cluster: 'mixed', confidence: 0 }

  const dominant = (Object.keys(counts) as Array<'dark' | 'warm' | 'natural' | 'vivid'>)
    .reduce((a, b) => (counts[a] >= counts[b] ? a : b))

  const confidence = counts[dominant] / matched

  return {
    cluster:    confidence >= 0.45 ? dominant : 'mixed',
    confidence,
  }
}

// ---------------------------------------------------------------------------
// Scheme HSV coordinate map — the spatial data for the recommendation engine.
// Each entry encodes where that scheme sits in (hue, saturation, value) space.
// 'warm' sits between 'dark' and 'natural' — mid-luminosity, tactile-world schemes
// (stage-lit comedy rooms, festival dust, candlelit kitchens).
// ---------------------------------------------------------------------------

type SchemeCoord = { hue: number; saturation: SaturationAxis; value: 'dark' | 'warm' | 'natural' }

export const SCHEME_HSV_MAP: Record<string, SchemeCoord> = {
  // Bold & Raw — split: warm-register schemes get value:'warm', night-ink schemes stay 'dark'
  turmeric:   { hue:  45, saturation: 'bold',    value: 'warm'    },
  gulaal:     { hue:   0, saturation: 'bold',    value: 'warm'    },
  velvet:     { hue: 330, saturation: 'bold',    value: 'warm'    },
  terracotta: { hue:  20, saturation: 'refined', value: 'warm'    },
  steel:      { hue: 215, saturation: 'bold',    value: 'dark'    },
  pista:      { hue: 130, saturation: 'bold',    value: 'dark'    },

  // Dark & Electric — all true night-world schemes
  default:    { hue:  15, saturation: 'bold',    value: 'dark'    },
  indigo:     { hue: 240, saturation: 'bold',    value: 'dark'    },
  sienna:     { hue:  25, saturation: 'refined', value: 'dark'    },
  electric:   { hue: 185, saturation: 'bold',    value: 'dark'    },
  nightforest:{ hue: 145, saturation: 'soft',    value: 'dark'    },
  forest:     { hue: 160, saturation: 'soft',    value: 'dark'    },

  // Atmospheric
  midnight:   { hue: 240, saturation: 'soft',    value: 'dark'    },
  ocean:      { hue: 190, saturation: 'bold',    value: 'dark'    },
  neel:       { hue: 215, saturation: 'refined', value: 'dark'    },
  aurora:     { hue: 285, saturation: 'bold',    value: 'dark'    },
  parchment:  { hue:  40, saturation: 'soft',    value: 'natural' },

  // Light & Natural
  blush:      { hue: 340, saturation: 'soft',    value: 'natural' },
  sand:       { hue:  40, saturation: 'refined', value: 'natural' },
  sage:       { hue: 130, saturation: 'soft',    value: 'natural' },
  mint:       { hue: 165, saturation: 'refined', value: 'natural' },
  gallery:    { hue: 270, saturation: 'refined', value: 'natural' },
}

// ---------------------------------------------------------------------------
// recommendScheme — the three-axis resolver
// ---------------------------------------------------------------------------

function hueDist(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

const SAT_RANK: Record<SaturationAxis, number> = { bold: 0, refined: 1, soft: 2 }
const VALUE_RANK: Record<string, number> = { dark: 0, warm: 1, natural: 2 }

// Map ValueCluster → scheme value axis.
// 'warm' and 'vivid' both represent mid-luminosity tactile/stage-lit environments
// — they should surface warm-register schemes (turmeric, gulaal, velvet, terracotta)
// over cold-dark atmospheric schemes (neel, indigo, midnight).
function clusterToValueAxis(cluster: ValueCluster): 'dark' | 'warm' | 'natural' {
  if (cluster === 'natural') return 'natural'
  if (cluster === 'dark')    return 'dark'
  return 'warm'  // warm and vivid both live in the mid-luminosity band
}

export function recommendScheme(
  creatorType:     string,
  persona:         string,
  interestTagIds:  string[],
): { primary: string; secondary?: string; confidence: 'high' | 'medium' } {
  const targetHue = CREATOR_TYPE_HUE[creatorType] ?? 180
  const targetSat = PERSONA_SATURATION[persona]   ?? 'refined'
  const { cluster, confidence: valueConfidence } = getValueAxis(interestTagIds)

  const targetValue = clusterToValueAxis(cluster === 'mixed' ? 'dark' : cluster)

  const valueStrongSignal = valueConfidence >= 0.65 && cluster !== 'mixed'

  // Regression expectations (verified manually):
  // (a) comedy_theatre + creator + warm tags  → velvet or turmeric, tab = bold
  // (b) music         + creator + dark tags   → indigo or midnight, tab = vivid/atmospheric
  // (c) lifestyle_wellness + personal + natural tags → sage or mint, tab = natural

  let valueMatch = ''
  let valueMatchScore = Infinity
  let hueMatch = ''
  let hueMatchScore = Infinity

  for (const [scheme, coord] of Object.entries(SCHEME_HSV_MAP)) {
    const hd   = hueDist(targetHue, coord.hue)
    const sd   = Math.abs(SAT_RANK[targetSat] - SAT_RANK[coord.saturation])
    const vd   = Math.abs(VALUE_RANK[targetValue] - VALUE_RANK[coord.value])

    // Value-first score (for strong value signal): value is heavily weighted
    const valueFirstScore = vd * 60 + sd * 25 + hd * 0.5

    // Hue-first score (for finding alternative): hue + sat, value ignored
    const hueFirstScore = hd + sd * 20

    if (valueFirstScore < valueMatchScore) {
      valueMatchScore = valueFirstScore
      valueMatch = scheme
    }
    if (hueFirstScore < hueMatchScore) {
      hueMatchScore = hueFirstScore
      hueMatch = scheme
    }
  }

  // When value signal is weak or missing, fall back to hue-dominant match
  const primary = valueStrongSignal ? valueMatch : hueMatch

  // Secondary: the hue-dominant alternative when it diverges from primary
  const secondary = (primary !== hueMatch) ? hueMatch : undefined

  const confidence: 'high' | 'medium' = secondary ? 'medium' : 'high'

  return { primary: primary || 'default', secondary, confidence }
}

// ---------------------------------------------------------------------------
// Value cluster → human-readable callout copy
// ---------------------------------------------------------------------------

export const VALUE_CALLOUT: Record<ValueCluster, string> = {
  dark:    'Your late-night event choices shaped this',
  warm:    'Your stage & kitchen choices shaped this',
  natural: 'Your outdoor & daylight choices shaped this',
  vivid:   'Your high-energy creative choices shaped this',
  mixed:   'Built from your creative mix',
}
