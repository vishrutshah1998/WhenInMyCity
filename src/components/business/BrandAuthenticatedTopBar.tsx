'use client'

import ExplorerTopBar from '@/components/explore/ExplorerTopBar'
import NotificationBell from '@/components/dashboard/NotificationBell'
import type { Notification } from '@/types/database'

const BRAND_ACCENT = '#F5A800'

interface Props {
  city:          string
  avatarUrl:     string | null
  initials:      string
  displayName:   string
  profileHref:   string
  notifications: Notification[]
}

// Brand's city (user_profiles.city) is fixed identity, not a session-scoped
// browsing filter — no onCitySelect, so ExplorerTopBar renders it as a
// static label (matches Creator/Venue).
//
// avatarUrl passes through user_profiles.avatar_url as-is: the column
// exists and IS populated for some accounts (read already in
// BrandSidebarServer/BrowseCreatorsClient/BrandPageEditorClient), but no
// Brand-facing UI lets a Brand set it — so this renders a real photo if one
// somehow exists, initials otherwise. Building upload UI is out of scope for
// this pass, same treatment as Explorer's own avatar-upload gap.
export default function BrandAuthenticatedTopBar({ city, avatarUrl, initials, displayName, profileHref, notifications }: Props) {
  return (
    <ExplorerTopBar
      city={city}
      avatar={{ href: profileHref, avatarUrl, initials, displayName }}
      logoHref="/business/brand/dashboard"
      accentColor={BRAND_ACCENT}
      variant="dark"
      notificationBell={<NotificationBell initialNotifications={notifications} />}
    />
  )
}
