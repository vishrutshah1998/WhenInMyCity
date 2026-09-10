import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import PayClient from './PayClient'

// =============================================================================
// Public, no-login "pay now" page for an approved paid-gated application
// (Phase B, migration 080) — this is what the approved-paid WhatsApp
// template's button links to, carrying the application id (see
// notifyApplicationDecision in event-applications.ts). Same security model
// as /ticket/[token]: the application id is an unguessable uuid used as a
// bearer capability, not paired with any additional auth requirement — the
// same pattern initiatePaymentForApplication itself already uses.
// =============================================================================

export const metadata: Metadata = { title: 'Complete Your Payment — When In My City' }

export default async function PayPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const admin = createAdminClient()

  const { data: application } = await admin
    .from('event_applications')
    .select('id, event_id, applicant_user_id, applicant_name, applicant_phone, answer, ticket_tier_id, status, payment_deadline, rsvp_id, created_at')
    .eq('id', applicationId)
    .maybeSingle()

  if (!application) notFound()

  const { data: event } = await admin
    .from('events')
    .select('id, slug, title, cover_image_url, starts_at, venue_name, venue_address, google_maps_url, ticket_price, ticket_tiers, whatsapp_group_url, status')
    .eq('id', application.event_id)
    .maybeSingle()

  if (!event) notFound()

  // Already paid — hand off to the existing ticket page instead of building
  // a second confirmation screen. Covers both a normal revisit and the race
  // where payment completed in another tab between link-click and page load.
  if (application.rsvp_id) {
    const { data: rsvp } = await admin
      .from('rsvps')
      .select('qr_code_token')
      .eq('id', application.rsvp_id)
      .maybeSingle()

    if (rsvp?.qr_code_token) {
      redirect(`/ticket/${rsvp.qr_code_token}`)
    }
    // rsvp_id set but the row is missing/unreadable (shouldn't happen given
    // the FK) — fall through and let PayClient's own alreadyBooked handling
    // (reached only via a live initiatePaymentForApplication call) cover it,
    // rather than 404 a guest who has, as far as we know, already paid.
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <PayClient
      application={application}
      event={event}
      isAuthenticated={!!session}
      sessionUserId={session?.user.id ?? null}
    />
  )
}
