-- =============================================================================
-- WIMC — Seed Data
-- Populates venue_directory with 10 real-feeling venues across 4 Tier-2 cities
-- =============================================================================

INSERT INTO public.venue_directory
  (name, address, city, lat, lng, category, capacity_min, capacity_max, photos, contact_whatsapp, is_active)
VALUES

-- ── Jaipur (3) ────────────────────────────────────────────────────────────────

(
  'Rawat Patisserie & Café',
  'Station Road, near Railway Station, Jaipur, Rajasthan 302006',
  'Jaipur',
  26.9154600, 75.7872100,
  'cafe',
  20, 80,
  ARRAY[
    'https://example.com/venues/rawat-1.jpg',
    'https://example.com/venues/rawat-2.jpg'
  ],
  '+919414000001',
  true
),
(
  'The Hive Co-Working',
  'C-Scheme, Opposite Gaurav Tower, Jaipur, Rajasthan 302001',
  'Jaipur',
  26.9124300, 75.8000200,
  'coworking',
  15, 60,
  ARRAY[
    'https://example.com/venues/hive-jaipur-1.jpg',
    'https://example.com/venues/hive-jaipur-2.jpg'
  ],
  '+919414000002',
  true
),
(
  'Jawahar Kala Kendra — Open Courtyard',
  'Jawahar Lal Nehru Marg, Jaipur, Rajasthan 302017',
  'Jaipur',
  26.8973900, 75.8263400,
  'gallery',
  50, 300,
  ARRAY[
    'https://example.com/venues/jkk-1.jpg',
    'https://example.com/venues/jkk-2.jpg'
  ],
  '+919414000003',
  true
),

-- ── Indore (3) ────────────────────────────────────────────────────────────────

(
  'Café Terazza',
  '6/3 South Tukoganj, Indore, Madhya Pradesh 452001',
  'Indore',
  22.7195800, 75.8577000,
  'cafe',
  15, 50,
  ARRAY[
    'https://example.com/venues/terazza-1.jpg'
  ],
  '+917312000001',
  true
),
(
  'WorkAsylum Co-Working Space',
  'Scheme 54, Near Vijay Nagar Square, Indore, Madhya Pradesh 452010',
  'Indore',
  22.7533100, 75.8937400,
  'coworking',
  10, 40,
  ARRAY[
    'https://example.com/venues/workasylum-1.jpg',
    'https://example.com/venues/workasylum-2.jpg'
  ],
  '+917312000002',
  true
),
(
  'Nehru Park Community Hall',
  'Nehru Park Road, Indore, Madhya Pradesh 452002',
  'Indore',
  22.7259100, 75.8702000,
  'community_hall',
  40, 200,
  ARRAY[
    'https://example.com/venues/nehrupark-1.jpg'
  ],
  '+917312000003',
  true
),

-- ── Coimbatore (2) ────────────────────────────────────────────────────────────

(
  'Brew Room — Café & Events',
  '1047 Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
  'Coimbatore',
  11.0264700, 77.0204400,
  'cafe',
  25, 100,
  ARRAY[
    'https://example.com/venues/brewroom-1.jpg',
    'https://example.com/venues/brewroom-2.jpg'
  ],
  '+914222000001',
  true
),
(
  'Innov8 Coworking Coimbatore',
  'Brookefields Mall, 3rd Floor, Kumaran Colony, Coimbatore, Tamil Nadu 641006',
  'Coimbatore',
  11.0131800, 76.9775600,
  'coworking',
  10, 50,
  ARRAY[
    'https://example.com/venues/innov8-cbe-1.jpg'
  ],
  '+914222000002',
  true
),

-- ── Chandigarh (2) ────────────────────────────────────────────────────────────

(
  'Elante Social — Café & Co-Work',
  'Elante Mall, Industrial Area Phase I, Chandigarh 160002',
  'Chandigarh',
  30.7065400, 76.8019300,
  'cafe',
  30, 120,
  ARRAY[
    'https://example.com/venues/elante-social-1.jpg',
    'https://example.com/venues/elante-social-2.jpg'
  ],
  '+911722000001',
  true
),
(
  'CoworkIN — Sector 34',
  'SCO 58-59, Sector 34-A, Chandigarh 160022',
  'Chandigarh',
  30.7274600, 76.7716200,
  'coworking',
  8, 35,
  ARRAY[
    'https://example.com/venues/coworkin-1.jpg'
  ],
  '+911722000002',
  true
);
