# WIMC Build Plan

> **How to use:** Tell Claude *"Continue the build plan"* at the start of each session.
> `[x]` done · `[~]` in-progress · `[ ]` not started

---

## Current Status → Resume Here

**Last completed:** S28 — Beacon & Lantern public badges + Beacon Recovery grace period (dimmed badge on `/events/[slug]` and `/@username` when `tier_recovery_until` is active; recovery evaluation + dashboard banner were already wired; typecheck clean)
**Blocker:** Run `supabase db push` to apply migrations 015–024.
**Next task:** Micro-local leaderboards — see Backlog

---

## Active Sessions

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

### Critical — Beacon trust signals (highest ROI, spec-cited Airbnb data)
- ~~**Beacon & Lantern public badge**~~ — done in S28
- ~~**Beacon Recovery grace period**~~ — done in S28
- **Long-tenure recognition** — track `lantern_since` / `beacon_since` dates; at 3-year Beacon mark show "Lantern Mentor" distinction; at 5-year mark add permanent Hall-of-Lights listing that never expires regardless of tier

### High — Lantern monetisation tools (spec-cited 17–67% revenue lift)
- **Fan tier ticket types** — extend event creation to support Patreon-style tiers (Free / ₹99 / ₹299 / ₹499+); each tier gets a name, description, and benefit list; gated at Lantern+; stored as `ticket_tiers` JSONB on events
- **Lantern badge on event pages** — trust signal for attendees on the public event booking page; show "Lantern Creator" or "Beacon Creator" badge below creator name
- **City-scoped Hub discovery** — add city filter to Hub Discover tab; default to viewer's city; "Other cities" section below; addresses cohort visibility spec requirement
- **Auto-generated event poster** — Lantern+ tool in event dashboard: generate a shareable 1080×1080 image (canvas-based, no external API) with event title, date, cover image, creator badge; download as PNG
- **Micro-local leaderboards** — "Top Lanterns in [Neighbourhood]" section on `/explore/city`; group by `neighbourhood` field on user_profiles; top 5 per neighbourhood, city-scoped

### High — Local identity & social features
- **Tier badge on public profile** — show Local/Lantern/Beacon badge on `/@username` public page; Wanderer shows nothing (per anti-dark-pattern spec)
- **Concentric-circles supporter view** — `/dashboard/explore` or new `/dashboard/community` page for Local+; shows top 5 creators attended (by RSVP count), with event count and "support level"; mirrors Bandcamp collection
- **Friend-scoped leaderboard** — on `/explore/city`, below global leaderboard, add "Among your connections" section showing only followed creators' streaks; mutable ("hide this") per spec
- **City mastery map** — on `/@username` public profile, show a grid/list of neighbourhoods explored (derived from venue_address of attended events); Swarm sticker-book analog; only visible to the profile owner + opted-in sharing
- **Bring-a-Wanderer referral** — Local+ can generate a one-time free-ticket code for a Wanderer (once per quarter); tracked in `referral_codes` table; redeemed at RSVP

### Medium — Wanderer activation (Duolingo first-value hook)
- **Onboarding challenge card** — after completing onboarding, show a "Your first event in 2 weeks" challenge card on `/explore`; persisted as a dismissed flag on explorer_profiles; shows countdown, event suggestions from their taste tags
- **Weekly digest integration** — cron job at `/api/cron/weekly-digest` already exists; wire it to explorer taste tags + city; add opt-in toggle in `/dashboard/settings` or explorer settings; surface "Your week in [City]" digest

### Good-to-have / deferred
- **Map of Legends — pin map view** — add an interactive Leaflet map above the city sections showing each Legendary Adda as a pin (lat/lng already in adda_profiles); no API key needed
- **Beacon Fund grant flow** — Beacon applies for a ₹40k–₹160k grant for an ambitious event; admin reviews + approves; grant disbursed via payout system; good-to-have until Beacon tier has real users
- **Beacon Mentorship matching** — Hub enhancement: Beacons can mark themselves as "open to mentoring"; Lanterns can request a mentor match; admin-curated or algorithmic pairing; good-to-have
- **Annual subscription product** — Beacons can offer annual subscriptions to fans (2× retention vs monthly per Patreon data); requires Razorpay subscription integration
- **Adda Community Hub** — member list, alumni feed, Adda Day anniversary — deferred

### Completed
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
