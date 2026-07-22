'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getInstagramFeedStatus } from '@/app/actions/instagram'

/**
 * Self-fetching Studio preview / editor-form widget for the instagram_feed
 * block. Client-side because it needs live connection status; only ever
 * calls getInstagramFeedStatus (a server action reading cached data — no
 * live Meta call happens here). Used from BlockRenderer.tsx's Studio preview
 * and BlockEditor.tsx's inline editor form.
 */
export function InstagramFeedPreview({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<{ connected: boolean; media: Array<{ post_url: string; thumbnail_url: string }> } | null>(null)

  useEffect(() => {
    let cancelled = false
    getInstagramFeedStatus(profileId).then((result) => {
      if (!cancelled) setStatus(result)
    })
    return () => { cancelled = true }
  }, [profileId])

  if (!status) {
    return <div className="w-full aspect-square rounded-xl bg-white/5 animate-pulse" />
  }

  if (!status.connected) {
    return (
      <div className="w-full rounded-xl border border-dashed border-white/15 bg-white/5 p-6 flex flex-col items-center gap-2 text-center">
        <span className="material-symbols-outlined text-3xl text-white/40">lock</span>
        <p className="text-sm font-semibold text-white/70">Instagram not connected</p>
        <p className="text-xs text-white/40">Connect your Instagram Business or Creator account in Profile Settings to show your recent posts here.</p>
      </div>
    )
  }

  if (status.media.length === 0) {
    return (
      <div className="w-full rounded-xl bg-white/5 p-6 text-center">
        <p className="text-sm text-white/50">No posts synced yet — check back after your next visit to the dashboard.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1 w-full">
      {status.media.map((m) => (
        <a
          key={m.post_url}
          href={m.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-square block overflow-hidden rounded-md bg-black/10"
        >
          <Image src={m.thumbnail_url} alt="" fill className="object-cover" unoptimized />
        </a>
      ))}
    </div>
  )
}
