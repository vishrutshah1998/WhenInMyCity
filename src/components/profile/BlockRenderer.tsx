'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { PageBlock, SocialLinkConfig, YoutubeEmbedConfig, TextBioConfig, ImageGalleryConfig, CustomLinkConfig, InstagramEmbedConfig, QuoteBlockConfig, MarqueeTextConfig, StatsGridConfig } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'

// ---------------------------------------------------------------------------
// Platform icons (inline SVG paths) for social links
// ---------------------------------------------------------------------------

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  youtube:   'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  twitter:   'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  spotify:   'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  linkedin:  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  other:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
}

// ---------------------------------------------------------------------------
// Individual block renderers
// ---------------------------------------------------------------------------

function SocialLinkBlock({ config, isPreview, accent }: { config: SocialLinkConfig; isPreview: boolean; accent: string }) {
  const platform = config.platform ?? 'other'
  const path = PLATFORM_ICONS[platform] ?? PLATFORM_ICONS.other
  const isLink = platform === 'other'

  const inner = (
    <div
      className="relative w-full flex items-center gap-3 px-5 py-4 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] group"
      style={{
        background: accent,
        color: '#fff',
      }}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current">
        <path d={path} />
      </svg>
      <span className="flex-1 text-center font-headline font-bold tracking-wide">
        {config.title || platform.charAt(0).toUpperCase() + platform.slice(1)}
      </span>
      {isPreview && (
        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      )}
    </div>
  )

  if (isPreview) return inner

  return (
    <a href={config.url || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">
      {inner}
    </a>
  )
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
        <div className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--pp-text)' }}>
          {config.title}
        </div>
      )}
    </div>
  )

  if (isPreview) return inner

  return (
    <a href={`https://youtube.com/watch?v=${config.video_id}`} target="_blank" rel="noopener noreferrer" className="block w-full">
      {inner}
    </a>
  )
}

function TextBioBlock({ config }: { config: TextBioConfig }) {
  if (!config.body) return null
  return (
    <p className="w-full text-sm leading-relaxed whitespace-pre-wrap text-center" style={{ color: 'var(--pp-text-muted)' }}>
      {config.body}
    </p>
  )
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
    <div
      className="w-full rounded-xl overflow-hidden border transition-all duration-150 group relative"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
    >
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
          <p className="font-headline font-bold text-sm truncate" style={{ color: 'var(--pp-text)' }}>
            {config.title || 'Link'}
          </p>
          {config.description && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--pp-text-muted)' }}>
              {config.description}
            </p>
          )}
        </div>
        <span
          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: accent, color: '#fff' }}
        >
          {config.cta_label || 'View'}
        </span>
      </div>
      {isPreview && (
        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      )}
    </div>
  )

  if (isPreview) return inner

  return (
    <a href={config.url || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">
      {inner}
    </a>
  )
}

function InstagramBlock({ config }: { config: InstagramEmbedConfig }) {
  if (!config.post_url) {
    return (
      <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 flex items-center justify-center opacity-40">
        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white"><path d={PLATFORM_ICONS.instagram}/></svg>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl overflow-hidden bg-black/20 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d={PLATFORM_ICONS.instagram}/></svg>
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--pp-text)' }}>Instagram Post</p>
        <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--pp-text-muted)' }}>{config.post_url}</p>
      </div>
    </div>
  )
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
        <cite className="text-xs not-italic font-medium" style={{ color: 'var(--pp-text-muted)' }}>
          — {config.author}
        </cite>
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
      <div
        className={`whitespace-nowrap text-xs font-bold tracking-widest uppercase ${speedClass}`}
        style={{ color: textColor }}
      >
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
// BlockRenderer
// ---------------------------------------------------------------------------

interface BlockRendererProps {
  block: PageBlock
  theme: ProfileTheme
  isPreview?: boolean
  isHighlighted?: boolean
}

export default function BlockRenderer({ block, theme, isPreview = false, isHighlighted = false }: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Resolve accent colour from theme
  const ACCENT: Record<ProfileTheme['colorScheme'], string> = {
    default:  '#E8572A',
    midnight: '#818CF8',
    ocean:    '#22D3EE',
    forest:   '#6EE7B7',
    blush:    '#E11D48',
    sand:     '#B45309',
    pista:    '#2D7A4F',
    gulaal:   '#E8342A',
    neel:     '#F5A800',
    turmeric: '#F5A800',
    steel:    '#F5A800',
    sienna:   '#C04A00',
    indigo:   '#818CF8',
  }
  const accent = ACCENT[theme.colorScheme]

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  if (!block.is_visible) return null

  const cfg = block.config as unknown

  const rendered = (() => {
    switch (block.block_type) {
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
        return <InstagramBlock config={cfg as InstagramEmbedConfig} />
      case 'quote_block':
        return <QuoteBlockRenderer config={cfg as QuoteBlockConfig} accent={accent} />
      case 'marquee_text':
        return <MarqueeBlockRenderer config={cfg as MarqueeTextConfig} accent={accent} />
      case 'stats_grid':
        return <StatsGridRenderer config={cfg as StatsGridConfig} accent={accent} />
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
}
