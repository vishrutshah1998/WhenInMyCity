'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { PageBlock, SocialLinkConfig, YoutubeEmbedConfig, TextBioConfig, ImageGalleryConfig, CustomLinkConfig, InstagramEmbedConfig, QuoteBlockConfig, MarqueeTextConfig, StatsGridConfig } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import { InstagramEmbedWidget } from './InstagramEmbedWidget'
import { InstagramFeedPreview } from './InstagramFeedPreview'

// ---------------------------------------------------------------------------
// Platform icons (inline SVG paths) for social links
// ---------------------------------------------------------------------------

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  youtube:   'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  twitter:   'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  tiktok:    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  spotify:   'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  apple_music: 'M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726a10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z',
  youtube_music: 'M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z',
  linkedin:  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  other:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function SocialLinkBlock({ config, isPreview, accent }: { config: SocialLinkConfig; isPreview: boolean; accent: string }) {
  const platform = config.platform ?? 'other'
  const path = PLATFORM_ICONS[platform] ?? PLATFORM_ICONS.other
  const inner = (
    <div
      className="relative w-full flex items-center gap-3 px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] group"
      style={{ background: accent, color: '#fff' }}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current"><path d={path} /></svg>
      <span className="flex-1 text-center font-headline font-bold tracking-wide">
        {config.title || platform.charAt(0).toUpperCase() + platform.slice(1)}
      </span>
      {isPreview && <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />}
    </div>
  )
  if (isPreview) return inner
  return <a href={config.url || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">{inner}</a>
}

function YoutubeBlock({ config, isPreview }: { config: YoutubeEmbedConfig; isPreview: boolean }) {
  if (!config.video_id) {
    return (
      <div className="w-full aspect-video rounded-xl flex items-center justify-center bg-black/20">
        <span className="text-white/40 text-sm">No video set</span>
      </div>
    )
  }
  const thumb = `https://img.youtube.com/vi/${config.video_id}/mqdefault.jpg`
  const inner = (
    <div className="w-full rounded-xl overflow-hidden relative group cursor-pointer">
      <div className="aspect-video relative">
        <Image src={thumb} alt={config.title ?? 'YouTube'} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-1"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      {config.title && (
        <div className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--pp-text)' }}>{config.title}</div>
      )}
    </div>
  )
  if (isPreview) return inner
  return <a href={`https://youtube.com/watch?v=${config.video_id}`} target="_blank" rel="noopener noreferrer" className="block w-full">{inner}</a>
}

function TextBioBlock({ config }: { config: TextBioConfig }) {
  if (!config.body) return null
  return <p className="w-full text-sm leading-relaxed whitespace-pre-wrap text-center" style={{ color: 'var(--pp-text-muted)' }}>{config.body}</p>
}

function ImageGalleryBlock({ config }: { config: ImageGalleryConfig }) {
  const images = config.images ?? []
  if (images.length === 0) {
    return (
      <div className="w-full grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="aspect-square rounded-lg bg-black/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 opacity-30 fill-current"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="w-full grid grid-cols-2 gap-2">
      {images.map((img, i) => (
        <div key={i} className="aspect-square rounded-lg overflow-hidden relative">
          <Image src={img.url} alt={img.caption ?? ''} fill className="object-cover" />
        </div>
      ))}
    </div>
  )
}

function CustomLinkBlock({ config, isPreview, accent }: { config: CustomLinkConfig; isPreview: boolean; accent: string }) {
  const inner = (
    <div className="w-full rounded-xl overflow-hidden border transition-all duration-150 group relative" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-4 p-4">
        {config.thumbnail_url ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative">
            <Image src={config.thumbnail_url} alt="" fill className="object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${accent}30` }}>
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" style={{ color: accent }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-sm truncate" style={{ color: 'var(--pp-text)' }}>{config.title || 'Link'}</p>
          {config.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--pp-text-muted)' }}>{config.description}</p>}
        </div>
        <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: accent, color: '#fff' }}>
          {config.cta_label || 'View'}
        </span>
      </div>
      {isPreview && <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />}
    </div>
  )
  if (isPreview) return inner
  return <a href={config.url || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">{inner}</a>
}

function InstagramBlock({ config }: { config: InstagramEmbedConfig }) {
  if (!config.post_url) {
    return (
      <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 flex items-center justify-center opacity-40">
        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white"><path d={PLATFORM_ICONS.instagram}/></svg>
      </div>
    )
  }
  // Studio preview renders the actual configured post's live embed — more
  // honest feedback than a fixed example, and embed.js works fine here since
  // this preview pane isn't rendered inside a cross-origin iframe.
  return <InstagramEmbedWidget postUrl={config.post_url} />
}

function QuoteBlockRenderer({ config, accent }: { config: QuoteBlockConfig; accent: string }) {
  if (!config.text) return null
  return (
    <div className="w-full rounded-xl px-5 py-6 flex flex-col items-center gap-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current mb-1" style={{ color: accent }}>
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
      </svg>
      <blockquote className="text-sm font-semibold leading-relaxed italic" style={{ color: 'var(--pp-text)' }}>
        &ldquo;{config.text}&rdquo;
      </blockquote>
      {config.author && (
        <cite className="text-xs not-italic font-medium" style={{ color: 'var(--pp-text-muted)' }}>— {config.author}</cite>
      )}
    </div>
  )
}

function MarqueeBlockRenderer({ config, accent }: { config: MarqueeTextConfig; accent: string }) {
  if (!config.text) return null
  const speed = config.speed ?? 'normal'
  const speedClass = speed === 'slow' ? 'marquee-slow' : speed === 'fast' ? 'marquee-fast' : 'marquee-normal'
  const bg = config.bg ?? 'primary'
  const bgColor = bg === 'ink' ? 'rgba(0,0,0,0.4)' : bg === 'chalk' ? '#F7F2E8' : accent
  const textColor = bg === 'chalk' ? '#1A1108' : '#fff'
  const repeated = `${config.text} · `.repeat(12)
  return (
    <div className="w-full overflow-hidden py-2.5 rounded-lg" style={{ background: bgColor }}>
      <div className={`whitespace-nowrap text-xs font-bold tracking-widest uppercase ${speedClass}`} style={{ color: textColor }}>
        {repeated}{repeated}
      </div>
    </div>
  )
}

function StatsGridRenderer({ config, accent }: { config: StatsGridConfig; accent: string }) {
  const stats = config.stats ?? []
  if (stats.length === 0) return null
  const colClass = stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
  return (
    <div className={`w-full grid ${colClass} gap-3`}>
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 py-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <span className="text-2xl font-bold leading-none" style={{ color: accent }}>{stat.value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// New block renderers (preview-only, simplified)
// ---------------------------------------------------------------------------

function SocialLinksRowRenderer({ config, accent }: { config: { links?: Array<{ platform: string; url: string; label?: string }> }; accent: string }) {
  const links = config.links ?? []
  if (links.length === 0) return (
    <div className="w-full flex justify-center gap-3 py-2">
      {['instagram', 'youtube', 'spotify'].map((p) => (
        <div key={p} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current opacity-40"><path d={PLATFORM_ICONS[p] ?? PLATFORM_ICONS.other}/></svg>
        </div>
      ))}
    </div>
  )
  return (
    <div className="w-full flex flex-wrap justify-center gap-3">
      {links.map((link, i) => (
        <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: accent }}>
            <path d={PLATFORM_ICONS[link.platform] ?? PLATFORM_ICONS.other}/>
          </svg>
        </div>
      ))}
    </div>
  )
}

function AnnouncementRenderer({ config, accent }: { config: { text?: string; cta_label?: string; background_style?: string; show_countdown?: boolean }; accent: string }) {
  const bg = config.background_style ?? 'primary'
  const bgColor = bg === 'dark' ? 'rgba(0,0,0,0.3)' : bg === 'accent' ? 'rgba(255,255,255,0.08)' : accent
  return (
    <div className="w-full rounded-2xl px-5 py-4 flex flex-col items-center gap-2 text-center" style={{ background: bgColor }}>
      <p className="font-bold text-sm text-white leading-snug">{config.text || 'Announcement text…'}</p>
      {config.show_countdown && (
        <div className="flex gap-3 text-white/80 text-xs font-bold">
          <span>00d</span><span>00h</span><span>00m</span><span>00s</span>
        </div>
      )}
      {config.cta_label && (
        <span className="px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
          {config.cta_label}
        </span>
      )}
    </div>
  )
}

function RsvpLinkRenderer({ config, accent }: { config: { label?: string; description?: string; emoji?: string; icon_emoji?: string }; accent: string }) {
  return (
    <div className="w-full flex items-center gap-4 px-5 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <span className="text-xl shrink-0">{config.emoji ?? config.icon_emoji ?? '🎟'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate" style={{ color: 'var(--pp-text)' }}>{config.label || 'RSVP Link'}</p>
        {config.description && <p className="text-xs truncate" style={{ color: 'var(--pp-text-muted)' }}>{config.description}</p>}
      </div>
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current opacity-40 shrink-0" strokeWidth="2">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
      </svg>
    </div>
  )
}

function SpotifyRenderer({ config, accent }: { config: { fallback_track_title?: string; fallback_track_artist?: string; spotify_user_id?: string }; accent: string }) {
  const spotifyGreen = '#1DB954'
  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ background: spotifyGreen }}>
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d={PLATFORM_ICONS.spotify}/></svg>
      </div>
      <div className="flex-1 min-w-0">
        {config.fallback_track_title ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: spotifyGreen }}>Listening to</p>
            <p className="font-bold text-sm truncate" style={{ color: 'var(--pp-text)' }}>{config.fallback_track_title}</p>
            {config.fallback_track_artist && <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>{config.fallback_track_artist}</p>}
          </>
        ) : (
          <p className="font-semibold text-sm" style={{ color: 'var(--pp-text)' }}>Follow on Spotify</p>
        )}
      </div>
    </div>
  )
}

function PodcastRenderer({ config, accent }: { config: { episode_title?: string; platform?: string; episode_duration?: string; artwork_url?: string }; accent: string }) {
  const platformLabel: Record<string, string> = {
    spotify: 'Spotify', apple_podcasts: 'Apple Podcasts', anchor: 'Anchor', direct: 'Podcast',
  }
  return (
    <div className="w-full flex gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${accent}20` }}>
        {config.artwork_url ? (
          <Image src={config.artwork_url} alt="" width={64} height={64} className="rounded-lg object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" style={{ color: accent }}>
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          {platformLabel[config.platform ?? 'direct'] ?? 'Podcast'}
        </p>
        <p className="font-bold text-sm line-clamp-2 leading-snug" style={{ color: 'var(--pp-text)' }}>
          {config.episode_title || 'Episode Title'}
        </p>
        {config.episode_duration && (
          <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>{config.episode_duration}</p>
        )}
      </div>
    </div>
  )
}

function NewsletterRenderer({ config, accent }: { config: { label?: string; button_label?: string; placeholder?: string }; accent: string }) {
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{config.label || 'Join the newsletter'}</p>
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl px-3 py-2.5 text-xs" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--pp-text-muted)' }}>
          {config.placeholder || 'your@email.com'}
        </div>
        <div className="rounded-xl px-4 py-2.5 text-xs font-bold" style={{ background: accent, color: '#fff' }}>
          {config.button_label || 'Subscribe'}
        </div>
      </div>
    </div>
  )
}

function SupportTipRenderer({ config, accent }: { config: { message?: string; preset_amounts_paise?: number[] }; accent: string }) {
  const amounts = config.preset_amounts_paise ?? [5000, 10000, 20000]
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <p className="text-sm" style={{ color: 'var(--pp-text)' }}>{config.message || 'Support my work 💛'}</p>
      <div className="flex flex-wrap gap-2">
        {amounts.map((paise, i) => (
          <div key={i} className="flex-1 min-w-[64px] py-2.5 px-2 rounded-xl text-center text-sm font-bold" style={{ background: `${accent}20`, color: accent }}>
            ₹{paise / 100}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventCalendarRenderer({ accent }: { accent: string }) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const startDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const highlighted = [now.getDate(), now.getDate() + 5, now.getDate() + 12].filter(d => d <= daysInMonth)

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ background: 'var(--pp-cal-bg, rgba(26,39,68,0.05))' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--pp-border, rgba(26,39,68,0.12))' }}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" style={{ color: accent }}><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
        <p className="font-bold text-sm" style={{ color: 'var(--pp-text, #1A2744)' }}>
          {now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="p-3 grid grid-cols-7 gap-0.5 text-center">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[9px] font-bold pb-1.5 opacity-40" style={{ color: 'var(--pp-text, #1A2744)' }}>{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map((d) => (
          <div
            key={d}
            className="w-6 h-6 mx-auto flex items-center justify-center rounded-full text-[11px] font-semibold"
            style={highlighted.includes(d)
              ? { background: accent, color: '#fff' }
              : { color: 'var(--pp-text, #1A2744)', opacity: 0.6 }
            }
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventListingBlockRenderer({ config, accent }: { config: Record<string, unknown>; accent: string }) {
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const m   = MONTHS[new Date().getMonth()]
  const d0  = new Date().getDate()
  const rows = [
    { day: String(d0 + 2).padStart(2, '0'), label: 'Upcoming Event',  venue: 'Venue name' },
    { day: String(d0 + 9).padStart(2, '0'), label: 'Next Event',      venue: 'Another venue' },
  ]
  const title = (config.title as string | undefined) || 'Upcoming Events'
  return (
    <div className="w-full flex flex-col">
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--pp-text-muted, rgba(26,39,68,0.5))', fontFamily: 'monospace' }}>
        {title}
      </p>
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2"
          style={{ borderBottom: `1px dashed var(--pp-border, rgba(26,39,68,0.12))` }}
        >
          <div className="flex flex-col items-center justify-center w-10 h-10 flex-shrink-0" style={{ background: accent }}>
            <span className="text-[15px] font-black text-white leading-none">{row.day}</span>
            <span className="text-[7px] text-white/80 uppercase tracking-wider">{m}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--pp-text, #1A2744)' }}>{row.label}</p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--pp-text-muted, rgba(26,39,68,0.55))' }}>{row.venue}</p>
          </div>
          <span className="text-[9px] font-bold flex-shrink-0 px-2 py-1" style={{ background: `${accent}18`, color: accent, fontFamily: 'monospace' }}>
            GET TICKETS →
          </span>
        </div>
      ))}
      <p className="text-[9px] text-right mt-2 opacity-50" style={{ color: 'var(--pp-text, #1A2744)', fontFamily: 'monospace' }}>
        auto-populated from your published events
      </p>
    </div>
  )
}

function PastEventsGalleryRenderer({ config, accent }: { config: { layout?: string; max_events?: number }; accent: string }) {
  const count = Math.min(config.max_events ?? 4, 6)
  if (config.layout === 'list') {
    return (
      <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/10 last:border-0">
            <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: `${accent}20` }} />
            <div className="flex-1">
              <div className="h-2.5 rounded w-3/4 mb-1.5" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="h-2 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="w-full grid grid-cols-2 gap-2">
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl flex items-end p-2" style={{ background: `${accent}${i % 2 === 0 ? '20' : '15'}` }}>
          <div className="h-2 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
      ))}
    </div>
  )
}

function EventSeriesRenderer({ config, accent }: { config: { series_name?: string; frequency?: string; episode_count?: number }; accent: string }) {
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest" style={{ background: `${accent}20`, color: accent }}>
        Recurring · {config.episode_count ?? 0} episodes
      </div>
      <p className="font-headline font-bold text-lg" style={{ color: 'var(--pp-text)' }}>
        {config.series_name || 'Event Series Name'}
      </p>
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
          <div className="h-2 rounded flex-1" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <div className="h-2 rounded w-16 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      ))}
    </div>
  )
}

function CommunityStatsRenderer({ config, accent }: { config: { show_events_hosted?: boolean; show_total_attendees?: boolean; show_average_rating?: boolean }; accent: string }) {
  const stats = [
    config.show_events_hosted !== false && { value: '24', label: 'Events' },
    config.show_total_attendees !== false && { value: '480', label: 'Attendees' },
    config.show_average_rating !== false && { value: '4.8★', label: 'Rating' },
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <div className={`w-full grid ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
      {stats.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 py-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <span className="text-2xl font-bold leading-none" style={{ color: accent }}>{s.value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function CreatorTypeBadgeRenderer({ config, accent }: { config: { creator_type?: string; custom_label?: string }; accent: string }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm" style={{ background: `${accent}20`, color: accent }}>
        🎨 {config.custom_label ?? config.creator_type ?? 'Creator'}
      </div>
    </div>
  )
}

function CityCommunityRenderer({ config, accent }: { config: { city?: string; neighbourhood?: string }; accent: string }) {
  const label = config.neighbourhood ? `${config.neighbourhood}, ${config.city}` : (config.city || 'Your City')
  return (
    <div className="w-full flex items-center gap-3 px-5 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0" style={{ color: accent }}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span className="flex-1 font-semibold text-sm" style={{ color: 'var(--pp-text)' }}>{label} Community</span>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-40" style={{ color: 'var(--pp-text)' }}><path d="M10 17l5-5-5-5v10z"/></svg>
    </div>
  )
}

function CollabInviteRenderer({ config, accent }: { config: { collab_types?: string[]; message?: string }; accent: string }) {
  const types = config.collab_types ?? ['co_host']
  const TYPE_LABELS: Record<string, string> = {
    co_host: 'Co-Host', workshop_partner: 'Workshop', venue_takeover: 'Venue', brand_collab: 'Brand',
  }
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>Open for Collabs</p>
      <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>{config.message || 'Let\'s create something together!'}</p>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: `${accent}20`, color: accent }}>
            {TYPE_LABELS[t] ?? t}
          </span>
        ))}
      </div>
      <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold" style={{ background: accent, color: '#fff' }}>
        Connect on Hub
      </div>
    </div>
  )
}

function VenuePartnershipRenderer({ config, accent }: { config: { venue_ids?: string[]; display_style?: string }; accent: string }) {
  const count = Math.min(config.venue_ids?.length ?? 2, 3)
  return (
    <div className="flex flex-col gap-3">
      <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>Venue Partners</p>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="w-14 h-14 rounded-lg shrink-0" style={{ background: `${accent}20` }} />
          <div className="flex-1">
            <div className="h-2.5 rounded w-3/4 mb-1.5" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="h-2 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function WhiteLabelEventRenderer({ config, accent }: { config: { partner_name?: string; event_title?: string; ticket_url?: string }; accent: string }) {
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${accent}20` }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" style={{ color: accent }}><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/></svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--pp-text-muted)' }}>Presented by</p>
          <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{config.partner_name || 'Partner Name'}</p>
        </div>
      </div>
      <p className="font-headline font-bold text-base" style={{ color: 'var(--pp-text)' }}>{config.event_title || 'Event Title'}</p>
      <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold" style={{ background: accent, color: '#fff' }}>
        Get Tickets
      </div>
    </div>
  )
}

function TestimonialRenderer({ accent }: { accent: string }) {
  const sample = [
    { name: 'Arjun M.', review: 'An incredible experience!', rating: 5 },
    { name: 'Priya S.', review: 'Absolutely loved the vibe.', rating: 5 },
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="font-bold text-sm px-1" style={{ color: 'var(--pp-text)' }}>What attendees say</p>
      {sample.map((t, i) => (
        <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${accent}20`, color: accent }}>
              {t.name.charAt(0)}
            </div>
            <span className="font-semibold text-xs" style={{ color: 'var(--pp-text)' }}>{t.name}</span>
            <span className="ml-auto text-yellow-400 text-xs">{'★'.repeat(t.rating)}</span>
          </div>
          <p className="text-xs italic" style={{ color: 'var(--pp-text-muted)' }}>&ldquo;{t.review}&rdquo;</p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wave 3 block renderers
// ---------------------------------------------------------------------------

function PressFeatureRenderer({ config, accent }: { config: { features?: Array<{ outlet: string; url?: string; logo_url?: string }>; heading?: string }; accent: string }) {
  const features = config.features ?? []
  if (features.length === 0) {
    return (
      <div className="w-full rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--pp-text-muted)' }}>No press features yet</p>
      </div>
    )
  }
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <p className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: 'var(--pp-text-muted)' }}>
        {config.heading ?? 'As seen in'}
      </p>
      <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5 opacity-60 grayscale">
            {f.logo_url ? (
              <Image src={f.logo_url} alt={f.outlet} width={80} height={24} className="object-contain h-6 w-auto" unoptimized />
            ) : (
              <span className="text-xs font-bold tracking-tight" style={{ color: 'var(--pp-text)' }}>{f.outlet}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TwitterEmbedRenderer({ config, accent }: { config: { tweet_url?: string; handle?: string; caption?: string }; accent: string }) {
  const url = config.tweet_url ?? '#'
  const handle = config.handle
  const caption = config.caption
  const inner = (
    <div
      className="w-full rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}20` }}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: accent }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        {handle && <span className="text-xs font-semibold" style={{ color: accent }}>@{handle}</span>}
        <span className="ml-auto text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Post on X</span>
      </div>
      {caption && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--pp-text)' }}>{caption}</p>
      )}
      {!caption && (
        <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>View this post on X →</p>
      )}
    </div>
  )
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full">{inner}</a>
  )
}

function AwardsBadgesRenderer({ config, accent }: { config: { badges?: Array<{ label: string; icon_url?: string; year?: number }>; heading?: string }; accent: string }) {
  const badges = config.badges ?? []
  if (badges.length === 0) {
    return (
      <div className="w-full rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--pp-text-muted)' }}>No badges yet</p>
      </div>
    )
  }
  return (
    <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
      {config.heading && (
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--pp-text-muted)' }}>{config.heading}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {badges.map((b, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
          >
            {b.icon_url ? (
              <Image src={b.icon_url} alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain" unoptimized />
            ) : (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            )}
            <span>{b.label}</span>
            {b.year && <span className="opacity-60">·{b.year}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Countdown (preview-only simple version)
// ---------------------------------------------------------------------------

function CountdownPreview({ accent }: { accent: string }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const display = `${String(Math.floor(secs / 3600)).padStart(2,'0')}:${String(Math.floor((secs%3600)/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`
  return <span className="font-mono font-bold text-sm" style={{ color: accent }}>{display}</span>
}

// ---------------------------------------------------------------------------
// BlockRenderer
// ---------------------------------------------------------------------------

const ACCENT_COLORS: Record<ProfileTheme['colorScheme'], string> = {
  default:    '#E8572A', midnight:   '#818CF8', ocean:      '#22D3EE',
  forest:     '#6EE7B7', blush:      '#E11D48', sand:       '#B45309',
  pista:      '#2D7A4F', gulaal:     '#E8342A', neel:       '#F5A800',
  turmeric:   '#F5A800', steel:      '#5B8DEF', sienna:     '#C04A00',
  indigo:     '#818CF8', aurora:     '#D946EF', sage:       '#3D7F53',
  mint:       '#0C8B6B', electric:   '#00E5FF', velvet:     '#8B2340',
  nightforest:'#7EC8A0', parchment:  '#4A3728', gallery:    '#1A1A1A',
  terracotta: '#C4552A',
}

interface BlockRendererProps {
  block: PageBlock
  theme: ProfileTheme
  isPreview?: boolean
  isHighlighted?: boolean
  /** All of this profile's blocks — used by blocks (e.g. shop_the_look) that reference sibling blocks. */
  allBlocks?: PageBlock[]
}

const BlockRenderer = React.memo(function BlockRenderer({ block, theme, isPreview = false, isHighlighted = false, allBlocks = [] }: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const accent = useMemo(() => ACCENT_COLORS[theme.colorScheme], [theme.colorScheme])

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  if (!block.is_visible) return null

  const cfg = block.config as unknown

  const rendered = (() => {
    switch (block.block_type) {
      // ── Original blocks ─────────────────────────────────────────────────
      case 'social_link':
        return <SocialLinkBlock config={cfg as SocialLinkConfig} isPreview={isPreview} accent={accent} />
      case 'youtube_embed':
        return <YoutubeBlock config={cfg as YoutubeEmbedConfig} isPreview={isPreview} />
      case 'text_bio':
        return <TextBioBlock config={cfg as TextBioConfig} />
      case 'image_gallery':
        return <ImageGalleryBlock config={cfg as ImageGalleryConfig} />
      case 'custom_link':
        return <CustomLinkBlock config={cfg as CustomLinkConfig} isPreview={isPreview} accent={accent} />
      case 'instagram_embed':
      case 'instagram_post':
        return <InstagramBlock config={cfg as InstagramEmbedConfig} />
      case 'instagram_feed':
        return <InstagramFeedPreview profileId={block.profile_id} />
      case 'quote_block':
        return <QuoteBlockRenderer config={cfg as QuoteBlockConfig} accent={accent} />
      case 'marquee_text':
        return <MarqueeBlockRenderer config={cfg as MarqueeTextConfig} accent={accent} />
      case 'stats_grid':
        return <StatsGridRenderer config={cfg as StatsGridConfig} accent={accent} />

      // ── New blocks ───────────────────────────────────────────────────────
      case 'social_links_row':
        return <SocialLinksRowRenderer config={cfg as { links?: Array<{ platform: string; url: string; label?: string }> }} accent={accent} />
      case 'announcement':
        return <AnnouncementRenderer config={cfg as { text?: string; cta_label?: string; background_style?: string; show_countdown?: boolean }} accent={accent} />
      case 'rsvp_link':
        return <RsvpLinkRenderer config={cfg as { label?: string; description?: string; emoji?: string; icon_emoji?: string }} accent={accent} />
      case 'spotify_now_playing':
        return <SpotifyRenderer config={cfg as { fallback_track_title?: string; fallback_track_artist?: string; spotify_user_id?: string }} accent={accent} />
      case 'podcast_episode':
        return <PodcastRenderer config={cfg as { episode_title?: string; platform?: string; episode_duration?: string; artwork_url?: string }} accent={accent} />
      case 'newsletter_signup':
        return <NewsletterRenderer config={cfg as { label?: string; button_label?: string; placeholder?: string }} accent={accent} />
      case 'support_tip':
        return <SupportTipRenderer config={cfg as { message?: string; preset_amounts_paise?: number[] }} accent={accent} />
      case 'event_listing':
        return <EventListingBlockRenderer config={cfg as Record<string, unknown>} accent={accent} />
      case 'event_calendar':
        return <EventCalendarRenderer accent={accent} />
      case 'past_events_gallery':
        return <PastEventsGalleryRenderer config={cfg as { layout?: string; max_events?: number }} accent={accent} />
      case 'event_series':
        return <EventSeriesRenderer config={cfg as { series_name?: string; frequency?: string; episode_count?: number }} accent={accent} />
      case 'community_stats':
        return <CommunityStatsRenderer config={cfg as { show_events_hosted?: boolean; show_total_attendees?: boolean; show_average_rating?: boolean }} accent={accent} />
      case 'creator_type_badge':
        return <CreatorTypeBadgeRenderer config={cfg as { creator_type?: string; custom_label?: string }} accent={accent} />
      case 'city_community':
        return <CityCommunityRenderer config={cfg as { city?: string; neighbourhood?: string }} accent={accent} />
      case 'collab_invite':
        return <CollabInviteRenderer config={cfg as { collab_types?: string[]; message?: string }} accent={accent} />
      case 'venue_partnership':
        return <VenuePartnershipRenderer config={cfg as { venue_ids?: string[]; display_style?: string }} accent={accent} />
      case 'white_label_event':
        return <WhiteLabelEventRenderer config={cfg as { partner_name?: string; event_title?: string; ticket_url?: string }} accent={accent} />
      case 'testimonial':
        return <TestimonialRenderer accent={accent} />
      case 'whatsapp_community': {
        const wcfg = cfg as { label?: string; member_count_label?: string }
        return (
          <div className="w-full flex items-center gap-4 rounded-2xl px-5 py-4" style={{ background: '#25D366' }}>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-white text-sm truncate">{wcfg.label || 'Join my WhatsApp community'}</p>
              {wcfg.member_count_label && <p className="text-white/80 text-xs">{wcfg.member_count_label}</p>}
            </div>
            <span className="shrink-0 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Join</span>
          </div>
        )
      }
      case 'music_player': {
        const mcfg = cfg as { platform?: string; track_title?: string; artist?: string }
        return (
          <div className="w-full rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}30` }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: accent }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--pp-text)' }}>{mcfg.track_title || 'Track title'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--pp-text-muted)' }}>{mcfg.artist || mcfg.platform || 'SoundCloud'}</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: accent }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        )
      }
      case 'booking_request': {
        const bcfg = cfg as { label?: string; categories?: string[] }
        const cats = bcfg.categories ?? []
        return (
          <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{bcfg.label || 'Book me for your event'}</p>
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide" style={{ background: `${accent}20`, color: accent }}>Open</span>
            </div>
            {cats.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cats.slice(0, 3).map((c) => (
                  <span key={c} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: `${accent}20`, color: accent }}>{c}</span>
                ))}
                {cats.length > 3 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--pp-text-muted)' }}>+{cats.length - 3}</span>}
              </div>
            )}
            <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold" style={{ background: accent, color: '#fff' }}>Send Inquiry</div>
          </div>
        )
      }
      case 'substack_preview': {
        const scfg = cfg as { publication_url?: string; posts_count?: number }
        return (
          <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: accent }}><path d="M22 4H2v16l10-5.5L22 20V4z"/></svg>
              <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>
                {scfg.publication_url ? scfg.publication_url.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'Substack'}
              </p>
            </div>
            {Array.from({ length: scfg.posts_count ?? 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-white/10 last:border-0">
                <div className="h-2.5 rounded w-4/5 mb-1.5" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="h-2 rounded w-3/5" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
            ))}
          </div>
        )
      }

      // ── Wave 3 — Social proof & embeds ──────────────────────────────────────
      case 'press_feature':
        return <PressFeatureRenderer config={cfg as { features?: Array<{ outlet: string; url?: string; logo_url?: string }>; heading?: string }} accent={accent} />
      case 'twitter_embed':
        return <TwitterEmbedRenderer config={cfg as { tweet_url?: string; handle?: string; caption?: string }} accent={accent} />
      case 'awards_badges':
        return <AwardsBadgesRenderer config={cfg as { badges?: Array<{ label: string; icon_url?: string; year?: number }>; heading?: string }} accent={accent} />

      // ── Wave 4 — Direct monetisation ────────────────────────────────────────
      case 'digital_product': {
        const dc = cfg as { title?: string; description?: string; price_paise?: number; cover_image_url?: string }
        return (
          <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {dc.cover_image_url && (
              <div className="w-full aspect-[2/1] relative">
                <Image src={dc.cover_image_url} alt={dc.title ?? ''} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="p-5 flex flex-col gap-2">
              <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{dc.title || 'Digital Product'}</p>
              {dc.description && <p className="text-xs leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>{dc.description}</p>}
              <div className="mt-1 py-2.5 rounded-xl text-center text-xs font-bold" style={{ background: accent, color: '#fff' }}>
                Buy · {dc.price_paise ? `₹${(dc.price_paise / 100).toLocaleString('en-IN')}` : '—'}
              </div>
            </div>
          </div>
        )
      }
      case 'waitlist': {
        const wc = cfg as { label?: string; description?: string }
        return (
          <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{wc.label || 'Join the waitlist'}</p>
            {wc.description && <p className="text-xs leading-relaxed" style={{ color: 'var(--pp-text-muted)' }}>{wc.description}</p>}
            <div className="flex flex-col gap-2">
              <div className="h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="py-2.5 rounded-xl text-center text-xs font-bold" style={{ background: accent, color: '#fff' }}>Join waitlist</div>
            </div>
          </div>
        )
      }
      case 'fan_membership': {
        const fc = cfg as { tiers?: Array<{ name: string; price_label: string; benefits: string[]; is_featured?: boolean }>; heading?: string }
        const tiers = fc.tiers ?? []
        return (
          <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {fc.heading && <p className="font-bold text-sm text-center" style={{ color: 'var(--pp-text)' }}>{fc.heading}</p>}
            {tiers.slice(0, 2).map((t, i) => (
              <div key={i} className="rounded-xl p-3.5" style={t.is_featured ? { background: `${accent}15`, border: `1.5px solid ${accent}40` } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{t.name}</p>
                <p className="font-bold text-base" style={{ color: accent }}>{t.price_label}</p>
                {t.benefits.slice(0, 2).map((b, j) => (
                  <p key={j} className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>✓ {b}</p>
                ))}
              </div>
            ))}
          </div>
        )
      }

      case 'shop_the_look': {
        const sc = cfg as { title?: string; items?: Array<{ id: string; image_url: string; name: string; link_type: 'external' | 'internal_product'; external_url?: string; price_display?: string; internal_block_id?: string }> }
        const items = sc.items ?? []
        if (!items.length) return null
        return (
          <div className="w-full flex flex-col gap-3">
            {sc.title && <p className="font-bold text-sm" style={{ color: 'var(--pp-text)' }}>{sc.title}</p>}
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                let priceLabel = item.price_display
                if (item.link_type === 'internal_product') {
                  const sourceBlock = allBlocks.find((b) => b.id === item.internal_block_id && b.block_type === 'digital_product' && b.is_visible)
                  if (!sourceBlock) return null
                  const pc = sourceBlock.config as unknown as { price_paise?: number }
                  priceLabel = pc.price_paise ? `₹${(pc.price_paise / 100).toLocaleString('en-IN')}` : undefined
                }
                return (
                  <div key={item.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="w-full aspect-square relative bg-black/20">
                      {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" unoptimized />}
                    </div>
                    <div className="p-2.5 flex flex-col gap-0.5">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--pp-text)' }}>{item.name}</p>
                      {priceLabel && <p className="text-xs" style={{ color: accent }}>{priceLabel}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      default:
        return null
    }
  })()

  if (!rendered) return null

  return (
    <div
      ref={ref}
      data-block-id={block.id}
      className="w-full transition-all duration-200"
      style={isHighlighted ? {
        outline: `2px dashed ${accent}`,
        outlineOffset: '4px',
        borderRadius: '12px',
        animation: 'pulse-highlight 1.5s ease-in-out',
      } : undefined}
      onClick={isPreview ? (e) => e.preventDefault() : undefined}
    >
      {rendered}
    </div>
  )
})

export default BlockRenderer
