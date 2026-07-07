# CLAUDE.md — When In My City (WIMC) / City Collective LLP

Standing instructions for Claude Code on this repo. Follow these by default in every session.

## Project identity (never conflate)
- **City Collective LLP** = the legal entity.
- **When In My City (WIMC)** = the product/platform.
- **City** = the government-co-branded edition of the Explorer experience (same codebase/backend/
  ticketing; a skin/config, NOT a fork).
Use these terms precisely; never interchange them.

## Stack
Next.js 14, TypeScript, Tailwind, Supabase. Payments via Razorpay Orders (single-account); revenue
split (platform/maker/venue) is computed and stored per-RSVP as bookkeeping only. Payouts to
creators/venues are currently manual and admin-approved (`payout_requests` / `venue_payout_requests`
→ `/admin/payouts`, `/admin/venue-payouts`) — Razorpay Route / automated-split payout is planned but
NOT live; do not assume it exists. See "Known debt" below for the parked payout-automation work.
Framer Motion for animation; `vaul` for bottom-sheets/drawers; `useIsMobile` (768px) for the
mobile breakpoint. Reuse these — do NOT add new dependencies for things already covered.

## Workflow (how I work)
- Planning/prompt-drafting happens in a separate chat; you receive structured task files.
- **Investigate before you build.** For any non-trivial change, first read the relevant code and
  report findings BEFORE writing code. If facts are already given in the task, don't re-investigate.
- **Stop and report rather than guess.** If schema, route names, variable names, or an approach are
  unclear, stop and ask — do not guess or fabricate.
- Prefer surgical `str_replace` edits over full-file rewrites. Preserve existing business logic
  exactly when making structural changes.

## Verification (required before declaring done)
- Run `npx tsc --noEmit` and confirm clean. (Note: `npm run lint`/ESLint is NOT configured — do not
  rely on it; `tsc` is the reliable check.)
- Confirm the **non-empty / populated / desktop path is unchanged** when a change only targets an
  empty/mobile/new case. Regression of the working path is the first thing to check.
- For money/data changes, state explicitly what still needs a manual round-trip test (save→reload→
  verify persistence; check money stored in paise, e.g. ₹500 → 50000).
- Report what was actually verified vs. assumed. Prefer proof (git diff empty, grep count = 0, a
  traced call path) over claims.

## Sealed / high-risk files (extra caution)
- **`BlockEditor.tsx` and `ThemeEditor.tsx`** are shared by all four persona Studios. Do NOT change
  their internals — pass data at the boundary (their existing prop APIs). Confirm with `git diff`
  showing these files unchanged. If a change seems to need their internals, STOP and flag.
- **`SplitRightPanel.tsx`** (~6,000 lines, shared across all 4 onboarding personas) — high
  cross-persona regression risk; touch with extra care.

## Firm architectural rules
- **One ticketing/payment stack** (City Collective LLP via Razorpay). Never build a second
  transaction path. City/guide/partner-feed content is discovery-only and must be STRUCTURALLY
  incapable of creating an order (no path to `initiateRSVP`/`confirmRSVPPayment`/Razorpay).
- **No fake data.** Never fabricate placeholder events/metrics/content shown as real. Honest empty
  states or "coming soon" over invented content. (Reframing a true-but-harsh state is fine;
  inventing false positives is not.)
- **Capture-and-forward, never system-of-record** for civic reports; store reference IDs only.
- Government/civic API integrations (e.g. Swachhata) go behind a feature-flag + credential guard
  with graceful fallback; never fake a successful external call.
- **No browser storage APIs** (localStorage/sessionStorage/cookies) in artifacts/components — use
  in-memory React state.

## Naming / conventions
- User-facing term for venues/cafés is "Venue" — renamed from the historical internal "Adda" name
  in mid-2026, across DB schema, code identifiers, and routes (e.g. venue payouts/analytics live at
  `/business/venue/...` and `/admin/venue-payouts`, `venue_profiles` table, `/venue/[slug]` public
  page). "Adda" may still resurface in informal/marketing copy, but is no longer the product term —
  do not reintroduce "adda"-named identifiers, routes, or DB columns.
- Deleted files: `lib/email.ts`, `lib/instagram.ts` — check for stale imports when touching adjacent code.
- Pagination pattern is `PAGE_SIZE=500` with cursor/nextCursor/done — apply to any new cron/unbounded query.
- Empty states: match existing empty-state visual style; distinguish owner-vs-visitor views on
  public pages; give a CTA where the user can act.

## Known debt (do NOT fix unless the task is specifically about it)
- Stale `npm run lint` reference in this file's history — ESLint not configured.
- Pre-existing type errors in `explore/lists/`, `legal/privacy/`, `legal/terms/` (not caused by new work).
- DPDP consent stored in localStorage — should move to server-persisted flag (`explorer_profiles`) eventually.
- Legacy users may lose a few old interest selections on first load after the tag-ID migration.
- **Payout automation is parked, not built.** Real creator/venue payouts require 194-O TDS
  withholding (currently not implemented) before automated/Route-based payout can go live; until
  then payouts stay manual/admin-approved. Do not build KYC, Razorpay Route, or TDS logic unless a
  task explicitly scopes it in.
- **`venue-covers` storage bucket has no RLS policies.** The old `adda-covers` bucket's policies
  (`adda_covers_select_public/insert_own/update_own/delete_own`) were dropped when that bucket was
  deleted (migration 054); equivalent policies for `venue-covers` were never created. Harmless today
  — every read goes through the public bucket URL and every write goes through the service-role
  admin client, both of which bypass RLS entirely. This becomes a real (silent) access-control bug
  the moment any authenticated non-admin client-side upload/download is added against this bucket.
  Recreate the four policies (scoped to `bucket_id = 'venue-covers'`) before adding that kind of
  access — do not assume RLS is already covering this bucket.
