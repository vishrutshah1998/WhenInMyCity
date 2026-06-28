'use client'

import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import PublicProfilePage from '@/components/profile/PublicProfilePage'
import CreatorPhonePreview from '@/components/dashboard/CreatorPhonePreview'

// ---------------------------------------------------------------------------
// PreviewPanel
// ---------------------------------------------------------------------------

interface PreviewPanelProps {
  profile: UserProfile
  blocks: PageBlock[]
  events?: Event[]
  theme?: ProfileTheme
  highlightedBlockId?: string | null
  saveStatus: 'idle' | 'saving' | 'saved'
  isDirty: boolean
  device?: 'mobile' | 'desktop'
}

export default function PreviewPanel({
  profile,
  blocks,
  events = [],
  theme,
  saveStatus,
  isDirty,
  device = 'mobile',
}: PreviewPanelProps) {
  const badgeText = saveStatus === 'saved'
    ? '✓ Saved'
    : isDirty
      ? 'Preview · unsaved changes'
      : 'Preview · live'

  const badgeColor = saveStatus === 'saved'
    ? '#16a34a'
    : isDirty
      ? '#d97706'
      : 'rgba(255,255,255,0.35)'

  if (device === 'desktop') {
    return (
      <PublicProfilePage
        profile={profile}
        blocks={blocks}
        upcomingEvents={events}
        theme={theme}
      />
    )
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-start gap-0 overflow-hidden py-4">
      {/* Save-state badge */}
      <div
        className="mb-3 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 shrink-0"
        style={{
          background: `${badgeColor}18`,
          color: badgeColor,
          border: `1px solid ${badgeColor}40`,
        }}
      >
        {badgeText}
      </div>

      {/* Phone preview — owns its own frame, status bar, and scaling */}
      <div className="w-full flex-1 min-h-0">
        <CreatorPhonePreview
          profile={profile}
          blocks={blocks}
          events={events}
          theme={theme}
        />
      </div>

      {/* URL label */}
      <p
        className="mt-3 text-xs font-medium tracking-wide shrink-0"
        style={{ color: 'rgba(255,255,255,0.55)', opacity: 0.5 }}
      >
        wheninmycity.com/{profile.username}
      </p>
    </div>
  )
}
