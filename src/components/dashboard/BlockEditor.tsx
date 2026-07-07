'use client'

import React, { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { uploadGalleryImage, addBlock, updateBlock, saveSupportTipBlock, toggleBlockVisibility } from '@/app/actions/blocks'
import { PERSONA_BLOCK_SETS, type PersonaKey } from '@/lib/constants/blocks'
import type {
  BlockType,
  PageBlock,
  Event,
  UserTier,
  SocialLinkConfig,
  YoutubeEmbedConfig,
  InstagramEmbedConfig,
  ImageGalleryConfig,
  TextBioConfig,
  CustomLinkConfig,
  EventListingConfig,
  QuoteBlockConfig,
  MarqueeTextConfig,
  StatsGridConfig,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Block type picker options
// ---------------------------------------------------------------------------

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  // ── Basics ─────────────────────────────────────────────────────────────────
  { type: 'text_bio',            label: 'Text / Bio',         icon: 'notes',              description: 'A message to visitors'             },
  { type: 'social_link',         label: 'Social Link',        icon: 'share',              description: 'Single platform link'              },
  { type: 'social_links_row',    label: 'Social Icons Row',   icon: 'link',               description: 'All your socials in one row'       },
  { type: 'custom_link',         label: 'Custom Link',        icon: 'open_in_new',        description: 'Any URL with a label'              },
  { type: 'image_gallery',       label: 'Photo Gallery',      icon: 'photo_library',      description: 'Up to 6 images'                    },
  { type: 'quote_block',         label: 'Quote',              icon: 'format_quote',       description: 'A bold pull-quote'                 },
  { type: 'stats_grid',          label: 'Stats Grid',         icon: 'bar_chart',          description: 'Numbers that impress'              },
  { type: 'marquee_text',        label: 'Marquee Ticker',     icon: 'view_headline',      description: 'Scrolling text banner'             },
  // ── Video & Social Content ─────────────────────────────────────────────────
  { type: 'youtube_embed',       label: 'YouTube Video',      icon: 'smart_display',      description: 'Embed your latest video'           },
  { type: 'instagram_embed',     label: 'Instagram Embed',    icon: 'photo_camera',       description: 'Embed an Instagram post'           },
  { type: 'instagram_post',      label: 'Instagram Post',     icon: 'camera',             description: 'Show off your content'             },
  { type: 'spotify_now_playing', label: 'Spotify',            icon: 'music_note',         description: 'Share a track or playlist'         },
  { type: 'podcast_episode',     label: 'Podcast Episode',    icon: 'mic',                description: 'Feature a podcast episode'         },
  { type: 'substack_preview',    label: 'Substack',           icon: 'mail_outline',       description: 'Latest posts from your Substack'   },
  // ── Announcements & Identity ───────────────────────────────────────────────
  { type: 'announcement',        label: 'Announcement',       icon: 'campaign',           description: 'Countdown banner with a CTA'       },
  { type: 'creator_type_badge',  label: 'Creator Badge',      icon: 'verified',           description: 'Your creator type'                 },
  { type: 'city_community',      label: 'City Page',          icon: 'location_city',      description: 'Link to your city community'       },
  // ── Events ────────────────────────────────────────────────────────────────
  { type: 'event_listing',       label: 'Event',              icon: 'calendar_today',     description: 'Pin an event to your page'         },
  { type: 'event_calendar',      label: 'Event Calendar',     icon: 'calendar_month',     description: 'Monthly view of upcoming events'   },
  { type: 'past_events_gallery', label: 'Past Events',        icon: 'history',            description: 'Showcase your past events'         },
  { type: 'event_series',        label: 'Event Series',       icon: 'calendar_view_week', description: 'Recurring series of events'        },
  { type: 'rsvp_link',           label: 'RSVP Link',          icon: 'confirmation_number',description: 'External event registration link'  },
  // ── Community & Growth ────────────────────────────────────────────────────
  { type: 'newsletter_signup',   label: 'Newsletter Signup',  icon: 'email',              description: 'Collect email subscribers'         },
  { type: 'testimonial',         label: 'Testimonials',       icon: 'star',               description: 'Reviews from your attendees'       },
  { type: 'community_stats',     label: 'Community Stats',    icon: 'trending_up',        description: 'Your event milestones'             },
  { type: 'support_tip',         label: 'Support / Tip Jar',  icon: 'favorite',           description: 'UPI tip jar for supporters'        },
  { type: 'collab_invite',       label: 'Collab Invite',      icon: 'group',              description: 'Invite creators to collaborate'    },
  { type: 'venue_partnership',   label: 'Venue Partner',      icon: 'business',           description: 'Showcase partner venues'           },
  { type: 'white_label_event',   label: 'White Label Event',  icon: 'workspace_premium',  description: 'Branded partner event'             },
  // ── Wave 2 — India-first engagement ──────────────────────────────────────
  { type: 'whatsapp_community',  label: 'WhatsApp Community', icon: 'chat',               description: 'Invite visitors to your WA group'  },
  { type: 'music_player',        label: 'Music Player',       icon: 'music_note',         description: 'SoundCloud or Bandcamp embed'      },
  { type: 'booking_request',     label: 'Booking Request',    icon: 'event_available',    description: '"Book me for your event" form'     },
  // ── Wave 3 — Social proof & embeds ────────────────────────────────────────
  { type: 'press_feature',       label: 'Press Feature',      icon: 'newspaper',          description: '"As seen in" media logo row'       },
  { type: 'twitter_embed',       label: 'X / Twitter Post',   icon: 'tag',                description: 'Embed a tweet on your page'        },
  { type: 'awards_badges',       label: 'Awards & Badges',    icon: 'military_tech',      description: 'Certifications and award badges'   },
  // ── Wave 4 — Direct monetisation blocks ──────────────────────────────────
  { type: 'digital_product',     label: 'Digital Product',    icon: 'download',           description: 'Sell a download from your page'    },
  { type: 'waitlist',            label: 'Waitlist',           icon: 'format_list_numbered',description: 'Collect email sign-ups'            },
  { type: 'fan_membership',      label: 'Fan Membership',     icon: 'workspace_premium',  description: 'Showcase your membership tiers'    },
]

// ---------------------------------------------------------------------------
// Block categories for the picker
// ---------------------------------------------------------------------------

const BLOCK_CATEGORIES: { id: string; label: string; icon: string; types: BlockType[] | null }[] = [
  { id: 'all',       label: 'All',       icon: 'apps',            types: null },
  { id: 'basics',    label: 'Basics',    icon: 'text_fields',     types: ['text_bio', 'social_link', 'social_links_row', 'custom_link', 'image_gallery', 'quote_block', 'stats_grid', 'marquee_text'] },
  { id: 'media',     label: 'Media',     icon: 'play_circle',     types: ['youtube_embed', 'instagram_embed', 'instagram_post', 'spotify_now_playing', 'podcast_episode', 'substack_preview', 'music_player', 'twitter_embed'] },
  { id: 'events',    label: 'Events',    icon: 'calendar_today',  types: ['event_listing', 'event_calendar', 'past_events_gallery', 'event_series', 'rsvp_link', 'announcement'] },
  { id: 'community', label: 'Community', icon: 'group',           types: ['newsletter_signup', 'testimonial', 'community_stats', 'collab_invite', 'whatsapp_community', 'booking_request'] },
  { id: 'monetise',  label: 'Monetise',  icon: 'payments',        types: ['support_tip', 'digital_product', 'waitlist', 'fan_membership', 'white_label_event'] },
  { id: 'identity',  label: 'Identity',  icon: 'badge',           types: ['creator_type_badge', 'city_community', 'venue_partnership', 'press_feature', 'awards_badges'] },
]

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
    </label>
  )
}

const BlockIcon = React.memo(function BlockIcon({ blockType }: { blockType: BlockType }) {
  const iconMap: Record<BlockType, string> = {
    // Legacy
    social_link:         'link',
    youtube_embed:       'play_circle',
    image_gallery:       'image',
    text_bio:            'notes',
    event_listing:       'event',
    custom_link:         'open_in_new',
    instagram_embed:     'photo_camera',
    quote_block:         'format_quote',
    marquee_text:        'view_headline',
    stats_grid:          'bar_chart',
    // Identity
    creator_type_badge:  'verified',
    city_community:      'location_city',
    announcement:        'campaign',
    // Social
    social_links_row:    'share',
    instagram_post:      'photo_camera',
    spotify_now_playing: 'music_note',
    newsletter_signup:   'email',
    // Events
    event_calendar:      'calendar_month',
    event_series:        'calendar_view_week',
    past_events_gallery: 'photo_library',
    rsvp_link:           'confirmation_number',
    // Content
    podcast_episode:     'mic',
    substack_preview:    'mail',
    // Community
    testimonial:         'star',
    community_stats:     'trending_up',
    venue_partnership:   'business',
    support_tip:         'favorite',
    collab_invite:       'group',
    white_label_event:   'workspace_premium',
    // Wave 2
    whatsapp_community:  'chat',
    music_player:        'music_note',
    booking_request:     'event_available',
    // Wave 3
    press_feature:       'newspaper',
    twitter_embed:       'tag',
    awards_badges:       'military_tech',
    // Wave 4
    digital_product:     'download',
    waitlist:            'format_list_numbered',
    fan_membership:      'workspace_premium',
  }
  const icon = iconMap[blockType] ?? 'link'
  return (
    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
  )
})

function formatEventDate(startsAt: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(startsAt))
}

const BlockPreviewLabel = React.memo(function BlockPreviewLabel({ block, events }: { block: PageBlock; events: Event[] }) {
  const cfg = block.config as unknown
  const eventListingEvent = useMemo(() => {
    if (block.block_type !== 'event_listing') return undefined
    const c = cfg as EventListingConfig
    return events.find((e) => e.id === c.event_ids?.[0])
  }, [block.block_type, cfg, events])

  switch (block.block_type) {
    case 'social_link': {
      const c = cfg as SocialLinkConfig
      return <span className="font-headline font-bold text-white text-sm">{c.title || 'Social Link'}</span>
    }
    case 'youtube_embed': {
      const c = cfg as YoutubeEmbedConfig
      return (
        <div className="flex items-center gap-3 flex-1">
          {c.video_id && (
            <div className="relative w-16 aspect-video rounded-md overflow-hidden bg-black shrink-0">
              <Image src={`https://img.youtube.com/vi/${c.video_id}/mqdefault.jpg`} alt="" fill className="object-cover" />
            </div>
          )}
          <span className="font-headline font-bold text-white text-sm">{c.title || 'YouTube Video'}</span>
        </div>
      )
    }
    case 'text_bio': {
      const c = cfg as TextBioConfig
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">Bio</span>
          {c.body && <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{c.body}</p>}
        </div>
      )
    }
    case 'image_gallery': {
      const c = cfg as ImageGalleryConfig
      return (
        <span className="font-headline font-bold text-white text-sm">
          Gallery {c.images?.length ? `(${c.images.length})` : ''}
        </span>
      )
    }
    case 'event_listing': {
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">{eventListingEvent?.title ?? 'Event'}</span>
          <p className="text-white/50 text-xs mt-0.5">
            {eventListingEvent ? formatEventDate(eventListingEvent.starts_at) : 'Tap to select an event'}
          </p>
        </div>
      )
    }
    case 'custom_link': {
      const c = cfg as CustomLinkConfig
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">{c.title || 'Custom Link'}</span>
          {c.description && <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{c.description}</p>}
        </div>
      )
    }
    case 'quote_block': {
      const c = cfg as QuoteBlockConfig
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">Quote</span>
          {c.text && <p className="text-white/50 text-xs mt-0.5 line-clamp-1 italic">&ldquo;{c.text}&rdquo;</p>}
        </div>
      )
    }
    case 'marquee_text': {
      const c = cfg as MarqueeTextConfig
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">Marquee Ticker</span>
          {c.text && <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{c.text}</p>}
        </div>
      )
    }
    case 'stats_grid': {
      const c = cfg as StatsGridConfig
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">Stats Grid</span>
          {c.stats?.length > 0 && (
            <p className="text-white/50 text-xs mt-0.5">{c.stats.length} stat{c.stats.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      )
    }
    default:
      return <span className="font-headline font-bold text-white text-sm capitalize">{block.block_type.replace(/_/g, ' ')}</span>
  }
})

// ---------------------------------------------------------------------------
// Inline edit forms per block type
// ---------------------------------------------------------------------------

const inputCls = 'w-full bg-surface-container-low text-on-surface placeholder:text-outline-variant rounded-lg px-3 py-2.5 text-sm border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40'
const labelCls = 'block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1'

const SocialLinkForm = React.memo(function SocialLinkForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: SocialLinkConfig
  onSave: (cfg: SocialLinkConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [platform, setPlatform] = useState(initial.platform ?? 'instagram')
  const [title, setTitle]       = useState(initial.title ?? '')
  const [url, setUrl]           = useState(initial.url ?? '')

  const platforms = ['instagram', 'youtube', 'twitter', 'spotify', 'linkedin', 'other'] as const

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Platform</label>
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                platform === p
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Label</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow me on Instagram" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>URL</label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={inputCls} />
      </div>
      <EditFormActions onSave={() => onSave({ platform, title, url })} onCancel={onCancel} isSaving={false} />
    </div>
  )
})

const YouTubeForm = React.memo(function YouTubeForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: YoutubeEmbedConfig
  onSave: (cfg: YoutubeEmbedConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [rawUrl, setRawUrl] = useState(
    initial.video_id ? `https://www.youtube.com/watch?v=${initial.video_id}` : ''
  )
  const [title, setTitle] = useState(initial.title ?? '')

  function extractVideoId(input: string): string {
    try {
      const url = new URL(input)
      return url.searchParams.get('v') ?? url.pathname.replace('/', '') ?? input
    } catch {
      return input.trim()
    }
  }

  const videoId = extractVideoId(rawUrl)

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>YouTube URL or Video ID</label>
        <input type="text" value={rawUrl} onChange={(e) => setRawUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className={inputCls} />
      </div>
      {videoId && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
          <Image src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" fill className="object-cover opacity-80" unoptimized />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          </div>
        </div>
      )}
      <div>
        <label className={labelCls}>Title (optional)</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My latest video" className={inputCls} />
      </div>
      <EditFormActions onSave={() => onSave({ video_id: videoId, title })} onCancel={onCancel} isSaving={false} />
    </div>
  )
})

const InstagramForm = React.memo(function InstagramForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: InstagramEmbedConfig
  onSave: (cfg: InstagramEmbedConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [postUrl, setPostUrl] = useState(initial.post_url ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Instagram Post URL</label>
        <input type="url" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className={inputCls} />
      </div>
      <EditFormActions onSave={() => onSave({ post_url: postUrl })} onCancel={onCancel} isSaving={false} />
    </div>
  )
})

const TextBioForm = React.memo(function TextBioForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: TextBioConfig
  onSave: (cfg: TextBioConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [body, setBody] = useState(initial.body ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Bio / Text</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell your audience about yourself…"
          rows={4}
          maxLength={500}
          className={`${inputCls} resize-none leading-relaxed`}
        />
        <p className="text-right text-xs text-on-surface-variant mt-1">{body.length}/500</p>
      </div>
      <EditFormActions onSave={() => onSave({ body })} onCancel={onCancel} isSaving={false} />
    </div>
  )
})

const ImageGalleryForm = React.memo(function ImageGalleryForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: ImageGalleryConfig
  onSave: (cfg: ImageGalleryConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [images, setImages] = useState<Array<{ url: string; caption?: string }>>(
    initial.images?.length ? initial.images : [{ url: '' }]
  )
  const [layout, setLayout] = useState<'grid' | 'carousel'>(initial.layout ?? 'grid')
  // Per-slot UI state: whether the URL input fallback is shown, and upload status
  const [showUrl, setShowUrl] = useState<boolean[]>(() => images.map((img) => !!img.url && !img.url.startsWith('blob:')))
  const [uploading, setUploading] = useState<boolean[]>(() => images.map(() => false))
  const [uploadError, setUploadError] = useState<(string | null)[]>(() => images.map(() => null))

  function syncUiArrays(newLength: number) {
    setShowUrl((prev) => {
      const next = [...prev]
      while (next.length < newLength) next.push(false)
      return next.slice(0, newLength)
    })
    setUploading((prev) => {
      const next = [...prev]
      while (next.length < newLength) next.push(false)
      return next.slice(0, newLength)
    })
    setUploadError((prev) => {
      const next = [...prev]
      while (next.length < newLength) next.push(null)
      return next.slice(0, newLength)
    })
  }

  function updateImage(index: number, field: 'url' | 'caption', value: string) {
    setImages((prev) => prev.map((img, i) => i === index ? { ...img, [field]: value } : img))
  }

  function addImage() {
    if (images.length >= 6) return
    setImages((prev) => [...prev, { url: '' }])
    syncUiArrays(images.length + 1)
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
    syncUiArrays(images.length - 1)
  }

  function setSlotShowUrl(index: number, value: boolean) {
    setShowUrl((prev) => prev.map((v, i) => i === index ? value : v))
  }

  function setSlotUploading(index: number, value: boolean) {
    setUploading((prev) => prev.map((v, i) => i === index ? value : v))
  }

  function setSlotError(index: number, value: string | null) {
    setUploadError((prev) => prev.map((v, i) => i === index ? value : v))
  }

  async function handleFileChange(index: number, file: File | null) {
    if (!file) return
    setSlotUploading(index, true)
    setSlotError(index, null)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadGalleryImage(formData)
    setSlotUploading(index, false)
    if (result.error || !result.url) {
      setSlotError(index, result.error ?? 'Upload failed.')
    } else {
      updateImage(index, 'url', result.url)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className={`${labelCls} mb-0`}>Layout</label>
        <div className="flex gap-2">
          {(['grid', 'carousel'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                layout === l
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {images.map((img, i) => {
          const isUploading = uploading[i] ?? false
          const hasUrl = !!img.url
          const showUrlInput = showUrl[i] ?? false
          const slotError = uploadError[i] ?? null

          return (
            <div key={i} className="bg-surface-container-high rounded-xl p-3 space-y-2">
              {/* Slot header */}
              <div className="flex items-center justify-between">
                <span className={`${labelCls} mb-0`}>Photo {i + 1}</span>
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="text-error text-xs font-semibold hover:opacity-80 transition-opacity"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Image slot body */}
              {hasUrl ? (
                /* ── Thumbnail view ── */
                <div className="space-y-2">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-surface-container-highest">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { updateImage(i, 'url', ''); setSlotShowUrl(i, false) }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  {/* Change button */}
                  <label className="flex items-center gap-1.5 w-fit cursor-pointer text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    Change image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => handleFileChange(i, e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              ) : showUrlInput ? (
                /* ── URL input fallback ── */
                <div className="space-y-2">
                  <input
                    type="url"
                    value={img.url}
                    onChange={(e) => updateImage(i, 'url', e.target.value)}
                    placeholder="https://..."
                    className={inputCls}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setSlotShowUrl(i, false)}
                    className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Upload instead
                  </button>
                </div>
              ) : (
                /* ── Upload zone ── */
                <div className="space-y-2">
                  <label className={`relative flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    isUploading
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-outline-variant hover:border-primary hover:bg-primary/5'
                  }`}>
                    {isUploading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-on-surface-variant">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant">upload_file</span>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-on-surface">Click to upload</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">JPEG, PNG, WebP or GIF · max 10 MB</p>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(e) => handleFileChange(i, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {slotError && (
                    <p className="text-xs text-error">{slotError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSlotShowUrl(i, true)}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors underline underline-offset-2"
                  >
                    Or paste a URL instead
                  </button>
                </div>
              )}

              {/* Caption (always shown when there's a URL) */}
              {hasUrl && (
                <input
                  type="text"
                  value={img.caption ?? ''}
                  onChange={(e) => updateImage(i, 'caption', e.target.value)}
                  placeholder="Caption (optional)"
                  className={inputCls}
                />
              )}
            </div>
          )
        })}
      </div>

      {images.length < 6 && (
        <button
          type="button"
          onClick={addImage}
          className="w-full py-2.5 border border-dashed border-outline-variant hover:border-primary rounded-lg text-sm font-semibold text-on-surface-variant hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add photo ({images.length}/6)
        </button>
      )}

      <EditFormActions
        onSave={() => onSave({ images: images.filter((img) => img.url.trim()), layout })}
        onCancel={onCancel}
        isSaving={false}
      />
    </div>
  )
})

const CustomLinkForm = React.memo(function CustomLinkForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: CustomLinkConfig
  onSave: (cfg: CustomLinkConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [title, setTitle]       = useState(initial.title ?? '')
  const [url, setUrl]           = useState(initial.url ?? '')
  const [description, setDesc]  = useState(initial.description ?? '')
  const [ctaLabel, setCtaLabel] = useState(initial.cta_label ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Link" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>URL</label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Description (optional)</label>
        <input type="text" value={description} onChange={(e) => setDesc(e.target.value)} placeholder="A short description" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Button label (optional)</label>
        <input type="text" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View, Book Now, Learn More…" className={inputCls} />
      </div>
      <EditFormActions
        onSave={() => onSave({ title, url, description: description || undefined, cta_label: ctaLabel || undefined })}
        onCancel={onCancel}
        isSaving={false}
      />
    </div>
  )
})

const EventPickerForm = React.memo(function EventPickerForm({
  initial,
  events,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: EventListingConfig
  events: Event[]
  onSave: (cfg: EventListingConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [pickedId, setPickedId] = useState<string | null>(initial.event_ids?.[0] ?? null)

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">You don&apos;t have any upcoming published events yet.</p>
        <a
          href="/dashboard/events/create"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create your first event
        </a>
        <EditFormActions onSave={() => onSave({})} onCancel={onCancel} isSaving={false} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className={labelCls}>Select an event to display</label>
      <div className="space-y-2">
        {events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => setPickedId(ev.id)}
            className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
              pickedId === ev.id
                ? 'border-primary bg-primary/10'
                : 'border-white/5 bg-surface-container-low hover:border-white/20'
            }`}
          >
            <p className="font-semibold text-sm text-on-surface">{ev.title}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {formatEventDate(ev.starts_at)} · {ev.venue_name}
            </p>
          </button>
        ))}
      </div>
      <a
        href="/dashboard/events/create"
        className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        Create a new event
      </a>
      <EditFormActions
        onSave={() => onSave(pickedId ? { event_ids: [pickedId] } : {})}
        onCancel={onCancel}
        isSaving={false}
      />
    </div>
  )
})

const QuoteBlockForm = React.memo(function QuoteBlockForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: QuoteBlockConfig
  onSave: (cfg: QuoteBlockConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [text, setText]     = useState(initial.text ?? '')
  const [author, setAuthor] = useState(initial.author ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Quote text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Something profound you'd like to share…"
          rows={3}
          maxLength={280}
          className={`${inputCls} resize-none leading-relaxed`}
        />
        <p className="text-right text-xs text-on-surface-variant mt-1">{text.length}/280</p>
      </div>
      <div>
        <label className={labelCls}>Attribution (optional)</label>
        <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="— Your name, or a source" className={inputCls} />
      </div>
      <EditFormActions onSave={() => onSave({ text, author: author || undefined })} onCancel={onCancel} isSaving={false} />
    </div>
  )
})

const MarqueeTextForm = React.memo(function MarqueeTextForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: MarqueeTextConfig
  onSave: (cfg: MarqueeTextConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [text, setText]   = useState(initial.text ?? '')
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>(initial.speed ?? 'normal')
  const [bg, setBg]       = useState<'primary' | 'ink' | 'chalk'>(initial.bg ?? 'primary')

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Ticker text</label>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your message · repeats across the banner ·" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Speed</label>
        <div className="flex gap-2">
          {(['slow', 'normal', 'fast'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                speed === s ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Background</label>
        <div className="flex gap-2">
          {([
            { id: 'primary' as const, label: 'Accent' },
            { id: 'ink'     as const, label: 'Ink'    },
            { id: 'chalk'   as const, label: 'Chalk'  },
          ]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBg(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                bg === opt.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <EditFormActions onSave={() => onSave({ text, speed, bg })} onCancel={onCancel} isSaving={false} />
    </div>
  )
})

const StatsGridForm = React.memo(function StatsGridForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: StatsGridConfig
  onSave: (cfg: StatsGridConfig) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>(
    initial.stats?.length ? initial.stats : [{ value: '', label: '' }]
  )

  function updateStat(index: number, field: 'value' | 'label', val: string) {
    setStats((prev) => prev.map((s, i) => i === index ? { ...s, [field]: val } : s))
  }

  function addStat() {
    if (stats.length >= 6) return
    setStats((prev) => [...prev, { value: '', label: '' }])
  }

  function removeStat(index: number) {
    setStats((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {stats.map((stat, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <input
                type="text"
                value={stat.value}
                onChange={(e) => updateStat(i, 'value', e.target.value)}
                placeholder="10K+"
                className={inputCls}
              />
              <input
                type="text"
                value={stat.label}
                onChange={(e) => updateStat(i, 'label', e.target.value)}
                placeholder="Followers"
                className={inputCls}
              />
            </div>
            {stats.length > 1 && (
              <button
                type="button"
                onClick={() => removeStat(i)}
                className="mt-2 w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>
        ))}
      </div>
      {stats.length < 6 && (
        <button
          type="button"
          onClick={addStat}
          className="w-full py-2.5 border border-dashed border-outline-variant hover:border-primary rounded-lg text-sm font-semibold text-on-surface-variant hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add stat ({stats.length}/6)
        </button>
      )}
      <EditFormActions
        onSave={() => onSave({ stats: stats.filter((s) => s.value.trim() || s.label.trim()) })}
        onCancel={onCancel}
        isSaving={false}
      />
    </div>
  )
})

// ---------------------------------------------------------------------------
// New block-type forms (Wave 1)
// ---------------------------------------------------------------------------

type SimpleFormProps = { initial: unknown; onSave: (cfg: unknown) => void; onCancel: () => void; isSaving: boolean }
type EventFormProps  = SimpleFormProps & { events: Event[] }

function AnnouncementForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { text?: string; background_style?: string; show_countdown?: boolean; countdown_target?: string; cta_label?: string; cta_url?: string }
  const [text,            setText]            = useState(cfg.text ?? '')
  const [bg,              setBg]              = useState<'primary'|'dark'|'accent'>((cfg.background_style as 'primary'|'dark'|'accent') ?? 'primary')
  const [showCountdown,   setShowCountdown]   = useState(cfg.show_countdown ?? false)
  const [countdownTarget, setCountdownTarget] = useState(cfg.countdown_target ?? '')
  const [ctaLabel,        setCtaLabel]        = useState(cfg.cta_label ?? '')
  const [ctaUrl,          setCtaUrl]          = useState(cfg.cta_url ?? '')
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Announcement text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={280} className={`${inputCls} resize-none leading-relaxed`} placeholder="Something exciting is happening…" />
        <p className="text-right text-xs text-on-surface-variant mt-1">{text.length}/280</p>
      </div>
      <div>
        <label className={labelCls}>Background style</label>
        <div className="flex gap-2">
          {([{ id: 'primary', label: 'Accent' }, { id: 'dark', label: 'Dark' }, { id: 'accent', label: 'Tertiary' }] as const).map(opt => (
            <button key={opt.id} type="button" onClick={() => setBg(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${bg === opt.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className={`${labelCls} mb-0`}>Show countdown timer</label>
        <ToggleSwitch checked={showCountdown} onChange={setShowCountdown} />
      </div>
      {showCountdown && (
        <div>
          <label className={labelCls}>Countdown target date & time</label>
          <input type="datetime-local" value={countdownTarget} onChange={e => setCountdownTarget(e.target.value)} className={inputCls} />
        </div>
      )}
      <div>
        <label className={labelCls}>Button label (optional)</label>
        <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Register Now" className={inputCls} />
      </div>
      {ctaLabel && (
        <div>
          <label className={labelCls}>Button URL</label>
          <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://" className={inputCls} />
        </div>
      )}
      <EditFormActions onSave={() => onSave({ text, background_style: bg, show_countdown: showCountdown, countdown_target: showCountdown ? countdownTarget : undefined, cta_label: ctaLabel || undefined, cta_url: ctaUrl || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function SocialLinksRowForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { links?: Array<{ platform: string; url: string }> }
  const [links, setLinks] = useState<Array<{ platform: string; url: string }>>(
    cfg.links?.length ? cfg.links : [{ platform: 'instagram', url: '' }]
  )
  const platforms = ['instagram', 'youtube', 'twitter', 'spotify', 'linkedin', 'tiktok', 'website', 'other']
  function updateLink(i: number, field: 'platform' | 'url', val: string) {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className="bg-surface-container-high rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`${labelCls} mb-0`}>Link {i + 1}</span>
              {links.length > 1 && (
                <button type="button" onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))} className="text-error text-xs font-semibold hover:opacity-80">Remove</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map(p => (
                <button key={p} type="button" onClick={() => updateLink(i, 'platform', p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${link.platform === p ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}`}>
                  {p}
                </button>
              ))}
            </div>
            <input type="url" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} placeholder="https://" className={inputCls} />
          </div>
        ))}
      </div>
      {links.length < 8 && (
        <button type="button" onClick={() => setLinks(prev => [...prev, { platform: 'instagram', url: '' }])}
          className="w-full py-2.5 border border-dashed border-outline-variant hover:border-primary rounded-lg text-sm font-semibold text-on-surface-variant hover:text-primary transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">add</span>Add link ({links.length}/8)
        </button>
      )}
      <EditFormActions onSave={() => onSave({ links: links.filter(l => l.url.trim()) })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function SpotifyForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { spotify_user_id?: string }
  const [userId, setUserId] = useState(cfg.spotify_user_id ?? '')
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Spotify profile URL or username</label>
        <input type="text" value={userId} onChange={e => setUserId(e.target.value)} placeholder="https://open.spotify.com/artist/… or your username" className={inputCls} />
        <p className="text-xs text-on-surface-variant mt-1.5">Paste your Spotify artist/profile link</p>
      </div>
      <EditFormActions onSave={() => onSave({ spotify_user_id: userId.trim() })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function NewsletterSignupForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { label?: string; placeholder?: string; button_label?: string; success_message?: string }
  const [label,          setLabel]          = useState(cfg.label ?? 'Join my newsletter')
  const [placeholder,    setPlaceholder]    = useState(cfg.placeholder ?? 'your@email.com')
  const [buttonLabel,    setButtonLabel]    = useState(cfg.button_label ?? 'Subscribe')
  const [successMessage, setSuccessMessage] = useState(cfg.success_message ?? "You're in! Thanks for subscribing.")
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Heading</label><input type="text" value={label} onChange={e => setLabel(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Input placeholder</label><input type="text" value={placeholder} onChange={e => setPlaceholder(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Button text</label><input type="text" value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Success message</label><input type="text" value={successMessage} onChange={e => setSuccessMessage(e.target.value)} className={inputCls} /></div>
      <EditFormActions onSave={() => onSave({ label, placeholder, button_label: buttonLabel, success_message: successMessage })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function EventCalendarForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { months_ahead?: number; show_past_events?: boolean }
  const [monthsAhead,    setMonthsAhead]    = useState(cfg.months_ahead ?? 1)
  const [showPastEvents, setShowPastEvents] = useState(cfg.show_past_events ?? false)
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Months to show ahead</label>
        <div className="flex gap-2">
          {[1, 2, 3].map(m => (
            <button key={m} type="button" onClick={() => setMonthsAhead(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${monthsAhead === m ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className={`${labelCls} mb-0`}>Show past events</label>
        <ToggleSwitch checked={showPastEvents} onChange={setShowPastEvents} />
      </div>
      <EditFormActions onSave={() => onSave({ months_ahead: monthsAhead, show_past_events: showPastEvents })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function EventSeriesForm({ initial, onSave, onCancel, isSaving, events }: EventFormProps) {
  const cfg = initial as { series_name?: string; frequency?: string; linked_event_ids?: string[] }
  const [seriesName,      setSeriesName]      = useState(cfg.series_name ?? '')
  const [frequency,       setFrequency]       = useState(cfg.frequency ?? 'monthly')
  const [linkedEventIds,  setLinkedEventIds]  = useState<string[]>(cfg.linked_event_ids ?? [])
  function toggleEvent(id: string) {
    setLinkedEventIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Series name</label><input type="text" value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="e.g. Monday Open Mic" className={inputCls} /></div>
      <div>
        <label className={labelCls}>Frequency</label>
        <div className="flex flex-wrap gap-2">
          {['weekly', 'biweekly', 'monthly', 'custom'].map(f => (
            <button key={f} type="button" onClick={() => setFrequency(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${frequency === f ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {events.length > 0 && (
        <div>
          <label className={labelCls}>Link events to this series</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {events.map(ev => (
              <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)}
                className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${linkedEventIds.includes(ev.id) ? 'border-primary bg-primary/10' : 'border-white/5 bg-surface-container-low hover:border-white/20'}`}>
                <p className="font-semibold text-sm text-on-surface">{ev.title}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{formatEventDate(ev.starts_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <EditFormActions onSave={() => onSave({ series_name: seriesName, frequency, linked_event_ids: linkedEventIds })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function PastEventsGalleryForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { layout?: string; max_events?: number; show_attendee_count?: boolean }
  const [layout,            setLayout]            = useState<'grid'|'list'>((cfg.layout as 'grid'|'list') ?? 'grid')
  const [maxEvents,         setMaxEvents]         = useState(cfg.max_events ?? 6)
  const [showAttendeeCount, setShowAttendeeCount] = useState(cfg.show_attendee_count ?? true)
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Layout</label>
        <div className="flex gap-2">
          {(['grid', 'list'] as const).map(l => (
            <button key={l} type="button" onClick={() => setLayout(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${layout === l ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Max events to show</label>
        <div className="flex gap-2">
          {[3, 6, 9, 12].map(n => (
            <button key={n} type="button" onClick={() => setMaxEvents(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${maxEvents === n ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className={`${labelCls} mb-0`}>Show attendee count</label>
        <ToggleSwitch checked={showAttendeeCount} onChange={setShowAttendeeCount} />
      </div>
      <EditFormActions onSave={() => onSave({ layout, max_events: maxEvents, show_attendee_count: showAttendeeCount })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function RsvpLinkForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { url?: string; label?: string; emoji?: string; description?: string }
  const [url,         setUrl]         = useState(cfg.url ?? '')
  const [label,       setLabel]       = useState(cfg.label ?? 'Register Now')
  const [emoji,       setEmoji]       = useState(cfg.emoji ?? '')
  const [description, setDescription] = useState(cfg.description ?? '')
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Registration URL</label><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={inputCls} /></div>
      <div><label className={labelCls}>Button label</label><input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Register Now" className={inputCls} /></div>
      <div><label className={labelCls}>Emoji (optional)</label><input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🎟️" maxLength={2} className={inputCls} /></div>
      <div><label className={labelCls}>Description (optional)</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Spots limited — register early" className={inputCls} /></div>
      <EditFormActions onSave={() => onSave({ url, label, emoji: emoji || undefined, description: description || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function PodcastEpisodeForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { title?: string; episode_url?: string; platform?: string; artwork_url?: string; duration_secs?: number }
  const [title,       setTitle]       = useState(cfg.title ?? '')
  const [episodeUrl,  setEpisodeUrl]  = useState(cfg.episode_url ?? '')
  const [platform,    setPlatform]    = useState(cfg.platform ?? 'spotify')
  const [artworkUrl,  setArtworkUrl]  = useState(cfg.artwork_url ?? '')
  const [durationSecs, setDurationSecs] = useState(cfg.duration_secs ?? 0)
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Episode title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Episode 42: My Story" className={inputCls} /></div>
      <div><label className={labelCls}>Episode URL</label><input type="url" value={episodeUrl} onChange={e => setEpisodeUrl(e.target.value)} placeholder="https://open.spotify.com/episode/…" className={inputCls} /></div>
      <div>
        <label className={labelCls}>Platform</label>
        <div className="flex flex-wrap gap-2">
          {['spotify', 'apple', 'google', 'other'].map(p => (
            <button key={p} type="button" onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${platform === p ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div><label className={labelCls}>Artwork URL (optional)</label><input type="url" value={artworkUrl} onChange={e => setArtworkUrl(e.target.value)} placeholder="https://…" className={inputCls} /></div>
      <div>
        <label className={labelCls}>Duration (minutes, optional)</label>
        <input type="number" value={durationSecs ? Math.round(durationSecs / 60) : ''} onChange={e => setDurationSecs(parseInt(e.target.value || '0') * 60)} min={0} className={inputCls} placeholder="45" />
      </div>
      <EditFormActions onSave={() => onSave({ title, episode_url: episodeUrl, platform, artwork_url: artworkUrl || undefined, duration_secs: durationSecs || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function SubstackPreviewForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { publication_url?: string; posts_count?: number; show_subscribe_button?: boolean }
  const [publicationUrl,      setPublicationUrl]      = useState(cfg.publication_url ?? '')
  const [postsCount,          setPostsCount]          = useState(cfg.posts_count ?? 3)
  const [showSubscribeButton, setShowSubscribeButton] = useState(cfg.show_subscribe_button ?? true)
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Substack publication URL</label>
        <input type="url" value={publicationUrl} onChange={e => setPublicationUrl(e.target.value)} placeholder="https://yournewsletter.substack.com" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Posts to show</label>
        <div className="flex gap-2">
          {[2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setPostsCount(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${postsCount === n ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className={`${labelCls} mb-0`}>Show subscribe button</label>
        <ToggleSwitch checked={showSubscribeButton} onChange={setShowSubscribeButton} />
      </div>
      <EditFormActions onSave={() => onSave({ publication_url: publicationUrl, posts_count: postsCount, show_subscribe_button: showSubscribeButton })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function SupportTipForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { message?: string; upi_vpa?: string; upi_vpa_encrypted?: string; preset_amounts_paise?: number[]; thank_you_message?: string }
  const hasExistingVpa = !!cfg.upi_vpa_encrypted && !cfg.upi_vpa
  const [message,        setMessage]        = useState(cfg.message ?? 'Support my work')
  const [upiVpa,         setUpiVpa]         = useState(cfg.upi_vpa ?? '')
  const [thankYouMsg,    setThankYouMsg]    = useState(cfg.thank_you_message ?? 'Thank you so much! 🙏')
  const defaultAmounts   = (cfg.preset_amounts_paise ?? [5000, 10000, 20000]).map(p => p / 100)
  const [amounts,        setAmounts]        = useState<number[]>(defaultAmounts)
  function updateAmount(i: number, val: string) {
    setAmounts(prev => prev.map((a, idx) => idx === i ? parseFloat(val) || 0 : a))
  }
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Message</label><input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Support my work ❤️" className={inputCls} /></div>
      <div>
        <label className={labelCls}>UPI VPA (your UPI ID){hasExistingVpa && <span className="text-primary ml-1 normal-case">(already set — enter to change)</span>}</label>
        <input type="text" value={upiVpa} onChange={e => setUpiVpa(e.target.value)} placeholder={hasExistingVpa ? 'Enter new UPI ID to change' : 'yourname@upi'} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Preset amounts (₹)</label>
        <div className="flex gap-2">
          {amounts.map((amt, i) => (
            <input key={i} type="number" value={amt || ''} onChange={e => updateAmount(i, e.target.value)} min={1} placeholder="100" className={`${inputCls} text-center`} />
          ))}
        </div>
      </div>
      <div><label className={labelCls}>Thank-you message</label><input type="text" value={thankYouMsg} onChange={e => setThankYouMsg(e.target.value)} className={inputCls} /></div>
      <EditFormActions
        onSave={() => onSave({ message, upi_vpa: upiVpa || cfg.upi_vpa || '', preset_amounts_paise: amounts.map(a => Math.round(a * 100)), thank_you_message: thankYouMsg })}
        onCancel={onCancel} isSaving={isSaving}
      />
    </div>
  )
}

function CommunityStatsForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { show_events_hosted?: boolean; show_total_attendees?: boolean; show_average_rating?: boolean }
  const [showEvents,    setShowEvents]    = useState(cfg.show_events_hosted ?? true)
  const [showAttendees, setShowAttendees] = useState(cfg.show_total_attendees ?? true)
  const [showRating,    setShowRating]    = useState(cfg.show_average_rating ?? true)
  return (
    <div className="space-y-4">
      <p className="text-xs text-on-surface-variant">Stats are automatically calculated from your event history.</p>
      <div className="space-y-3">
        {[
          { label: 'Events hosted', val: showEvents, set: setShowEvents },
          { label: 'Total attendees', val: showAttendees, set: setShowAttendees },
          { label: 'Average rating', val: showRating, set: setShowRating },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-on-surface">{item.label}</span>
            <ToggleSwitch checked={item.val} onChange={item.set} />
          </div>
        ))}
      </div>
      <EditFormActions onSave={() => onSave({ show_events_hosted: showEvents, show_total_attendees: showAttendees, show_average_rating: showRating })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function CollabInviteForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { collab_types?: string[]; message?: string; availability_note?: string }
  const [types,   setTypes]   = useState<string[]>(cfg.collab_types ?? [])
  const [message, setMessage] = useState(cfg.message ?? '')
  const [avail,   setAvail]   = useState(cfg.availability_note ?? '')
  const ALL_TYPES = ['photography', 'videography', 'sound_engineering', 'mc_hosting', 'art_installation', 'promotion', 'sponsorship', 'venue_sharing', 'co_hosting']
  function toggleType(t: string) { setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]) }
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Collaboration types</label>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${types.includes(t) ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
      <div><label className={labelCls}>Message (optional)</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="I'm open to collaborating on live events…" className={`${inputCls} resize-none`} /></div>
      <div><label className={labelCls}>Availability note (optional)</label><input type="text" value={avail} onChange={e => setAvail(e.target.value)} placeholder="Available weekends in Pune" className={inputCls} /></div>
      <EditFormActions onSave={() => onSave({ collab_types: types, message: message || undefined, availability_note: avail || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function WhiteLabelEventForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { partner_name?: string; partner_logo_url?: string; event_title?: string; event_description?: string; ticket_url?: string }
  const [partnerName, setPartnerName] = useState(cfg.partner_name ?? '')
  const [logoUrl,     setLogoUrl]     = useState(cfg.partner_logo_url ?? '')
  const [eventTitle,  setEventTitle]  = useState(cfg.event_title ?? '')
  const [eventDesc,   setEventDesc]   = useState(cfg.event_description ?? '')
  const [ticketUrl,   setTicketUrl]   = useState(cfg.ticket_url ?? '')
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Partner / brand name</label><input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Acme Corp" className={inputCls} /></div>
      <div><label className={labelCls}>Partner logo URL (optional)</label><input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" className={inputCls} /></div>
      <div><label className={labelCls}>Event title</label><input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Acme × WIMC Launch Night" className={inputCls} /></div>
      <div><label className={labelCls}>Event description (optional)</label><textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
      <div><label className={labelCls}>Ticket / info URL</label><input type="url" value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://…" className={inputCls} /></div>
      <EditFormActions onSave={() => onSave({ partner_name: partnerName, partner_logo_url: logoUrl || undefined, event_title: eventTitle, event_description: eventDesc || undefined, ticket_url: ticketUrl })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function VenuePartnershipForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { venue_ids?: string[]; display_style?: string }
  const [rawIds,        setRawIds]        = useState((cfg.venue_ids ?? []).join('\n'))
  const [displayStyle,  setDisplayStyle]  = useState<'cards'|'row'>((cfg.display_style as 'cards'|'row') ?? 'cards')
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Venue / venue IDs (one per line)</label>
        <textarea value={rawIds} onChange={e => setRawIds(e.target.value)} rows={3} placeholder="Paste venue IDs from your dashboard" className={`${inputCls} resize-none font-mono text-xs`} />
        <p className="text-xs text-on-surface-variant mt-1">Find venue IDs in your Venues dashboard</p>
      </div>
      <div>
        <label className={labelCls}>Display style</label>
        <div className="flex gap-2">
          {(['cards', 'row'] as const).map(s => (
            <button key={s} type="button" onClick={() => setDisplayStyle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${displayStyle === s ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <EditFormActions
        onSave={() => onSave({ venue_ids: rawIds.split('\n').map(s => s.trim()).filter(Boolean), display_style: displayStyle })}
        onCancel={onCancel} isSaving={isSaving}
      />
    </div>
  )
}

function WhatsAppCommunityForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { label?: string; invite_url?: string; member_count_label?: string }
  const [label,       setLabel]       = useState(cfg.label ?? 'Join my WhatsApp community')
  const [inviteUrl,   setInviteUrl]   = useState(cfg.invite_url ?? '')
  const [memberLabel, setMemberLabel] = useState(cfg.member_count_label ?? '')
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Button label</label><input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Join my WhatsApp community" className={inputCls} /></div>
      <div>
        <label className={labelCls}>WhatsApp invite link</label>
        <input type="url" value={inviteUrl} onChange={e => setInviteUrl(e.target.value)} placeholder="https://chat.whatsapp.com/…" className={inputCls} />
        <p className="text-xs text-on-surface-variant mt-1">Open WhatsApp → Group info → Invite link</p>
      </div>
      <div><label className={labelCls}>Member count label (optional)</label><input type="text" value={memberLabel} onChange={e => setMemberLabel(e.target.value)} placeholder="1,200+ members" className={inputCls} /></div>
      <EditFormActions onSave={() => onSave({ label, invite_url: inviteUrl, member_count_label: memberLabel || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function MusicPlayerForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { platform?: string; embed_url?: string; track_title?: string; artist?: string }
  const [platform,    setPlatform]    = useState<'soundcloud' | 'bandcamp'>((cfg.platform as 'soundcloud' | 'bandcamp') ?? 'soundcloud')
  const [embedUrl,    setEmbedUrl]    = useState(cfg.embed_url ?? '')
  const [trackTitle,  setTrackTitle]  = useState(cfg.track_title ?? '')
  const [artist,      setArtist]      = useState(cfg.artist ?? '')
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Platform</label>
        <div className="flex gap-2">
          {(['soundcloud', 'bandcamp'] as const).map(p => (
            <button key={p} type="button" onClick={() => setPlatform(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${platform === p ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>
          {platform === 'soundcloud' ? 'SoundCloud track/set URL' : 'Bandcamp embed URL'}
        </label>
        <input type="url" value={embedUrl} onChange={e => setEmbedUrl(e.target.value)}
          placeholder={platform === 'soundcloud' ? 'https://soundcloud.com/artist/track' : 'https://bandcamp.com/EmbeddedPlayer/album=…'}
          className={inputCls} />
        {platform === 'soundcloud' && (
          <p className="text-xs text-on-surface-variant mt-1">Paste the track or playlist URL — WIMC will build the embed automatically</p>
        )}
      </div>
      <div><label className={labelCls}>Track / album title (optional)</label><input type="text" value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="My Latest EP" className={inputCls} /></div>
      <div><label className={labelCls}>Artist name (optional)</label><input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Your stage name" className={inputCls} /></div>
      <EditFormActions onSave={() => onSave({ platform, embed_url: embedUrl, track_title: trackTitle || undefined, artist: artist || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function BookingRequestForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { label?: string; description?: string; categories?: string[] }
  const [label,       setLabel]       = useState(cfg.label ?? 'Book me for your event')
  const [description, setDescription] = useState(cfg.description ?? '')
  const [rawCats,     setRawCats]     = useState((cfg.categories ?? ['Corporate Events', 'Private Parties', 'Festivals', 'Weddings', 'College Fests']).join('\n'))
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Heading</label><input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Book me for your event" className={inputCls} /></div>
      <div><label className={labelCls}>Description (optional)</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Available for corporate shows, festivals, and private events across India" className={`${inputCls} resize-none`} /></div>
      <div>
        <label className={labelCls}>Event categories (one per line)</label>
        <textarea value={rawCats} onChange={e => setRawCats(e.target.value)} rows={5} className={`${inputCls} resize-none font-mono text-xs`} />
        <p className="text-xs text-on-surface-variant mt-1">Shown as selector chips on the form</p>
      </div>
      <EditFormActions
        onSave={() => onSave({ label, description: description || undefined, categories: rawCats.split('\n').map(s => s.trim()).filter(Boolean) })}
        onCancel={onCancel} isSaving={isSaving}
      />
    </div>
  )
}

function PressFeatureForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { features?: Array<{ outlet: string; url?: string; logo_url?: string }>; heading?: string }
  const [heading,  setHeading]  = useState(cfg.heading ?? 'As seen in')
  const [features, setFeatures] = useState<Array<{ outlet: string; url: string; logo_url: string }>>(
    (cfg.features ?? [{ outlet: '', url: '', logo_url: '' }]).map(f => ({
      outlet:   f.outlet ?? '',
      url:      f.url ?? '',
      logo_url: f.logo_url ?? '',
    }))
  )

  function updateFeature(i: number, field: 'outlet' | 'url' | 'logo_url', val: string) {
    setFeatures(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }
  function addFeature() {
    if (features.length >= 8) return
    setFeatures(prev => [...prev, { outlet: '', url: '', logo_url: '' }])
  }
  function removeFeature(i: number) {
    setFeatures(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Section heading</label>
        <input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="As seen in" className={inputCls} />
      </div>
      <div className="space-y-3">
        <label className={labelCls}>Media outlets</label>
        {features.map((f, i) => (
          <div key={i} className="space-y-2 p-3 rounded-lg bg-surface-container-low border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Outlet {i + 1}</span>
              {features.length > 1 && (
                <button type="button" onClick={() => removeFeature(i)} className="text-xs text-error hover:underline">Remove</button>
              )}
            </div>
            <input type="text" value={f.outlet} onChange={e => updateFeature(i, 'outlet', e.target.value)} placeholder="The Hindu, Times Now, YourStory…" className={inputCls} />
            <input type="url" value={f.url} onChange={e => updateFeature(i, 'url', e.target.value)} placeholder="Article URL (optional)" className={inputCls} />
            <input type="url" value={f.logo_url} onChange={e => updateFeature(i, 'logo_url', e.target.value)} placeholder="Logo image URL (optional)" className={inputCls} />
          </div>
        ))}
        {features.length < 8 && (
          <button type="button" onClick={addFeature} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>
            Add outlet
          </button>
        )}
      </div>
      <EditFormActions
        onSave={() => onSave({
          heading: heading || undefined,
          features: features.filter(f => f.outlet.trim()).map(f => ({
            outlet: f.outlet.trim(),
            url: f.url.trim() || undefined,
            logo_url: f.logo_url.trim() || undefined,
          })),
        })}
        onCancel={onCancel}
        isSaving={isSaving}
      />
    </div>
  )
}

function TwitterEmbedForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { tweet_url?: string; handle?: string; caption?: string }
  const [tweetUrl, setTweetUrl] = useState(cfg.tweet_url ?? '')
  const [handle,   setHandle]   = useState(cfg.handle ?? '')
  const [caption,  setCaption]  = useState(cfg.caption ?? '')
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Post URL</label>
        <input type="url" value={tweetUrl} onChange={e => setTweetUrl(e.target.value)} placeholder="https://x.com/user/status/123456789" className={inputCls} />
        <p className="text-xs text-on-surface-variant mt-1">Paste any X (Twitter) post link</p>
      </div>
      <div>
        <label className={labelCls}>Author handle (optional)</label>
        <input type="text" value={handle} onChange={e => setHandle(e.target.value.replace(/^@/, ''))} placeholder="yourhandle" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Preview caption (optional)</label>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} maxLength={280} placeholder="Short excerpt from the post…" className={`${inputCls} resize-none`} />
        <p className="text-right text-xs text-on-surface-variant mt-1">{caption.length}/280</p>
      </div>
      <EditFormActions onSave={() => onSave({ tweet_url: tweetUrl, handle: handle.trim() || undefined, caption: caption.trim() || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function AwardsBadgesForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { badges?: Array<{ label: string; icon_url?: string; year?: number }>; heading?: string }
  const [heading, setHeading] = useState(cfg.heading ?? '')
  const [badges,  setBadges]  = useState<Array<{ label: string; icon_url: string; year: string }>>(
    (cfg.badges ?? [{ label: '', icon_url: '', year: 0 }]).map(b => ({
      label:    b.label ?? '',
      icon_url: b.icon_url ?? '',
      year:     b.year ? String(b.year) : '',
    }))
  )

  function updateBadge(i: number, field: 'label' | 'icon_url' | 'year', val: string) {
    setBadges(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b))
  }
  function addBadge() {
    if (badges.length >= 12) return
    setBadges(prev => [...prev, { label: '', icon_url: '', year: '' }])
  }
  function removeBadge(i: number) {
    setBadges(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Section heading (optional)</label>
        <input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="Awards & Recognition" className={inputCls} />
      </div>
      <div className="space-y-3">
        <label className={labelCls}>Badges</label>
        {badges.map((b, i) => (
          <div key={i} className="space-y-2 p-3 rounded-lg bg-surface-container-low border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Badge {i + 1}</span>
              {badges.length > 1 && (
                <button type="button" onClick={() => removeBadge(i)} className="text-xs text-error hover:underline">Remove</button>
              )}
            </div>
            <input type="text" value={b.label} onChange={e => updateBadge(i, 'label', e.target.value)} placeholder="Best New Artist 2024" className={inputCls} />
            <input type="url" value={b.icon_url} onChange={e => updateBadge(i, 'icon_url', e.target.value)} placeholder="Icon URL (optional)" className={inputCls} />
            <input type="number" value={b.year} onChange={e => updateBadge(i, 'year', e.target.value)} placeholder="Year (e.g. 2024)" min={1900} max={2099} className={inputCls} />
          </div>
        ))}
        {badges.length < 12 && (
          <button type="button" onClick={addBadge} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>
            Add badge
          </button>
        )}
      </div>
      <EditFormActions
        onSave={() => onSave({
          heading: heading.trim() || undefined,
          badges: badges.filter(b => b.label.trim()).map(b => ({
            label: b.label.trim(),
            icon_url: b.icon_url.trim() || undefined,
            year: b.year ? parseInt(b.year, 10) : undefined,
          })),
        })}
        onCancel={onCancel}
        isSaving={isSaving}
      />
    </div>
  )
}

function DigitalProductForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { title?: string; description?: string; price_paise?: number; file_url?: string; cover_image_url?: string }
  const [title,         setTitle]         = useState(cfg.title ?? '')
  const [description,   setDescription]   = useState(cfg.description ?? '')
  const [priceRupees,   setPriceRupees]   = useState(cfg.price_paise ? String(cfg.price_paise / 100) : '99')
  const [fileUrl,       setFileUrl]       = useState(cfg.file_url ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(cfg.cover_image_url ?? '')
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Product title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Music Pack Vol. 1" className={inputCls} /></div>
      <div><label className={labelCls}>Description (optional)</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="20 loops, stems, and presets for EDM producers" className={`${inputCls} resize-none`} /></div>
      <div>
        <label className={labelCls}>Price (₹)</label>
        <input type="number" value={priceRupees} onChange={e => setPriceRupees(e.target.value)} min={1} step={1} className={inputCls} />
        <p className="text-xs text-on-surface-variant mt-1">Buyers pay via Razorpay and are redirected to your file URL</p>
      </div>
      <div>
        <label className={labelCls}>File / download URL</label>
        <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/…" className={inputCls} />
        <p className="text-xs text-on-surface-variant mt-1">Google Drive, Dropbox, or any direct download link</p>
      </div>
      <div><label className={labelCls}>Cover image URL (optional)</label><input type="url" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://…" className={inputCls} /></div>
      <EditFormActions
        onSave={() => {
          const paise = Math.max(1, Math.round(parseFloat(priceRupees || '0') * 100))
          onSave({ title, description: description || undefined, price_paise: paise, file_url: fileUrl, cover_image_url: coverImageUrl || undefined })
        }}
        onCancel={onCancel} isSaving={isSaving}
      />
    </div>
  )
}

function WaitlistForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { label?: string; description?: string; event_id?: string }
  const [label,       setLabel]       = useState(cfg.label ?? 'Join the waitlist')
  const [description, setDescription] = useState(cfg.description ?? '')
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Heading</label><input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Join the waitlist" className={inputCls} /></div>
      <div><label className={labelCls}>Description (optional)</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Be the first to know when tickets drop" className={`${inputCls} resize-none`} /></div>
      <EditFormActions onSave={() => onSave({ label, description: description || undefined })} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

function FanMembershipForm({ initial, onSave, onCancel, isSaving }: SimpleFormProps) {
  const cfg = initial as { tiers?: Array<{ name: string; price_label: string; benefits: string[]; is_featured?: boolean }>; heading?: string }
  const [heading, setHeading] = useState(cfg.heading ?? '')
  const [tiers, setTiers] = useState<Array<{ name: string; price_label: string; benefits: string; is_featured: boolean }>>(
    (cfg.tiers ?? [{ name: 'Supporter', price_label: '₹99/mo', benefits: ['Early access to events'], is_featured: false }]).map(t => ({
      name:        t.name,
      price_label: t.price_label,
      benefits:    t.benefits.join('\n'),
      is_featured: t.is_featured ?? false,
    }))
  )

  function updateTier(i: number, field: string, val: string | boolean) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }
  function addTier() {
    if (tiers.length >= 4) return
    setTiers(prev => [...prev, { name: '', price_label: '', benefits: '', is_featured: false }])
  }
  function removeTier(i: number) {
    setTiers(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Section heading (optional)</label><input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="Join my community" className={inputCls} /></div>
      <div className="space-y-3">
        <label className={labelCls}>Tiers</label>
        {tiers.map((t, i) => (
          <div key={i} className="p-3 rounded-lg bg-surface-container-low border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Tier {i + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={t.is_featured} onChange={e => updateTier(i, 'is_featured', e.target.checked)} className="accent-primary" />
                  Featured
                </label>
                {tiers.length > 1 && <button type="button" onClick={() => removeTier(i)} className="text-xs text-error hover:underline">Remove</button>}
              </div>
            </div>
            <input type="text" value={t.name} onChange={e => updateTier(i, 'name', e.target.value)} placeholder="Supporter" className={inputCls} />
            <input type="text" value={t.price_label} onChange={e => updateTier(i, 'price_label', e.target.value)} placeholder="₹99/mo" className={inputCls} />
            <div>
              <label className="block text-[10px] text-on-surface-variant mb-1">Benefits (one per line)</label>
              <textarea value={t.benefits} onChange={e => updateTier(i, 'benefits', e.target.value)} rows={3} className={`${inputCls} resize-none text-xs font-mono`} placeholder="Early access to events&#10;Behind-the-scenes content" />
            </div>
          </div>
        ))}
        {tiers.length < 4 && (
          <button type="button" onClick={addTier} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>
            Add tier
          </button>
        )}
      </div>
      <EditFormActions
        onSave={() => onSave({
          heading: heading.trim() || undefined,
          tiers: tiers.filter(t => t.name.trim()).map(t => ({
            name:        t.name.trim(),
            price_label: t.price_label.trim(),
            benefits:    t.benefits.split('\n').map(b => b.trim()).filter(Boolean),
            is_featured: t.is_featured || undefined,
          })),
        })}
        onCancel={onCancel} isSaving={isSaving}
      />
    </div>
  )
}

function NoConfigInfoBox({ message, onCancel }: { message: string; onCancel: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">{message}</p>
      <button type="button" onClick={onCancel} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">Close</button>
    </div>
  )
}

function EditFormActions({ onSave, onCancel, isSaving }: { onSave: () => void; onCancel: () => void; isSaving: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-5 py-2 text-sm font-bold bg-primary text-on-primary rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline block edit panel — renders the right form per type
// ---------------------------------------------------------------------------

const BlockEditPanel = React.memo(function BlockEditPanel({
  block,
  events,
  onSaved,
  onCancel,
}: {
  block: PageBlock
  events: Event[]
  onSaved: (updated: PageBlock) => void
  onCancel: () => void
}) {
  const cfg = block.config as unknown
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  async function save(newConfig: unknown) {
    setSaving(true)
    setSaveError(null)
    const { error } = block.block_type === 'support_tip'
      ? await saveSupportTipBlock(block.id, newConfig)
      : await updateBlock(block.id, newConfig)
    setSaving(false)
    if (error) { setSaveError(error); return }
    onSaved({ ...block, config: newConfig as typeof block.config })
  }

  const sp: SimpleFormProps     = { initial: cfg, onSave: save, onCancel, isSaving: saving }
  const ep: EventFormProps      = { ...sp, events }

  return (
    <div className="mt-3 pt-4 border-t border-white/10">
      {saveError && <p className="text-xs text-error mb-3">{saveError}</p>}

      {/* ── Legacy blocks ── */}
      {block.block_type === 'social_link'     && <SocialLinkForm    initial={cfg as SocialLinkConfig}     onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'youtube_embed'   && <YouTubeForm       initial={cfg as YoutubeEmbedConfig}   onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'instagram_embed' && <InstagramForm     initial={cfg as InstagramEmbedConfig} onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'instagram_post'  && <InstagramForm     initial={cfg as InstagramEmbedConfig} onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'text_bio'        && <TextBioForm       initial={cfg as TextBioConfig}        onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'image_gallery'   && <ImageGalleryForm  initial={cfg as ImageGalleryConfig}   onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'event_listing'   && <EventPickerForm   initial={cfg as EventListingConfig}   events={events} onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'custom_link'     && <CustomLinkForm    initial={cfg as CustomLinkConfig}     onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'quote_block'     && <QuoteBlockForm    initial={cfg as QuoteBlockConfig}     onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'marquee_text'    && <MarqueeTextForm   initial={cfg as MarqueeTextConfig}    onSave={save} onCancel={onCancel} isSaving={saving} />}
      {block.block_type === 'stats_grid'      && <StatsGridForm     initial={cfg as StatsGridConfig}      onSave={save} onCancel={onCancel} isSaving={saving} />}

      {/* ── New Wave-1 blocks ── */}
      {block.block_type === 'announcement'        && <AnnouncementForm      {...sp} />}
      {block.block_type === 'social_links_row'    && <SocialLinksRowForm    {...sp} />}
      {block.block_type === 'spotify_now_playing' && <SpotifyForm           {...sp} />}
      {block.block_type === 'newsletter_signup'   && <NewsletterSignupForm  {...sp} />}
      {block.block_type === 'event_calendar'      && <EventCalendarForm     {...sp} />}
      {block.block_type === 'event_series'        && <EventSeriesForm       {...ep} />}
      {block.block_type === 'past_events_gallery' && <PastEventsGalleryForm {...sp} />}
      {block.block_type === 'rsvp_link'           && <RsvpLinkForm          {...sp} />}
      {block.block_type === 'podcast_episode'     && <PodcastEpisodeForm    {...sp} />}
      {block.block_type === 'substack_preview'    && <SubstackPreviewForm   {...sp} />}
      {block.block_type === 'support_tip'         && <SupportTipForm        {...sp} />}
      {block.block_type === 'community_stats'     && <CommunityStatsForm    {...sp} />}
      {block.block_type === 'collab_invite'       && <CollabInviteForm      {...sp} />}
      {block.block_type === 'white_label_event'   && <WhiteLabelEventForm   {...sp} />}
      {block.block_type === 'venue_partnership'   && <VenuePartnershipForm  {...sp} />}
      {block.block_type === 'testimonial'         && <NoConfigInfoBox message="Testimonials are automatically pulled from your attendees' reviews. No configuration needed." onCancel={onCancel} />}
      {block.block_type === 'creator_type_badge'  && <NoConfigInfoBox message="Your creator badge is automatically set from your profile type." onCancel={onCancel} />}
      {block.block_type === 'city_community'      && <NoConfigInfoBox message="Your city page link is automatically set from your profile." onCancel={onCancel} />}

      {/* ── Wave 2 blocks ── */}
      {block.block_type === 'whatsapp_community' && <WhatsAppCommunityForm {...sp} />}
      {block.block_type === 'music_player'       && <MusicPlayerForm       {...sp} />}
      {block.block_type === 'booking_request'    && <BookingRequestForm    {...sp} />}

      {/* ── Wave 3 blocks ── */}
      {block.block_type === 'press_feature'  && <PressFeatureForm  {...sp} />}
      {block.block_type === 'twitter_embed'  && <TwitterEmbedForm  {...sp} />}
      {block.block_type === 'awards_badges'  && <AwardsBadgesForm  {...sp} />}

      {/* ── Wave 4 blocks ── */}
      {block.block_type === 'digital_product' && <DigitalProductForm {...sp} />}
      {block.block_type === 'waitlist'         && <WaitlistForm       {...sp} />}
      {block.block_type === 'fan_membership'   && <FanMembershipForm  {...sp} />}
    </div>
  )
})

// ---------------------------------------------------------------------------
// Add Block modal
// ---------------------------------------------------------------------------

function AddBlockModal({ onClose, onAdd, isPending, allowedTypes }: {
  onClose: () => void
  onAdd: (type: BlockType) => void
  isPending: boolean
  allowedTypes: BlockType[] | null
}) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const personaBlockTypes = allowedTypes
    ? BLOCK_TYPES.filter((bt) => allowedTypes.includes(bt.type))
    : BLOCK_TYPES

  const activeCat = BLOCK_CATEGORIES.find((c) => c.id === activeCategory)
  const filtered = personaBlockTypes.filter((bt) => {
    const matchesCategory = !activeCat?.types || activeCat.types.includes(bt.type)
    const q = search.toLowerCase()
    const matchesSearch = !q || bt.label.toLowerCase().includes(q) || bt.description.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-10"
      style={{ paddingLeft: 'calc(var(--wimc-sidebar-w, var(--venue-sidebar-w, 0px)) + 40px)' }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl z-[80] bg-surface rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] flex flex-col"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        {/* Header */}
        <div className="px-6 pt-3 pb-3 flex justify-between items-center shrink-0">
          <h2 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">Add a block</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 bg-surface-container-high rounded-xl px-4 py-2.5 border border-white/5">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blocks…"
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="shrink-0 overflow-x-auto pb-3 px-6 scrollbar-none">
          <div className="flex gap-2 w-max">
            {BLOCK_CATEGORIES.map((cat) => {
              const count = cat.types
                ? cat.types.filter((t) => !allowedTypes || allowedTypes.includes(t)).length
                : personaBlockTypes.length
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSearch('') }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    activeCategory === cat.id
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-high text-on-surface-variant border-white/5 hover:text-on-surface hover:border-white/15'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{cat.icon}</span>
                  {cat.label}
                  <span className={`text-[10px] font-normal tabular-nums ${activeCategory === cat.id ? 'text-white/60' : 'text-on-surface-variant/50'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-white/5 shrink-0" />

        {/* Block grid — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }}>search_off</span>
              <p className="text-sm text-on-surface-variant">No blocks match &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch('')} className="text-xs text-primary font-semibold mt-1 hover:underline">Clear search</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-10">
              {filtered.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => { onAdd(bt.type); onClose() }}
                  disabled={isPending}
                  className="bg-surface-container-lowest p-4 rounded-xl text-left border border-white/5 transition-all flex flex-col items-start gap-2.5 overflow-hidden hover:border-primary active:scale-[0.98] group disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{bt.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface leading-tight">{bt.label}</h4>
                    <p className="font-body text-[11px] text-on-surface-variant leading-tight mt-0.5">{bt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// BlockControls
// ---------------------------------------------------------------------------

function BlockControls({ block, onToggle, onDelete, onEdit, isPending }: {
  block: PageBlock
  onToggle: (block: PageBlock, isVisible: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  isPending: boolean
}) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className="flex items-center gap-2 shrink-0">
      <ToggleSwitch checked={block.is_visible} onChange={(v) => onToggle(block, v)} />
      <div className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          disabled={isPending}
          className="p-2 text-outline-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-10 z-20 bg-surface-container-high rounded-xl shadow-xl border border-outline-variant/20 py-1 min-w-[140px]">
              <button
                onClick={() => { setShowMenu(false); onEdit(block.id) }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-on-surface hover:bg-surface-container-highest text-sm"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit
              </button>
              <button
                onClick={() => { setShowMenu(false); onDelete(block.id) }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-error hover:bg-error/10 text-sm"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BlockEditor
// ---------------------------------------------------------------------------

interface BlockEditorProps {
  blocks: PageBlock[]
  events: Event[]
  onBlocksChange: (blocks: PageBlock[]) => void
  onEditBlock?: (blockId: string) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  userTier?: UserTier | null
  persona?: PersonaKey
}

const BlockEditor = React.memo(function BlockEditor({ blocks, events, onBlocksChange, onEditBlock, isDirty, isSaving, onSave, userTier, persona }: BlockEditorProps) {
  const allowedTypes = persona ? PERSONA_BLOCK_SETS[persona] : null
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isAdding,      setIsAdding]      = useState(false)
  const dragIndexRef = useRef<number | null>(null)

  function handleToggle(block: PageBlock, isVisible: boolean) {
    onBlocksChange(blocks.map((b) => b.id === block.id ? { ...b, is_visible: isVisible } : b))
    toggleBlockVisibility(block.id, isVisible)
  }

  async function handleAdd(blockType: BlockType) {
    setShowAddModal(false)
    setIsAdding(true)
    const { block: newBlock, error } = await addBlock(blockType)
    setIsAdding(false)
    if (error || !newBlock) return
    onBlocksChange([...blocks, newBlock])
    setEditingBlockId(newBlock.id)
  }

  function handleDelete(blockId: string) {
    if (editingBlockId === blockId) setEditingBlockId(null)
    onBlocksChange(blocks.filter((b) => b.id !== blockId))
  }

  function handleEdit(blockId: string) {
    setEditingBlockId((prev) => (prev === blockId ? null : blockId))
    onEditBlock?.(blockId)
  }

  function handleBlockSaved(updated: PageBlock) {
    onBlocksChange(blocks.map((b) => b.id === updated.id ? updated : b))
    setEditingBlockId(null)
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }
    const updated = [...blocks]
    const [removed] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, removed)
    onBlocksChange(updated.map((b, i) => ({ ...b, position: i })))
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {/* Block list */}
      {blocks.map((block, index) => {
        const isEditing = editingBlockId === block.id
        const isDragOver = dragOverIndex === index
        return (
          <div
            key={block.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`group rounded-xl p-4 transition-all border ${
              isEditing
                ? 'bg-primary/[0.08] border-primary/50 shadow-md shadow-primary/10'
                : isDragOver
                  ? 'bg-primary/[0.10] border-primary/70 shadow-lg scale-[1.01]'
                  : 'bg-primary/[0.04] border-primary/20 hover:bg-primary/[0.07] hover:border-primary/35 hover:shadow-md hover:shadow-primary/5'
            } ${!block.is_visible && !isEditing ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3">
              {/* Drag handle */}
              <div className="shrink-0 cursor-grab active:cursor-grabbing text-outline-variant hover:text-on-surface transition-colors touch-none">
                <span className="material-symbols-outlined text-xl select-none">drag_indicator</span>
              </div>

              <BlockIcon blockType={block.block_type} />

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handleEdit(block.id)}
              >
                <BlockPreviewLabel block={block} events={events} />
                {!isEditing && (
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">Tap to edit</p>
                )}
              </div>

              <BlockControls
                block={block}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isPending={isSaving}
              />
            </div>

            {/* Inline edit panel */}
            {isEditing && (
              <BlockEditPanel
                block={block}
                events={events}
                onSaved={handleBlockSaved}
                onCancel={() => setEditingBlockId(null)}
              />
            )}
          </div>
        )
      })}

      {/* Add block button */}
      <button
        onClick={() => setShowAddModal(true)}
        disabled={isAdding}
        className="w-full py-10 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 transition-all rounded-xl flex flex-col items-center justify-center gap-2 group disabled:opacity-60"
      >
        <div className="w-10 h-10 rounded-full bg-surface-container-high group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center text-primary">
          {isAdding
            ? <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined">add</span>
          }
        </div>
        <span className="font-headline font-bold text-sm text-on-surface-variant group-hover:text-primary transition-colors">
          {isAdding ? 'Adding…' : 'Add a block'}
        </span>
      </button>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className="w-full py-3 rounded-xl font-headline font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-primary text-on-primary"
      >
        {isSaving ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving…
          </>
        ) : isDirty ? (
          <>
            <span className="material-symbols-outlined text-lg">save</span>
            Save blocks
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Saved
          </>
        )}
      </button>

      {/* Modal */}
      {showAddModal && (
        <AddBlockModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          isPending={isSaving}
          allowedTypes={allowedTypes}
        />
      )}
    </div>
  )
})

export default BlockEditor
