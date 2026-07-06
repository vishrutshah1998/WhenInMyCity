-- Favorite-spots lists: curated UGC about places (not people).
--
-- Moderation model:
--   • trusted contributors (is_trusted_contributor = true) → publish directly
--   • all other explorers → status becomes 'under_review'; admin approves offline
--   • spot_list_flags captures reports; admin reviews flags via service role
--
-- Scope constraints enforced at the data level:
--   • Lists link to city_attractions OR freeform place names — never named individuals
--   • No comments, reviews of people, or social feed tables here
--   • Public SELECT is limited to is_public = true rows (double-gated with status = 'published')

-- ── Extend explorer_profiles ──────────────────────────────────────────────────

ALTER TABLE explorer_profiles
  ADD COLUMN IF NOT EXISTS is_trusted_contributor boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN explorer_profiles.is_trusted_contributor IS
  'When true, the Explorer can publish spot lists directly without moderation review.';

-- ── spot_lists ────────────────────────────────────────────────────────────────

CREATE TABLE spot_lists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  explorer_id uuid        NOT NULL REFERENCES explorer_profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description text            CHECK (char_length(description) <= 500),
  city_id     text        NOT NULL DEFAULT 'ahmedabad-gandhinagar',
  slug        text        NOT NULL UNIQUE,
  status      text        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','under_review','published','removed')),
  is_public   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN spot_lists.status IS
  'draft: private; under_review: submitted, awaiting admin; published: public; removed: admin-removed.';

-- ── spot_list_items ───────────────────────────────────────────────────────────

CREATE TABLE spot_list_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         uuid        NOT NULL REFERENCES spot_lists(id) ON DELETE CASCADE,
  -- Links to the city_attractions curated seed; nullable for freeform places.
  attraction_id   uuid        REFERENCES city_attractions(id) ON DELETE SET NULL,
  -- Denormalised name — always populated. Allows freeform places + survives attraction deletion.
  place_name      text        NOT NULL CHECK (char_length(place_name) BETWEEN 1 AND 100),
  place_category  text,
  -- The author's note about why they like this place. About the place, never about a person.
  note            text        CHECK (char_length(note) <= 200),
  position        int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── spot_list_flags ───────────────────────────────────────────────────────────
-- Report / flag affordance. One flag per reporter per list. No public display of counts.

CREATE TABLE spot_list_flags (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id          uuid        NOT NULL REFERENCES spot_lists(id) ON DELETE CASCADE,
  reporter_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason           text        NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 200),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, reporter_user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX spot_lists_explorer_id_idx ON spot_lists (explorer_id);
CREATE INDEX spot_lists_slug_idx        ON spot_lists (slug);
CREATE INDEX spot_lists_status_idx      ON spot_lists (status) WHERE status = 'published';
CREATE INDEX spot_list_items_list_id_idx ON spot_list_items (list_id, position);
CREATE INDEX spot_list_flags_list_id_idx ON spot_list_flags (list_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE spot_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_list_flags ENABLE ROW LEVEL SECURITY;

-- Public can read published, public lists and their items (needed for /explore/lists/[slug])
CREATE POLICY "spot_lists_public_read" ON spot_lists
  FOR SELECT USING (status = 'published' AND is_public = true);

CREATE POLICY "spot_list_items_public_read" ON spot_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spot_lists sl
      WHERE sl.id = list_id AND sl.status = 'published' AND sl.is_public = true
    )
  );

-- Authenticated users can flag published lists (one flag per user per list enforced by UNIQUE)
CREATE POLICY "spot_list_flags_auth_insert" ON spot_list_flags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_user_id);

-- Service role has full access (admin moderation, approval, removal)
CREATE POLICY "spot_lists_service_all"      ON spot_lists      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "spot_list_items_service_all" ON spot_list_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "spot_list_flags_service_all" ON spot_list_flags FOR ALL USING (auth.role() = 'service_role');

-- All other CRUD (owner reads, writes, deletes) goes through server actions using the
-- admin/service-role client, which bypasses RLS. Owner is verified in the action layer
-- by checking explorer_profiles.auth_user_id = auth.uid() in the WHERE clause.
