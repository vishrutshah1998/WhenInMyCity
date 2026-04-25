'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadGalleryImage } from '@/app/actions/blocks'
import type {
  BlockType,
  PageBlock,
  Event,
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
  { type: 'social_link',     label: 'Social Link',     icon: 'share',         description: 'Instagram, YouTube & more' },
  { type: 'youtube_embed',   label: 'YouTube Video',   icon: 'smart_display', description: 'Embed your latest video'   },
  { type: 'instagram_embed', label: 'Instagram Post',  icon: 'camera',        description: 'Show off your content'     },
  { type: 'text_bio',        label: 'Text / Bio',      icon: 'notes',         description: 'A message to visitors'     },
  { type: 'image_gallery',   label: 'Photo Gallery',   icon: 'photo_library', description: 'Up to 6 images'            },
  { type: 'custom_link',     label: 'Custom Link',     icon: 'link',          description: 'Any URL with a label'      },
  { type: 'quote_block',     label: 'Quote',           icon: 'format_quote',  description: 'A bold pull-quote'         },
  { type: 'marquee_text',    label: 'Marquee Ticker',  icon: 'view_headline', description: 'Scrolling text banner'     },
  { type: 'stats_grid',      label: 'Stats Grid',      icon: 'bar_chart',     description: 'Numbers that impress'      },
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

function BlockIcon({ blockType }: { blockType: BlockType }) {
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
  }
  const icon = iconMap[blockType] ?? 'link'
  return (
    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
  )
}

function formatEventDate(startsAt: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(startsAt))
}

function BlockPreviewLabel({ block, events }: { block: PageBlock; events: Event[] }) {
  const cfg = block.config as unknown
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
      const c = cfg as EventListingConfig
      const eventId = c.event_ids?.[0]
      const ev = events.find((e) => e.id === eventId)
      return (
        <div>
          <span className="font-headline font-bold text-white text-sm">{ev?.title ?? 'Event'}</span>
          <p className="text-white/50 text-xs mt-0.5">
            {ev ? formatEventDate(ev.starts_at) : 'Tap to select an event'}
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
}

// ---------------------------------------------------------------------------
// Inline edit forms per block type
// ---------------------------------------------------------------------------

const inputCls = 'w-full bg-surface-container-low text-on-surface placeholder:text-outline-variant rounded-lg px-3 py-2.5 text-sm border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40'
const labelCls = 'block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1'

function SocialLinkForm({
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
}

function YouTubeForm({
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
}

function InstagramForm({
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
}

function TextBioForm({
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
}

function ImageGalleryForm({
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
}

function CustomLinkForm({
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
}

function EventPickerForm({
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
}

function QuoteBlockForm({
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
}

function MarqueeTextForm({
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
}

function StatsGridForm({
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

function BlockEditPanel({
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

  function save(newConfig: unknown) {
    onSaved({ ...block, config: newConfig as typeof block.config })
  }

  return (
    <div className="mt-3 pt-4 border-t border-white/10">
      {block.block_type === 'social_link' && (
        <SocialLinkForm initial={cfg as SocialLinkConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'youtube_embed' && (
        <YouTubeForm initial={cfg as YoutubeEmbedConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'instagram_embed' && (
        <InstagramForm initial={cfg as InstagramEmbedConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'text_bio' && (
        <TextBioForm initial={cfg as TextBioConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'image_gallery' && (
        <ImageGalleryForm initial={cfg as ImageGalleryConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'event_listing' && (
        <EventPickerForm initial={cfg as EventListingConfig} events={events} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'custom_link' && (
        <CustomLinkForm initial={cfg as CustomLinkConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'quote_block' && (
        <QuoteBlockForm initial={cfg as QuoteBlockConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'marquee_text' && (
        <MarqueeTextForm initial={cfg as MarqueeTextConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
      {block.block_type === 'stats_grid' && (
        <StatsGridForm initial={cfg as StatsGridConfig} onSave={save} onCancel={onCancel} isSaving={false} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Block modal
// ---------------------------------------------------------------------------

function AddBlockModal({ onClose, onAdd, isPending }: {
  onClose: () => void
  onAdd: (type: BlockType) => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-[80] bg-surface rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-white/10 rounded-full" />
        </div>
        <div className="px-8 pt-4 pb-6 flex justify-between items-center">
          <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Add a block</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-95">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="px-8 pb-12 grid grid-cols-2 gap-4">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              onClick={() => { onAdd(bt.type); onClose() }}
              disabled={isPending}
              className="bg-surface-container-lowest p-5 rounded-xl text-left border border-white/5 hover:border-primary transition-all active:scale-[0.98] group flex flex-col items-start gap-3 disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[28px]">{bt.icon}</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm text-on-surface">{bt.label}</h4>
                <p className="font-body text-[11px] text-on-surface-variant leading-tight mt-0.5">{bt.description}</p>
              </div>
            </button>
          ))}

          {/* Event block */}
          <button
            onClick={() => { onAdd('event_listing'); onClose() }}
            disabled={isPending}
            className="bg-surface-container-lowest p-5 rounded-xl text-left border border-white/5 hover:border-primary transition-all active:scale-[0.98] group flex flex-col items-start gap-3 relative overflow-hidden disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[28px]">calendar_today</span>
            </div>
            <div>
              <h4 className="font-headline font-bold text-sm text-on-surface">Event</h4>
              <p className="font-body text-[11px] text-on-surface-variant leading-tight mt-0.5">Pin an event to your page</p>
            </div>
          </button>
        </div>
      </div>
    </div>
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
}

export default function BlockEditor({ blocks, events, onBlocksChange, onEditBlock, isDirty, isSaving, onSave }: BlockEditorProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)

  function handleToggle(block: PageBlock, isVisible: boolean) {
    onBlocksChange(blocks.map((b) => b.id === block.id ? { ...b, is_visible: isVisible } : b))
  }

  function handleAdd(blockType: BlockType) {
    setShowAddModal(false)
    const newBlock: PageBlock = {
      id: `temp_${blockType}_${Date.now()}`,
      profile_id: '',
      block_type: blockType,
      position: blocks.length,
      is_visible: true,
      config: {} as PageBlock['config'],
      block_family: 'content' as import('@/types/database').BlockFamily,
      minimum_tier: 'mohalla' as import('@/types/database').MakerTier,
      analytics_config: {} as PageBlock['analytics_config'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
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
    <div className="space-y-3">
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
        className="w-full py-10 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 transition-all rounded-xl flex flex-col items-center justify-center gap-2 group"
      >
        <div className="w-10 h-10 rounded-full bg-surface-container-high group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">add</span>
        </div>
        <span className="font-headline font-bold text-sm text-on-surface-variant group-hover:text-primary transition-colors">
          Add a block
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
        />
      )}
    </div>
  )
}
