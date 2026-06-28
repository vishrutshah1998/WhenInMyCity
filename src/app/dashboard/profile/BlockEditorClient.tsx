'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, PageBlock, BlockType, Json } from '@/types/database'
import BlockRenderer from '@/components/profile/BlockRenderer'
import { resolveTheme } from '@/types/theme'

// ── Types ──────────────────────────────────────────────────────────────────────

interface EditorBlock {
  id: string
  block_type: BlockType
  config: Record<string, unknown>
  position: number
  is_visible: boolean
  _isDirty?: boolean
  _isNew?: boolean
  _isDeleted?: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BLOCK_DEFAULTS: Partial<Record<BlockType, Record<string, unknown>>> = {
  text_bio:         { body: '' },
  event_listing:    { title: 'Upcoming Events', show_past: false },
  social_links_row: { links: [] },
  image_gallery:    { images: [], layout: 'grid' },
  youtube_embed:    { video_id: '', title: '' },
  announcement:     { text: '', background_style: 'dark' },
}

const PALETTE: { type: BlockType; icon: string; label: string; color: string }[] = [
  { type: 'text_bio',         icon: 'notes',               label: 'BIO',     color: '#E8705A' },
  { type: 'event_listing',    icon: 'confirmation_number', label: 'EVENTS',  color: '#E8705A' },
  { type: 'social_links_row', icon: 'link',                label: 'LINKS',   color: '#9B8FFF' },
  { type: 'image_gallery',    icon: 'image',               label: 'IMAGE',   color: '#5DD9D0' },
  { type: 'youtube_embed',    icon: 'play_circle',         label: 'VIDEO',   color: '#E8705A' },
  { type: 'announcement',     icon: 'title',               label: 'HEADING', color: 'rgba(255,255,255,0.6)' },
]

const BLOCK_META: Partial<Record<BlockType, { icon: string; color: string; label: string }>> = {
  text_bio:         { icon: 'notes',               color: '#E8705A',              label: 'BIO' },
  event_listing:    { icon: 'confirmation_number', color: '#E8705A',              label: 'EVENTS' },
  social_links_row: { icon: 'link',                color: '#9B8FFF',              label: 'LINKS' },
  image_gallery:    { icon: 'image',               color: '#5DD9D0',              label: 'IMAGE' },
  youtube_embed:    { icon: 'play_circle',         color: '#E8705A',              label: 'VIDEO' },
  announcement:     { icon: 'title',               color: 'rgba(255,255,255,0.6)', label: 'HEADING' },
  social_link:      { icon: 'link',                color: '#9B8FFF',              label: 'LINK' },
  custom_link:      { icon: 'open_in_new',         color: '#5DD9D0',              label: 'LINK' },
  quote_block:      { icon: 'format_quote',        color: '#9B8FFF',              label: 'QUOTE' },
  marquee_text:     { icon: 'text_fields',         color: '#F5A800',              label: 'MARQUEE' },
  stats_grid:       { icon: 'grid_view',           color: '#5DD9D0',              label: 'STATS' },
  instagram_embed:  { icon: 'photo_camera',        color: '#E8705A',              label: 'INSTAGRAM' },
  instagram_post:   { icon: 'photo_camera',        color: '#E8705A',              label: 'INSTAGRAM' },
}

const INJECTED_CSS = `
@keyframes block-slide-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes block-slide-out {
  to { opacity: 0; transform: translateX(40px); }
}
.blk-slide-in  { animation: block-slide-in  300ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.blk-slide-out { animation: block-slide-out 250ms ease-out forwards; }
.blk-scrollbar::-webkit-scrollbar { width: 4px; }
.blk-scrollbar::-webkit-scrollbar-track { background: transparent; }
.blk-scrollbar::-webkit-scrollbar-thumb { background: rgba(87,66,62,0.6); border-radius: 2px; }
`

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&\n]+)/)
  return m?.[1] ?? ''
}

function blockTitle(block: EditorBlock): string {
  const c = block.config
  switch (block.block_type) {
    case 'text_bio':         return ((c.body as string) || 'Bio text').slice(0, 40)
    case 'event_listing':    return (c.title as string) || 'Upcoming Events'
    case 'social_links_row': {
      const links = c.links as unknown[]
      return links?.length ? `${links.length} link${links.length !== 1 ? 's' : ''}` : 'No links yet'
    }
    case 'image_gallery': {
      const imgs = c.images as unknown[]
      return imgs?.length ? `${imgs.length} image${imgs.length !== 1 ? 's' : ''}` : 'No images yet'
    }
    case 'youtube_embed':  return ((c.title as string) || (c.video_id as string) || 'YouTube video').slice(0, 40)
    case 'announcement':   return ((c.text as string) || 'Heading text').slice(0, 40)
    default:               return BLOCK_META[block.block_type]?.label ?? block.block_type
  }
}

function toPreviewBlock(b: EditorBlock): PageBlock {
  return {
    id:               b.id,
    profile_id:       '',
    block_type:       b.block_type,
    position:         b.position,
    is_visible:       b.is_visible,
    config:           b.config as unknown as Json,
    block_family:     'content',
    minimum_tier:     'wanderer',
    analytics_config: {} as Json,
    created_at:       '',
    updated_at:       '',
  }
}

// ── Inline block editors ───────────────────────────────────────────────────────

function TextBioEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Partial<Record<string, unknown>>) => void
}) {
  const body = (config.body as string) ?? ''
  return (
    <div>
      <textarea
        value={body}
        onChange={e => onChange({ body: e.target.value })}
        maxLength={300}
        rows={4}
        className="w-full bg-transparent border border-[#57423e] p-3 text-white resize-none focus:border-[#E8705A] outline-none"
        style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 15 }}
        placeholder="Write your bio…"
      />
      <p
        className="text-right mt-1 text-[9px] text-white/20"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {body.length} / 300
      </p>
    </div>
  )
}

function EventListingEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Partial<Record<string, unknown>>) => void
}) {
  const title    = (config.title as string)    ?? 'Upcoming Events'
  const showPast = (config.show_past as boolean) ?? false
  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={title}
        onChange={e => onChange({ title: e.target.value })}
        className="w-full bg-transparent border-b border-[#57423e] px-2 py-2 text-white placeholder:text-white/30 focus:border-[#E8705A] outline-none"
        style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14 }}
        placeholder="Section title"
      />
      <div className="flex items-center justify-between py-1">
        <span className="text-[13px] text-white/60" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Show past events
        </span>
        <div
          onClick={() => onChange({ show_past: !showPast })}
          className="relative w-10 h-5 rounded-full cursor-pointer transition-colors"
          style={{ background: showPast ? '#E8705A' : 'rgba(255,255,255,0.1)' }}
          role="switch"
          aria-checked={showPast}
        >
          <div
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
            style={{ transform: showPast ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
      </div>
      <p
        className="text-[9px] text-white/20 italic"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        Events pulled from your published events automatically
      </p>
    </div>
  )
}

const PLATFORMS = ['Instagram', 'Twitter-X', 'YouTube', 'Spotify', 'Website', 'Other']

function SocialLinksEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Partial<Record<string, unknown>>) => void
}) {
  const links = (config.links as Array<{ platform: string; url: string }>) ?? []

  function update(i: number, field: 'platform' | 'url', value: string) {
    onChange({ links: links.map((l, idx) => idx === i ? { ...l, [field]: value } : l) })
  }

  return (
    <div>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-dashed border-[#57423e]/30">
          <select
            value={link.platform}
            onChange={e => update(i, 'platform', e.target.value)}
            className="bg-[#07070A] border border-[#57423e] px-2 py-1 text-white/60 outline-none cursor-pointer"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10 }}
          >
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="url"
            value={link.url}
            onChange={e => update(i, 'url', e.target.value)}
            className="flex-1 bg-transparent border-b border-[#57423e] px-2 py-1 text-white/80 placeholder:text-white/20 focus:border-[#E8705A] outline-none"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}
            placeholder="https://…"
          />
          <button
            onClick={() => onChange({ links: links.filter((_, idx) => idx !== i) })}
            className="text-white/20 hover:text-white/60 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange({ links: [...links, { platform: 'Instagram', url: '' }] })}
        className="mt-2 px-3 py-1 border border-dashed border-[#9B8FFF]/30 text-[#9B8FFF] hover:bg-[#9B8FFF]/10 transition-colors"
        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10 }}
      >
        ADD LINK +
      </button>
    </div>
  )
}

function ImageGalleryEditor({
  config,
  onChange,
  profileId,
  blockId,
}: {
  config: Record<string, unknown>
  onChange: (c: Partial<Record<string, unknown>>) => void
  profileId: string
  blockId: string
}) {
  const images     = (config.images as Array<{ url: string; caption?: string }>) ?? []
  const firstImage = images[0]
  const fileRef    = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const path = `${profileId}/${blockId}/${file.name}`
    const { error } = await supabase.storage
      .from('page-images')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('page-images').getPublicUrl(path)
      const newImages = firstImage
        ? [{ ...firstImage, url: data.publicUrl }, ...images.slice(1)]
        : [{ url: data.publicUrl }]
      onChange({ images: newImages })
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="border-2 border-dashed border-[#57423e] p-6 text-center cursor-pointer hover:border-[#5DD9D0] transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {firstImage?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstImage.url} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[#5DD9D0] text-[32px]">upload_file</span>
            <span
              className="text-[10px] text-white/30 uppercase"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {uploading ? 'UPLOADING…' : 'TAP TO UPLOAD'}
            </span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {firstImage?.url && (
        <input
          type="text"
          value={firstImage.caption ?? ''}
          onChange={e => onChange({ images: [{ ...firstImage, caption: e.target.value }, ...images.slice(1)] })}
          className="w-full bg-transparent border-b border-[#57423e] px-2 py-1 text-white/60 placeholder:text-white/20 focus:border-[#E8705A] outline-none"
          style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13 }}
          placeholder="Add a caption…"
        />
      )}
    </div>
  )
}

function YoutubeEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Partial<Record<string, unknown>>) => void
}) {
  const videoId = (config.video_id as string) ?? ''
  const title   = (config.title as string)    ?? ''
  const [url, setUrl] = useState(videoId ? `https://youtube.com/watch?v=${videoId}` : '')

  function handleUrl(val: string) {
    setUrl(val)
    const id = extractYouTubeId(val)
    onChange({ video_id: id, title })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="url"
        value={url}
        onChange={e => handleUrl(e.target.value)}
        className="w-full bg-transparent border-b border-[#57423e] px-2 py-2 text-white/80 placeholder:text-white/30 focus:border-[#E8705A] outline-none"
        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}
        placeholder="https://youtube.com/watch?v=…"
      />
      {videoId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt="Thumbnail"
          className="w-full h-36 object-cover"
        />
      )}
      <input
        type="text"
        value={title}
        onChange={e => onChange({ video_id: videoId, title: e.target.value })}
        className="w-full bg-transparent border-b border-[#57423e] px-2 py-1 text-white/60 placeholder:text-white/20 focus:border-[#E8705A] outline-none"
        style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13 }}
        placeholder="Video title (optional)"
      />
    </div>
  )
}

const HEADING_SIZES = [
  { size: 'large',  label: 'LARGE',  style: { fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 900 } },
  { size: 'medium', label: 'MEDIUM', style: { fontFamily: 'var(--font-outfit, var(--font-syne))', fontSize: 22, fontWeight: 900 } },
  { size: 'small',  label: 'SMALL',  style: { fontFamily: 'var(--font-dm-sans)', fontSize: 17, fontWeight: 700 } },
] as const

function HeadingEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Partial<Record<string, unknown>>) => void
}) {
  const text = (config.text as string) ?? ''
  const size = (config.size as string) ?? 'medium'
  const chosen = HEADING_SIZES.find(s => s.size === size) ?? HEADING_SIZES[1]

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={text}
        onChange={e => onChange({ text: e.target.value, size, background_style: 'dark' })}
        className="w-full bg-transparent border-b border-[#57423e] px-2 py-2 text-white placeholder:text-white/20 focus:border-[#E8705A] outline-none"
        style={{ ...chosen.style }}
        placeholder="Heading text…"
      />
      <div className="flex gap-2">
        {HEADING_SIZES.map(s => (
          <button
            key={s.size}
            onClick={() => onChange({ text, size: s.size, background_style: 'dark' })}
            className="px-3 py-1 text-[10px] uppercase transition-colors"
            style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              background: size === s.size ? '#E8705A' : 'transparent',
              color:      size === s.size ? '#1A2744'  : 'rgba(255,255,255,0.4)',
              border:     size === s.size ? 'none'     : '1px dashed rgba(255,255,255,0.2)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function BlockInlineEditor({
  block,
  onChange,
  profileId,
}: {
  block: EditorBlock
  onChange: (id: string, config: Partial<Record<string, unknown>>) => void
  profileId: string
}) {
  const onCfg = useCallback(
    (c: Partial<Record<string, unknown>>) => onChange(block.id, c),
    [block.id, onChange],
  )

  switch (block.block_type) {
    case 'text_bio':
      return <TextBioEditor config={block.config} onChange={onCfg} />
    case 'event_listing':
      return <EventListingEditor config={block.config} onChange={onCfg} />
    case 'social_links_row':
      return <SocialLinksEditor config={block.config} onChange={onCfg} />
    case 'image_gallery':
      return (
        <ImageGalleryEditor
          config={block.config}
          onChange={onCfg}
          profileId={profileId}
          blockId={block.id}
        />
      )
    case 'youtube_embed':
      return <YoutubeEditor config={block.config} onChange={onCfg} />
    case 'announcement':
      return <HeadingEditor config={block.config} onChange={onCfg} />
    default:
      return (
        <p
          className="text-[11px] text-white/30 italic"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          Edit on the public profile page.
        </p>
      )
  }
}

// ── BlockCard ──────────────────────────────────────────────────────────────────

function BlockCard({
  block,
  index,
  isDragging,
  isDeleting,
  isConfirmingDelete,
  onChange,
  onToggleVisibility,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  profileId,
}: {
  block: EditorBlock
  index: number
  isDragging: boolean
  isDeleting: boolean
  isConfirmingDelete: boolean
  onChange: (id: string, config: Partial<Record<string, unknown>>) => void
  onToggleVisibility: (id: string) => void
  onDeleteClick: (id: string) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDragEnd: () => void
  profileId: string
}) {
  const meta = BLOCK_META[block.block_type]

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={[
        'relative group border-2 border-[#57423e] bg-[#1A2744] transition-all duration-200',
        block._isNew ? 'blk-slide-in' : '',
        isDeleting   ? 'blk-slide-out' : '',
        isDragging   ? 'opacity-50 scale-[0.98] rotate-[-1deg]' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Drag handle */}
      <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="material-symbols-outlined text-white/30 text-[18px]">drag_indicator</span>
      </div>

      {/* Block header */}
      <div className="flex items-center justify-between px-4 py-3 pl-10 border-b border-[#57423e]/50">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="material-symbols-outlined text-[18px] flex-shrink-0"
            style={{ color: meta?.color ?? '#E8705A' }}
          >
            {meta?.icon ?? 'widgets'}
          </span>
          <span
            className="text-[10px] text-white/50 uppercase flex-shrink-0"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {meta?.label ?? block.block_type}
          </span>
          <span
            className="text-[14px] text-white truncate"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {blockTitle(block)}
          </span>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
          <button
            onClick={() => onToggleVisibility(block.id)}
            title={block.is_visible ? 'Hide block' : 'Show block'}
            className="text-white/30 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              {block.is_visible ? 'visibility' : 'visibility_off'}
            </span>
          </button>
          <button
            onClick={() => onDeleteClick(block.id)}
            className="text-white/20 hover:text-red-400 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">delete_outline</span>
          </button>
        </div>
      </div>

      {/* Block content — either editor or delete confirm */}
      <div className="p-4 pl-10">
        {isConfirmingDelete ? (
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] text-white/60 flex-1"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              DELETE THIS BLOCK?
            </span>
            <button
              onClick={() => onConfirmDelete(block.id)}
              className="px-3 py-1 bg-red-600 text-white text-[10px] uppercase font-bold hover:bg-red-500 transition-colors"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              CONFIRM
            </button>
            <button
              onClick={onCancelDelete}
              className="px-3 py-1 border border-white/20 text-white/40 text-[10px] uppercase hover:border-white/40 transition-colors"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              CANCEL
            </button>
          </div>
        ) : (
          <BlockInlineEditor block={block} onChange={onChange} profileId={profileId} />
        )}
      </div>

      {/* Hidden indicator overlay */}
      {!block.is_visible && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-end pr-3">
          <span
            className="text-[9px] text-white/30 uppercase"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            HIDDEN
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BlockEditorClient({ profile }: { profile: UserProfile }) {
  const [blocks,            setBlocks]            = useState<EditorBlock[]>([])
  const [saveStatus,        setSaveStatus]        = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hasUnsaved,        setHasUnsaved]        = useState(false)
  const [dragIndex,         setDragIndex]         = useState<number | null>(null)
  const [mobileTab,         setMobileTab]         = useState<'blocks' | 'preview'>('blocks')
  const [deleteConfirm,     setDeleteConfirm]     = useState<string | null>(null)
  const [deletingId,        setDeletingId]        = useState<string | null>(null)

  const theme = resolveTheme(profile.page_theme, profile.creator_type)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('page_blocks')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position')
      .then(({ data }) => {
        setBlocks((data ?? []).map(b => ({
          id:         b.id,
          block_type: b.block_type,
          config:     (b.config as Record<string, unknown>) ?? {},
          position:   b.position,
          is_visible: b.is_visible,
        })))
      })
  }, [profile.id])

  // ── Before unload ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', fn)
    return () => window.removeEventListener('beforeunload', fn)
  }, [hasUnsaved])

  // ── Block mutations ─────────────────────────────────────────────────────────
  const setBlockConfig = useCallback((id: string, config: Partial<Record<string, unknown>>) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, config: { ...b.config, ...config }, _isDirty: true } : b
    ))
    setHasUnsaved(true)
  }, [])

  const toggleVisibility = useCallback((id: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, is_visible: !b.is_visible, _isDirty: true } : b
    ))
    setHasUnsaved(true)
  }, [])

  const handleDeleteClick = useCallback((id: string) => setDeleteConfirm(id), [])

  const confirmDelete = useCallback((id: string) => {
    setDeletingId(id)
    setTimeout(() => {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, _isDeleted: true } : b))
      setDeletingId(null)
      setDeleteConfirm(null)
    }, 250)
    setHasUnsaved(true)
  }, [])

  const addBlock = useCallback((blockType: BlockType) => {
    const newBlock: EditorBlock = {
      id:         `new_${Date.now()}`,
      block_type: blockType,
      config:     { ...(BLOCK_DEFAULTS[blockType] ?? {}) },
      position:   0,
      is_visible: true,
      _isNew:     true,
      _isDirty:   true,
    }
    setBlocks(prev => [...prev.filter(b => !b._isDeleted), newBlock])
    setHasUnsaved(true)
  }, [])

  // ── Drag ────────────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((index: number) => setDragIndex(index), [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setBlocks(prev => {
      const visible = prev.filter(b => !b._isDeleted)
      const deleted = prev.filter(b => b._isDeleted)
      const next = [...visible]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      setDragIndex(index)
      return [...next, ...deleted]
    })
    setHasUnsaved(true)
  }, [dragIndex])

  const handleDragEnd = useCallback(() => setDragIndex(null), [])

  // ── Save ────────────────────────────────────────────────────────────────────
  const saveBlocks = async () => {
    setSaveStatus('saving')
    const supabase = createClient()

    const toDelete = blocks.filter(b => b._isDeleted && !b._isNew)
    if (toDelete.length) {
      await supabase.from('page_blocks').delete().in('id', toDelete.map(b => b.id))
    }

    const toSave = blocks.filter(b => !b._isDeleted)
    if (toSave.length) {
      await supabase.from('page_blocks').upsert(
        toSave.map((b, i) => ({
          ...(b._isNew ? {} : { id: b.id }),
          profile_id: profile.id,
          block_type: b.block_type,
          config:     b.config as unknown as Json,
          position:   i,
          is_visible: b.is_visible,
        })),
      )
    }

    const { data } = await supabase
      .from('page_blocks')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position')

    setBlocks((data ?? []).map(b => ({
      id:         b.id,
      block_type: b.block_type,
      config:     (b.config as Record<string, unknown>) ?? {},
      position:   b.position,
      is_visible: b.is_visible,
    })))
    setHasUnsaved(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const visibleBlocks = blocks.filter(b => !b._isDeleted)
  const displayName   = profile.display_name || profile.username
  const citySlug      = profile.city.toLowerCase().replace(/\s+/g, '-')
  const profilePath   = profile.creator_type === 'business_brand'
    ? `/${citySlug}/${profile.username}`
    : `/${profile.username}`

  const crosshatch = {
    backgroundImage:  'radial-gradient(#1A2744 0.5px, transparent 0.5px)',
    backgroundSize:   '16px 16px',
    backgroundColor:  '#F5ECD7',
  }

  function SaveButton({ className = '' }: { className?: string }) {
    const s = saveStatus
    const label = s === 'saving' ? 'SAVING…' : s === 'saved' ? 'SAVED ✓' : 'SAVE'
    const bg    = s === 'saved'  ? '#5DD9D0' : '#E8705A'
    return (
      <button
        onClick={saveBlocks}
        disabled={s === 'saving' || (!hasUnsaved && s === 'idle')}
        className={`px-6 py-2 text-white font-black uppercase border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] transition-all hover:shadow-[5px_5px_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-default ${className}`}
        style={{
          fontFamily: 'var(--font-outfit, var(--font-syne))',
          background: bg,
          color: s === 'saved' ? '#1A2744' : 'white',
        }}
      >
        {label}
      </button>
    )
  }

  function BlockList() {
    return (
      <>
        {visibleBlocks.length === 0 ? (
          <div className="border-2 border-dashed border-white/10 p-12 text-center">
            <p
              className="text-[10px] text-white/20 uppercase tracking-widest mb-2"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              YOUR PAGE IS BLANK
            </p>
            <p
              className="text-[14px] text-white/30"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Add your first block below
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleBlocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                index={index}
                isDragging={dragIndex === index}
                isDeleting={deletingId === block.id}
                isConfirmingDelete={deleteConfirm === block.id}
                onChange={setBlockConfig}
                onToggleVisibility={toggleVisibility}
                onDeleteClick={handleDeleteClick}
                onConfirmDelete={confirmDelete}
                onCancelDelete={() => setDeleteConfirm(null)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                profileId={profile.id}
              />
            ))}
          </div>
        )}
      </>
    )
  }

  function BlockPalette() {
    return (
      <div
        className="border-t-2 border-dashed border-[#57423e] p-4 bg-[#07070A]"
        style={{ position: 'sticky', bottom: 0 }}
      >
        <p
          className="text-[10px] text-white/30 uppercase mb-3"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          ADD BLOCK
        </p>
        <div className="flex gap-2 flex-wrap">
          {PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => addBlock(item.type)}
              className="flex items-center gap-2 px-3 py-2 bg-[#1A2744] border border-dashed border-[#57423e] hover:border-[#E8705A] hover:bg-[#E8705A]/10 transition-all cursor-pointer"
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ color: item.color }}
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] text-white/60 uppercase"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function PreviewPanel() {
    return (
      <div style={crosshatch} className="h-full overflow-y-auto blk-scrollbar">
        {/* Preview header */}
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b-2 border-dashed border-[#57423e] bg-[#F5ECD7]">
          <span
            className="text-[10px] text-[#1A2744]/50 uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            LIVE PREVIEW
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#E8705A] rounded-full animate-pulse" />
            <span
              className="text-[10px] text-[#1A2744]/40"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {profilePath}
            </span>
          </div>
        </div>

        {/* Mini creator strip */}
        <div className="bg-[#1A2744] px-6 py-5 border-b-2 border-dashed border-[#57423e]">
          <span
            className="inline-block bg-[#E8705A] text-[#1A2744] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest mb-2"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {profile.creator_type.replace(/_/g, ' ').toUpperCase()}
          </span>
          <h2
            className="text-white font-black uppercase leading-none"
            style={{ fontFamily: 'var(--font-syne)', fontSize: 28 }}
          >
            {displayName.toUpperCase()}
          </h2>
          <p
            className="text-white/40 text-[12px] mt-1"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            @{profile.username}
          </p>
        </div>

        {/* Block previews */}
        <div className="p-4 flex flex-col gap-4">
          {visibleBlocks.length === 0 ? (
            <div className="border-2 border-dashed border-[#1A2744]/10 p-8 text-center mt-4">
              <p
                className="text-[10px] text-[#1A2744]/30 uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                NO BLOCKS YET
              </p>
            </div>
          ) : (
            visibleBlocks.map((block, idx) => (
              <div
                key={block.id}
                className="bg-white border border-[#1A2744]/10 shadow-[2px_4px_12px_rgba(0,0,0,0.06)] relative overflow-hidden"
                style={{
                  opacity: block.is_visible ? 1 : 0.3,
                  '--pp-text':       '#1A2744',
                  '--pp-text-muted': 'rgba(26,39,68,0.55)',
                  '--pp-border':     'rgba(26,39,68,0.12)',
                } as React.CSSProperties}
              >
                <div
                  className="absolute top-2 right-3 text-[8px] text-[#1A2744]/20"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {idx + 1}
                </div>
                {!block.is_visible && (
                  <div
                    className="absolute top-2 left-3 text-[8px] text-[#1A2744]/40"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    HIDDEN FROM VISITORS
                  </div>
                )}
                <div className="p-4">
                  <BlockRenderer
                    block={toPreviewBlock(block)}
                    theme={theme}
                    isPreview
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{INJECTED_CSS}</style>

      {/* Desktop layout */}
      <div
        className="hidden md:grid"
        style={{
          gridTemplateColumns: '55fr 45fr',
          height:              'calc(100vh - 48px)',
          overflow:            'hidden',
          background:          '#07070A',
        }}
      >
        {/* ── Left: Editor ─────────────────────────────────────────────────── */}
        <div
          className="flex flex-col"
          style={{
            overflow:    'hidden',
            borderRight: '2px dashed #57423e',
          }}
        >
          {/* Editor header */}
          <div
            className="flex items-center justify-between flex-shrink-0"
            style={{ padding: '24px', borderBottom: '2px dashed #57423e' }}
          >
            <div>
              <p
                className="text-[10px] text-white/40 uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                YOUR PAGE
              </p>
              <p
                className="text-[20px] text-white font-bold mt-1"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {displayName}&apos;s zine
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={profilePath}
                target="_blank"
                className="px-4 py-2 border border-dashed border-[#9B8FFF] text-[#9B8FFF] text-[10px] uppercase hover:bg-[#9B8FFF]/10 transition-colors"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                VIEW PAGE →
              </Link>
              <Link
                href="/dashboard/profile/settings"
                className="px-4 py-2 border border-dashed border-[#57423e] text-white/40 text-[10px] uppercase hover:border-white/40 hover:text-white/60 transition-colors"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                PROFILE SETTINGS
              </Link>
              <SaveButton />
            </div>
          </div>

          {/* Block list — scrollable */}
          <div className="flex-1 overflow-y-auto blk-scrollbar p-6">
            <BlockList />
          </div>

          {/* Add palette — sticky */}
          <BlockPalette />
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────────── */}
        <PreviewPanel />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden bg-[#07070A] min-h-screen">
        {/* Mobile header */}
        <div
          className="sticky top-0 z-20 h-14 flex items-center justify-between px-4"
          style={{ background: '#07070A', borderBottom: '2px dashed #57423e' }}
        >
          <div className="flex items-center gap-3">
            <p
              className="text-[14px] text-white font-bold"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              EDIT PAGE
            </p>
            {hasUnsaved && (
              <span className="w-2 h-2 bg-[#E8705A] rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileTab(t => t === 'blocks' ? 'preview' : 'blocks')}
              className="px-3 py-1 text-[10px] uppercase border border-dashed border-[#57423e] text-white/40 hover:text-white/60 transition-colors"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {mobileTab === 'blocks' ? 'PREVIEW' : 'BLOCKS'}
            </button>
            <SaveButton />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b-2 border-dashed border-[#57423e] sticky" style={{ top: 56, zIndex: 19, background: '#07070A' }}>
          {(['blocks', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-3 text-[10px] uppercase transition-colors"
              style={{
                fontFamily:  'var(--font-jetbrains-mono)',
                background:  mobileTab === tab ? '#1A2744' : 'transparent',
                color:       mobileTab === tab ? 'white'    : 'rgba(255,255,255,0.4)',
              }}
            >
              {tab === 'blocks' ? 'BLOCKS' : 'PREVIEW'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {mobileTab === 'blocks' ? (
          <div className="pb-32">
            <div className="p-4">
              <BlockList />
            </div>
            <BlockPalette />
          </div>
        ) : (
          <div style={{ height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
            <PreviewPanel />
          </div>
        )}
      </div>
    </>
  )
}
