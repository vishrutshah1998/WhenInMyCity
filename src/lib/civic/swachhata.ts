/**
 * Swachhata SBM Platform — complaint forwarding adapter.
 *
 * Scope: sanitation and garbage categories only (those are the categories
 * Swachhata covers under the Swachh Bharat Mission mandate).
 *
 * ── Integration boundary ────────────────────────────────────────────────────
 * Credentials (SWACHHATA_VENDOR_KEY + SWACHHATA_ACCESS_KEY) are issued by the
 * State Admin after AMC sponsors the integration via the Swachhata SBM Vendor
 * Portal. Until those exist in environment variables, every call returns
 *   { ok: false, reason: 'not_configured' }
 * and the caller (civicReport.ts) falls through to the AMC-channel handoff.
 *
 * ── To wire in live credentials ─────────────────────────────────────────────
 * 1. Receive SWACHHATA_VENDOR_KEY and SWACHHATA_ACCESS_KEY from State Admin.
 * 2. Add both to Vercel environment variables (server-only, not NEXT_PUBLIC_).
 * 3. Confirm COMPLAINT_TYPE_IDS below against the Swachhata vendor docs or by
 *    calling GET /complaint/GetComplaintType with your VendorKey.
 * 4. Confirm AHMEDABAD_STATE_ID and AHMEDABAD_CITY_ID from the same vendor docs.
 * 5. Remove the TODO comments in this file that mention "confirm with vendor docs".
 *
 * ── API reference ───────────────────────────────────────────────────────────
 * POST https://swachhata.in/Swachh_Api/api/complaint/PostComplaint
 * Content-Type: application/x-www-form-urlencoded
 * All authentication params travel in the body (not HTTP headers).
 * Docs: available after credential issuance via the Swachhata SBM Vendor Portal.
 */

import 'server-only'

// ── Categories this adapter handles ───────────────────────────────────────────
// All other CivicCategory values (pothole, streetlight, etc.) must not be
// passed to this adapter — they route to different channels.

export type SwachhataCategory = 'garbage' | 'open_defecation'

// ── Complaint type IDs ────────────────────────────────────────────────────────
// These are Swachhata-internal integer codes.
// TODO: confirm exact IDs by calling
//   GET https://swachhata.in/Swachh_Api/api/complaint/GetComplaintType
//   with VendorKey + AccessKey once credentials are issued.
// Placeholder values below will fail at the API level (not silently) so the
// fallback path triggers and no phantom data is written to Swachhata.

const COMPLAINT_TYPE_IDS: Record<SwachhataCategory, number> = {
  garbage:         1,  // TODO: confirm — likely "Garbage Not Collected" or "Solid Waste"
  open_defecation: 14, // TODO: confirm — likely "Open Defecation" category
}

// ── City / state identifiers ──────────────────────────────────────────────────
// TODO: confirm both values from Swachhata vendor docs or GET /GetCityList.
// Gujarat state code in Swachhata's registry (not the Census code).
const AHMEDABAD_STATE_ID = 11  // TODO: confirm — Gujarat state ID in Swachhata system
// Ahmedabad city code in Swachhata's ULB registry.
const AHMEDABAD_CITY_ID  = 164 // TODO: confirm — Ahmedabad Municipal Corporation ID

// ── API endpoint ──────────────────────────────────────────────────────────────

// TODO: confirm base URL from vendor documentation once credentials are issued.
// The path below is the conventional shape seen in public government-tech references,
// but MoHUA/NIC may provide a different URL with the credential package.
const SWACHHATA_BASE = 'https://swachhata.in/Swachh_Api/api'

// ── Request / response types ──────────────────────────────────────────────────
// Matching the documented Swachhata SBM vendor API shape.
// Fields are PascalCase to match the API contract exactly.

interface SwachhataRequest {
  VendorKey:       string
  AccessKey:       string
  /** Reporter's mobile number. Required by Swachhata for complaint attribution. */
  MobileNo:        string
  ComplaintTypeId: number
  StateId:         number
  CityId:          number
  /** Ward number within the city. Optional; omit if unknown. */
  WardId?:         number
  /** Human-readable locality name (neighbourhood / area). */
  Locality?:       string
  Description?:    string
  /** GPS latitude as a decimal string, e.g. "23.0225". */
  Latitude?:       string
  /** GPS longitude as a decimal string, e.g. "72.5714". */
  Longitude?:      string
  /**
   * Photo attachment.
   * Swachhata accepts a publicly-accessible URL or base64-encoded image data.
   * Prefer a short-lived signed URL from Supabase Storage over base64 to keep
   * the POST payload small. Generate with:
   *   createAdminClient().storage.from('civic-reports').createSignedUrl(path, 300)
   */
  Photo?:          string
}

interface SwachhataResponse {
  /** HTTP-style status code: 200 = success, 400/500 = error. */
  StatusCode:  number
  /** Complaint reference number returned by Swachhata (e.g. "SW-AHD-2024-001234"). */
  ComplaintId: string
  Message:     string
}

// ── Public result type ────────────────────────────────────────────────────────

export type SwachhataResult =
  | { ok: true;  complaintId: string; rawStatus: number }
  | { ok: false; reason: 'not_configured' | 'api_error' | 'network_error'; detail?: string }

// ── Input accepted by the public function ─────────────────────────────────────

export interface SwachhataInput {
  category:      SwachhataCategory
  /** Reporter's phone from Supabase auth user.phone. Pass empty string if unavailable. */
  reporterPhone: string
  description?:  string
  lat?:          number
  lng?:          number
  locality?:     string
  wardId?:       number
  /**
   * Publicly-accessible URL for the complaint photo.
   * Generate a signed URL from Supabase Storage before calling this function.
   * Leave undefined if no photo was attached.
   */
  photoUrl?:     string
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Attempt to forward a sanitation/garbage report to the Swachhata SBM Platform.
 *
 * Returns `{ ok: false, reason: 'not_configured' }` immediately when
 * SWACHHATA_VENDOR_KEY or SWACHHATA_ACCESS_KEY are absent.
 * The caller (submitCivicReport) treats this as "fall through to AMC handoff".
 *
 * All other failures return `{ ok: false, reason: 'api_error' | 'network_error' }`
 * and are logged — the report row stays in `forward_status = 'failed'` so the
 * admin dashboard can surface it for manual re-submission.
 */
export async function forwardToSwachhata(input: SwachhataInput): Promise<SwachhataResult> {
  const vendorKey = process.env.SWACHHATA_VENDOR_KEY
  const accessKey = process.env.SWACHHATA_ACCESS_KEY

  // ── Feature gate ────────────────────────────────────────────────────────────
  // Credentials not yet issued. Return cleanly so the caller falls through to
  // the AMC-channel handoff rather than erroring or silently dropping the report.
  if (!vendorKey || !accessKey) {
    return { ok: false, reason: 'not_configured' }
  }

  const typeId = COMPLAINT_TYPE_IDS[input.category]

  const body = new URLSearchParams()
  body.set('VendorKey',       vendorKey)
  body.set('AccessKey',       accessKey)
  body.set('MobileNo',        input.reporterPhone)
  body.set('ComplaintTypeId', String(typeId))
  body.set('StateId',         String(AHMEDABAD_STATE_ID))
  body.set('CityId',          String(AHMEDABAD_CITY_ID))
  if (input.wardId)      body.set('WardId',      String(input.wardId))
  if (input.locality)    body.set('Locality',    input.locality)
  if (input.description) body.set('Description', input.description)
  if (input.lat != null) body.set('Latitude',    String(input.lat))
  if (input.lng != null) body.set('Longitude',   String(input.lng))
  if (input.photoUrl)    body.set('Photo',       input.photoUrl)

  let raw: Response
  try {
    raw = await fetch(`${SWACHHATA_BASE}/complaint/PostComplaint`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      signal:  AbortSignal.timeout(15_000),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[swachhata] network error:', detail)
    return { ok: false, reason: 'network_error', detail }
  }

  let json: SwachhataResponse
  try {
    json = await raw.json() as SwachhataResponse
  } catch {
    const detail = `HTTP ${raw.status} — non-JSON response`
    console.error('[swachhata] parse error:', detail)
    return { ok: false, reason: 'api_error', detail }
  }

  // TODO: confirm success StatusCode with vendor docs — 200 is assumed.
  if (json.StatusCode !== 200 || !json.ComplaintId) {
    const detail = `StatusCode=${json.StatusCode} Message=${json.Message}`
    console.error('[swachhata] complaint rejected:', detail)
    return { ok: false, reason: 'api_error', detail }
  }

  return { ok: true, complaintId: json.ComplaintId, rawStatus: json.StatusCode }
}
