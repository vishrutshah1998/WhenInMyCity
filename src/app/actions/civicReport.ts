'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth }       from '@/lib/auth/requireAuth'
import { z }                 from 'zod'
import {
  forwardToSwachhata,
  type SwachhataCategory,
} from '@/lib/civic/swachhata'

// ── Category taxonomy ──────────────────────────────────────────────────────────
// forward_target is derived server-side from category; never accepted from the client.

const CATEGORIES = [
  'garbage',
  'open_defecation',
  'pothole',
  'streetlight',
  'waterlogging',
  'water_supply',
  'tree',
  'traffic',
] as const

export type CivicCategory = (typeof CATEGORIES)[number]
export type ForwardTarget  = 'swachhata' | 'amc_channel' | 'traffic_police'
export type ForwardStatus  = 'pending' | 'forwarded' | 'handoff_shown' | 'failed'

const SWACHHATA_CATEGORIES = new Set<CivicCategory>(['garbage', 'open_defecation'])

const FORWARD_TARGET: Record<CivicCategory, ForwardTarget> = {
  garbage:          'swachhata',
  open_defecation:  'swachhata',
  pothole:          'amc_channel',
  streetlight:      'amc_channel',
  waterlogging:     'amc_channel',
  water_supply:     'amc_channel',
  tree:             'amc_channel',
  traffic:          'traffic_police',
}

// ── Input schema ──────────────────────────────────────────────────────────────

const ReportSchema = z.object({
  category:       z.enum(CATEGORIES),
  subcategory:    z.string().max(80).optional(),
  description:    z.string().max(500).optional(),
  photo_ref:      z.string().max(500).optional(),
  lat:            z.number().min(-90).max(90).optional(),
  lng:            z.number().min(-180).max(180).optional(),
  edition:        z.string().default('ahmedabad-gandhinagar'),
  // Traffic violation reports only. Never surfaces outside the owning user's session.
  vehicle_number: z.string().max(20).optional(),
})

export type ReportInput = z.input<typeof ReportSchema>

// ── Return type ───────────────────────────────────────────────────────────────
// forward_status tells the UI what happened so it can branch correctly:
//   'forwarded'   → show success + external_reference (Swachhata complaint ID)
//   'pending'     → show "queued" + AMC-channel handoff (creds absent / no phone)
//   'failed'      → show "saved but forwarding failed" + AMC-channel handoff

export type SubmitResult =
  | { success: true;  id: string; forward_target: ForwardTarget; forward_status: ForwardStatus; external_reference: string | null }
  | { success: false; error: string }

// ── Server action ──────────────────────────────────────────────────────────────

export async function submitCivicReport(input: unknown): Promise<SubmitResult> {
  const { user } = await requireAuth('/explore/guide')

  const parsed = ReportSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid report data.' }
  }

  const data           = parsed.data
  const forward_target = FORWARD_TARGET[data.category]

  const supabase = await createClient()
  // civic_reports is not yet in the auto-generated database.ts types;
  // cast to any until `supabase gen types` is re-run after the migration lands.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: report, error } = await db
    .from('civic_reports')
    .insert({
      user_id:        user.id,
      category:       data.category,
      subcategory:    data.subcategory ?? null,
      description:    data.description ?? null,
      photo_ref:      data.photo_ref      ?? null,
      lat:            data.lat            ?? null,
      lng:            data.lng            ?? null,
      edition:        data.edition,
      vehicle_number: data.vehicle_number ?? null,
      forward_target,
      forward_status: 'pending',
    })
    .select('id, external_reference')
    .single() as { data: { id: string; external_reference: string | null } | null; error: { message: string } | null }

  if (error || !report) {
    console.error('[submitCivicReport] insert failed:', error?.message)
    return { success: false, error: 'Failed to save report. Please try again.' }
  }

  // ── Swachhata forwarding path ─────────────────────────────────────────────
  // Only for garbage and open_defecation — the two categories Swachhata covers.
  // All other categories (pothole, streetlight, etc.) route to AMC / traffic
  // channels and land in Prompt 4's handoff UI with forward_status = 'pending'.

  if (SWACHHATA_CATEGORIES.has(data.category)) {
    const fwdResult = await trySwachhataForward({
      reportId:    report.id,
      category:    data.category as SwachhataCategory,
      reporterPhone: user.phone ?? '',
      description: data.description,
      lat:         data.lat,
      lng:         data.lng,
      photo_ref:   data.photo_ref,
    })

    return {
      success:            true,
      id:                 report.id,
      forward_target,
      forward_status:     fwdResult.forward_status,
      external_reference: fwdResult.external_reference,
    }
  }

  // Non-Swachhata categories queue as 'pending'; Prompt 4's handoff UI surfaces them.
  return {
    success:            true,
    id:                 report.id,
    forward_target,
    forward_status:     'pending',
    external_reference: null,
  }
}

// ── Mark handoff shown ────────────────────────────────────────────────────────
// Called by AmcHandoffCard on mount. Updates forward_status to 'handoff_shown'
// so the admin dashboard can see that the citizen was shown the AMC/Traffic
// channel and is expected to self-submit.
//
// Uses admin client because RLS UPDATE policy requires service_role.
// Guards against overwriting a 'forwarded' status (safety: only updates
// 'pending' or 'failed' rows) and verifies user_id ownership.

export async function markHandoffShown(reportId: string): Promise<void> {
  const { user } = await requireAuth('/explore/guide')
  const admin   = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any
  await adminDb
    .from('civic_reports')
    .update({ forward_status: 'handoff_shown' })
    .eq('id',          reportId)
    .eq('user_id',     user.id)
    .in('forward_status', ['pending', 'failed'])
}

// ── Swachhata forward helper ──────────────────────────────────────────────────
// Isolated here so the main action stays readable.
// Uses createAdminClient() for the status update because the RLS UPDATE policy
// on civic_reports requires service_role (users cannot flip their own status).

interface ForwardArgs {
  reportId:      string
  category:      SwachhataCategory
  reporterPhone: string
  description?:  string
  lat?:          number
  lng?:          number
  photo_ref?:    string
}

async function trySwachhataForward(args: ForwardArgs): Promise<{
  forward_status:    ForwardStatus
  external_reference: string | null
}> {
  // If the reporter authenticated via Google OAuth they may have no phone number.
  // Swachhata requires MobileNo — skip the API call rather than sending an empty
  // value and getting a confusing rejection. The report stays queued as 'pending'.
  if (!args.reporterPhone) {
    return { forward_status: 'pending', external_reference: null }
  }

  // Generate a short-lived signed URL for the photo if one was uploaded.
  // The civic-reports bucket is private; we need a signed URL so Swachhata
  // can fetch the image without the bucket being public.
  let photoUrl: string | undefined
  if (args.photo_ref) {
    const admin = createAdminClient()
    const { data: signed } = await admin.storage
      .from('civic-reports')
      .createSignedUrl(args.photo_ref, 300) // 5-minute window
    photoUrl = signed?.signedUrl ?? undefined
  }

  const result = await forwardToSwachhata({
    category:      args.category,
    reporterPhone: args.reporterPhone,
    description:   args.description,
    lat:           args.lat,
    lng:           args.lng,
    photoUrl,
  })

  // ── Update the DB row with the forwarding outcome ────────────────────────
  // Use admin client to bypass RLS (service_role required for UPDATE).
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  if (result.ok) {
    await adminDb
      .from('civic_reports')
      .update({ forward_status: 'forwarded', external_reference: result.complaintId })
      .eq('id', args.reportId)
    return { forward_status: 'forwarded', external_reference: result.complaintId }
  }

  if (result.reason === 'not_configured') {
    // Credentials absent — report stays 'pending', UI falls through to AMC handoff.
    return { forward_status: 'pending', external_reference: null }
  }

  // api_error or network_error — mark failed so the admin dashboard can surface it.
  await adminDb
    .from('civic_reports')
    .update({ forward_status: 'failed' })
    .eq('id', args.reportId)
  console.error('[swachhata] forwarding failed for report', args.reportId, result.detail)
  return { forward_status: 'failed', external_reference: null }
}
