'use server'

// =============================================================================
// WIMC — Razorpay Route Linked Account onboarding (Phase 1)
//
// Creates the Razorpay Route Linked Account (`POST /v2/accounts`) and its
// single Stakeholder (`POST /v2/accounts/:id/stakeholders`), then requests
// and updates its Product Configuration (bank/settlement details), for a
// creator or venue — writing progress into `linked_accounts` (migration 083)
// at every step.
//
// Deliberately NOT implemented here: the Route webhook handler, or any read
// path that treats a synchronous API response's activation_status as
// authoritative (plan Finding #11 — it isn't). Also not here: Phase 2/3
// (transfers, refunds) and any UI.
//
// No profile table in this app currently stores legal_business_name, PAN,
// GST, or a registered/residential address (checked user_profiles,
// creator_profiles, brand_profiles, venue_profiles — none have them; the
// razorpay_linked_account_id/stakeholder_id/business_type/kyc_details
// columns migration 048 added to user_profiles/venue_profiles are dead,
// unreferenced scaffolding and are deliberately left untouched here —
// migration 083's linked_accounts table is the single source of truth per
// the Route integration plan). So every KYC field below is caller-supplied
// input, validated with zod, not looked up from an existing profile.
// =============================================================================

import { requireAuth, requireAdmin } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'
import {
  createLinkedAccount,
  createStakeholder,
  requestProductConfiguration,
  updateProductConfiguration,
  fetchProductConfiguration,
  isConfigLockedResponse,
  summarizeRequirements,
  describeRazorpayError,
  validatePanMatchesBusinessType,
} from '@/lib/razorpay'
import type { LinkedAccount, LinkedAccountOwnerType } from '@/types/database'
import type { RazorpayProductConfiguration } from '@/types/events'
import {
  CreateLinkedAccountInputSchema,
  UpdateProductConfigurationInputSchema,
  type CreateLinkedAccountInput,
  type UpdateProductConfigurationInput,
} from './route-linked-accounts.schemas'

export interface CreateLinkedAccountResult {
  data: LinkedAccount | null
  error: string | null
}

// `linked_accounts.rejection_reason` is the "needs owner attention" signal —
// check it independent of `status`, not as a value implied by any particular
// status. A row can be 'requested' or 'not_started' with a real Razorpay
// error sitting in rejection_reason (see the catch blocks below) that
// nothing has surfaced to the owner yet — status alone won't tell you that.
// No dedicated status value/column for this by design (see review discussion
// on this file) — non-null rejection_reason is the whole signal. Nothing
// reads this column yet; this note is for whatever UI/query eventually does.

// ---------------------------------------------------------------------------
// Internal: write helpers that always check what actually landed in the DB.
//
// linked_accounts has no client-side INSERT/UPDATE/DELETE RLS policy (see
// migration 083) — every write here goes through the service-role admin
// client. That also means a silent 0-row no-op can't be blamed on RLS the
// way it can from an authenticated client; if it happens here it's a real
// bug (bad filter, race, schema drift) and must not be swallowed. Every
// write below checks `error` AND `!data` explicitly, per this project's
// existing referral_codes.ts idiom.
// ---------------------------------------------------------------------------

async function insertLinkedAccount(
  admin: ReturnType<typeof createAdminClient>,
  row: {
    owner_type: LinkedAccountOwnerType
    owner_id: string
    status: string
    rejection_reason?: string | null
    razorpay_account_id?: string | null
    legal_name?: string | null
    business_type?: string | null
    business_pan?: string | null
  },
): Promise<{ data: LinkedAccount | null; error: string | null }> {
  const { data, error } = await admin
    .from('linked_accounts')
    .insert(row)
    .select()
    .single()

  if (error || !data) {
    const message = error?.message ?? 'Insert into linked_accounts returned no row.'
    console.error('[route-linked-accounts] insertLinkedAccount failed', { row, message })
    return { data: null, error: message }
  }
  return { data: data as LinkedAccount, error: null }
}

/**
 * Exported so the Route webhook handler (src/app/api/webhooks/razorpay/route.ts)
 * can reuse this exact write-and-verify helper for status transitions it
 * receives from Razorpay, rather than reimplementing the error/row-count
 * check standard used everywhere else this table is written.
 */
export async function updateLinkedAccount(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ data: LinkedAccount | null; error: string | null }> {
  const { data, error } = await admin
    .from('linked_accounts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    const message = error?.message ?? `UPDATE linked_accounts id=${id} affected 0 rows.`
    console.error('[route-linked-accounts] updateLinkedAccount failed', { id, patch, message })
    return { data: null, error: message }
  }
  return { data: data as LinkedAccount, error: null }
}

/**
 * Verifies the authenticated `user` actually owns `(ownerType, ownerId)`.
 * owner_type/owner_id are caller-supplied on every action in this file, but
 * linked_accounts has no client-write RLS policy — this check is the only
 * thing stopping an authenticated user from creating/advancing another
 * owner's Linked Account. Shared by every action below.
 */
async function verifyOwnership(
  admin: ReturnType<typeof createAdminClient>,
  user: User,
  ownerType: LinkedAccountOwnerType,
  ownerId: string,
): Promise<string | null> {
  if (ownerType === 'creator') {
    return ownerId === user.id ? null : 'Not authorized to manage this linked account.'
  }

  const { data: venue, error } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('id', ownerId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error) return `Failed to verify venue ownership: ${error.message}`
  return venue ? null : 'Not authorized to manage this linked account.'
}

/** Fetches the linked_accounts row for (ownerType, ownerId), or null if none exists yet. */
async function fetchLinkedAccountRow(
  admin: ReturnType<typeof createAdminClient>,
  ownerType: LinkedAccountOwnerType,
  ownerId: string,
): Promise<{ data: LinkedAccount | null; error: string | null }> {
  const { data, error } = await admin
    .from('linked_accounts')
    .select()
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error) return { data: null, error: `Failed to look up existing linked account: ${error.message}` }
  return { data: data as LinkedAccount | null, error: null }
}

// ---------------------------------------------------------------------------
// createRouteLinkedAccount
//
// Idempotent / resumable: safe to call again after a partial failure.
//   - No row yet, or row has no razorpay_account_id  → runs step 2 (Create
//     Linked Account), then falls through to step 3.
//   - razorpay_account_id present, stakeholder_id absent → skips step 2,
//     runs step 3 (Create Stakeholder) only.
//   - Both present → no Razorpay calls at all; returns the existing row.
// Never re-creates an account or stakeholder that already exists.
// ---------------------------------------------------------------------------

export async function createRouteLinkedAccount(
  ownerType: LinkedAccountOwnerType,
  ownerId: string,
  rawInput: CreateLinkedAccountInput,
): Promise<CreateLinkedAccountResult> {
  const parsed = CreateLinkedAccountInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    return { data: null, error: message }
  }
  const input = parsed.data

  // Fail fast on a predictable Razorpay 400 (plan Finding #3) rather than
  // burning a round trip to discover it.
  const panCheck = validatePanMatchesBusinessType(input.businessPan, input.businessType)
  if (!panCheck.ok) return { data: null, error: panCheck.error }

  // --- Authn + ownership check -------------------------------------------
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const ownershipErr = await verifyOwnership(admin, user, ownerType, ownerId)
  if (ownershipErr) return { data: null, error: ownershipErr }

  // --- Look up existing progress ------------------------------------------
  const { data: existing, error: lookupErr } = await fetchLinkedAccountRow(admin, ownerType, ownerId)
  if (lookupErr) return { data: null, error: lookupErr }

  let row = existing

  // --- Step 2: Create Linked Account (skip if already done) ---------------
  if (!row?.razorpay_account_id) {
    let account
    try {
      account = await createLinkedAccount({
        email: input.email,
        phone: input.phone,
        referenceId: `${ownerType}:${ownerId}`,
        legalBusinessName: input.legalBusinessName,
        businessType: input.businessType,
        contactName: input.contactName,
        registeredAddress: input.registeredAddress,
        pan: input.businessPan,
        gst: input.gst,
      })
    } catch (err) {
      const message = describeRazorpayError(err)
      // Nothing was created at Razorpay — record the failure for visibility
      // without claiming a review outcome. status stays 'not_started' (a
      // fresh row) or whatever the existing row's status already was; a
      // failed *request* here is not the same as Razorpay *rejecting* a
      // submitted KYC (that's what 'rejected' means elsewhere in this
      // table — see migration 083's comment on the status column).
      if (row) {
        await updateLinkedAccount(admin, row.id, { rejection_reason: message })
      } else {
        await insertLinkedAccount(admin, {
          owner_type: ownerType,
          owner_id: ownerId,
          status: 'not_started',
          rejection_reason: message,
        })
      }
      return { data: null, error: message }
    }

    const written = row
      ? await updateLinkedAccount(admin, row.id, {
          razorpay_account_id: account.id,
          status: 'requested',
          legal_name: input.legalBusinessName,
          business_type: input.businessType,
          business_pan: input.businessPan,
          rejection_reason: null,
        })
      : await insertLinkedAccount(admin, {
          owner_type: ownerType,
          owner_id: ownerId,
          razorpay_account_id: account.id,
          status: 'requested',
          legal_name: input.legalBusinessName,
          business_type: input.businessType,
          business_pan: input.businessPan,
        })

    if (!written.data) {
      // Razorpay account was created but we failed to persist it — the
      // account_id would otherwise be lost. Surface loudly; do not proceed
      // to stakeholder creation on an unrecorded account.
      const message = `Linked Account ${account.id} was created at Razorpay but failed to save: ${written.error}`
      console.error('[route-linked-accounts]', message)
      return { data: null, error: message }
    }
    row = written.data
  }

  // --- Step 3: Create Stakeholder (skip if already done) ------------------
  if (!row.stakeholder_id) {
    let stakeholder
    try {
      stakeholder = await createStakeholder(row.razorpay_account_id!, {
        name: input.stakeholderName,
        email: input.stakeholderEmail,
        residentialAddress: input.residentialAddress,
        pan: input.stakeholderPan,
      })
    } catch (err) {
      const message = describeRazorpayError(err)
      await updateLinkedAccount(admin, row.id, { rejection_reason: message })
      return { data: null, error: message }
    }

    const written = await updateLinkedAccount(admin, row.id, {
      stakeholder_id: stakeholder.id,
      rejection_reason: null,
    })

    if (!written.data) {
      const message = `Stakeholder ${stakeholder.id} was created at Razorpay but failed to save: ${written.error}`
      console.error('[route-linked-accounts]', message)
      return { data: null, error: message }
    }
    row = written.data
  }

  return { data: row, error: null }
}

// =============================================================================
// requestProductConfigurationAction / updateProductConfigurationAction
//
// Second half of Phase 1: attach the Route product to an already-created
// Linked Account, then submit settlement (bank) details. Both depend on
// createRouteLinkedAccount having already run successfully.
// =============================================================================

export interface ProductConfigurationResult {
  data: LinkedAccount | null
  error: string | null
}

/**
 * Requests a Product Configuration for an existing Linked Account.
 *
 * Idempotent-safe by construction: only calls Razorpay when
 * `product_config_id` is not already set on the row (see
 * `requestProductConfiguration`'s doc comment — re-calling Razorpay's
 * endpoint once a config exists returns the same, possibly locked, config
 * rather than a fresh one, so this action must never do that itself).
 */
export async function requestProductConfigurationAction(
  ownerType: LinkedAccountOwnerType,
  ownerId: string,
): Promise<ProductConfigurationResult> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const ownershipErr = await verifyOwnership(admin, user, ownerType, ownerId)
  if (ownershipErr) return { data: null, error: ownershipErr }

  const { data: row, error: lookupErr } = await fetchLinkedAccountRow(admin, ownerType, ownerId)
  if (lookupErr) return { data: null, error: lookupErr }

  if (!row?.razorpay_account_id || !row?.stakeholder_id) {
    return {
      data: null,
      error: 'Linked Account and Stakeholder must be created first — call createRouteLinkedAccount before requesting a Product Configuration.',
    }
  }

  // Already requested — return as-is, no Razorpay call.
  if (row.product_config_id) {
    return { data: row, error: null }
  }

  let config: RazorpayProductConfiguration
  try {
    config = await requestProductConfiguration(row.razorpay_account_id)
  } catch (err) {
    const message = describeRazorpayError(err)
    // Nothing was created at Razorpay (the request itself failed) — record
    // for visibility, same "request failure ≠ Razorpay-decided outcome"
    // reasoning as createRouteLinkedAccount above. status is left untouched.
    await updateLinkedAccount(admin, row.id, { rejection_reason: message })
    return { data: null, error: message }
  }

  const written = await updateLinkedAccount(admin, row.id, {
    product_config_id: config.id,
    status: 'requested',
    rejection_reason: null,
  })

  if (!written.data) {
    const message = `Product Configuration ${config.id} was created at Razorpay but failed to save: ${written.error}`
    console.error('[route-linked-accounts]', message)
    return { data: null, error: message }
  }

  return { data: written.data, error: null }
}

/**
 * Submits settlement (bank) details onto an existing Product Configuration.
 *
 * Locally refuses (no Razorpay call at all) when the row's current status is
 * 'under_review' or 'config_locked' — see the inline checks below for why.
 *
 * On a successful round trip (Razorpay accepted the request, regardless of
 * what it said), always records what was submitted (bank_ifsc,
 * bank_beneficiary_name, bank_account_last4, submitted_at) — these columns
 * exist for exactly this and nothing else populates them. This wasn't
 * explicitly specified but follows directly from migration 083's column
 * comments; flagged in the summary as an inference, not literal spec.
 */
export async function updateProductConfigurationAction(
  ownerType: LinkedAccountOwnerType,
  ownerId: string,
  rawInput: UpdateProductConfigurationInput,
): Promise<ProductConfigurationResult> {
  const parsed = UpdateProductConfigurationInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { data: null, error: message }
  }
  const input = parsed.data

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const ownershipErr = await verifyOwnership(admin, user, ownerType, ownerId)
  if (ownershipErr) return { data: null, error: ownershipErr }

  const { data: row, error: lookupErr } = await fetchLinkedAccountRow(admin, ownerType, ownerId)
  if (lookupErr) return { data: null, error: lookupErr }

  if (!row?.razorpay_account_id || !row?.product_config_id) {
    return {
      data: null,
      error: 'A Product Configuration must be requested first — call requestProductConfigurationAction before updating settlement details.',
    }
  }

  // --- Local status gate — fail fast, no Razorpay call -------------------
  if (row.status === 'under_review') {
    return {
      data: null,
      error: 'This account is under review — resubmission is not allowed right now. Razorpay rejects submissions in this state outright (plan Finding #12); wait for review to complete.',
    }
  }
  if (row.status === 'config_locked') {
    return {
      data: null,
      error: 'This Linked Account\'s Product Configuration is permanently locked after exceeding its retry limit and cannot be recovered by resubmitting (plan Finding #9). A new Linked Account must be created (via createRouteLinkedAccount) to continue.',
    }
  }

  let config: RazorpayProductConfiguration
  try {
    config = await updateProductConfiguration(row.razorpay_account_id, row.product_config_id, {
      accountNumber: input.accountNumber,
      beneficiaryName: input.beneficiaryName,
      ifscCode: input.ifscCode,
    })
  } catch (err) {
    const message = describeRazorpayError(err)
    await updateLinkedAccount(admin, row.id, { rejection_reason: message })
    return { data: null, error: message }
  }

  const submittedFields = {
    bank_ifsc: input.ifscCode,
    bank_beneficiary_name: input.beneficiaryName,
    bank_account_last4: input.accountNumber.slice(-4),
    submitted_at: new Date().toISOString(),
  }

  const requirements = config.requirements ?? []

  let patch: Record<string, unknown>
  if (requirements.length === 0) {
    // Succeeded at the request level. Does NOT mean activated — that's
    // async and must come from a webhook (not built yet) or an explicit
    // fetch-status call, never inferred here. status is deliberately left
    // untouched; only the stale rejection_reason (if any) is cleared, since
    // a clean resubmission makes a previous failure note misleading.
    patch = { ...submittedFields, rejection_reason: null }
  } else if (isConfigLockedResponse(requirements)) {
    patch = {
      ...submittedFields,
      status: 'config_locked',
      rejection_reason:
        'Retry limit exceeded on this Product Configuration\'s settlement details — this cannot be fixed by resubmitting. A new Linked Account must be created.',
    }
  } else {
    patch = {
      ...submittedFields,
      status: 'needs_clarification',
      rejection_reason: summarizeRequirements(requirements),
    }
  }

  const written = await updateLinkedAccount(admin, row.id, patch)
  if (!written.data) {
    const message = `Product Configuration ${config.id} was updated at Razorpay but failed to save locally: ${written.error}`
    console.error('[route-linked-accounts]', message)
    return { data: null, error: message }
  }

  return { data: written.data, error: null }
}

// ---------------------------------------------------------------------------
// fetchProductConfigurationStatus — manual/admin polling only
//
// NOT a source of truth for activation (plan Finding #11). Read-only: does
// not write anything to linked_accounts, specifically so a stale/flapping
// poll result can never be mistaken for this table's authoritative status.
// Admin-gated rather than owner-gated — this is an ops/debugging tool, not
// a normal onboarding step; a future "my payout status" view for the owner
// should read `linked_accounts` directly, not call Razorpay live.
// ---------------------------------------------------------------------------

export async function fetchProductConfigurationStatus(
  ownerType: LinkedAccountOwnerType,
  ownerId: string,
): Promise<{ data: RazorpayProductConfiguration | null; error: string | null }> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: row, error: lookupErr } = await fetchLinkedAccountRow(admin, ownerType, ownerId)
  if (lookupErr) return { data: null, error: lookupErr }

  if (!row?.razorpay_account_id || !row?.product_config_id) {
    return { data: null, error: 'No Product Configuration exists yet for this owner.' }
  }

  try {
    const config = await fetchProductConfiguration(row.razorpay_account_id, row.product_config_id)
    return { data: config, error: null }
  } catch (err) {
    return { data: null, error: describeRazorpayError(err) }
  }
}
