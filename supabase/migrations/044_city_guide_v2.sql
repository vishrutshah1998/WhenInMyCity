-- City Guide v2: source tracking + external info URLs
-- Adds two columns to city_attractions; no destructive changes.

ALTER TABLE city_attractions
  ADD COLUMN IF NOT EXISTS source       text NOT NULL DEFAULT 'curated',
  ADD COLUMN IF NOT EXISTS external_url text;

-- ── Source classification ───────────────────────────────────────────────────
-- heritage_dataset = entries sourced from ASI / AMC heritage registers
-- available under GODL-India (data.gov.in)

UPDATE city_attractions
SET source = 'heritage_dataset'
WHERE name IN (
  'Adalaj Stepwell',
  'Hutheesing Jain Temple',
  'Sidi Saiyyed Mosque',
  'Rani no Hajiro',
  'Modhera Sun Temple'
);

-- ── External info URLs (Wikipedia / official) ───────────────────────────────
-- All are discovery-only links; none route through WIMC ticketing.

UPDATE city_attractions SET external_url = 'https://www.gandhiashramsabarmati.org/'
  WHERE name = 'Sabarmati Ashram';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Adalaj_stepwell'
  WHERE name = 'Adalaj Stepwell';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Kankaria_Lake'
  WHERE name = 'Kankaria Lake';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Law_Garden,_Ahmedabad'
  WHERE name = 'Law Garden Night Market';

UPDATE city_attractions SET external_url = 'https://akshardham.com/gandhinagar/'
  WHERE name = 'Akshardham Temple';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Indroda_Nature_Park'
  WHERE name = 'Indroda Dinosaur Park';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Sabarmati_Riverfront'
  WHERE name = 'Sabarmati Riverfront';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Manek_Chowk'
  WHERE name = 'Manek Chowk';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Science_City,_Ahmedabad'
  WHERE name = 'Science City';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Hatheesingh_Jain_temple'
  WHERE name = 'Hutheesing Jain Temple';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Calico_Museum_of_Textiles'
  WHERE name = 'Calico Museum of Textiles';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Sidi_Saiyyed_Mosque'
  WHERE name = 'Sidi Saiyyed Mosque';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Sun_Temple,_Modhera'
  WHERE name = 'Modhera Sun Temple';

UPDATE city_attractions SET external_url = 'https://en.wikipedia.org/wiki/Rani_no_Hajiro'
  WHERE name = 'Rani no Hajiro';
