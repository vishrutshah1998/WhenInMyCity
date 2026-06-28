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
  'Visakhapatnam','Thiruvananthapuram','Chhatrapati Sambhajinagar',
  'Bengaluru','Chandigarh','Gandhinagar','Hyderabad','Ahmedabad',
  'Vadodara','Lucknow','Nagpur','Kolkata','Chennai','Mumbai','Delhi',
  'Jaipur','Indore','Bhopal','Surat','Rajkot','Mysuru','Kochi','Patna',
  'Ranchi','Raipur','Nashik','Pune','Bhubaneswar','Guwahati','Srinagar',
  'Coimbatore','Agra','Meerut','Jabalpur','Rourkela','Ujjain','Varanasi',
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
      v_events:          JSON.parse(sessionStorage.getItem(SK.v_events)    || '[]') as string[],
      v_days:            JSON.parse(sessionStorage.getItem(SK.v_days)      || '[]') as string[],
      v_times:           JSON.parse(sessionStorage.getItem(SK.v_times)     || '[]') as string[],
      v_lead:            sessionStorage.getItem(SK.v_lead) || '',
      v_alcohol_license: sessionStorage.getItem(SK.v_alcohol_license) === 'true',
      v_sound_curfew:    sessionStorage.getItem(SK.v_sound_curfew)    || 'none',
      v_google_name:     sessionStorage.getItem(SK.v_google_name)     || '',
      v_slug:            sessionStorage.getItem(SK.v_slug)            || '',
      v_amenities:       JSON.parse(sessionStorage.getItem(SK.v_amenities) || '[]') as string[],
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
    'Agartala':           '23.83° N, 91.27° E',
    'Agra':               '27.17° N, 78.01° E',
    'Ahmedabad':          '23.02° N, 72.57° E',
    'Ajmer':              '26.45° N, 74.63° E',
    'Aligarh':            '27.88° N, 78.08° E',
    'Amravati':           '20.93° N, 77.75° E',
    'Amritsar':           '31.63° N, 74.87° E',
    'Anand':              '22.55° N, 72.95° E',
    'Asansol':            '23.68° N, 86.98° E',
    'Bareilly':           '28.36° N, 79.41° E',
    'Belagavi':           '15.85° N, 74.50° E',
    'Bhavnagar':          '21.76° N, 72.14° E',
    'Bhilai':             '21.21° N, 81.43° E',
    'Bhopal':             '23.25° N, 77.40° E',
    'Bhubaneswar':        '20.29° N, 85.82° E',
    'Bikaner':            '28.01° N, 73.31° E',
    'Chandigarh':         '30.73° N, 76.77° E',
    'Chhatrapati Sambhajinagar': '19.87° N, 75.34° E',
    'Coimbatore':         '11.01° N, 76.96° E',
    'Cuttack':            '20.46° N, 85.88° E',
    'Dehradun':           '30.31° N, 78.03° E',
    'Delhi':              '28.61° N, 77.20° E',
    'Dhanbad':            '23.80° N, 86.42° E',
    'Dharamshala':        '32.22° N, 76.32° E',
    'Durgapur':           '23.48° N, 87.32° E',
    'Faridabad':          '28.41° N, 77.31° E',
    'Gandhinagar':        '23.21° N, 72.63° E',
    'Gangtok':            '27.33° N, 88.61° E',
    'Gaya':               '24.79° N, 84.99° E',
    'Gorakhpur':          '26.75° N, 83.37° E',
    'Guntur':             '16.30° N, 80.43° E',
    'Gurugram':           '28.44° N, 77.02° E',
    'Guwahati':           '26.14° N, 91.74° E',
    'Gwalior':            '26.22° N, 78.18° E',
    'Haldwani':           '29.21° N, 79.52° E',
    'Haridwar':           '29.94° N, 78.17° E',
    'Hisar':              '29.14° N, 75.72° E',
    'Hubballi':           '15.36° N, 75.12° E',
    'Imphal':             '24.81° N, 93.95° E',
    'Indore':             '22.71° N, 75.85° E',
    'Jabalpur':           '23.18° N, 79.94° E',
    'Jaipur':             '26.91° N, 75.78° E',
    'Jalandhar':          '31.32° N, 75.58° E',
    'Jamnagar':           '22.47° N, 70.06° E',
    'Jammu':              '32.73° N, 74.87° E',
    'Jamshedpur':         '22.80° N, 86.18° E',
    'Jodhpur':            '26.29° N, 73.02° E',
    'Kalaburagi':         '17.33° N, 76.82° E',
    'Kanpur':             '26.44° N, 80.35° E',
    'Karnal':             '29.68° N, 76.98° E',
    'Kochi':               '9.93° N, 76.26° E',
    'Kolhapur':           '16.70° N, 74.23° E',
    'Kollam':              '8.88° N, 76.59° E',
    'Kota':               '25.21° N, 75.86° E',
    'Kozhikode':          '11.25° N, 75.78° E',
    'Lucknow':            '26.84° N, 80.94° E',
    'Ludhiana':           '30.90° N, 75.85° E',
    'Madurai':             '9.93° N, 78.12° E',
    'Mangaluru':          '12.91° N, 74.85° E',
    'Meerut':             '28.98° N, 77.70° E',
    'Mumbai':             '19.07° N, 72.87° E',
    'Muzaffarpur':        '26.12° N, 85.39° E',
    'Mysuru':             '12.30° N, 76.65° E',
    'Nagpur':             '21.14° N, 79.08° E',
    'Nashik':             '19.99° N, 73.79° E',
    'Nellore':            '14.44° N, 79.99° E',
    'Nizamabad':          '18.67° N, 78.10° E',
    'Panaji':             '15.50° N, 73.83° E',
    'Panipat':            '29.39° N, 76.97° E',
    'Patna':              '25.59° N, 85.13° E',
    'Patiala':            '30.34° N, 76.39° E',
    'Prayagraj':          '25.43° N, 81.84° E',
    'Puducherry':         '11.93° N, 79.83° E',
    'Pune':               '18.52° N, 73.85° E',
    'Raipur':             '21.25° N, 81.63° E',
    'Rajkot':             '22.30° N, 70.80° E',
    'Ranchi':             '23.36° N, 85.33° E',
    'Rourkela':           '22.21° N, 84.86° E',
    'Salem':              '11.66° N, 78.16° E',
    'Shillong':           '25.57° N, 91.88° E',
    'Shimla':             '31.10° N, 77.16° E',
    'Siliguri':           '26.71° N, 88.43° E',
    'Solapur':            '17.68° N, 75.90° E',
    'Srinagar':           '34.08° N, 74.79° E',
    'Surat':              '21.17° N, 72.83° E',
    'Thiruvananthapuram':  '8.52° N, 76.93° E',
    'Thrissur':           '10.52° N, 76.21° E',
    'Tiruchirappalli':    '10.80° N, 78.68° E',
    'Tirunelveli':         '8.71° N, 77.75° E',
    'Tirupati':           '13.62° N, 79.41° E',
    'Tumkur':             '13.34° N, 77.10° E',
    'Udaipur':            '24.57° N, 73.69° E',
    'Ujjain':             '23.17° N, 75.77° E',
    'Vadodara':           '22.30° N, 73.19° E',
    'Varanasi':           '25.31° N, 82.97° E',
    'Vellore':            '12.91° N, 79.13° E',
    'Vijayawada':         '16.50° N, 80.64° E',
    'Visakhapatnam':      '17.68° N, 83.21° E',
    'Warangal':           '18.00° N, 79.58° E',
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
