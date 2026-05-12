'use client'

interface MusicPlayerBlockProps {
  platform:    'soundcloud' | 'bandcamp'
  embedUrl:    string
  trackTitle?: string
  artist?:     string
}

function buildSoundCloudSrc(embedUrl: string): string {
  // Accept either the player URL (https://w.soundcloud.com/...) or a track/set URL
  if (embedUrl.startsWith('https://w.soundcloud.com')) return embedUrl
  const encoded = encodeURIComponent(embedUrl)
  return `https://w.soundcloud.com/player/?url=${encoded}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`
}

function buildBandcampSrc(embedUrl: string): string {
  // Bandcamp embeds are already iframes; accept the src attribute URL directly
  // e.g. https://bandcamp.com/EmbeddedPlayer/album=123/...
  return embedUrl
}

export default function MusicPlayerBlock({ platform, embedUrl, trackTitle, artist }: MusicPlayerBlockProps) {
  if (!embedUrl) {
    return (
      <section className="card-surface bg-surface-container-high rounded-2xl p-5 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          music_note
        </span>
        <p className="text-sm text-on-surface-variant">No track set yet</p>
      </section>
    )
  }

  const src = platform === 'soundcloud' ? buildSoundCloudSrc(embedUrl) : buildBandcampSrc(embedUrl)
  const height = platform === 'soundcloud' ? 166 : 120

  return (
    <section className="flex flex-col gap-2">
      {(trackTitle || artist) && (
        <div className="px-1">
          {trackTitle && <p className="font-headline font-bold text-on-surface text-sm leading-tight">{trackTitle}</p>}
          {artist && <p className="text-xs text-on-surface-variant">{artist}</p>}
        </div>
      )}
      <iframe
        src={src}
        width="100%"
        height={height}
        allow="autoplay"
        className="rounded-xl border-0 w-full"
        title={trackTitle ?? `${platform} player`}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </section>
  )
}
