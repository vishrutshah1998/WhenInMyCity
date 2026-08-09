'use client'

import { SK } from '@/lib/onboarding/session-keys'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'

// ── Dark palette for business right panels (V4–V8, R1–R5) ────────────────────
export const DARK = {
  bg:       '#07070A',
  surface:  '#131317',
  elevated: '#1b1b1f',
  border:   '#57423e',
  text:     '#F0EFF8',
  muted:    '#9896B0',
  faint:    'rgba(240,239,248,0.3)',
  // grain overlay — apply as backgroundImage with opacity 0.028
  grain:    'repeating-radial-gradient(circle at 17% 32%, white, black 0.00085px)',
  teal:     '#5DD9D0',
  amber:    '#F5A800',
} as const

// ── Barcode strip data ────────────────────────────────────────────────────────
export const BARCODE = [3,1,4,2,1,3,1,2,4,1,3,2,1,4,2,1,3,4,1,2,3,1]

// ── Venue city derivation ─────────────────────────────────────────────────────
// v_city is set after a place is confirmed; v_address is set as soon as a
// prediction is resolved. Fall back to scanning v_address for a known city name
// so the postcard updates immediately when the user types/selects an address.
export const VENUE_CITY_NAMES = [
  // Longer / more specific first to avoid partial-match surprises
  'Gandhinagar','Ahmedabad',
]

export function deriveVenueCity(vCity: string, vAddress: string): string {
  if (vCity) return vCity
  return VENUE_CITY_NAMES.find(c => vAddress.includes(c)) || ''
}

// ── sessionStorage snapshot ───────────────────────────────────────────────────
export function readSnapshot() {
  if (typeof window === 'undefined') return null
  try {
    const rawCapacity = sessionStorage.getItem(SK.v_capacity) || ''
    let v_capacity = 0
    let v_cap_detail: { standing: number | null; seated: number | null; classroom: number | null; min_pax: number | null } = { standing: null, seated: null, classroom: null, min_pax: null }
    if (rawCapacity) {
      try {
        const parsed = JSON.parse(rawCapacity)
        if (typeof parsed === 'object' && parsed !== null) {
          v_cap_detail = parsed
          v_capacity = Math.max(parsed.standing ?? 0, parsed.seated ?? 0, parsed.classroom ?? 0, parsed.max ?? 0)
        } else {
          v_capacity = parseInt(rawCapacity, 10) || 0
        }
      } catch { v_capacity = parseInt(rawCapacity, 10) || 0 }
    }
    return {
      persona:        sessionStorage.getItem(SK.persona)      || '',
      c_name:         sessionStorage.getItem(SK.c_name)       || '',
      c_username:     sessionStorage.getItem(SK.c_username)   || '',
      c_category:     sessionStorage.getItem(SK.c_category)   || '',
      c_city:         sessionStorage.getItem(SK.c_city)       || '',
      c_subtypes:     JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') as string[],
      c_subtype_rank: JSON.parse(sessionStorage.getItem(SK.c_subtype_rank) || '[]') as string[],
      c_interests:    JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]') as string[],
      c_platforms:    JSON.parse(sessionStorage.getItem(SK.c_platforms) || '[]') as string[],
      c_bio:          sessionStorage.getItem(SK.c_bio)        || '',
      b_name:         sessionStorage.getItem(SK.b_name)       || '',
      b_slug:         sessionStorage.getItem(SK.b_slug)       || '',
      b_city:         sessionStorage.getItem(SK.b_city)       || '',
      b_subpath:      sessionStorage.getItem(SK.b_subpath)    || '',
      b_logo_url:     sessionStorage.getItem(SK.b_logo_url)   || '',
      v_types:        JSON.parse(sessionStorage.getItem(SK.v_types)       || '[]') as string[],
      v_capacity,
      v_cap_detail,
      v_city:          deriveVenueCity(
                         sessionStorage.getItem(SK.v_city)    || '',
                         sessionStorage.getItem(SK.v_address) || '',
                       ),
      v_neighbourhood: sessionStorage.getItem(SK.v_neighbourhood) || '',
      v_pricing:         sessionStorage.getItem(SK.v_pricing)         || '',
      v_pricing_amount:  sessionStorage.getItem(SK.v_pricing_amount)  || '',
      v_pricing_split:   sessionStorage.getItem(SK.v_pricing_split)   || '',
      v_events:          JSON.parse(sessionStorage.getItem(SK.v_events)    || '[]') as string[],
      v_days:            JSON.parse(sessionStorage.getItem(SK.v_days)      || '[]') as string[],
      v_times:           JSON.parse(sessionStorage.getItem(SK.v_times)     || '[]') as string[],
      v_lead:            sessionStorage.getItem(SK.v_lead) || '',
      v_alcohol_license: sessionStorage.getItem(SK.v_alcohol_license) === 'true',
      v_sound_curfew:    sessionStorage.getItem(SK.v_sound_curfew)    || 'none',
      v_google_name:     sessionStorage.getItem(SK.v_google_name)     || '',
      v_slug:            sessionStorage.getItem(SK.v_slug)            || '',
      v_amenities:       JSON.parse(sessionStorage.getItem(SK.v_amenities) || '[]') as string[],
      v_google_photos:   JSON.parse(sessionStorage.getItem(SK.v_google_photos) || '[]') as string[],
      v_editorial:     sessionStorage.getItem(SK.v_editorial)      || '',
      r_categories:    sessionStorage.getItem(SK.r_categories)     || '',
      r_aesthetic:     sessionStorage.getItem(SK.r_aesthetic)      || '',
      r_contact: (() => {
        try { return JSON.parse(sessionStorage.getItem(SK.r_contact) || '{}') as { whatsapp?: string; email?: string; instagram?: string; bio?: string } }
        catch { return {} as { whatsapp?: string; email?: string; instagram?: string; bio?: string } }
      })(),
      v_contact: (() => {
        try { return JSON.parse(sessionStorage.getItem(SK.v_contact) || '{}') as { whatsapp?: string; email?: string; instagram?: string; bio?: string } }
        catch { return {} as { whatsapp?: string; email?: string; instagram?: string; bio?: string } }
      })(),
      e_name:          sessionStorage.getItem(SK.e_name)           || '',
      e_username:      sessionStorage.getItem(SK.e_username)       || '',
      e_city:          sessionStorage.getItem(SK.e_city)           || '',
      e_scene:         sessionStorage.getItem(SK.e_scene)          || '',
      e_interests:     JSON.parse(sessionStorage.getItem(SK.e_interests) || '[]') as string[],
      c_theme_preview: (() => {
        try { return JSON.parse(sessionStorage.getItem(SK.c_theme_preview) || '{}') as { bg?: string; primary?: string; surface?: string; text?: string; light?: boolean } }
        catch { return {} }
      })(),
      c_social_handles: (() => {
        try { return JSON.parse(sessionStorage.getItem(SK.c_social_handles) || '{}') as Record<string, string> }
        catch { return {} as Record<string, string> }
      })(),
    }
  } catch { return null }
}

export type Snap = NonNullable<ReturnType<typeof readSnapshot>>

// ── City → coordinates lookup ─────────────────────────────────────────────────
export function getCityCoords(city: string): string {
  const MAP: Record<string, string> = {
    'Ahmedabad':          '23.02° N, 72.57° E',
    'Gandhinagar':        '23.21° N, 72.63° E',
  }
  return MAP[city] || '—° N, —° E'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getCategoryEmoji(catId: string): string {
  return CREATOR_CATEGORIES.find(c => c.id === catId)?.emoji ?? '🎨'
}

export function getInterestEmoji(id: string): string {
  const MAP: Record<string, string> = {
    'acoustic-sets': '🎸', 'stand-up-comedy': '🎤', 'dj-nights': '🎧',
    'open-mics': '🎙️', 'poetry-slams': '📜', 'improv-comedy': '🃏',
    'music-jams': '🥁', 'live-theatre': '🎭', 'classical-concerts': '🎻',
    'sufi-ghazal-nights': '🌙', 'storytelling-nights': '📖', 'spoken-word': '🗣️',
    'painting-workshops': '🎨', 'street-art': '🖌️', 'craft-sessions': '✂️',
    'photography-walks': '📷', 'film-screenings': '🎬', 'pottery': '🏺',
    'life-drawing': '✏️', 'digital-art': '🖥️', 'calligraphy': '✒️',
    'cooking-classes': '👨‍🍳', 'dance-workshops': '💃', 'yoga-classes': '🧘',
    'book-clubs': '📚', 'creative-writing': '🖊️', 'coding-workshops': '💻',
    'public-speaking': '🎯', 'history-walks': '🏛️', 'mindfulness-wellness': '🌸',
  }
  return MAP[id] ?? '✨'
}
