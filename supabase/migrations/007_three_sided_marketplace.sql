-- =============================================================================
-- WIMC — Three-Sided Marketplace: Makers, Addas, Explorers
-- Migration: 007_three_sided_marketplace.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MODIFY user_profiles — Add maker tier + explorer role columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS user_role               text        NOT NULL DEFAULT 'maker'
    CHECK (user_role IN ('maker', 'explorer')),
  ADD COLUMN IF NOT EXISTS maker_tier              text        NOT NULL DEFAULT 'mohalla'
    CHECK (maker_tier IN ('mohalla', 'nukkad', 'chowk', 'maidan')),
  ADD COLUMN IF NOT EXISTS tier_evaluated_at        timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS cumulative_events_hosted integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_unique_attendees integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_gmv_paise    bigint      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_event_rating    numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_attendee_rate    numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_page_visitors   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_event_hosted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS tier_locked_until        timestamptz,
  ADD COLUMN IF NOT EXISTS is_founding_maker        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_subscriber_count integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collab_invite_active    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS collab_invite_config    jsonb       NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.user_profiles.user_role               IS 'maker = creator, explorer = audience member. Addas have their own adda_profiles table.';
COMMENT ON COLUMN public.user_profiles.maker_tier              IS 'Mohalla → Nukkad → Chowk → Maidan — recalculated by evaluate-tiers cron.';
COMMENT ON COLUMN public.user_profiles.cumulative_gmv_paise    IS 'Total ticket revenue earned (paise). Updated on each payment.captured webhook.';
COMMENT ON COLUMN public.user_profiles.repeat_attendee_rate    IS 'Fraction of attendees who attend more than one event. Stored as 0.0–1.0.';
COMMENT ON COLUMN public.user_profiles.tier_locked_until       IS 'Prevents tier downgrade for 30 days after an upgrade.';
COMMENT ON COLUMN public.user_profiles.is_founding_maker       IS 'Set manually for Maidan creators who joined in Year 1. Exempt from auto-downgrade.';
COMMENT ON COLUMN public.user_profiles.collab_invite_config    IS 'JSON: { types: string[], availability: string, note: string }';

-- ---------------------------------------------------------------------------
-- 2. CREATE TABLE adda_profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.adda_profiles (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id                uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                        text        NOT NULL,
  slug                        text        UNIQUE NOT NULL,
  description                 text,
  adda_type                   text[]      NOT NULL DEFAULT '{}',
  -- valid values: 'cafe', 'coworking', 'gallery', 'community_hall', 'rooftop', 'garden', 'studio', 'library', 'restaurant'
  city                        text        NOT NULL DEFAULT 'ahmedabad',
  neighbourhood               text,
  address                     text        NOT NULL,
  lat                         numeric(10,7),
  lng                         numeric(10,7),
  cover_image_url             text,
  gallery_images              text[]      NOT NULL DEFAULT '{}',
  -- max 12 images
  capacity_min                integer     CHECK (capacity_min IS NULL OR capacity_min >= 0),
  capacity_max                integer     CHECK (capacity_max IS NULL OR capacity_max >= 0),
  capacity_configurations     jsonb       NOT NULL DEFAULT '[]',
  -- [{ type: 'theatre', capacity: 80 }, { type: 'workshop', capacity: 40 }, ...]
  amenities                   text[]      NOT NULL DEFAULT '{}',
  -- valid: 'projector', 'pa_system', 'natural_light', 'parking', 'accessible', 'wifi', 'whiteboard', 'kitchen', 'outdoor_space', 'ac'
  pricing_model               text        NOT NULL DEFAULT 'door_split'
    CHECK (pricing_model IN ('fixed_rental', 'door_split', 'hybrid', 'f_and_b_minimum')),
  pricing_config              jsonb       NOT NULL DEFAULT '{}',
  -- { fixed_rental_paise: 500000, door_split_percent: 15, f_and_b_minimum_paise: 200000 }
  contact_whatsapp            text,
  contact_email               text,
  instagram_handle            text,
  is_verified                 boolean     NOT NULL DEFAULT false,
  is_active                   boolean     NOT NULL DEFAULT true,
  total_events_hosted         integer     NOT NULL DEFAULT 0,
  total_revenue_earned_paise  bigint      NOT NULL DEFAULT 0,
  average_maker_rating        numeric(3,2) NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT adda_slug_format CHECK (slug ~ '^[a-z0-9_\-]{3,60}$'),
  CONSTRAINT adda_capacity_range CHECK (
    capacity_min IS NULL OR capacity_max IS NULL OR capacity_max >= capacity_min
  ),
  CONSTRAINT adda_gallery_max CHECK (array_length(gallery_images, 1) IS NULL OR array_length(gallery_images, 1) <= 12)
);

COMMENT ON TABLE  public.adda_profiles                        IS 'Venue profiles — cafes, coworking spaces, galleries, etc. that partner with Makers.';
COMMENT ON COLUMN public.adda_profiles.slug                  IS 'URL-safe slug used in /adda/[slug]/dashboard';
COMMENT ON COLUMN public.adda_profiles.pricing_model         IS 'How the venue earns: fixed_rental, door_split, hybrid, or f_and_b_minimum.';
COMMENT ON COLUMN public.adda_profiles.pricing_config        IS 'JSON payload for the chosen pricing_model. See column comment for shape.';
COMMENT ON COLUMN public.adda_profiles.capacity_configurations IS 'Array of { type: string, capacity: number } — different room configurations.';

CREATE INDEX adda_profiles_city_idx         ON public.adda_profiles (city);
CREATE INDEX adda_profiles_is_active_idx    ON public.adda_profiles (is_active);
CREATE INDEX adda_profiles_pricing_model_idx ON public.adda_profiles (pricing_model);

CREATE TRIGGER trg_adda_profiles_updated_at
  BEFORE UPDATE ON public.adda_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. CREATE TABLE explorer_profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.explorer_profiles (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id                uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                text        NOT NULL,
  avatar_url                  text,
  city                        text        NOT NULL DEFAULT 'ahmedabad',
  interest_tags               text[]      NOT NULL DEFAULT '{}',
  -- 3–5 tags from INTEREST_TAGS constant
  preferred_formats           text[]      NOT NULL DEFAULT '{}',
  -- 'small_group', 'workshop', 'performance', 'networking', 'outdoor', 'dining'
  price_range_max_paise       integer     NOT NULL DEFAULT 50000,
  -- ₹500 default
  neighbourhood_preference    text,
  explorer_score              integer     NOT NULL DEFAULT 0 CHECK (explorer_score >= 0 AND explorer_score <= 100),
  -- 0–100, private, used for recommendations
  total_events_attended       integer     NOT NULL DEFAULT 0,
  followed_maker_ids          uuid[]      NOT NULL DEFAULT '{}',
  saved_event_ids             uuid[]      NOT NULL DEFAULT '{}',
  notification_preferences    jsonb       NOT NULL DEFAULT '{"whatsapp": true, "digest_frequency": "weekly"}',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.explorer_profiles                       IS 'Audience member profiles — private interest graph used for event recommendations.';
COMMENT ON COLUMN public.explorer_profiles.explorer_score        IS '0–100 engagement score. Private — used internally for recommendation weighting.';
COMMENT ON COLUMN public.explorer_profiles.interest_tags         IS '3–5 tags from INTEREST_TAGS. Drive personalised event feed.';
COMMENT ON COLUMN public.explorer_profiles.price_range_max_paise IS 'Maximum ticket price the explorer is willing to pay, in paise.';

CREATE INDEX explorer_profiles_city_idx ON public.explorer_profiles (city);

CREATE TRIGGER trg_explorer_profiles_updated_at
  BEFORE UPDATE ON public.explorer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. CREATE TABLE adda_availability
-- ---------------------------------------------------------------------------

CREATE TABLE public.adda_availability (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  adda_id     uuid    NOT NULL REFERENCES public.adda_profiles(id) ON DELETE CASCADE,
  date        date    NOT NULL,
  slot_type   text    NOT NULL DEFAULT 'full_day'
    CHECK (slot_type IN ('morning', 'afternoon', 'evening', 'full_day')),
  status      text    NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'blocked', 'pending', 'confirmed')),
  event_id    uuid    REFERENCES public.events(id),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (adda_id, date, slot_type)
);

COMMENT ON TABLE  public.adda_availability          IS 'Per-slot availability calendar for each Adda.';
COMMENT ON COLUMN public.adda_availability.slot_type IS 'Time-of-day slot: morning, afternoon, evening, or full_day.';
COMMENT ON COLUMN public.adda_availability.status    IS 'available = open for proposals, blocked = owner-blocked, pending = awaiting confirmation, confirmed = booked.';

CREATE INDEX adda_availability_adda_id_date_idx ON public.adda_availability (adda_id, date);
CREATE INDEX adda_availability_status_idx       ON public.adda_availability (status);

-- ---------------------------------------------------------------------------
-- 5. CREATE TABLE maker_adda_proposals
-- ---------------------------------------------------------------------------

CREATE TABLE public.maker_adda_proposals (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  maker_id                uuid    NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  adda_id                 uuid    NOT NULL REFERENCES public.adda_profiles(id) ON DELETE CASCADE,
  event_id                uuid    REFERENCES public.events(id),
  proposed_date           date    NOT NULL,
  proposed_slot           text    NOT NULL,
  event_title             text    NOT NULL,
  expected_attendees      integer,
  expected_revenue_paise  integer,
  proposed_pricing_model  text,
  proposed_split_config   jsonb   NOT NULL DEFAULT '{}',
  message                 text,
  status                  text    NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'counter_offered', 'accepted', 'declined', 'expired')),
  counter_offer           jsonb   NOT NULL DEFAULT '{}',
  adda_response_note      text,
  expires_at              timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.maker_adda_proposals            IS 'Booking proposals sent by Makers to Addas. Supports counter-offer negotiation.';
COMMENT ON COLUMN public.maker_adda_proposals.status     IS 'Lifecycle: pending → counter_offered | accepted | declined | expired.';
COMMENT ON COLUMN public.maker_adda_proposals.counter_offer IS 'JSON payload set by Adda when status = counter_offered.';
COMMENT ON COLUMN public.maker_adda_proposals.expires_at IS 'Proposal expires 72 hours after creation if no response.';

CREATE INDEX maker_adda_proposals_maker_id_idx  ON public.maker_adda_proposals (maker_id);
CREATE INDEX maker_adda_proposals_adda_id_idx   ON public.maker_adda_proposals (adda_id);
CREATE INDEX maker_adda_proposals_status_idx    ON public.maker_adda_proposals (status);

CREATE TRIGGER trg_maker_adda_proposals_updated_at
  BEFORE UPDATE ON public.maker_adda_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. CREATE TABLE maker_tier_history
-- ---------------------------------------------------------------------------

CREATE TABLE public.maker_tier_history (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  maker_id       uuid    NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  previous_tier  text,
  new_tier       text    NOT NULL,
  triggered_at   timestamptz NOT NULL DEFAULT now(),
  snapshot       jsonb   NOT NULL DEFAULT '{}'
  -- snapshot of metrics at the time of the tier change
);

COMMENT ON TABLE  public.maker_tier_history          IS 'Audit log of Maker tier changes. Each row is one tier transition.';
COMMENT ON COLUMN public.maker_tier_history.snapshot IS 'JSON snapshot of tier metrics at the moment of the change — for dispute resolution.';

CREATE INDEX maker_tier_history_maker_id_idx ON public.maker_tier_history (maker_id);

-- ---------------------------------------------------------------------------
-- 7. CREATE TABLE explorer_event_history
-- ---------------------------------------------------------------------------

CREATE TABLE public.explorer_event_history (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  explorer_id  uuid    NOT NULL REFERENCES public.explorer_profiles(id) ON DELETE CASCADE,
  event_id     uuid    NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rsvp_id      uuid    REFERENCES public.rsvps(id),
  attended     boolean NOT NULL DEFAULT false,
  rating       integer CHECK (rating >= 1 AND rating <= 5),
  review       text,
  rated_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (explorer_id, event_id)
);

COMMENT ON TABLE  public.explorer_event_history       IS 'Explorer attendance and rating history. One row per explorer per event.';
COMMENT ON COLUMN public.explorer_event_history.rating IS '1–5 stars. NULL until the Explorer rates the event.';

CREATE INDEX explorer_event_history_explorer_id_idx ON public.explorer_event_history (explorer_id);
CREATE INDEX explorer_event_history_event_id_idx    ON public.explorer_event_history (event_id);

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.adda_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explorer_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adda_availability     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maker_adda_proposals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maker_tier_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explorer_event_history ENABLE ROW LEVEL SECURITY;

-- ── adda_profiles ──────────────────────────────────────────────────────────

-- Anyone can view active adda profiles; the owner can see their own even if inactive.
CREATE POLICY "adda_profiles_select_public"
  ON public.adda_profiles
  FOR SELECT
  USING (is_active = true OR auth_user_id = public.get_user_id());

-- Authenticated users may create one adda profile linked to their own auth account.
CREATE POLICY "adda_profiles_insert_own"
  ON public.adda_profiles
  FOR INSERT
  WITH CHECK (auth_user_id = public.get_user_id());

-- Only the adda owner may update their profile.
CREATE POLICY "adda_profiles_update_own"
  ON public.adda_profiles
  FOR UPDATE
  USING (auth_user_id = public.get_user_id())
  WITH CHECK (auth_user_id = public.get_user_id());

-- ── adda_availability ──────────────────────────────────────────────────────

-- Anyone can view availability slots.
CREATE POLICY "adda_availability_select_public"
  ON public.adda_availability
  FOR SELECT
  USING (true);

-- Only the adda owner may insert availability slots.
CREATE POLICY "adda_availability_insert_own"
  ON public.adda_availability
  FOR INSERT
  WITH CHECK (
    adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  );

-- Only the adda owner may update their slots.
CREATE POLICY "adda_availability_update_own"
  ON public.adda_availability
  FOR UPDATE
  USING (
    adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  )
  WITH CHECK (
    adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  );

-- Only the adda owner may delete their slots.
CREATE POLICY "adda_availability_delete_own"
  ON public.adda_availability
  FOR DELETE
  USING (
    adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  );

-- ── maker_adda_proposals ───────────────────────────────────────────────────

-- The maker who sent the proposal OR the adda owner can view it.
CREATE POLICY "proposals_select_maker_or_adda"
  ON public.maker_adda_proposals
  FOR SELECT
  USING (
    maker_id = public.get_user_id()
    OR adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  );

-- Only authenticated Makers (users with a maker user_profiles row) may send proposals.
CREATE POLICY "proposals_insert_maker"
  ON public.maker_adda_proposals
  FOR INSERT
  WITH CHECK (
    maker_id = public.get_user_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = public.get_user_id()
        AND user_role = 'maker'
    )
  );

-- The adda owner may update status/counter_offer; the maker may withdraw (update status to expired/declined).
CREATE POLICY "proposals_update_maker_or_adda"
  ON public.maker_adda_proposals
  FOR UPDATE
  USING (
    maker_id = public.get_user_id()
    OR adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  )
  WITH CHECK (
    maker_id = public.get_user_id()
    OR adda_id IN (SELECT id FROM public.adda_profiles WHERE auth_user_id = public.get_user_id())
  );

-- ── explorer_profiles ──────────────────────────────────────────────────────

-- Explorer profiles are private — only the owner can view their own.
CREATE POLICY "explorer_profiles_select_own"
  ON public.explorer_profiles
  FOR SELECT
  USING (auth_user_id = public.get_user_id());

-- An explorer may only create their own profile.
CREATE POLICY "explorer_profiles_insert_own"
  ON public.explorer_profiles
  FOR INSERT
  WITH CHECK (auth_user_id = public.get_user_id());

-- An explorer may only update their own profile.
CREATE POLICY "explorer_profiles_update_own"
  ON public.explorer_profiles
  FOR UPDATE
  USING (auth_user_id = public.get_user_id())
  WITH CHECK (auth_user_id = public.get_user_id());

-- ── maker_tier_history ─────────────────────────────────────────────────────

-- A Maker can view their own tier history.
CREATE POLICY "tier_history_select_own"
  ON public.maker_tier_history
  FOR SELECT
  USING (maker_id = public.get_user_id());

-- All writes are service_role only (no INSERT/UPDATE/DELETE policies for client roles).

-- ── explorer_event_history ─────────────────────────────────────────────────

-- An Explorer may view their own attendance history.
CREATE POLICY "explorer_history_select_own"
  ON public.explorer_event_history
  FOR SELECT
  USING (
    explorer_id IN (
      SELECT id FROM public.explorer_profiles WHERE auth_user_id = public.get_user_id()
    )
  );

-- INSERT is service_role only (triggered on RSVP confirmation).

-- An Explorer may update their own history rows (to add ratings).
CREATE POLICY "explorer_history_update_own"
  ON public.explorer_event_history
  FOR UPDATE
  USING (
    explorer_id IN (
      SELECT id FROM public.explorer_profiles WHERE auth_user_id = public.get_user_id()
    )
  )
  WITH CHECK (
    explorer_id IN (
      SELECT id FROM public.explorer_profiles WHERE auth_user_id = public.get_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 9. STORAGE BUCKET — adda-covers
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'adda-covers',
  'adda-covers',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read adda cover images (public bucket).
CREATE POLICY "adda_covers_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'adda-covers');

-- Adda owners may upload under adda-covers/<their_auth_user_id>/<filename>.
CREATE POLICY "adda_covers_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'adda-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Adda owners may replace their own cover images.
CREATE POLICY "adda_covers_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'adda-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Adda owners may delete their own cover images.
CREATE POLICY "adda_covers_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'adda-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
