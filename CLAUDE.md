# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**When In My City (WIMC)** is a Next.js 15 SaaS platform for creator-led offline experiences in India's Tier-2 cities. Creators (musicians, comedians, artists, etc.) can host ticketed events and build customizable link-in-bio pages.

## Commands

```bash
npm run dev        # Dev server with Turbopack
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking (tsc --noEmit)
```

No test framework is configured. Type-check and lint before submitting changes.

## Architecture

### Stack
- **Next.js 15** (App Router) + **TypeScript 5** strict mode
- **Supabase** (PostgreSQL + Auth) with Row-Level Security
- **Razorpay** for payments (UPI Intent, cards)
- **Tailwind CSS** with Material Design 3 color palette
- **Zod** for runtime validation
- **Server Actions** for all mutations — no separate REST API layer

### Directory Structure

```
src/
├── app/
│   ├── actions/          # All Server Actions (auth, events, rsvp, blocks, profile, onboarding)
│   ├── api/
│   │   ├── webhooks/razorpay/   # Payment webhook handler
│   │   └── cron/reconcile-payments/
│   ├── auth/callback/    # OAuth redirect handler
│   ├── signin/           # Phone OTP + Google OAuth
│   ├── onboarding/       # 4-step creator profile wizard
│   ├── dashboard/        # Creator studio (edit events, blocks, theme)
│   └── [username]/       # Public creator profile pages (dynamic route)
├── components/
│   ├── dashboard/        # BlockEditor, ThemeEditor, PreviewPanel
│   └── profile/          # BlockRenderer, PublicProfilePage
├── lib/
│   ├── supabase/         # DB clients: server.ts, browser.ts, admin.ts
│   ├── razorpay/         # Payment API wrapper
│   ├── auth/             # requireAuth(), requireProfile() guards
│   └── constants/        # Reference data (creator types, interest tags, cities)
├── types/
│   ├── database.ts       # Auto-generated Supabase types (do not edit manually)
│   ├── events.ts         # Event schemas + Razorpay types
│   ├── onboarding.ts     # Onboarding Zod schemas
│   └── theme.ts          # Theme types
└── middleware.ts          # Session validation on every request
supabase/
├── config.toml
└── migrations/           # SQL migration files (numbered sequentially)
```

### Path Alias
`@/*` maps to `./src/*` — use this for all imports.

## Key Patterns

### Authentication
- Phone OTP via Supabase Auth (SMS) or Google OAuth
- `middleware.ts` validates sessions on every request and redirects unauthenticated users
- Use `requireAuth()` in Server Actions to get the current user; use `requireProfile()` when a completed profile is required
- RLS policies enforce data isolation at the database level

### Server Actions
All mutations go through Server Actions in `src/app/actions/`. They follow this pattern:
1. Call `requireAuth()` / `requireProfile()` to validate session
2. Validate inputs with Zod schemas
3. Use `createServerClient()` (not admin client) for user-scoped queries
4. Return `{ success: true, data }` or `{ success: false, error: string }`

### Supabase Clients
- `createServerClient()` — for Server Actions and Route Handlers (respects RLS)
- `createBrowserClient()` — for Client Components
- `createAdminClient()` — only for webhook handler and cron jobs (bypasses RLS); use sparingly

### Payment Flow (Razorpay)
1. Attendee submits RSVP → `initiateRSVP()` creates RSVP row + Razorpay order
2. Client opens Razorpay checkout widget with `order_id`
3. On success, client calls `confirmRSVPPayment()` with payment details
4. Razorpay sends `payment.captured` webhook → `/api/webhooks/razorpay` verifies signature, checks `webhook_events` table for idempotency, updates RSVP status
5. Cron job `/api/cron/reconcile-payments` handles orphaned pending RSVPs

**Important**: Ticket prices are stored in **paise** (₹1 = 100 paise). GST: events under ₹500 are GST-exempt; ≥₹500 applies 18% GST (SAC 998596).

### Page Blocks (Link-in-Bio)
Creators build their public `/{username}` page from typed blocks stored in `page_blocks` table. Each block has a `block_type` enum and a `config` JSONB column. Block types: `social_link`, `youtube_embed`, `instagram_embed`, `text_bio`, `image_gallery`, `event_listing`, `custom_link`.

## Database

Schema lives in `supabase/migrations/`. Key tables:
- `user_profiles` — creator accounts, linked to `auth.users`
- `page_blocks` — link-in-bio components with `position` ordering
- `events` — ticketed events (`status`: draft → published → cancelled/completed)
- `rsvps` — ticket bookings with `payment_status` tracking and `qr_code_token` for check-in
- `webhook_events` — idempotency ledger for Razorpay webhook events
- `venue_directory` — reference data for event locations

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # Server-only; admin client only
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET                # Server-only
RAZORPAY_WEBHOOK_SECRET            # Server-only
```

## Known Tech Debt

### DPDP consent — localStorage → server-persisted flag
**Location:** `src/app/explore/guide/GuideClient.tsx`, `CivicReportFlow.tsx`, `TrafficViolationFlow.tsx`

Three `localStorage` keys (`wimc_city_guide_consent_v1`, `wimc_civic_report_consent_v1`, `wimc_traffic_report_consent_v1`) store DPDP Act consent for the civic data processing notice. This works for single-device UX but has two gaps:
- Consent is lost when the user clears browser storage or switches devices.
- Provable compliance (audit trail, withdrawal timestamp) requires server persistence.

**Deferred action:** Move each consent flag to a dedicated column on `explorer_profiles` (e.g., `city_guide_consent_at TIMESTAMPTZ`, `civic_report_consent_at`, `traffic_report_consent_at`). Read on component mount via a lightweight server action; write on acceptance. Do not block the civic UI behind an auth wall — unauthenticated users should still see the notice and be able to dismiss it locally (localStorage fallback acceptable for guests).

**Priority:** Medium — required before DPDP compliance audit; not urgent for feature launch.
