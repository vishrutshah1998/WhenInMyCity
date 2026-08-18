import { requireProfile } from '@/lib/auth/requireAuth'
import { getCreatorEventsWithBookings } from '@/app/actions/events'
import { getMyTickets } from '@/app/actions/rsvp'
import { resolveWorkspaces } from '@/lib/constants/bottomNavConfigs'
import { getCategoryColors } from '@/lib/constants/categories'
import type { CreatorType } from '@/types/database'
import CreatorProfileHubClient, { type HubActivityItem } from './CreatorProfileHubClient'

const DEFAULT_ACCENT = '#E8705A'

export default async function CreatorProfileHubPage() {
  const { profile } = await requireProfile()

  const personas: string[] = profile.personas ?? []
  const isBrand = profile.creator_type === 'business_brand' || personas.includes('brand')
  const isVenue = personas.includes('venue') || personas.includes('business')
  const sidebarPersonas = [
    ...personas,
    ...(isBrand && !personas.includes('brand') ? ['brand'] : []),
    ...(isVenue && !personas.includes('venue') ? ['venue'] : []),
  ]

  const [{ events, bookings }, { tickets }] = await Promise.all([
    getCreatorEventsWithBookings(profile.id),
    getMyTickets(),
  ])

  const displayName = profile.display_name ?? profile.username ?? 'Creator'
  const initials     = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const accentColor  = getCategoryColors(profile.creator_type as CreatorType | null).primary || DEFAULT_ACCENT

  const countByEvent: Record<string, number> = {}
  for (const b of bookings) countByEvent[b.event_id] = (countByEvent[b.event_id] ?? 0) + 1

  const hosting: HubActivityItem[] = events
    .filter(e => e.status !== 'cancelled')
    .map(e => ({
      key:       e.id,
      href:      `/dashboard/events/${e.id}`,
      title:     e.title,
      startsAt:  e.starts_at,
      venueName: e.venue_name,
      badge:     e.status === 'draft' ? 'Draft' : undefined,
    }))

  const attending: HubActivityItem[] = tickets.map(t => ({
    key:       t.rsvpId,
    href:      `/events/${t.eventSlug}`,
    title:     t.eventTitle,
    startsAt:  t.eventStartsAt,
    venueName: t.venueName,
  }))

  const workspaces = resolveWorkspaces(sidebarPersonas, 'creator')

  return (
    <CreatorProfileHubClient
      displayName={displayName}
      avatarUrl={profile.avatar_url ?? null}
      initials={initials}
      username={profile.username ?? null}
      bio={profile.bio ?? null}
      hosting={hosting}
      attending={attending}
      workspaces={workspaces}
      accentColor={accentColor}
    />
  )
}
