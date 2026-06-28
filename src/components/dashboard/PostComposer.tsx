'use client'

import { useRef, useState } from 'react'
import {
  createPost,
  uploadPostImage,
  fetchOgData,
  type CreatorPost,
  type CreatePostInput,
} from '@/app/actions/posts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostType = 'text' | 'photo' | 'link'

interface OgData {
  title: string | null
  image: string | null
}

interface Props {
  onPostCreated?: (post: CreatorPost) => void
}

// ---------------------------------------------------------------------------
// PostComposer
// ---------------------------------------------------------------------------

export default function PostComposer({ onPostCreated }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [postType,         setPostType]         = useState<PostType>('text')
  const [content,          setContent]          = useState('')
  const [caption,          setCaption]          = useState('')
  const [imageUrl,         setImageUrl]         = useState<string | null>(null)
  const [imagePreview,     setImagePreview]     = useState<string | null>(null)
  const [imageUploading,   setImageUploading]   = useState(false)
  const [imageError,       setImageError]       = useState<string | null>(null)
  const [linkUrl,          setLinkUrl]          = useState('')
  const [ogData,           setOgData]           = useState<OgData | null>(null)
  const [ogLoading,        setOgLoading]        = useState(false)
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false)
  const [posting,          setPosting]          = useState(false)
  const [statusMsg,        setStatusMsg]        = useState<string | null>(null)
  const [errorMsg,         setErrorMsg]         = useState<string | null>(null)

  // ── Type pill ─────────────────────────────────────────────────────────────

  const TYPES: { type: PostType; emoji: string; label: string }[] = [
    { type: 'text',  emoji: '✍️', label: 'Text'  },
    { type: 'photo', emoji: '📸', label: 'Photo' },
    { type: 'link',  emoji: '🔗', label: 'Link'  },
  ]

  function switchType(t: PostType) {
    setPostType(t)
    setErrorMsg(null)
    setStatusMsg(null)
  }

  // ── Image handling ────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl(null)
    setImageUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPostImage(fd)
    setImageUploading(false)

    if (result.error) {
      setImageError(result.error)
      setImagePreview(null)
    } else {
      setImageUrl(result.url)
    }
  }

  function removeImage() {
    setImagePreview(null)
    setImageUrl(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── OG fetch ──────────────────────────────────────────────────────────────

  async function handleLinkBlur() {
    const trimmed = linkUrl.trim()
    if (!trimmed || ogLoading) return
    setOgLoading(true)
    const result = await fetchOgData(trimmed)
    setOgLoading(false)
    if (result.title || result.image) {
      setOgData({ title: result.title, image: result.image })
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setErrorMsg(null)
    setStatusMsg(null)
    setPosting(true)

    const input: CreatePostInput = {
      post_type:          postType,
      is_subscriber_only: isSubscriberOnly,
    }

    if (postType === 'text') {
      input.content = content.trim()
    } else if (postType === 'photo') {
      if (!imageUrl) { setErrorMsg('Image still uploading — please wait.'); setPosting(false); return }
      input.image_url = imageUrl
      if (caption.trim()) input.content = caption.trim()
    } else {
      input.link_url    = linkUrl.trim()
      input.link_title  = ogData?.title ?? undefined
      input.link_preview = ogData?.image ?? undefined
      if (content.trim()) input.content = content.trim()
    }

    const result = await createPost(input)
    setPosting(false)

    if (result.error) {
      setErrorMsg(result.error)
      return
    }

    // Reset form
    setContent('')
    setCaption('')
    setImagePreview(null)
    setImageUrl(null)
    setLinkUrl('')
    setOgData(null)
    setIsSubscriberOnly(false)
    setStatusMsg('Posted ✓')
    setTimeout(() => setStatusMsg(null), 2500)

    if (result.data) onPostCreated?.(result.data)
  }

  // ── isEmpty guard ─────────────────────────────────────────────────────────

  const isEmpty =
    (postType === 'text'  && !content.trim()) ||
    (postType === 'photo' && !imagePreview)   ||
    (postType === 'link'  && !linkUrl.trim())

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative mb-8"
      style={{
        background:  '#FAF7F0',
        border:      '2px solid #1A2744',
        boxShadow:   '4px 4px 0px 0px rgba(0,0,0,1)',
      }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8705A]" />

      {/* ── Top row ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between pl-6 pr-4 py-4"
        style={{ borderBottom: '2px dashed rgba(26,39,68,0.1)' }}
      >
        <span
          className="text-[16px] text-[#1A2744] font-bold"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          WHAT&apos;S HAPPENING?
        </span>

        <div className="flex gap-2">
          {TYPES.map(({ type, emoji, label }) => (
            <button
              key={type}
              onClick={() => switchType(type)}
              className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-semibold transition-all"
              style={{
                fontFamily:      'var(--font-dm-sans)',
                backgroundColor: postType === type ? '#E8705A' : 'transparent',
                color:           postType === type ? 'white'   : '#1A2744',
                border:          postType === type ? '2px solid #E8705A' : '2px dashed rgba(26,39,68,0.2)',
                borderRadius:    0,
              }}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="pl-6 pr-4 pt-4 pb-3">

        {/* TEXT */}
        {postType === 'text' && (
          <>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              placeholder="Share an update with your community..."
              rows={3}
              className="w-full bg-transparent border-none outline-none resize-none text-[16px] text-[#1A2744]"
              style={{
                fontFamily:  'var(--font-dm-sans)',
                fontWeight:  400,
                lineHeight:  1.6,
              }}
            />
            <p
              className="text-right text-[13px] mt-1"
              style={{ fontFamily: 'var(--font-dm-sans)', color: 'rgba(26,39,68,0.3)' }}
            >
              {content.length}/500
            </p>
          </>
        )}

        {/* PHOTO */}
        {postType === 'photo' && (
          <>
            {!imagePreview ? (
              <div
                className="cursor-pointer py-6 flex flex-col items-center justify-center transition-all"
                style={{ border: '2px dashed rgba(26,39,68,0.15)' }}
                onClick={() => fileInputRef.current?.click()}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#E8705A')}
                onMouseOut={(e)  => (e.currentTarget.style.borderColor = 'rgba(26,39,68,0.15)')}
              >
                <span className="text-[14px] text-[#1A2744]/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  📸&nbsp; Add a photo
                </span>
                {imageUploading && (
                  <span className="text-[12px] text-[#E8705A] mt-1 animate-pulse" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    Uploading…
                  </span>
                )}
                {imageError && (
                  <span className="text-[12px] text-red-500 mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {imageError}
                  </span>
                )}
              </div>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full max-h-[200px] object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors"
                  style={{ borderRadius: 0 }}
                  aria-label="Remove image"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
                {imageUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-[13px] animate-pulse" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                      Uploading…
                    </span>
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {imagePreview && (
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={300}
                placeholder="Add a caption…"
                rows={2}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-[#1A2744] mt-3"
                style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 400, lineHeight: 1.6 }}
              />
            )}
          </>
        )}

        {/* LINK */}
        {postType === 'link' && (
          <>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => { setLinkUrl(e.target.value); setOgData(null) }}
              onBlur={handleLinkBlur}
              placeholder="Paste a link…"
              className="w-full bg-transparent outline-none text-[16px] text-[#1A2744] pb-1"
              style={{
                fontFamily:   'var(--font-dm-sans)',
                fontWeight:   400,
                borderBottom: '1px solid rgba(26,39,68,0.15)',
              }}
            />

            {ogLoading && (
              <p className="text-[12px] text-[#E8705A] mt-2 animate-pulse" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Fetching preview…
              </p>
            )}

            {ogData && (
              <div
                className="flex gap-3 mt-3 p-3"
                style={{ background: 'rgba(26,39,68,0.05)' }}
              >
                {ogData.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ogData.image}
                    alt=""
                    className="w-[60px] h-[60px] object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-semibold text-[#1A2744] truncate"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {ogData.title ?? linkUrl}
                  </p>
                  <p
                    className="text-[12px] text-[#1A2744]/40 mt-0.5 truncate"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {(() => { try { return new URL(linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`).hostname } catch { return linkUrl } })()}
                  </p>
                </div>
              </div>
            )}

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={300}
              placeholder="Say something about this link…"
              rows={2}
              className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-[#1A2744] mt-3"
              style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 400, lineHeight: 1.6 }}
            />
          </>
        )}
      </div>

      {/* ── Bottom row ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between pl-6 pr-4 py-3"
        style={{ borderTop: '2px dashed rgba(26,39,68,0.1)' }}
      >
        {/* Subscriber-only toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: isSubscriberOnly ? '#E8705A' : 'rgba(26,39,68,0.15)' }}
              onClick={() => setIsSubscriberOnly(!isSubscriberOnly)}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: isSubscriberOnly ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </div>
            <span
              className="text-[13px] text-[#1A2744]/50"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Subscriber only
            </span>
          </label>
          {isSubscriberOnly && (
            <span
              className="text-[12px] text-[#1A2744]/40"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              🔒 Only your subscribers will see this
            </span>
          )}
        </div>

        {/* Submit + status */}
        <div className="flex items-center gap-3">
          {errorMsg && (
            <span
              className="text-[12px] text-red-500"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {errorMsg}
            </span>
          )}
          {statusMsg && (
            <span
              className="text-[12px] text-[#E8705A] font-semibold"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {statusMsg}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={isEmpty || posting || imageUploading}
            className="px-8 py-2 text-[15px] font-bold text-white transition-all"
            style={{
              fontFamily:  'var(--font-dm-sans)',
              background:  '#E8705A',
              border:      '2px solid black',
              boxShadow:   '3px 3px 0px 0px rgba(0,0,0,1)',
              opacity:     isEmpty || posting || imageUploading ? 0.5 : 1,
              cursor:      isEmpty || posting || imageUploading ? 'not-allowed' : 'pointer',
            }}
          >
            {posting ? 'POSTING…' : 'POST'}
          </button>
        </div>
      </div>
    </div>
  )
}
