// =============================================================================
// ONE-OFF, THROWAWAY test script — NOT part of a test suite (this project has
// none). Exercises POST /api/webhooks/razorpay end-to-end for the three
// product.route.* events against a LOCAL dev server + LOCAL Supabase only.
//
// Usage:
//   1. Run a Next.js dev server on a port that has been started with LOCAL
//      Supabase env vars (NOT .env.local's production values) and a known
//      RAZORPAY_WEBHOOK_SECRET, e.g.:
//        PORT=3001 \
//        NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
//        NEXT_PUBLIC_SUPABASE_ANON_KEY="<local anon key from `supabase status`>" \
//        SUPABASE_SERVICE_ROLE_KEY="<local service role key>" \
//        RAZORPAY_WEBHOOK_SECRET="local_test_webhook_secret_do_not_use_in_prod" \
//        npx next dev --port 3001
//   2. npx tsx scripts/test-route-webhook.ts
//
// This script itself connects directly to Supabase (to seed/inspect/clean up
// linked_accounts + webhook_events) using the SAME local URL/key pair above.
// It refuses to run if that URL doesn't look like a local Supabase instance.
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { createHmac, randomUUID } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'local_test_webhook_secret_do_not_use_in_prod'
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'http://localhost:3001/api/webhooks/razorpay'

// Hard safety guard — refuse to run against anything that isn't an obvious
// local Supabase instance. This script inserts/deletes rows directly.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(SUPABASE_URL)) {
  console.error(`Refusing to run: SUPABASE_URL "${SUPABASE_URL}" does not look like a local instance.`)
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mirrors src/lib/razorpay/index.ts verifyWebhookSignature() exactly, in reverse:
// HMAC_SHA256(WEBHOOK_SECRET, rawBody) as hex.
function signPayload(rawBody: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
}

async function sendWebhook(rawBody: string, eventId: string) {
  const signature = signPayload(rawBody)
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': eventId,
    },
    body: rawBody,
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

async function getLinkedAccount(id: string) {
  const { data } = await admin.from('linked_accounts').select('*').eq('id', id).maybeSingle()
  return data
}

async function getWebhookEvent(eventId: string) {
  const { data } = await admin.from('webhook_events').select('id, event_type, processed_at').eq('id', eventId).maybeSingle()
  return data
}

function makeNeedsClarificationPayload(accountId: string, productConfigId: string) {
  return {
    event: 'product.route.needs_clarification',
    account_id: accountId,
    payload: {
      merchant_product: {
        entity: {
          id: productConfigId,
          merchant_id: accountId,
          activation_status: 'needs_clarification',
        },
        data: {
          requirements: [
            { reason_code: 'bank_account_invalid', description: 'Max retry exceeded for bank account details.' },
            { reason_code: 'bank_account_invalid', description: 'Max retry exceeded for bank account details.' },
            { reason_code: 'bank_account_invalid', description: 'Max retry exceeded for bank account details.' },
          ],
        },
      },
    },
  }
}

function makeUnderReviewEmptyArrayPayload(accountId: string, productConfigId: string) {
  return {
    event: 'product.route.under_review',
    account_id: accountId,
    payload: {
      merchant_product: {
        entity: {
          id: productConfigId,
          merchant_id: accountId,
          activation_status: 'under_review',
        },
        data: [],
      },
    },
  }
}

function makeOrphanPayload() {
  const accountId = `acc_TESTORPHAN${randomUUID().replace(/-/g, '').slice(0, 10)}`
  const productConfigId = `acc_prd_TESTORPHAN${randomUUID().replace(/-/g, '').slice(0, 10)}`
  return {
    event: 'product.route.under_review',
    account_id: accountId,
    payload: {
      merchant_product: {
        entity: {
          id: productConfigId,
          merchant_id: accountId,
          activation_status: 'under_review',
        },
        data: [],
      },
    },
  }
}

async function main() {
  console.log(`Target webhook: ${WEBHOOK_URL}`)
  console.log(`Target Supabase: ${SUPABASE_URL}`)
  console.log('')

  const insertedRowIds: string[] = []

  // ---------------------------------------------------------------------
  // Test 1 — needs_clarification with 3x "Max retry exceeded" requirements
  // → should trigger the config_locked branch.
  // ---------------------------------------------------------------------
  console.log('=== Test 1: needs_clarification -> config_locked (Max retry exceeded) ===')
  const t1AccountId = `acc_TEST1${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const t1ProductConfigId = `acc_prd_TEST1${randomUUID().replace(/-/g, '').slice(0, 12)}`

  const { data: t1Row, error: t1InsertErr } = await admin
    .from('linked_accounts')
    .insert({
      owner_type: 'creator',
      owner_id: randomUUID(),
      razorpay_account_id: t1AccountId,
      product_config_id: t1ProductConfigId,
      status: 'requested',
    })
    .select()
    .single()

  if (t1InsertErr || !t1Row) {
    console.error('Failed to insert throwaway row for test 1:', t1InsertErr?.message)
    process.exit(1)
  }
  insertedRowIds.push(t1Row.id)
  console.log('Row before:', { id: t1Row.id, status: t1Row.status, rejection_reason: t1Row.rejection_reason })

  const t1Payload = makeNeedsClarificationPayload(t1AccountId, t1ProductConfigId)
  const t1RawBody = JSON.stringify(t1Payload)
  const t1EventId = `evt_test_${randomUUID()}`
  const t1Response = await sendWebhook(t1RawBody, t1EventId)
  console.log('HTTP response:', t1Response)

  const t1After = await getLinkedAccount(t1Row.id)
  console.log('Row after:', { status: t1After?.status, rejection_reason: t1After?.rejection_reason })
  const t1WebhookEvent = await getWebhookEvent(t1EventId)
  console.log('webhook_events row recorded:', !!t1WebhookEvent, t1WebhookEvent?.event_type)
  console.log('')

  // ---------------------------------------------------------------------
  // Test 2 — under_review with data: [] (bare empty array quirk)
  // ---------------------------------------------------------------------
  console.log('=== Test 2: under_review with data: [] ===')
  const t2AccountId = `acc_TEST2${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const t2ProductConfigId = `acc_prd_TEST2${randomUUID().replace(/-/g, '').slice(0, 12)}`

  const { data: t2Row, error: t2InsertErr } = await admin
    .from('linked_accounts')
    .insert({
      owner_type: 'creator',
      owner_id: randomUUID(),
      razorpay_account_id: t2AccountId,
      product_config_id: t2ProductConfigId,
      status: 'requested',
    })
    .select()
    .single()

  if (t2InsertErr || !t2Row) {
    console.error('Failed to insert throwaway row for test 2:', t2InsertErr?.message)
    process.exit(1)
  }
  insertedRowIds.push(t2Row.id)
  console.log('Row before:', { id: t2Row.id, status: t2Row.status, rejection_reason: t2Row.rejection_reason })

  const t2Payload = makeUnderReviewEmptyArrayPayload(t2AccountId, t2ProductConfigId)
  const t2RawBody = JSON.stringify(t2Payload)
  const t2EventId = `evt_test_${randomUUID()}`
  const t2Response = await sendWebhook(t2RawBody, t2EventId)
  console.log('HTTP response:', t2Response)

  const t2After = await getLinkedAccount(t2Row.id)
  console.log('Row after:', { status: t2After?.status, rejection_reason: t2After?.rejection_reason })
  const t2WebhookEvent = await getWebhookEvent(t2EventId)
  console.log('webhook_events row recorded:', !!t2WebhookEvent, t2WebhookEvent?.event_type)
  console.log('')

  // ---------------------------------------------------------------------
  // Test 3 — orphan event: no matching linked_accounts row at all.
  // ---------------------------------------------------------------------
  console.log('=== Test 3: orphan event (no matching linked_accounts row) ===')
  const t3Payload = makeOrphanPayload()
  const t3RawBody = JSON.stringify(t3Payload)
  const t3EventId = `evt_test_${randomUUID()}`
  console.log('No row inserted — confirming no row exists for these ids first:')
  const t3PreCheck = await admin
    .from('linked_accounts')
    .select('id')
    .or(`razorpay_account_id.eq.${t3Payload.account_id},product_config_id.eq.${t3Payload.payload.merchant_product.entity.id}`)
  console.log('Pre-check row count (expect 0):', t3PreCheck.data?.length ?? 0)

  const t3Response = await sendWebhook(t3RawBody, t3EventId)
  console.log('HTTP response:', t3Response)
  const t3WebhookEvent = await getWebhookEvent(t3EventId)
  console.log('webhook_events row recorded:', !!t3WebhookEvent, t3WebhookEvent?.event_type)
  console.log('(Check server-side console output for the expected error-level "no matching linked_accounts row — anomaly" log.)')
  console.log('')

  // ---------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------
  console.log('=== Cleanup ===')
  if (insertedRowIds.length) {
    const { error: deleteErr } = await admin.from('linked_accounts').delete().in('id', insertedRowIds)
    if (deleteErr) {
      console.error('Cleanup failed:', deleteErr.message)
    } else {
      console.log(`Deleted ${insertedRowIds.length} throwaway linked_accounts row(s).`)
    }
  }
  const { data: remaining } = await admin.from('linked_accounts').select('id').in('id', insertedRowIds)
  console.log('Remaining rows after cleanup (expect 0):', remaining?.length ?? 0)
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
