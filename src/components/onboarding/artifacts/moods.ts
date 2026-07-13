// =============================================================================
// WIMC — Creator poster moods. Persisted on user_profiles.page_theme.posterMood
// (see supabase/migrations/056_creator_poster_mood.sql) so the choice is reused
// anywhere else the poster renders later, not a one-time onboarding setting.
// =============================================================================

export type PosterMood = 'moody' | 'editorial' | 'vivid'

export interface MoodPalette {
  bg: string
  fg: string
  accent: string
  chipBg: string
  chipFg: string
  sub: string
  dash: string
  blob: string
  blob2: string
}

export const POSTER_MOODS: Record<PosterMood, MoodPalette> = {
  moody: {
    bg: '#171310', fg: '#FBF3E7', accent: '#FF8F73',
    chipBg: 'rgba(251,243,231,0.10)', chipFg: '#FBF3E7',
    sub: 'rgba(251,243,231,0.58)', dash: 'rgba(251,243,231,0.25)',
    blob: 'rgba(255,143,115,0.16)', blob2: 'rgba(79,184,232,0.12)',
  },
  editorial: {
    bg: '#FBF3E7', fg: '#201A12', accent: '#2C4A8C',
    chipBg: 'rgba(32,26,18,0.06)', chipFg: '#201A12',
    sub: '#58503F', dash: 'rgba(32,26,18,0.22)',
    blob: 'rgba(44,74,140,0.08)', blob2: 'rgba(255,197,61,0.18)',
  },
  vivid: {
    bg: '#FF6B35', fg: '#FFFFFF', accent: '#201A12',
    chipBg: 'rgba(255,255,255,0.20)', chipFg: '#FFFFFF',
    sub: 'rgba(255,255,255,0.78)', dash: 'rgba(255,255,255,0.45)',
    blob: 'rgba(255,255,255,0.18)', blob2: 'rgba(32,26,18,0.10)',
  },
}

export const DEFAULT_MOOD: PosterMood = 'vivid'

export function isPosterMood(v: unknown): v is PosterMood {
  return v === 'moody' || v === 'editorial' || v === 'vivid'
}
