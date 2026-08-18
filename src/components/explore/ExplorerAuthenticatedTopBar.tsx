'use client'

import { useRouter } from 'next/navigation'
import ExplorerTopBar from './ExplorerTopBar'
import NotificationBell from '@/components/dashboard/NotificationBell'
import type { Notification } from '@/types/database'

interface Props {
  city:          string
  avatarUrl:     string | null
  initials:      string
  displayName:   string
  profileHref:   string
  notifications: Notification[]
}

// Thin client wrapper — explore/dashboard/layout.tsx is a Server Component and
// can't hold the onCitySelect handler itself. There's no per-page city filter
// inside /explore/dashboard/* today (unlike /explore's ?city= driven feed), so
// selecting a city here jumps to the discovery page filtered by it rather than
// updating state in place.
export default function ExplorerAuthenticatedTopBar({ city, avatarUrl, initials, displayName, profileHref, notifications }: Props) {
  const router = useRouter()

  return (
    <ExplorerTopBar
      city={city}
      onCitySelect={(c) => router.push(`/explore?city=${encodeURIComponent(c)}`)}
      avatar={{ href: profileHref, avatarUrl, initials, displayName }}
      notificationBell={<NotificationBell initialNotifications={notifications} seeAllHref="/explore/dashboard/notifications" />}
      variant="dark"
    />
  )
}
