-- City Guide: Ahmedabad–Gandhinagar co-branded module
-- Tables: city_attractions, transit_routes, civic_layer_cache

CREATE TABLE IF NOT EXISTS city_attractions (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id     text          NOT NULL DEFAULT 'ahmedabad-gandhinagar',
  name        text          NOT NULL,
  category    text          NOT NULL,  -- heritage | park | market | food | temple | nature | arts | shopping | attraction
  description text,
  lat         numeric(10,7) NOT NULL,
  lng         numeric(10,7) NOT NULL,
  photo_url   text,
  address     text,
  is_active   boolean       NOT NULL DEFAULT true,
  sort_order  int           NOT NULL DEFAULT 0,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transit_routes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator           text        NOT NULL,  -- gmrc | janmarg | amts
  route_number       text,
  name               text        NOT NULL,
  from_stop          text        NOT NULL,
  to_stop            text        NOT NULL,
  fare_min_paise     int,
  fare_max_paise     int,
  frequency_minutes  int,
  operating_hours    text,
  notes              text,
  is_active          boolean     NOT NULL DEFAULT true,
  sort_order         int         NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Stores only place_id per Google Places ToS (no coordinates cached)
CREATE TABLE IF NOT EXISTS civic_layer_cache (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_type  text        NOT NULL,  -- toilet | hospital | police | petrol
  place_id    text        NOT NULL,
  cached_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (layer_type, place_id)
);

ALTER TABLE city_attractions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_routes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_layer_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "city_attractions_public_read" ON city_attractions  FOR SELECT USING (true);
CREATE POLICY "transit_routes_public_read"   ON transit_routes    FOR SELECT USING (true);
CREATE POLICY "civic_cache_public_read"      ON civic_layer_cache FOR SELECT USING (true);
CREATE POLICY "civic_cache_service_write"    ON civic_layer_cache FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─── Seed: Ahmedabad–Gandhinagar Attractions ─────────────────────────────────

INSERT INTO city_attractions (name, category, description, lat, lng, address, sort_order) VALUES
  ('Sabarmati Ashram',          'heritage',   'Gandhi''s home 1917–1930; starting point of the 1930 Salt March.',        23.0627,  72.5811, 'Ashram Road, Ahmedabad',               1),
  ('Adalaj Stepwell',           'heritage',   '15th-century ornate vav with five storeys of intricate stone carvings.',   23.1671,  72.5807, 'Adalaj, Gandhinagar',                  2),
  ('Kankaria Lake',             'park',       '15th-century lake complex with promenade, zoo and toy train.',             22.9975,  72.6002, 'Kankaria, Ahmedabad',                  3),
  ('Law Garden Night Market',   'market',     'Evening bazaar for bandhani textiles, handicrafts, and street food.',      23.0238,  72.5586, 'Law Garden, Ellisbridge, Ahmedabad',   4),
  ('Akshardham Temple',         'temple',     'Grand Swaminarayan complex in 23 acres; sound & light show nightly.',      23.2139,  72.6747, 'Gandhinagar',                          5),
  ('Indroda Dinosaur Park',     'nature',     'India''s only fossil park with dinosaur and evolution exhibits.',          23.1868,  72.6577, 'Sector 9, Gandhinagar',                6),
  ('Sabarmati Riverfront',      'park',       'Landscaped riverside promenade; cycling, kite festivals, events.',         23.0301,  72.5856, 'Sabarmati Riverfront, Ahmedabad',      7),
  ('Manek Chowk',               'food',       'Open market by day; legendary open-air street-food plaza by night.',       23.0294,  72.5849, 'Manek Chowk, Walled City, Ahmedabad', 8),
  ('Science City',              'attraction', 'Interactive science museum with IMAX, aquatics and energy park.',          23.0393,  72.6060, 'Sola, Ahmedabad',                      9),
  ('Hutheesing Jain Temple',    'heritage',   '1848 white marble temple dedicated to the 15th Jain Tirthankara.',         23.0349,  72.5735, 'Shahibaug, Ahmedabad',                10),
  ('Calico Museum of Textiles', 'heritage',   'World-class rare textile collection; pre-booked guided entry only.',       23.0447,  72.5566, 'Shahibaug, Ahmedabad',                11),
  ('Sidi Saiyyed Mosque',       'heritage',   'Famous stone jaali window; emblem of Ahmedabad since 1572.',              23.0267,  72.5761, 'Lal Darwaja, Ahmedabad',              12),
  ('Kanoria Arts Centre',       'arts',       'Contemporary art gallery in a heritage bungalow; free entry.',             23.0395,  72.5568, 'Shahibaug, Ahmedabad',                13),
  ('Modhera Sun Temple',        'heritage',   '11th-century Solanki sun temple; day trip (~1 hr from Ahmedabad).',        23.5824,  72.1298, 'Modhera, Mehsana district',           14),
  ('Rani no Hajiro',            'heritage',   'Royal tombs of Ahmad Shah''s queens in the old walled city.',             23.0263,  72.5839, 'Mirzapur, Ahmedabad',                 15)
ON CONFLICT DO NOTHING;

-- ─── Seed: Transit Routes ────────────────────────────────────────────────────

INSERT INTO transit_routes (operator, route_number, name, from_stop, to_stop, fare_min_paise, fare_max_paise, frequency_minutes, operating_hours, notes, sort_order) VALUES
  ('gmrc', 'L1', 'Metro Line 1 — East–West',          'Vastral Gam',  'Thaltej Gam',    500, 4500, 10, '06:00–23:00', 'Runs every ~10 min peak, ~15 min off-peak. Interchanges at Ghee Kanta & APMC.', 1),
  ('gmrc', 'L2', 'Metro Line 2 — North–South',        'APMC',         'Motera Stadium', 500, 4000, 12, '06:00–23:00', 'Connects Gyaspur to Motera; interchange with Line 1 at APMC.',                  2),
  ('janmarg', 'J1', 'BRTS — Pirana–Naroda',           'Pirana',       'Naroda',         500, 2500,  5, '06:00–22:30', 'Dedicated BRT lane; trunk corridor with high frequency.',                       3),
  ('janmarg', 'J2', 'BRTS — Sargasan–Bopal',          'Sargasan',     'Bopal',          500, 2500,  7, '06:00–22:30', 'Connects Gandhinagar boundary to south Ahmedabad via S.G. Highway.',            4),
  ('janmarg', 'J3', 'BRTS — Gota–Lal Darwaja',        'Gota',         'Lal Darwaja',    500, 2000,  6, '06:00–22:30', 'Passes RTO Circle, Memnagar, Income Tax junction.',                             5),
  ('janmarg', 'J4', 'BRTS — Ranip–Maninagar',         'Ranip',        'Maninagar',      500, 2000,  8, '06:00–22:30', 'Connects northwest to southeast via Relief Road.',                              6),
  ('amts', 'A52',   'AMTS 52 — Rakhial–Maninagar',    'Rakhial',      'Maninagar',      500, 1500, 20, '05:30–22:00', 'City bus; exact stops vary. Verify schedule at AMTS depot.',                    7),
  ('amts', 'A101',  'AMTS 101 — Naroda–Navrangpura',  'Naroda',       'Navrangpura',    500, 1500, 25, '05:30–22:00', 'City bus; reduced frequency Sundays.',                                          8),
  ('amts', 'A204',  'AMTS 204 — Vatva–Satellite',     'Vatva GIDC',   'Satellite',      500, 1500, 25, '05:30–21:30', 'Serves industrial and residential zones in south-east Ahmedabad.',              9)
ON CONFLICT DO NOTHING;
