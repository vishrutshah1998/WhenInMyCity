import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventApplications } from '@/app/actions/rsvp'
import { getPaidEventApplications } from '@/app/actions/event-applications'
import type { TicketTier } from '@/types/events'
import ApplicationsClient from './ApplicationsClient'
import PaidApplicationsClient from './PaidApplicationsClient'

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, application_question, rsvp_style, ticket_price, ticket_tiers')
    .eq('id', id)
    .eq('creator_id', user.id)
    .maybeSingle()

  if (!event) notFound()

  // Paid gated events (rsvp_style === 'ticketed' with a price > 0) route
  // approval through event_applications (migration 080, Phase B); every
  // other event — including a free 'ticketed' event with no gating at all —
  // keeps the original Phase A path (rsvps.application_status), which is
  // simply empty for an event that never gated anything, same as today.
  const isPaidGatedEvent = event.ticket_price > 0 && event.rsvp_style === 'ticketed'

  if (isPaidGatedEvent) {
    const { data: applications, error } = await getPaidEventApplications(id)

    if (error) {
      return (
        <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: 40 }}>
          {error}
        </div>
      )
    }

    return (
      <PaidApplicationsClient
        eventId={event.id}
        eventTitle={event.title}
        applicationQuestion={event.application_question}
        ticketTiers={event.ticket_tiers as TicketTier[] | null}
        applications={applications ?? []}
      />
    )
  }

  const { data: applications, error } = await getEventApplications(id)

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: 40 }}>
        {error}
      </div>
    )
  }

  return (
    <ApplicationsClient
      eventId={event.id}
      eventTitle={event.title}
      applicationQuestion={event.application_question}
      applications={applications ?? []}
    />
  )
}
