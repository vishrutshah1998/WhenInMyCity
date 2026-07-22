'use client'

import { useEffect } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

/**
 * Renders a single Instagram post via Instagram's own embed.js widget —
 * shared by the Studio preview (BlockRenderer.tsx) and the live public page
 * (PublicProfilePage.tsx) so both render the real post instead of a static
 * fallback card. embed.js scans the DOM for `.instagram-media` blockquotes
 * on load; `Embeds.process()` re-scans on demand, which we call after mount
 * and whenever postUrl changes (e.g. Studio live-preview edits) since
 * process() is idempotent and safe to call repeatedly.
 */
export function InstagramEmbedWidget({ postUrl }: { postUrl: string }) {
  useEffect(() => {
    window.instgrm?.Embeds.process()
  }, [postUrl])

  return (
    <div className="w-full">
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds.process()}
      />
      <blockquote
        key={postUrl}
        className="instagram-media"
        data-instgrm-permalink={postUrl}
        data-instgrm-version="14"
        style={{ background: '#FFF', border: 0, margin: '0 auto', width: '100%', minWidth: 220 }}
      />
    </div>
  )
}
