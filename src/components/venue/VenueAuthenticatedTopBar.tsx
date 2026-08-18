'use client'

import ExplorerTopBar from '@/components/explore/ExplorerTopBar'
import VenueNotificationBell from '@/components/venue/VenueNotificationBell'
import type { Notification } from '@/types/database'

const VENUE_ACCENT = '#5DD9D0'

interface Props {
  city:          string
  initials:      string
  displayName:   string
  profileHref:   string
  venueId:       string
  notifications: Notification[]
  unreadCount:   number
}

// Venue's city (venue_profiles.city) is fixed at onboarding, not a session-scoped browsing
// filter — no onCitySelect, so ExplorerTopBar renders it as a static label (matches Creator).
//
// avatarUrl is always null: venue_profiles has no avatar_url column, and the desktop sidebar
// (VenueSidebarClient) already falls back to initials-only for the same reason — this keeps
// that behavior identical rather than repurposing cover_image_url (a page hero, frequently
// unset on newer venues) as a personal-style avatar.
export default function VenueAuthenticatedTopBar({ city, initials, displayName, profileHref, venueId, notifications, unreadCount }: Props) {
  return (
    <ExplorerTopBar
      city={city}
      avatar={{ href: profileHref, avatarUrl: null, initials, displayName }}
      logoHref="/business/venue/dashboard"
      accentColor={VENUE_ACCENT}
      variant="dark"
      notificationBell={
        <VenueNotificationBell
          venueId={venueId}
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
      }
    />
  )
}
