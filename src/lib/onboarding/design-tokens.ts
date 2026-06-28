// ── Aged-paper right panel ────────────────────────────────────────────────────
// Three CSS background-image layers stacked over the base color:
//   1. SVG fractalNoise grain  — paper texture
//   2. Horizontal ruling lines — old ledger / account book
//   3. Left margin rule        — faint coral line ~60px in, like a ledger margin
const _GRAIN  = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`
const _LEDGER = `repeating-linear-gradient(transparent, transparent 27px, rgba(139,115,85,0.10) 27px, rgba(139,115,85,0.10) 28px)`
const _MARGIN = `linear-gradient(90deg, transparent 59px, rgba(232,112,90,0.14) 59px, rgba(232,112,90,0.14) 60px, transparent 60px)`

export const PAPER = {
  bg:      '#EDE0C4' as const,
  texture: [_GRAIN, _LEDGER, _MARGIN].join(', '),
}

// Path accent colours — one per persona, used everywhere in onboarding
export const PATH_COLOURS = {
  creator:  '#E8705A',  // coral
  venue:    '#5DD9D0',  // teal
  explorer: '#9B8FFF',  // lavender
  brand:    '#F5A800',  // amber
  default:  '#E8705A',
} as const

// Category → accent colour (set in C3, persists through creator flow)
export const CATEGORY_COLOURS: Record<string, string> = {
  // Legacy IDs (kept for backwards compat)
  music:       '#E8705A',
  art:         '#5DD9D0',
  tech:        '#9B8FFF',
  lifestyle:   '#F5A800',
  comedy:      '#E8705A',
  writing:     '#E8705A',
  theatre:     '#E8705A',
  video:       '#9B8FFF',
  education:   '#9B8FFF',
  podcasts:    '#E8705A',
  photo:       '#5DD9D0',
  events:      '#F5A800',
  dance:       '#FF6B9D',
  // V2 category IDs (used by Profile Settings and completeOnboarding)
  comedy_theatre:         '#E8705A',
  art_design:             '#5DD9D0',
  video_content:          '#9B8FFF',
  teaching_coaching:      '#845EF7',
  lifestyle_wellness:     '#F5A800',
  business_brand:         '#F5A800',
  professional_portfolio: '#6C757D',
  community_impact:       '#2F9E44',
  // V3 categories
  food_culinary:          '#FF9F1C',
  fitness_wellness:       '#06D6A0',
  spirituality:           '#B39DDB',
  travel_adventure:       '#00B4D8',
  literature_poetry:      '#C2185B',
  crafts_making:          '#FF7043',
  default:     '#E8705A',
}

export function getCategoryColour(cat: string | null | undefined): string {
  if (!cat) return CATEGORY_COLOURS.default
  return CATEGORY_COLOURS[cat.toLowerCase()] ?? CATEGORY_COLOURS.default
}

export const ONBOARDING = {
  bg: {
    page:       '#07070A',
    surface:    '#111116',
    raised:     '#0D0D12',
    leftPanel:  '#1A2744',
    rightPanel: '#EDE0C4',
    ticket:     '#FAF7F0',
    overlay:    '#131318',
  },
  text: {
    primary:   '#F0EFF8',
    secondary: '#9896B0',
    tertiary:  '#5C5A72',
    muted:     '#9896B0',
    ticket:    '#1A2744',
  },
  border: {
    subtle:  'rgba(255,255,255,0.08)',
    default: 'rgba(255,255,255,0.15)',
    dashed:  '#57423e',
  },
  layout: {
    headerH: 56,
    footerH: 72,
    leftW:   '40%',
    rightW:  '60%',
  },
} as const
