# WIMC Build Plan

> **How to use this file:**
> - At the start of every session, tell Claude: *"Continue the build plan"*
> - Claude reads this file, picks up from the last incomplete task, and works through it
> - Tasks are marked `[x]` when done, `[~]` when in-progress, `[ ]` when not started
> - Each session target is ~2 hours of focused work (5 hours available, aiming for 2–3h effective)

---

## Current Status → Resume Here

**Last completed:** Session 9 — Discovery & Social Feed (all tasks complete)  
**Next task:** S10 — Recommendations

---

## Phase 1 — MVP Completion

### Session 1 · Analytics Dashboard (UI + Charts)
**Goal:** Replace the "coming soon" analytics page with a real dashboard.
Data layer is complete (`analytics.ts` actions, `link_clicks` table, per-block counts). Just needs UI.

- [x] **S1-T1** — Read `src/app/dashboard/analytics/` and `src/app/actions/analytics.ts` to understand data shape
- [x] **S1-T2** — Build summary cards: total link clicks, top block, clicks this week vs last week
- [x] **S1-T3** — Add clicks-over-time line chart (CSS bars — no new deps)
- [x] **S1-T4** — Add per-block breakdown table: block type, label, click count, % of total
- [x] **S1-T5** — Wire up date-range filter (last 7d / 30d / all time)
- [x] **S1-T6** — Add event-specific stats section: RSVPs per event, revenue per event
- [x] **S1-T7** — Typecheck + lint pass

**Handoff note:** If session ends mid-task, update `[~]` on the in-progress task and note blockers below.

---

### Session 2 · Adda Marketplace UI — Onboarding
**Goal:** Build the venue owner onboarding flow. Backend (`adda-onboarding.ts`, 458 lines) is complete.

- [x] **S2-T1** — Read `src/app/actions/adda-onboarding.ts` to map all steps and data shapes
- [x] **S2-T2** — Create `/adda/onboarding/` route with step-based layout (mirrors creator onboarding)
- [x] **S2-T3** — Step 1: Venue name, description, city, neighbourhood, address
- [x] **S2-T4** — Step 2: Venue type (9-option grid) + capacity min/max
- [x] **S2-T5** — Step 3: Amenities (10 chips) + pricing model + conditional pricing config
- [x] **S2-T6** — Step 4: Contact details (WhatsApp, email, Instagram) + calls `completeAddaOnboarding`
- [x] **S2-T7** — Complete page with slug badge; redirects to `/adda/dashboard`
- [x] **S2-T8** — Typecheck pass (clean)

---

### Session 3 · Adda Marketplace UI — Dashboard
**Goal:** Build the venue owner dashboard. Backend (`adda-dashboard.ts`, 555 lines) is complete.

- [x] **S3-T1** — Read `src/app/actions/adda-dashboard.ts` to map all actions
- [x] **S3-T2** — Replaced stub at `/adda/dashboard` with full server page + client component
- [x] **S3-T3** — Listing details card: name, city, types, capacity, amenities, pricing model, contacts
- [x] **S3-T4** — Booking requests: pending/counter-offered proposals with Accept/Decline buttons
- [x] **S3-T5** — Calendar: current-month grid with color-coded availability dots
- [x] **S3-T6** — Revenue summary table: ticket revenue + adda share per completed event
- [x] **S3-T7** — Typecheck pass (clean)

---

### Session 4 · Adda Marketplace UI — Discovery (Explorer side)
**Goal:** Let creators browse and book venues from their dashboard.

- [x] **S4-T1** — Read `src/app/actions/adda.ts` — mapped searchAddas, sendProposal, getProposalHistory, getAddaPublicPage
- [x] **S4-T2** — Replaced "Q3 2025" stub with real server component + VenuesClient
- [x] **S4-T3** — Venue cards: cover, name, neighbourhood/city, types, capacity, pricing model
- [x] **S4-T4** — Right-side detail drawer: full venue info, amenities, stats, contact
- [x] **S4-T5** — Proposal form modal: event title, date, slot, headcount, message → sendProposal
- [x] **S4-T6** — My Proposals table in venues page: venue, event, date, slot, status, sent-at
- [x] **S4-T7** — Typecheck pass (clean)

---

### Session 5 · Notifications — WhatsApp + Email
**Goal:** Wire up real notifications. Infrastructure exists; templates and API calls are TODOs.

- [x] **S5-T1** — Audit `src/lib/notifications.ts` and all `// TODO` notification placeholders
- [x] **S5-T2** — Set up WhatsApp Business API credentials in `.env.local`
- [x] **S5-T3** — Implement `sendWhatsAppMessage()` utility; wire into `notifyAddaOfProposal`
- [x] **S5-T4** — Follower notification on publish: in-app rows + WhatsApp log (phone not stored on explorers)
- [x] **S5-T5** — Booking confirmation WhatsApp sent from Razorpay webhook after RSVP capture
- [x] **S5-T6** — 24h reminder WhatsApp sent from reconcile-payments cron (23–25h window)
- [x] **S5-T7** — `src/lib/email.ts` with Resend delivery + `bookingConfirmationHtml` + `eventReminderHtml`
- [x] **S5-T8** — Typecheck pass (clean)

---

### Session 6 · Testimonials / Post-Event Reviews
**Goal:** Allow attendees to rate and review events after attending.

- [x] **S6-T1** — No migration needed: reviews live in `explorer_event_history` (rating, review, rated_at)
- [x] **S6-T2** — `submitEventRating()` already existed in `explorer.ts` — no change needed
- [x] **S6-T3** — `triggerPostEventRating` now sends WhatsApp review prompt with event link after 24h
- [x] **S6-T4** — `/events/[slug]` page fetches reviews; `event-page.tsx` shows stars + review cards
- [x] **S6-T5** — `/dashboard/testimonials` replaced stub with real server component (stats + top picks + table)
- [x] **S6-T6** — `testimonial` block renders top 4★+ reviews on link-in-bio; fetched server-side in `[username]/page.tsx`
- [x] **S6-T7** — Typecheck pass (clean)

---

## Phase 2 — Creator Tools

### Session 7 · Payout Dashboard
- [x] **S7-T1** — Migration 011: `payout_requests` table with RLS (manual review flow)
- [x] **S7-T2** — `database.ts`: `PayoutStatus` type + `payout_requests` table types + `PayoutRequest` alias
- [x] **S7-T3** — `src/app/actions/payouts.ts`: `getPayableEvents`, `requestPayout`, `getPayoutHistory`
- [x] **S7-T4** — `PayoutRequestForm` client component + `/dashboard/payouts` server page
- [x] **S7-T5** — Added Payouts link to Sidebar (Growth nav)
- [x] **S7-T6** — Typecheck pass (clean)

### Session 8 · Advanced Event Management
- [x] **S8-T1** — `extendCapacity` + `duplicateEvent` added to `events.ts`; `updateEvent` now accepts `cover_image_url`
- [x] **S8-T2** — `/dashboard/events/[id]/page.tsx` server loader (fetches event + RSVP count)
- [x] **S8-T3** — `EventManageClient.tsx`: edit form (published: title/desc/cover/time; draft: all fields), extend capacity, duplicate, cancel with confirm + refund info
- [x] **S8-T4** — Typecheck pass (clean)

---

## Phase 3 — Explorer Experience

### Session 9 · Discovery & Social Feed
- [x] **S9-T1** — `unsaveEvent`, `browseEvents`, `getSavedEvents`, `getFollowedFeed` added to `explorer.ts`
- [x] **S9-T2** — `/explore` layout with sticky tab nav (Discover / Saved / Following)
- [x] **S9-T3** — `/explore` browse page: city, category, date filters via URL search params; save/unsave inline
- [x] **S9-T4** — `/explore/saved` page: saved events split into upcoming/past, unsave inline
- [x] **S9-T5** — `/explore/feed` page: events from followed creators, urgency badge (Today/Tomorrow/In Nd)
- [x] **S9-T6** — `FollowButton` client component wired into `/{username}` creator profile page
- [x] **S9-T7** — Typecheck pass (clean)

### Session 10 · Recommendations
- [x] Refine recommendation algorithm (interests + location + past attendance + diversity cap)
- [x] Notification: "New event near you matching your interests" (`notifyNearbyExplorers`)

---

## Blockers / Notes

_(add anything that's blocking a task here)_

---

## Completed Sessions

_(move finished sessions here as they complete)_
