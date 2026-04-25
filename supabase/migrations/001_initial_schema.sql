-- =============================================================================
-- WIMC — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for ILIKE / search on username, title

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
CREATE TYPE public.creator_type AS ENUM (
  'music_performance',
  'comedy_open_mic',
  'art_design',
  'workshops_teaching',
  'food_lifestyle',
  'content_creation'
);

CREATE TYPE public.block_type AS ENUM (
  'social_link',
  'youtube_embed',
  'instagram_embed',
  'text_bio',
  'image_gallery',
  'event_listing',
  'custom_link'
);

CREATE TYPE public.event_status AS ENUM (
  'draft',
  'published',
  'cancelled',
  'completed'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'captured',
  'failed',
  'refunded'
);

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS  (SECURITY DEFINER so they work inside RLS policies)
-- ---------------------------------------------------------------------------

-- Thin wrapper around auth.uid() that RLS policies can call without
-- embedding auth schema references directly (avoids privilege escalation).
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- TABLE: user_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text        UNIQUE NOT NULL,
  display_name    text        NOT NULL,
  bio             text        CHECK (char_length(bio) <= 160),
  avatar_url      text,
  city            text        NOT NULL,
  creator_type    public.creator_type NOT NULL,
  interest_tags   text[]      NOT NULL DEFAULT '{}',
  phone           text        UNIQUE,                -- Indian mobile, verified via OTP
  instagram_handle text,
  is_verified     boolean     NOT NULL DEFAULT false,
  page_theme      jsonb       NOT NULL DEFAULT '{}', -- colour, font, background choices
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- username must be URL-safe: lowercase alphanum + hyphens/underscores, 3-30 chars
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_\-]{3,30}$'),
  -- interest_tags: max 5
  CONSTRAINT interest_tags_max CHECK (array_length(interest_tags, 1) IS NULL OR array_length(interest_tags, 1) <= 5)
);

COMMENT ON TABLE  public.user_profiles                IS 'Creator profiles — one row per auth.users account.';
COMMENT ON COLUMN public.user_profiles.username       IS 'URL slug used in wimc.app/@username';
COMMENT ON COLUMN public.user_profiles.phone          IS 'Indian mobile number in +91XXXXXXXXXX format, verified via OTP';
COMMENT ON COLUMN public.user_profiles.interest_tags  IS 'Up to 5 free-form tags e.g. ["jazz","open-mic","pune"]';
COMMENT ON COLUMN public.user_profiles.page_theme     IS 'JSON: {color_primary, color_bg, font_family, background_type, ...}';

-- Returns TRUE when the calling user has a row in user_profiles
-- (i.e. they have completed onboarding and are a verified creator).
-- Used in the events INSERT policy.
CREATE OR REPLACE FUNCTION public.has_creator_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_profiles
    WHERE  id = (SELECT auth.uid())
  )
$$;

-- ---------------------------------------------------------------------------
-- TABLE: page_blocks
-- ---------------------------------------------------------------------------
CREATE TABLE public.page_blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  block_type  public.block_type NOT NULL,
  position    integer     NOT NULL CHECK (position >= 0),  -- 0-indexed display order
  is_visible  boolean     NOT NULL DEFAULT true,
  config      jsonb       NOT NULL DEFAULT '{}',  -- block-specific data: url, title, embed_id, …
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.page_blocks            IS 'Link-in-bio blocks displayed on a creator''s public page.';
COMMENT ON COLUMN public.page_blocks.position   IS '0-indexed. Lower = appears higher on the page.';
COMMENT ON COLUMN public.page_blocks.config     IS 'Flexible JSON payload per block_type. Examples: {url, title} for social_link; {video_id} for youtube_embed; {images:[]} for image_gallery.';

CREATE INDEX page_blocks_profile_id_position_idx
  ON public.page_blocks (profile_id, position);

-- ---------------------------------------------------------------------------
-- TABLE: events
-- ---------------------------------------------------------------------------
CREATE TABLE public.events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text,
  cover_image_url   text,
  venue_name        text        NOT NULL,
  venue_address     text        NOT NULL,
  venue_lat         numeric(10, 7),
  venue_lng         numeric(10, 7),
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz,
  ticket_price      integer     NOT NULL DEFAULT 0 CHECK (ticket_price >= 0),  -- paise (₹1 = 100)
  capacity          integer     CHECK (capacity IS NULL OR capacity > 0),      -- NULL = unlimited
  status            public.event_status NOT NULL DEFAULT 'draft',
  razorpay_event_id text,        -- external Razorpay event/item id for payment linking
  whatsapp_group_url text,
  slug              text        UNIQUE NOT NULL,  -- wimc.app/e/<slug>
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT slug_format        CHECK (slug ~ '^[a-z0-9\-]{3,80}$')
);

COMMENT ON TABLE  public.events                 IS 'Creator-hosted events ticketed through the platform.';
COMMENT ON COLUMN public.events.ticket_price    IS 'Amount in paise. 0 = free event. ₹100 = 10000.';
COMMENT ON COLUMN public.events.slug            IS 'SEO-friendly URL slug used in wimc.app/e/<slug>';
COMMENT ON COLUMN public.events.razorpay_event_id IS 'Razorpay event/item ID used to reconcile payments.';

CREATE INDEX events_creator_id_idx  ON public.events (creator_id);
CREATE INDEX events_starts_at_idx   ON public.events (starts_at);
CREATE INDEX events_status_idx      ON public.events (status);

-- ---------------------------------------------------------------------------
-- TABLE: rsvps
-- ---------------------------------------------------------------------------
CREATE TABLE public.rsvps (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  attendee_name       text        NOT NULL,
  attendee_phone      text        NOT NULL,
  attendee_user_id    uuid        REFERENCES public.user_profiles(id),  -- NULL = guest checkout
  payment_status      public.payment_status NOT NULL DEFAULT 'pending',
  razorpay_order_id   text,
  razorpay_payment_id text,
  amount_paid         integer     CHECK (amount_paid IS NULL OR amount_paid >= 0),  -- paise
  qr_code_token       text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,  -- check-in QR
  checked_in          boolean     NOT NULL DEFAULT false,
  checked_in_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT checked_in_requires_timestamp CHECK (
    (checked_in = false) OR (checked_in_at IS NOT NULL)
  )
);

COMMENT ON TABLE  public.rsvps                   IS 'Ticket / RSVP records. Supports both logged-in users and guest checkout.';
COMMENT ON COLUMN public.rsvps.attendee_user_id  IS 'NULL when the attendee checked out as a guest.';
COMMENT ON COLUMN public.rsvps.qr_code_token     IS 'UUID-based token embedded in the entry QR code for check-in scanning.';
COMMENT ON COLUMN public.rsvps.amount_paid       IS 'Captured amount in paise. May differ from ticket_price (promo codes etc.).';

CREATE INDEX rsvps_event_id_idx          ON public.rsvps (event_id);
CREATE INDEX rsvps_attendee_user_id_idx  ON public.rsvps (attendee_user_id);
CREATE INDEX rsvps_qr_code_token_idx     ON public.rsvps (qr_code_token);

-- ---------------------------------------------------------------------------
-- TABLE: venue_directory
-- ---------------------------------------------------------------------------
CREATE TABLE public.venue_directory (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  address          text        NOT NULL,
  city             text        NOT NULL,
  lat              numeric(10, 7),
  lng              numeric(10, 7),
  category         text        CHECK (category IN ('cafe', 'coworking', 'gallery', 'community_hall', 'other')),
  capacity_min     integer     CHECK (capacity_min IS NULL OR capacity_min >= 0),
  capacity_max     integer     CHECK (capacity_max IS NULL OR capacity_max >= 0),
  photos           text[],
  contact_whatsapp text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT capacity_range_valid CHECK (
    capacity_min IS NULL OR capacity_max IS NULL OR capacity_max >= capacity_min
  )
);

COMMENT ON TABLE  public.venue_directory IS 'Platform-curated venue listings shown in the event creation flow.';

CREATE INDEX venue_directory_city_idx      ON public.venue_directory (city);
CREATE INDEX venue_directory_category_idx  ON public.venue_directory (category);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER  (reusable for all tables with updated_at)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_page_blocks_updated_at
  BEFORE UPDATE ON public.page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_directory ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS: user_profiles
-- ---------------------------------------------------------------------------

-- Anyone (including anonymous visitors) can read any profile.
CREATE POLICY "profiles_select_public"
  ON public.user_profiles
  FOR SELECT
  USING (true);

-- A new user can only create their own profile row.
CREATE POLICY "profiles_insert_own"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (id = public.get_user_id());

-- Users can only update their own profile.
CREATE POLICY "profiles_update_own"
  ON public.user_profiles
  FOR UPDATE
  USING (id = public.get_user_id())
  WITH CHECK (id = public.get_user_id());

-- ---------------------------------------------------------------------------
-- RLS: page_blocks
-- ---------------------------------------------------------------------------

-- Anyone can view blocks on any creator page.
CREATE POLICY "blocks_select_public"
  ON public.page_blocks
  FOR SELECT
  USING (true);

-- Only the profile owner can add blocks to their page.
CREATE POLICY "blocks_insert_own"
  ON public.page_blocks
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.user_profiles WHERE id = public.get_user_id()
    )
  );

-- Only the profile owner can update their blocks.
CREATE POLICY "blocks_update_own"
  ON public.page_blocks
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.user_profiles WHERE id = public.get_user_id()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.user_profiles WHERE id = public.get_user_id()
    )
  );

-- Only the profile owner can delete their blocks.
CREATE POLICY "blocks_delete_own"
  ON public.page_blocks
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.user_profiles WHERE id = public.get_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: events
-- ---------------------------------------------------------------------------

-- Published events are visible to everyone.
-- Draft / cancelled / completed events are visible only to the creator.
CREATE POLICY "events_select_public_or_own"
  ON public.events
  FOR SELECT
  USING (
    status = 'published'
    OR creator_id = public.get_user_id()
  );

-- Only authenticated users who have a creator profile can create events.
CREATE POLICY "events_insert_creator"
  ON public.events
  FOR INSERT
  WITH CHECK (
    public.has_creator_role()
    AND creator_id = public.get_user_id()
  );

-- Only the event creator can update their events.
CREATE POLICY "events_update_own"
  ON public.events
  FOR UPDATE
  USING (creator_id = public.get_user_id())
  WITH CHECK (creator_id = public.get_user_id());

-- Only the event creator can delete their events.
CREATE POLICY "events_delete_own"
  ON public.events
  FOR DELETE
  USING (creator_id = public.get_user_id());

-- ---------------------------------------------------------------------------
-- RLS: rsvps
-- ---------------------------------------------------------------------------

-- Event creator sees all RSVPs for their events.
-- A logged-in attendee sees only their own RSVPs.
-- Guest RSVPs (attendee_user_id IS NULL) are invisible via client — managed
-- server-side with the service_role key.
CREATE POLICY "rsvps_select_creator_or_own"
  ON public.rsvps
  FOR SELECT
  USING (
    -- Event creator can see all RSVPs for events they own
    event_id IN (
      SELECT id FROM public.events WHERE creator_id = public.get_user_id()
    )
    OR
    -- Logged-in attendee can see their own RSVPs
    attendee_user_id = public.get_user_id()
  );

-- Anyone (including unauthenticated guests) can create an RSVP.
-- Phone + name are collected at checkout; payment status defaults to 'pending'.
CREATE POLICY "rsvps_insert_anyone"
  ON public.rsvps
  FOR INSERT
  WITH CHECK (true);

-- Updates (payment capture, check-in) are performed exclusively by the
-- service_role key (Razorpay webhook handler, check-in API).
-- No client-side UPDATE allowed.
CREATE POLICY "rsvps_update_service_role_only"
  ON public.rsvps
  FOR UPDATE
  USING (false)      -- client can never UPDATE
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- RLS: venue_directory
-- ---------------------------------------------------------------------------

-- Anyone can browse venues.
CREATE POLICY "venues_select_public"
  ON public.venue_directory
  FOR SELECT
  USING (true);

-- All mutations are restricted to service_role (admin seeding / CMS).
-- No INSERT / UPDATE / DELETE policy is created for authenticated or anon roles,
-- which means those operations are denied by default once RLS is enabled.
-- (service_role bypasses RLS entirely.)


-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Insert bucket configs via the storage schema (works in migrations).
-- Public buckets so files are accessible via the CDN URL without auth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,   -- 2 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-covers',
  'event-covers',
  true,
  5242880,   -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage RLS: avatars
-- ---------------------------------------------------------------------------

-- Anyone can read avatar images (bucket is public, but policy is defence-in-depth).
CREATE POLICY "avatars_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- A user may only upload to avatars/<their_user_id>/<filename>.
-- Path format enforced: the first path segment after the bucket must equal auth.uid().
CREATE POLICY "avatars_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- A user may update/replace only their own avatar files.
CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- A user may delete only their own avatar files.
CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- Storage RLS: event-covers
-- ---------------------------------------------------------------------------

-- Anyone can read event cover images.
CREATE POLICY "event_covers_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-covers');

-- A user may only upload event covers under event-covers/<their_user_id>/<filename>.
CREATE POLICY "event_covers_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'event-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- A user may update only their own event cover files.
CREATE POLICY "event_covers_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'event-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- A user may delete only their own event cover files.
CREATE POLICY "event_covers_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'event-covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
