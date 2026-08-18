'use client'

import ExplorerTopBar from '@/components/explore/ExplorerTopBar'
import NotificationBell from '@/components/dashboard/NotificationBell'
import type { Notification } from '@/types/database'

interface Props {
  city:             string
  avatarUrl:        string | null
  initials:         string
  displayName:      string
  profileHref:      string
  accentColor:      string
  notifications:    Notification[]
}

// Creator's city (user_profiles.city) is fixed identity, not a session-scoped
// browsing filter like Explorer's — so no onCitySelect is passed, which makes
// ExplorerTopBar render it as a static label instead of an interactive toggle.
export default function CreatorAuthenticatedTopBar({ city, avatarUrl, initials, displayName, profileHref, accentColor, notifications }: Props) {
  return (
    <ExplorerTopBar
      city={city}
      avatar={{ href: profileHref, avatarUrl, initials, displayName }}
      logoHref="/dashboard"
      accentColor={accentColor}
      notificationBell={<NotificationBell initialNotifications={notifications} />}
    />
  )
}
