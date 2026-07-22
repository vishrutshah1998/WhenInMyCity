// New keys for new flows — do NOT replace existing wimc_s1 etc.
// Existing keys stay until all old screens are retired.

export const SK = {
  // Universal (new flows)
  persona:      'wimc_ob_persona',   // 'creator' | 'business' | 'explorer'

  // Creator new flow
  c_name:       'wimc_ob_c_name',
  c_username:   'wimc_ob_c_username',
  c_category:   'wimc_ob_c_category',
  c_city:       'wimc_ob_c_city',
  c_subtypes:     'wimc_ob_c_subtypes',
  c_subtype_rank: 'wimc_ob_c_subtype_rank', // subtype IDs ordered by real popularity, most-picked first
  c_offline_acts: 'wimc_ob_c_offline_acts',
  c_interests:    'wimc_ob_c_interests',
  c_platforms:      'wimc_ob_c_platforms',
  c_social_handles: 'wimc_ob_c_social_handles',
  c_bio:            'wimc_ob_c_bio',
  c_theme_preview:  'wimc_ob_c_theme_preview',
  c_colorscheme:    'wimc_ob_c_colorscheme',
  c_theme_json:     'wimc_ob_c_theme_json',
  c_final_username: 'wimc_ob_c_final_username',
  c_avatar_url:     'wimc_ob_c_avatar_url',

  // Business shared
  b_name:       'wimc_ob_b_name',
  b_city:       'wimc_ob_b_city',
  b_slug:       'wimc_ob_b_slug',
  b_subpath:    'wimc_ob_b_subpath',  // 'venue' | 'brand'

  // Venue
  v_slug:          'wimc_ob_v_slug',
  v_types:         'wimc_ob_v_types',
  v_capacity:      'wimc_ob_v_capacity',
  v_address:       'wimc_ob_v_address',
  v_neighbourhood: 'wimc_ob_v_neighbourhood',
  v_amenities:     'wimc_ob_v_amenities',  // read by V8; nothing currently writes it
  v_pricing:        'wimc_ob_v_pricing',
  v_pricing_amount: 'wimc_ob_v_pricing_amount',
  v_pricing_split:  'wimc_ob_v_pricing_split',
  v_day_schedules:  'wimc_ob_v_day_schedules',
  v_events:         'wimc_ob_v_events',
  v_days:       'wimc_ob_v_days',
  v_lead:       'wimc_ob_v_lead',
  v_contact:    'wimc_ob_v_contact',

  // Venue city — detected from Google Places address (may differ from b_city)
  v_city:             'wimc_ob_v_city',

  // Venue — Google Places enrichment (written by V5, consumed by V7/V8)
  v_lat:              'wimc_ob_v_lat',
  v_lng:              'wimc_ob_v_lng',
  v_google_place_id:  'wimc_ob_v_google_place_id',
  v_google_name:      'wimc_ob_v_google_name',
  v_phone:            'wimc_ob_v_phone',
  v_website:          'wimc_ob_v_website',
  v_google_rating:    'wimc_ob_v_google_rating',
  v_google_reviews:   'wimc_ob_v_google_reviews',   // JSON string: GoogleReview[]
  v_google_photos:    'wimc_ob_v_google_photos',    // JSON string: string[] (Supabase URLs)
  v_opening_hours:    'wimc_ob_v_opening_hours',    // JSON string: parsed {days, periods} from Google
  v_google_types:     'wimc_ob_v_google_types',     // JSON string: string[] raw Google place types
  v_editorial:        'wimc_ob_v_editorial',        // string: editorial summary for bio pre-fill
  v_wheelchair:       'wimc_ob_v_wheelchair',       // 'true' | 'false' | '' from Google Places wheelchair_accessible_entrance

  // Venue — availability details (V7)
  v_time_windows:     'wimc_ob_v_time_windows',     // JSON string: TimeWindow[] ({id,label,start,end} 24h HH:MM)
  v_times:            'wimc_ob_v_times',            // JSON string: string[] ('morning'|'afternoon'|'evening'|'late_night') — derived from v_time_windows
  v_alcohol_license:  'wimc_ob_v_alcohol_license',  // 'true' | 'false'
  v_sound_curfew:     'wimc_ob_v_sound_curfew',     // string: '22:00' | '23:00' | '00:00' | 'none' (legacy, no longer written)

  // Brand
  b_logo_url:   'wimc_ob_b_logo_url',
  r_aesthetic:  'wimc_ob_r_aesthetic',
  r_categories: 'wimc_ob_r_categories',
  r_goals:      'wimc_ob_r_goals',
  r_contact:    'wimc_ob_r_contact',

  // Explorer
  e_name:         'wimc_ob_e_name',
  e_username:     'wimc_ob_e_username',
  e_scene:        'wimc_ob_e_scene',
  e_city:         'wimc_ob_e_city',
  e_neighbourhood:'wimc_ob_e_neighbourhood',
  e_interests:    'wimc_ob_e_interests',
  e_formats:      'wimc_ob_e_formats',
  e_price_max:    'wimc_ob_e_price_max',
  e_notif_wa:     'wimc_ob_e_notif_wa',
  e_digest_freq:  'wimc_ob_e_digest_freq',
  e_intent:       'wimc_ob_e_intent',
  e_avatar_url:   'wimc_ob_e_avatar_url',
} as const

export function clearNewOnboardingKeys(): void {
  Object.values(SK).forEach(k => {
    try { sessionStorage.removeItem(k) } catch {}
  })
  try { sessionStorage.removeItem('wimc_ob_mode') } catch {}
}

export const LEGACY_KEYS = [
  'wimc_s1', 'wimc_s2', 'wimc_role', 'wimc_persona',
  'wimc_city', 'wimc_subtypes', 'wimc_platforms', 'wimc_interests',
  'venue_step1', 'venue_step2', 'venue_step3',
] as const
