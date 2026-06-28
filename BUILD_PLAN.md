# WIMC Build Plan

> **How to use:** Tell Claude *"Continue the build plan"* at the start of each session.
> `[x]` done · `[~]` in-progress · `[ ]` not started

---

## Current Status → Resume Here

**Last completed:** S58 — Adda dashboard mobile layout + button primitive: responsive pass on `AddaDashboardClient.tsx` (2-col stats, stacked main grid, topbar link hiding via CSS media queries); created `ProposalActionButtons` shared primitive (compact/full size, confirm-state, inter font, radius 8); wired into `PendingRequests.tsx`; `BookingRequestCard.tsx` normalized to radius 8 / padding 13px; typecheck clean. Note: `src/app/adda/dashboard/AddaDashboardClient.tsx` is dead code — the live adda dashboard is `src/app/adda/dashboard/page.tsx` + its component imports.
**Blocker:** None.
**Next task:** S39 — Landing Page Product Proof & Revenue Honesty (see Backlog → Critical section). Note: S39 tasks are all marked [x] — verify completion or re-open if landing page still needs these changes.

---

## Active Sessions

### Session 48 · HSV Axis 3 — Interest Tag Value Annotation
**Goal:** Annotate every interest tag with its HSV Value cluster (the photonic conditions of the environment it inhabits) and build the three-axis recommendation engine that maps `(creatorType, persona, interestTags)` → best color scheme.

The three onboarding questions encode orthogonal HSV axes:
- **Hue** — creator type (craft environment color, e.g. Music → Indigo 240°, Theatre → Burgundy 330°)
- **Saturation** — persona (Creator → bold/high-contrast, Business → refined, Personal → soft)
- **Value** — interest tags (dark-cluster tags → low Value 5–25%; natural-cluster → high Value 70–95%)

- [x] **S48-T1** — Add `valueCluster: 'dark' | 'warm' | 'natural' | 'vivid'` to `InterestTag` type in `src/lib/constants/interests.ts`; annotate all 65 tags. Mapping:
  - **dark** (night/low-light environments): DJ Nights, Live Theatre, Sufi & Ghazal Nights, Storytelling Nights, Spoken Word, Film Screenings, Gaming Sessions, Cocktail & Wine Tasting, Tarot & Astrology, Sound Healing, Meditation Sessions, Open Mics, Improv Comedy, Classical Concerts, Music Jams
  - **warm** (stage-lit or interior-warm): Acoustic Sets, Stand-Up Comedy, Poetry Slams, Cooking Classes, Mixology, Board Games, Fitness Bootcamp, Dance Workshops, Street Food Tours, Pop-Up Dining, Food Tasting Events, Cultural Festivals, Sports & Cricket, Painting Workshops, Craft Sessions
  - **natural** (outdoor daylight or bright airy studios): Nature Walks, Trekking, Camping, Birdwatching, Rock Climbing, Water Sports, Cycling Tours, Running Clubs, Photography Walks, History Walks, Yoga Classes, Mindfulness & Wellness, Journaling Circles, Book Clubs, Coffee Culture, Pottery, Life Drawing, Language Exchange, Sustainable Living
  - **vivid** (high-energy indoor or screen-lit): Street Art, Tech Talks, Startup Meetups, Hackathons, AI & ML Workshops, Coding Workshops, Debate Clubs, Design Sprints, Web3 & Crypto, Product & UX Meetups, Finance & Investing, Creative Writing, Printmaking, Digital Art, Textile & Fiber Arts, Calligraphy, Sculpture, Public Speaking
- [x] **S48-T2** — Create `src/lib/theme/hsv.ts`. Add `getValueAxis(tagIds: string[]): { cluster: 'dark' | 'warm' | 'natural' | 'vivid' | 'mixed'; confidence: number }` — counts cluster membership across selected tags; returns dominant cluster + confidence ratio (e.g. 6/8 dark tags → `{ cluster: 'dark', confidence: 0.75 }`); returns `'mixed'` when no cluster exceeds 0.45
- [x] **S48-T3** — In the same file, add `CREATOR_TYPE_HUE: Record<string, number>` (Music→240, Comedy/Theatre→330, Art/Design→15, Video/Content→210, Teaching→130, Lifestyle/Wellness→145, Community→30, Business→215, Portfolio→215, Exploring→175) and `PERSONA_SATURATION: Record<string, 'bold' | 'refined' | 'soft'>` (creator→bold, business→refined, personal→soft)
- [x] **S48-T4** — Add `recommendScheme(creatorType: string, persona: string, interestTagIds: string[]): { primary: string; secondary?: string; confidence: 'high' | 'medium' }`. Algorithm: build HSV coordinate from the three axes; compare against `hsvCoordinate` of every scheme (added in S49-T7); return nearest scheme as `primary`; when Hue-dominant and Value-dominant schemes diverge, set confidence `'medium'` and expose the alternative as `secondary`; Value axis signal overrides when cluster confidence ≥ 0.65
- [x] **S48-T5** — Typecheck pass (clean)

---

### Session 49 · Missing Color Schemes — 6 New HSV Sampling Points
**Goal:** Fill the 6 HSV blind spots where creators currently get the nearest-neighbor instead of their actual coordinate: electric (dark+cyan), velvet/burgundy (dark+wine), nightforest (dark+green), parchment (light+warm), gallery (light+white), terracotta (natural+clay).

- [x] **S49-T1** — Add `electric`: `bg '#080C10'`, `primary '#00E5FF'`, `text '#E0FAFF'`, Space Grotesk, aurora style, `label 'Electric'` — the club/EDM/DJ/night-photographer scheme; HSV `{ hue: 185, saturation: 'bold', value: 'dark' }`
- [x] **S49-T2** — Add `velvet` (label `'Velvet'`): `bg '#0C0508'`, `primary '#8B2340'`, `text '#F5E8EC'`, Playfair, heavy-border + noise, `label 'Velvet'` — theatre/comedy/spoken-word/literary; HSV `{ hue: 330, saturation: 'bold', value: 'dark' }`
- [x] **S49-T3** — Add `nightforest`: `bg '#060E08'`, `primary '#7EC8A0'`, `text '#D4F5E2'`, Playfair, dot-pattern, `label 'Nightforest'` — evening wellness/mindfulness/candlelit yoga; HSV `{ hue: 145, saturation: 'soft', value: 'dark' }`
- [x] **S49-T4** — Add `parchment`: `bg '#F7F3E9'`, `primary '#4A3728'`, `text '#2E1F14'`, Inter, solid, light, `label 'Parchment'` — writer/academic/literary educator; HSV `{ hue: 40, saturation: 'soft', value: 'natural' }`
- [x] **S49-T5** — Add `gallery`: `bg '#FAFAFA'`, `primary '#1A1A1A'`, `text '#0A0A0A'`, Inter, solid, light, `label 'Gallery'` — visual artist/designer; gallery white wall with near-black primary; HSV `{ hue: 270, saturation: 'refined', value: 'natural' }`
- [x] **S49-T6** — Add `terracotta`: `bg '#FAF0E6'`, `primary '#C4552A'`, `text '#2C1A0E'`, Inter, solid, light, `label 'Terracotta'` — local business/craft/pottery/handmade-goods; HSV `{ hue: 20, saturation: 'refined', value: 'natural' }`
- [x] **S49-T7** — `SCHEME_HSV_MAP` defined in `src/lib/theme/hsv.ts` carries all 22 coordinates; `FULL_SCHEME_DATA` in screen-3 carries visual swatch data for all 22 schemes
- [x] **S49-T8** — Redistributed `STYLE_CATEGORIES` across 4 balanced tabs (Bold & Raw 6, Dark & Electric 6, Atmospheric 5, Light & Natural 5); updated `SCHEME_TO_CATEGORY` for all 22 entries; added 6 new CSS variable sets to `COLOR_SCHEME_VARS` in `types/theme.ts`
- [x] **S49-T9** — Typecheck pass (clean)

---

### Session 50 · HSV-Driven Theme Picker UX
**Goal:** Wire the three-axis engine to Screen 3's theme picker — it opens at the right coordinate, explains the recommendation, and surfaces divergence without forcing a choice.

- [x] **S50-T1** — In Screen 3 `useEffect`, replace the `CREATOR_TYPE_DEFAULT_SCHEME[data1.creatorType] ?? 'default'` lookup with `recommendScheme(data1.creatorType, persona, interestTagIds)` call; read `persona` from `sessionStorage.getItem('wimc_persona')`; read `interestTagIds` from `wimc_s2.interestTags`; store the full `{ primary, secondary, confidence }` result in component state alongside `colorScheme`
- [x] **S50-T2** — On mount, set `activeCategory` from `SCHEME_TO_CATEGORY[recommendation.primary]` so the picker opens on the correct tab for the user's HSV coordinate (not always 'vivid')
- [x] **S50-T3** — When `confidence === 'high'`: show a small callout between the tab row and the swatch row: `✦ Picked for you · [Scheme name]` + one-liner copy keyed to the dominant Value cluster
- [x] **S50-T4** — When `confidence === 'medium'`: append the `secondary` scheme as a single `ThemeSwatch` at the end of the swatch row with a small `alt →` label above it; tapping it switches `colorScheme` to the secondary
- [x] **S50-T5** — Typecheck pass (clean)

---

### Session 53 · Onboarding HSV — Completion Screen Story + Full Scheme Coverage
**Goal:** The completion screen currently falls back to the default ember scheme for any of the 6 new HSV coordinate schemes (electric, velvet, nightforest, parchment, gallery, terracotta), and shows no explanation of why the user received their theme recommendation. The research specifies: "COMPLETION PAGE: Preview uses the three-axis composite. Not just colorScheme lookup but the full HSV story rendered: bg darkness = their Value, primary hue = their Hue, contrast level = their Saturation."

- [x] **S53-T1** — In `src/app/onboarding/complete/complete-view.tsx`, extend `SCHEME_COLORS` with the 6 missing schemes: `electric` (`#080C10` / `#0f1a22` / `#00E5FF` / `#E0FAFF`), `velvet` (`#0C0508` / `#1c0a12` / `#8B2340` / `#F5E8EC`), `nightforest` (`#060E08` / `#0d1e12` / `#7EC8A0` / `#D4F5E2`), `parchment` (`#F7F3E9` / `#ede7d4` / `#4A3728` / `#2E1F14`), `gallery` (`#FAFAFA` / `#f0f0f0` / `#1A1A1A` / `#0A0A0A`), `terracotta` (`#FAF0E6` / `#edd9c4` / `#C4552A` / `#2C1A0E`); update `isLight` to also flag parchment, gallery, terracotta as light schemes
- [x] **S53-T2** — In `src/app/onboarding/complete/page.tsx`, extend the Supabase select to also fetch `interest_tags` and `persona` (stored in `raw_user_meta_data`); pass both as props to `CompleteView`
- [x] **S53-T3** — In `CompleteView`, import `getValueAxis` and `VALUE_CALLOUT` from `@/lib/theme/hsv`; compute the value cluster from `interest_tags`; render the callout below the profile card: `"✦ [SchemeLabel] — [VALUE_CALLOUT text]"` styled with the scheme's primary color
- [x] **S53-T4** — Fallback: if `interest_tags` is null or empty, suppress the callout rather than showing "Built from your creative mix"
- [x] **S53-T5** — Typecheck pass (clean)

---

### Session 54 · Onboarding HSV — Screen 1 Always-Visible Categories + Persona Accent Precision
**Goal:** The research specifies "full category grid below, grouped under persona section headers, all visible" — meaning the category grid should be navigable before a persona is picked, not hidden behind a maxHeight gate. Additionally, the persona pill accent colors are off: Business is `#4B8FE0` (should be `#5B8DEF`, matching the steel/ocean/neel theme family) and Personal is `#2DBF7A` (should be `#3D7F53`, matching the sage/mint/forest theme family so the pill previews the colour the user will encounter).

- [x] **S54-T1** — In `src/app/onboarding/screen-1/page.tsx`, remove the `maxHeight: persona ? '620px' : '0px'` / `opacity` gate on the category section; render the full `GROUPED_CATEGORIES` grid immediately; all tiles start at 60% opacity; when a persona is selected, the matching section's tiles go to 100% opacity and others drop to 35% opacity to create focus without hiding
- [x] **S54-T2** — When a category tile is clicked before a persona is chosen, auto-set the persona to the section that tile belongs to (derive persona from `GROUPED_CATEGORIES` section id) so the accent colour system activates
- [x] **S54-T3** — Update `PERSONA_LIST` Business accent: `#4B8FE0` → `#5B8DEF`; update matching `bg` and `border` rgba values proportionally
- [x] **S54-T4** — Update `PERSONA_LIST` Personal accent: `#2DBF7A` → `#3D7F53`; update matching `bg` and `border` rgba values; update `GROUPED_CATEGORIES` Personal section accent to match
- [x] **S54-T5** — Typecheck pass (clean)

---

### Session 55 · Onboarding HSV — Warm Cluster Bridge to Bold/Textured
**Goal:** The research states "Warm Cluster dominant → opens on Bold & Textured tab (turmeric/pista/gulaal/steel)". Currently `clusterToValueAxis('warm')` maps to `'dark'`, pushing warm-interest users (food markets, comedy nights, festival-goers) toward Dark & Electric or Atmospheric schemes (neel, indigo) rather than the raw-textured warm schemes (turmeric, gulaal, velvet, terracotta) they aesthetically inhabit. The fix is making 'warm' a distinct value axis target in `SCHEME_HSV_MAP` so warm-cluster signals pull weight toward Bold & Raw schemes.

- [x] **S55-T1** — In `src/lib/theme/hsv.ts`, add `'warm'` as a valid `SchemeCoord.value` (expand the type union); update `VALUE_RANK` to `{ dark: 0, warm: 1, natural: 2 }`; update `clusterToValueAxis` to return `'warm'` for both `'warm'` and `'vivid'` clusters (both live in the mid-luminosity tactile world)
- [x] **S55-T2** — In `SCHEME_HSV_MAP`, update the `value` field for warm-register schemes: `turmeric` → `'warm'`, `gulaal` → `'warm'`, `velvet` → `'warm'`, `terracotta` → `'warm'`; keep `pista`, `steel`, `default`, `sienna` at `'dark'` (they read as night-dark more than warm)
- [x] **S55-T3** — In `recommendScheme`, update `targetValue` resolution: warm cluster → `'warm'`, vivid cluster → `'warm'`, natural → `'natural'`, dark → `'dark'`, mixed → `'dark'`; confirm the value-first score formula still works (vd comparison now uses updated `VALUE_RANK`)
- [x] **S55-T4** — Regression-check three example paths: (a) Comedy creator + creator persona + warm tags → should recommend velvet or turmeric, tab = bold; (b) Music creator + creator persona + dark tags → should recommend indigo or midnight, tab = vivid or atmospheric; (c) Wellness creator + personal persona + natural tags → should recommend sage or mint, tab = natural; add these as `// expected:` inline comments in `hsv.ts`
- [x] **S55-T5** — Typecheck pass (clean)

---

> **Future · 2D Color Picker (aspirational, not sequenced)**
> The research describes "The Picker Becomes Two-Dimensional" — a spatial grid replacing the 4-tab flat list, with vertical = Value (dark at bottom, light at top) and horizontal = Hue family (warm left, cool right). The user's coordinate is marked; the recommended scheme is the nearest sampling point; all other schemes reachable by exploring in any direction. This is a significant UX rework of Screen 3's theme section. Sequence as a standalone session once S53–S55 are shipped and the HSV coordinate data is confirmed working in production.

---

### Session 11 · Explorer Metric Tracking
**Goal:** Increment the counters added in migration 015 so the evaluate-tiers cron has real data.
All counters live on `user_profiles`; updates use the admin client via existing Server Actions.

- [x] **S11-T1** — `rsvp.ts` `confirmRSVPPayment`: increment `rsvps_total_count` after payment captured; free-event path in `initiateRSVP` too
- [x] **S11-T2** — `explorer.ts` `submitEventRating`: increment `reviews_posted_count` on first review
- [x] **S11-T3** — `explorer.ts` `saveEvent` / `unsaveEvent`: increment / decrement `events_saved_count`
- [x] **S11-T4** — `explorer.ts` `followMaker` / `unfollowMaker`: increment / decrement `creators_followed_count`
- [x] **S11-T5** — `rsvp.ts` `checkInAttendee` / `checkInAttendeeById`: increment `events_attended_count`; reconcile cron: increment `no_shows_count` for unchecked captured RSVPs on completed events
- [x] **S11-T6** — Typecheck pass (clean); new `src/lib/metrics.ts` helper with `bumpUserMetric`; migration 016 adds `increment_user_metric` Postgres function

---

### Session 12 · Tier-Based Revenue Splits
**Goal:** Apply `REVENUE_SPLITS` from `lib/constants/interests.ts` at checkout instead of a flat fee.
Splits: wanderer/local → 10% platform, lantern → 8%, beacon → 5%.

- [x] **S12-T1** — `calculateRevenueSplit` already existed in `lib/revenue.ts`; `getPayableEvents` used it at payout time (wrong — should use tier at sale time)
- [x] **S12-T2** — `initiateRSVP` fetches `creator_id + venue_adda_id` from event, then creator's `user_tier`; computes per-ticket split before insert
- [x] **S12-T3** — `platform_fee_paise`, `maker_payout_paise`, `venue_fee_paise`, `split_tier` written to every RSVP row (paid + free)
- [x] **S12-T4** — Migration 017 adds the 4 columns; `getPayableEvents` uses stored sums when all rows have splits, falls back to recalc for pre-017 rows
- [x] **S12-T5** — `database.ts` rsvps Row/Insert/Update updated with all 4 nullable columns
- [x] **S12-T6** — Typecheck pass (clean)

---

### Session 13 · Adda Tier System — DB & Evaluation
**Goal:** Stand up the Adda tier ladder (Open → Verified → Beloved → Legendary) with the Trending overlay.
See design spec in the Reference section below for full criteria.

- [x] **S13-T1** — Migration 018: `adda_tier` (open/verified/beloved/legendary, default open), `trending_until`, `on_time_rate`, `complaint_rate`, `repeat_attendee_rate`, `unique_lantern_beacon_hosts`, `beloved_since` added to `adda_profiles`
- [x] **S13-T2** — `database.ts`: `AddaTier` type; all 7 new columns in Row/Insert/Update; `adda_tier` in Enums
- [x] **S13-T3** — `src/app/actions/adda-tiers.ts`: `evaluateAddaTier` (trust axis — reviews, maker tiers, repeat rate, beloved tenure gate for Legendary); `computeTrendingAddas` (MoM growth, rating, capacity utilisation)
- [x] **S13-T4** — `/api/cron/evaluate-adda-tiers/route.ts`: monthly cron, batched trust-axis + per-city Trending recompute; TIER_ORDER upgrade/downgrade logging
- [x] **S13-T5** — Typecheck pass (clean)

---

### Session 14 · Adda Tier System — UI
**Goal:** Surface Adda tier badges everywhere venues appear.

- [x] **S14-T1** — Adda public page (`/adda/[slug]`): show Verified / Beloved / Legendary badge; 🔥 Trending overlay if `trending_until` is in the future
- [x] **S14-T2** — Venue discovery (`/dashboard/venues`): filter chips for Adda tier; Trending addas pinned as a banner row above search results
- [x] **S14-T3** — Proposal modal: Beloved/Legendary badge next to venue name in the send-proposal drawer
- [x] **S14-T4** — Adda dashboard (`/adda/dashboard`): show current tier + next-tier progress card
- [x] **S14-T5** — Typecheck pass (clean)

---

### Session 15 · Tier Perk Enforcement
**Goal:** Make tier gates do real work — early access for Locals, fee bypass for new Lanterns, gated creator tools for Lantern+.

- [x] **S15-T1** — `rsvp.ts` `initiateRSVP`: if event has `early_access_at` set and explorer's `user_tier` is wanderer, block until `early_access_at` passes; Locals+ bypass
- [x] **S15-T2** — Event creation form: add optional `early_access_at` datetime field (Local+ events only); store on `events` table (migration 019)
- [x] **S15-T3** — "First Year is Free": in `initiateRSVP` fee computation, check if creator's `user_tier === 'lantern'` AND `created_at` within 90 days → override `platform_fee_paise` to 0 (maker gets the difference)
- [x] **S15-T4** — Lantern Studio gate: `BlockEditor` `AddBlockModal` locks `image_gallery` for wanderer/local with lock icon + "Lantern+ required" label
- [x] **S15-T5** — Typecheck pass (clean)

---

### Session 16 · Concentric Circles Audience Dashboard
**Goal:** Give Lantern+ creators a view of their audience segmented by tier — the "1,000 True Fans" model made literal.

- [x] **S16-T1** — `src/app/actions/analytics.ts`: add `getAudienceBreakdown(creatorId)` — count followers by `user_tier` (join `creator_followers` → `user_profiles`)
- [x] **S16-T2** — `/dashboard/analytics`: add "Your Audience" section below existing charts — three concentric ring segments (Wanderers / Locals / Lanterns) with counts and % labels
- [x] **S16-T3** — Annual subscription CTA on `/dashboard/payouts` for Beacon-tier creators: "Switch subscribers to annual — save them 15%, earn 10% more" banner
- [x] **S16-T4** — Typecheck pass (clean)

---

## Backlog (not yet sequenced)

### Design — Boarding Pass UI System

#### S56 · Event Page — Boarding Pass Layout ✅ done this session
**Goal:** Redesign `/events/[slug]` to match the WIMC design language HTML mockups — full-bleed primary-color hero with poster Outfit typography, boarding pass info bar (FROM / TO / CLASS / DATE / TIME), two-column desktop layout (left: content, right: sticky paper ticket card with punch holes + barcode stub), torn-paper review cards. All RSVP sheets and payment logic untouched. Mobile retains the existing bottom CTA sheet flow.

- [x] **S56-T1** — Replace hero with `bg-primary` block + poster `font-display` title (`clamp(36px,7vw,96px)`); grain overlay; cover image as 15%-opacity mix-blend-multiply underlay; creator handle chip
- [x] **S56-T2** — Add boarding pass info bar (FROM / TO / CLASS / DATE / TIME / GOING) with left primary accent stripe + barcode-strip element; `font-mono` throughout
- [x] **S56-T3** — Two-column layout: left flex column (About, Host, Venue, Reviews); right sticky `w-72` paper ticket card (`#FAF7F0` bg, `8px 8px` shadow, dark border, punch-hole perforation divider, barcode stub, ADMIT ONE label)
- [x] **S56-T4** — Reviews rendered as torn-paper cards (clip-path jagged top edge, light paper bg, shadow, JetBrains Mono reviewer name)
- [x] **S56-T5** — `data-noise="true"` on root div for grain overlay; remove unused `RubberStamp` / `IconBox` references; typecheck clean

#### S57 · Public Profile Page — Boarding Pass Layout
**Goal:** Bring `PublicProfilePage.tsx` in line with the Jazz Jaipur HTML mockup: torn-edge paper header card with avatar overlapping bottom edge, event listing blocks rendered as boarding-pass ticket cards (left accent bar, punch holes, barcode stub, ADMIT ONE stub), review blocks as torn-paper cards, and a "WIMC Classic" editorial preset in ThemeEditor that bundles `heavyBorders + noiseBg + default scheme + archivo-black`.

- [x] **S57-T1** — Profile header: `bg-[#FAF7F0]` paper card with border-2 dashed, torn-edge clip-path at the bottom (`polygon` with `calc()` jagged points + `pb-6`), location/type stamp in `font-mono`, avatar overlapping bottom edge via negative margin
- [x] **S57-T2** — Upcoming events section: render each event as a boarding-pass ticket card (left-side primary accent bar, `font-mono` metadata header `TKT-XXXX`, punch-hole perforation divider, barcode stub + ADMIT ONE footer strip)
- [x] **S57-T3** — Reviews section: torn-paper card style (same clip-path as event page) with `format_quote` icon, `#FAF7F0` bg, shadow
- [x] **S57-T4** — Add "WIMC Classic" preset to `EDITORIAL_PRESETS` in `ThemeEditor.tsx`: `{ colorScheme: 'default', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, heavyBorders: true }`
- [x] **S57-T5** — Typecheck pass (clean)

---

### Critical — UX & Trust Fixes (from Linktree benchmarking + founder review)

#### S39 · Landing Page — Product Proof & Revenue Honesty
**Goal:** Close the gap between promise and reality before a creator even signs up.

- [x] **S39-T1** — Add a product screenshot or live-preview of a sample `/{username}` page as a hero visual on the landing page; creators need to see the dashboard or a real profile before committing; even a static mockup beats a blank hero
- [x] **S39-T2** — Fix misleading "Keep 90% of every rupee" headline stat: that is Beacon tier. New creators start at Wanderer/Local and keep 75%. Replace with an honest tiered table or the Wanderer/Local rate with a "up to 90% at Beacon" footnote; trust breaks the moment they read the payout section post-signup
- [x] **S39-T3** — Add social proof below the hero: 2–3 creator quotes with city and genre, or real event attendance numbers if available; the page is visually strong but has no proof of concept
- [x] **S39-T4** — Typecheck pass (clean)

#### S40 · Sign-in Page — Contextual Entry
**Goal:** The sign-in page currently renders with zero context about what the creator signed up for.

- [x] **S40-T1** — When `?next=/onboarding/screen-1` is present (i.e. coming from "Start for free"), show a mini context strip: WIMC logo, tagline, and the specific value prop ("Your stage in [City]" or "Bring your events online") so the creator knows why they're giving their phone number
- [x] **S40-T2** — Typecheck pass (clean)

#### S41 · Onboarding Flow — Linktree-Inspired Revamp
**Goal:** Replace the 4-screen wizard with a flow that matches what creators actually need to feel ready.

- [x] **S41-T1** — Add a **goal selection screen** at the start of onboarding: "What best describes you?" with three options — **Creator** (build your stage, host events), **Business** (promote your venue or brand), **Personal** (share your links); sets `creator_category` and personalises subsequent copy
- [x] **S41-T2** — Add a **platform selection step**: grid of platform icons (Instagram, YouTube, WhatsApp, Spotify, SoundCloud, X, etc.) — creator picks up to 5 they're already on; auto-creates matching `social_link` page blocks so their profile starts populated rather than blank
- [x] **S41-T3** — Redesign the **profile details screen** so the preview on the right renders exactly as it would on their public `/{username}` page (avatar, display name, bio in their chosen style) — what they type is what visitors will see, no imagination required
- [x] **S41-T4** — Fix the **progress bar bug**
- [x] **S41-T5** — Fix **Screen 3 progress label**
- [x] **S41-T6** — Typecheck pass (clean)

#### S42 · Post-Onboarding Dashboard — First-Session Guidance
**Goal:** The creator lands on /dashboard with zero guidance, 0-stats, and 15+ sidebar items. Fix the empty-state experience.

- [x] **S42-T1** — Add a **setup checklist** for all new users (regardless of creator/business/personal goal): modelled after Linktree's "3 of 6 complete" persistent widget; tasks: Add profile photo → Add bio → Share your first social link → Create your first event → Customise your page theme → Share your page URL; persisted as a dismissed flag per task on `user_profiles`
- [x] **S42-T2** — Add a prominent **"Create your first event"** CTA card in the dashboard home (above the 0-stats); and a **"Share your page"** button that copies `/{username}` to clipboard; both should appear only when `events_hosted_count === 0`
- [x] **S42-T3** — **Progressive sidebar disclosure**: for users with `events_hosted_count < 3`, collapse Bookings, Tickets, Leads, Testimonials, Payouts, Tier Progress, My Circles into a "More tools" expandable group; surface only My Page, Events, Community, Analytics at the top level — reduces immediate overwhelm without hiding features permanently
- [x] **S42-T4** — Typecheck pass (clean)

#### S43 · Tier Simplification — All Blocks Accessible to Wanderers
**Goal:** All page blocks are fully accessible to every creator regardless of tier. The block system is a page-building tool, not a monetisation lever — gates belong on revenue features, not self-expression.

- [x] **S43-T1** — Remove tier gates from all block types in `src/lib/constants/blocks.ts`; every block should have no `minTier` requirement (or equivalent floor of `wanderer`)
- [x] **S43-T2** — Remove any tier checks in `BlockEditor` `AddBlockModal` and the `saveBlock` / `updateBlock` server actions that guard block creation/editing by tier
- [x] **S43-T3** — Remove lock icons, "Lantern+ required" labels, and any greyed/disabled states from block cards in the editor UI
- [x] **S43-T4** — Typecheck pass (clean)

#### S44 · Digital Products Section (Tier-Gated, Not Block-Gated)
**Goal:** Move monetisation gates from page blocks to a dedicated "Digital Products" section, matching Linktree's Earn model.

- [x] **S44-T1** — Add a **Digital Products** section to the creator dashboard sidebar (under Earn); surfaces three monetisation paths gated by tier: **Digital Downloads** (Lantern+) — sell a music pack, PDF zine, or template; **Bookings** (Lantern+) — let fans book a session or call; **Online Courses** (Beacon) — multi-module content product
- [x] **S44-T2** — The `digital_product` block (already in backlog Wave 4) and `booking_request` block (done S30) should be surfaced as the Earn paths rather than buried in the block editor; creators find monetisation through the "Earn" section not through "Add a block"
- [x] **S44-T3** — "Selling is not enabled" state: show a clear explanation of which tier unlocks which product type (table or cards), not a blank wall; include a progress indicator towards the next unlock
- [x] **S44-T4** — Typecheck pass (clean)

#### S45 · Theme Revamp — More Templates & Design Combinations
**Goal:** Give creators the design variety that Linktree's 18+ theme grid offers.

- [x] **S45-T1** — Expand the theme selector to at least 12 named themes (currently minimal); each theme should bundle a background color/gradient, a button style, and a font pairing so selecting one theme changes the entire page look in a single click
- [x] **S45-T2** — Add a **Curated vs Customisable** tab to the theme picker: Curated = opinionated pre-made combinations; Customisable = user tweaks background, button shape, font, and accent color independently
- [x] **S45-T3** — Live preview panel in the theme editor should update instantly as each attribute changes (background, font, button radius) — no "Save first" lag; implemented via optimistic client-side state in the theme editor component
- [x] **S45-T4** — Typecheck pass (clean)

---

#### S46 · Booking Inquiries Dashboard
**Goal:** Surface `booking_inquiries` (from the booking_request block) in the creator dashboard so creators can actually see and respond to requests — the Earn page pointed to Bookings but only RSVPs were shown.

- [x] **S46-T1** — Update `BookingsPage` server component to fetch `booking_inquiries` for the creator in parallel with RSVPs
- [x] **S46-T2** — Add Ticket Sales / Booking Inquiries tab switcher to `BookingsClient`; Inquiries tab shows status badge (new/read/replied/declined), event type, message, reply-by-email CTA; new-inquiry count badge on the tab
- [x] **S46-T3** — Update Earn section "View inquiries" link to deep-link to `?tab=inquiries`; `BookingsClient` reads the `tab` search param to set default tab
- [x] **S46-T4** — Typecheck pass (clean)

---

#### S47 · Inquiry Status Updates + Neighbourhood Field
**Goal:** Make booking inquiries actionable and surface the neighbourhood column added in migration 026.

- [x] **S47-T1** — `updateInquiryStatus(inquiryId, status)` server action in `booking.ts`; verifies creator ownership before updating; revalidates `/dashboard/bookings`
- [x] **S47-T2** — `InquiryCard` component with optimistic status toggle; "Mark read / replied / declined" buttons shown per current status; reply-by-email link auto-marks new→read on click
- [x] **S47-T3** — `neighbourhood` field added to `UpdateProfileInput`, profile update DB call, profile-client state, fetch select, and save payload; input shown below city picker once city is confirmed; placeholder guides "Koramangala, Bandra, Karol Bagh"
- [x] **S47-T4** — Typecheck pass (clean)

---

### Critical — Beacon trust signals (highest ROI, spec-cited Airbnb data)
- ~~**Beacon & Lantern public badge**~~ — done in S28
- ~~**Beacon Recovery grace period**~~ — done in S28
- ~~**Long-tenure recognition**~~ — done in S24

### High — Lantern monetisation tools (spec-cited 17–67% revenue lift)
- ~~**Fan tier ticket types**~~ — done in S22 (migration 022; UI in create form, event page, RSVP flow)
- ~~**Lantern badge on event pages**~~ — done in S32 (Local case added to existing `creatorTierBadge`; all tiers render below creator name)
- ~~**City-scoped Hub discovery**~~ — done in S37 ("Other cities" grouped by city with per-city collapsible sub-sections, sorted by count desc; "In your city" primary section was already implemented)
- ~~**Auto-generated event poster**~~ — done in S38 (Lantern+ "Event Poster" section in event dashboard; auto-generates from title during event creation; `fill` + `canvasRefOut` props on `EventCanvasRenderer`)
- ~~**Micro-local leaderboards**~~ — done in S33 (migration 026 adds `neighbourhood` to user_profiles; ranked cards below city leaderboard)

### High — Local identity & social features
- ~~**Tier badge on public profile**~~ — done in S31 (Local green badge added; Lantern/Beacon were already present)
- ~~**Concentric-circles supporter view**~~ — done in S34 (`/dashboard/community`, SVG rings + ranked list, Local+ gated)
- ~~**Friend-scoped leaderboard**~~ — done in S35 ("Among Your Connections" card, localStorage hide toggle, city-filtered follows)
- ~~**City mastery map**~~ — done in S36 (`CityMasteryMap` badge grid on `/@username`; `show_city_mastery` opt-in toggle in dashboard profile settings; migration 027)
- ~~**Bring-a-Wanderer referral**~~ — done in S26

### ~~Medium — Wanderer activation (Duolingo first-value hook)~~
~~Done in S53–S54~~ — challenge card ships in `BrowseClient.tsx` (countdown, dismiss → `setup_checklist_dismissed`); weekly digest wired to send real WhatsApp messages via batch phone lookup from `user_profiles`.

- ~~**Onboarding challenge card**~~ — done in S53; `ChallengeCard` sub-component in `BrowseClient.tsx`; 14-day countdown; dismiss flag `'challenge_card'` on `user_profiles.setup_checklist_dismissed`; gated to new users with 0 events attended
- ~~**Weekly digest integration**~~ — done in S54; `weekly-digest` cron now batch-fetches phones from `user_profiles`, guards `whatsapp: false` + missing phone, calls `sendWhatsAppMessage(phone, message)` with "Your week in [City]" header

### Block System — Wave 2: India-first engagement blocks
~~Done in S30~~ — all three block types ship with migration 025 (`booking_inquiries`), config forms in BlockEditor, preview renderers in BlockRenderer, and full public renderers in PublicProfilePage.

- ~~**`whatsapp_community`**~~ (wanderer) — green CTA card; config: `{ label, invite_url, member_count_label? }`
- ~~**`music_player`**~~ (local) — SoundCloud / Bandcamp iframe embed; config: `{ platform, embed_url, track_title?, artist? }`
- ~~**`booking_request`**~~ (local) — inquiry form → `booking_inquiries` table; config: `{ label, description?, categories[] }`

### ~~Block System — Wave 3: Social proof & embeds~~
~~Done in S51~~ — all three blocks ship across `database.ts`, `blocks.ts`, `BlockEditor.tsx`, `BlockRenderer.tsx`, and `PublicProfilePage.tsx` (standalone components); typecheck clean.

- ~~**`press_feature`**~~ — "As seen in" media logo row; greyscale opacity treatment; logo_url or text fallback
- ~~**`twitter_embed`**~~ — X/Twitter post card with handle + caption preview; links to original post; no API key needed
- ~~**`awards_badges`**~~ — pill-grid certifications and awards; icon_url + year optional per badge

### ~~Block System — Wave 4: Direct monetisation blocks~~
~~Done in S52~~ — all three blocks ship with migration 030 (`digital_purchases` + `waitlist_entries`), server actions in `digital.ts`, 3 standalone components, editor forms, preview renderers, and `PublicProfilePage` wiring; typecheck clean.

- ~~**`digital_product`**~~ — Razorpay checkout flow; pending `digital_purchases` row → signature verify → redirect to file_url; order-first pattern matching RSVP flow
- ~~**`waitlist`**~~ — Email + optional name form; upsert-safe `waitlist_entries` insert; live join count; duplicate emails handled via unique constraint
- ~~**`fan_membership`**~~ — Read-only tier comparison card; up to 4 tiers; featured-tier highlight; no payment wired

### Good-to-have / deferred
- **Map of Legends — pin map view** — add an interactive Leaflet map above the city sections showing each Legendary Adda as a pin (lat/lng already in adda_profiles); no API key needed
- **Beacon Fund grant flow** — Beacon applies for a ₹40k–₹160k grant for an ambitious event; admin reviews + approves; grant disbursed via payout system; good-to-have until Beacon tier has real users
- **Beacon Mentorship matching** — Hub enhancement: Beacons can mark themselves as "open to mentoring"; Lanterns can request a mentor match; admin-curated or algorithmic pairing; good-to-have
- **Annual subscription product** — Beacons can offer annual subscriptions to fans (2× retention vs monthly per Patreon data); requires Razorpay subscription integration
- **Adda Community Hub** — member list, alumni feed, Adda Day anniversary — deferred

### Completed
- ~~**Block System Wave 1**~~ — all 29 block types render on public profiles; BlockEditor has config forms + server-action persistence for every type; typecheck clean
- ~~**Streak + Streak Freeze**~~ — done in S18
- ~~**Gamification UI**~~ — done in S19
- ~~**Hall-of-Lights**~~ — done in S20
- ~~**Map of Legends**~~ — done in S21
- ~~**WhatsApp tier-change notifications**~~ — done in S17
- ~~**Creator Hub**~~ — done in S22
- ~~**Long-tenure recognition**~~ — done in S24
- ~~**City-scoped Hub discovery**~~ — done in S25
- ~~**Bring-a-Wanderer referral**~~ — done in S26
- ~~**Auto-generated event poster**~~ — done in S27

---

## Reference — Design Specs

### Adda Tier Criteria
| Tier | Events (window) | Reviews | Avg ★ | Other gates | Signal |
|------|----------------|---------|-------|-------------|--------|
| Open | 0 | — | — | Listed | Inventory |
| Verified | ≥3 (lifetime) | ≥10 | ≥4.0 | Claimed + complete profile | Trust |
| Trending | ≥10 (30 d) | — | ≥4.5 | ≥30% MoM growth, ≥70% capacity utilization | Velocity overlay |
| Beloved | ≥30 (180 d) | ≥100 | ≥4.6 | ≥3 Lanterns/Beacons hosted; <2% complaints; ≥90% on-time | Stable quality |
| Legendary | ≥150 (365 d × 2 yrs) | ≥500 | ≥4.7 | ≥10 Beacons; ≥40% repeat-attendee rate | Tenured institution |

### User Tier Gates
| Tier | Gates | Rolling window |
|------|-------|----------------|
| Wanderer | Default | — |
| Local | ≥6 events attended, ≥1 review per 3 events, <15% no-show rate | 90 d |
| Lantern | ≥3 events hosted, ≥4.5★, <5% cancellation, ≥80% on-time | 180 d |
| Beacon | ≥36 events hosted OR ≥1,200 paid tickets, ≥4.7★, ≥30% repeat-attendance, ≥50 subscribers, <1% cancellation | 365 d |

### Revenue Splits by Tier
| Creator tier | Platform | Maker | Venue | Payout days |
|-------------|----------|-------|-------|-------------|
| Wanderer / Local | 10% | 75% | 15% | 7 |
| Lantern | 8% | 80% | 12% | 3 |
| Beacon | 5% | 85% | 10% | 1 |

---

## Completed Sessions

- **S1** — Analytics Dashboard UI (charts, date range filter, per-block table, event stats)
- **S2** — Adda Onboarding UI (4-step wizard → `/adda/onboarding`)
- **S3** — Adda Dashboard UI (listing card, booking requests, calendar, revenue table)
- **S4** — Adda Discovery UI (venue cards, detail drawer, proposal modal, My Proposals table)
- **S5** — Notifications (WhatsApp Business, booking confirmation, 24h reminder, Resend email)
- **S6** — Testimonials & Post-Event Reviews (rating flow, review cards on event page, dashboard view, testimonial block)
- **S7** — Payout Dashboard (`payout_requests` table, request form, history)
- **S8** — Advanced Event Management (edit form, extend capacity, duplicate, cancel)
- **S9** — Explorer Discovery & Social Feed (`/explore` with Discover / Saved / Following tabs, FollowButton)
- **S10** — Recommendations (interest + location algorithm, nearby event notification)
- **Phase 1 Tiers** — Wanderer/Local/Lantern/Beacon rename across all DB, types, actions, UI (migration 015, `tier.ts` rewrite, `TierClient.tsx` rewrite, evaluate-tiers cron update)
- **S11–S14** — Explorer metric tracking, tier-based revenue splits, Adda tier DB + evaluation cron, Adda tier UI (badges, venue discovery, proposal drawer, dashboard progress card)
- **S15** — Tier perk enforcement: early-access gate on RSVP, `early_access_at` field in event creation, First-90-days-free for new Lanterns, Lantern Studio block gate
- **S16** — Concentric circles audience dashboard: `getAudienceBreakdown` action, SVG ring chart + tier legend in analytics, Beacon annual subscription CTA on payouts page
- **S17** — WhatsApp tier-change notifications: user tier upgrades/downgrades and adda tier changes now fire `sendWhatsAppMessage` in both evaluate-tiers and evaluate-adda-tiers crons
- **S18** — Streak + Streak Freeze: migration 020 adds `attendance_streak`, `streak_freeze_tokens`, `last_streak_week`; `src/lib/streak.ts` helper; check-in fires streak update; 3 freeze tokens granted on Local tier upgrade; flame widget on `/explore`
- **S19** — Gamification UI: `/explore/city` tab with City Pulse flame map (event density per city via creator join) + city-scoped streak leaderboard (top 25 explorers, current user highlighted, no global ranking)
- **S20** — Hall-of-Lights: public `/hall-of-lights` page; `getShowcasedCreators()` fetches Lantern + Beacon tiers; tier filter chips (amber/purple); cohort section for Lantern+ viewers; city filter; landing nav link
- **S21** — Map of Legends: public `/map-of-legends` page; `getLegendaryAddas()` action; city-grouped sections with cover images, signal stats (rating/repeat/on-time), beloved-since label, trending badge; city filter chips; landing nav link
- **S22** — Creator Hub: migration 021 (`creator_connections` + `creator_messages`); `hub.ts` server actions (directory, send/respond to connections, send/get messages, unread count); `/hub` page with Discover/Connections/Messages tabs; Lantern/Beacon gate with locked state for lower tiers; sidebar Hub link with unread badge; lazy message mark-as-read on thread open
- **S23–S28** — Fan ticket tiers (022), long-tenure recognition (023), referral codes (024), city-scoped Hub, Bring-a-Wanderer, auto-generated event poster, Beacon/Lantern public badge + recovery grace period
- **S29** — Block System Wave 1: all 29 block types render on `/{username}`; BlockEditor config forms + server-action persistence for every type; typecheck clean
- **S30** — Block System Wave 2: `whatsapp_community` (wanderer), `music_player` (local), `booking_request` (local); migration 025 `booking_inquiries` table; `submitBookingInquiry` server action; BlockEditor forms; BlockRenderer previews; PublicProfilePage renderers; typecheck clean
