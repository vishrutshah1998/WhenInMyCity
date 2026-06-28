'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReactionBar from './ReactionBar'
import { deletePost, type CreatorPostWithReactions } from '@/app/actions/posts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  === 1) return 'yesterday'
  if (days  < 7)  return `${days} days ago`
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function safeHostname(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
  } catch {
    return url
  }
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-[2px] w-8" style={{ background: '#E8705A' }} />
      <span
        className="text-[13px] text-[#1A2744]/50 uppercase tracking-[0.3em] font-semibold"
        style={{ fontFamily: 'var(--font-dm-sans)', letterSpacing: '0.3em' }}
      >
        {label}
      </span>
      <div className="h-px flex-grow" style={{ background: 'rgba(26,39,68,0.1)' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual post card
// ---------------------------------------------------------------------------

function PostCard({
  post,
  isOwner,
  viewerUserId,
  onDelete,
}: {
  post:         CreatorPostWithReactions
  isOwner:      boolean
  viewerUserId: string | null
  onDelete:     (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    const result = await deletePost(post.id)
    if (result.error) { setDeleting(false); return }
    onDelete(post.id)
  }

  return (
    <div
      className="relative group mb-4"
      style={{
        background:   '#FFFFFF',
        border:       '1px solid rgba(26,39,68,0.08)',
        boxShadow:    '2px 4px 12px rgba(0,0,0,0.06)',
        opacity:      deleting ? 0.4 : 1,
        transition:   'opacity 0.2s',
      }}
    >
      {/* Torn top edge for text posts */}
      {post.post_type === 'text' && (
        <div
          aria-hidden
          style={{
            height:     10,
            background: '#FAF7F0',
            maskImage:  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'10\'%3E%3Cpath d=\'M0 10 Q5 0 10 5 Q15 10 20 4 Q25 0 30 6 Q35 10 40 3 L40 10Z\' fill=\'white\'/%3E%3C/svg%3E")',
            maskRepeat: 'repeat-x',
            maskSize:   '40px 10px',
          }}
        />
      )}

      <div className="px-5 pt-4 pb-3">

        {/* TEXT */}
        {post.post_type === 'text' && (
          <p
            className="text-[16px] leading-relaxed text-[#1A2744]"
            style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 400 }}
          >
            {post.content}
          </p>
        )}

        {/* PHOTO */}
        {post.post_type === 'photo' && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url!}
              alt=""
              className="w-full object-cover max-h-[320px] mb-3"
              style={{ border: '1px solid rgba(26,39,68,0.05)' }}
            />
            {post.content && (
              <p
                className="text-[15px] text-[#1A2744]/70"
                style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 400 }}
              >
                {post.content}
              </p>
            )}
          </>
        )}

        {/* LINK */}
        {post.post_type === 'link' && post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 transition-colors"
            style={{
              background:  '#F5ECD7',
              border:      '1px solid rgba(26,39,68,0.1)',
              textDecoration: 'none',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#E8705A')}
            onMouseOut={(e)  => (e.currentTarget.style.borderColor = 'rgba(26,39,68,0.1)')}
          >
            <div className="flex gap-3 items-start">
              {post.link_preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.link_preview}
                  alt=""
                  className="w-16 h-16 object-cover flex-shrink-0"
                />
              )}
              <div>
                <p
                  className="text-[14px] font-semibold text-[#1A2744] leading-tight"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {post.link_title || post.link_url}
                </p>
                <p
                  className="text-[12px] text-[#1A2744]/40 mt-1 truncate"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {safeHostname(post.link_url)}
                </p>
              </div>
            </div>
            {post.content && (
              <p
                className="text-[14px] text-[#1A2744]/60 mt-2"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {post.content}
              </p>
            )}
          </a>
        )}

        {/* Subscriber-only badge */}
        {post.is_subscriber_only && (
          <div className="inline-flex items-center gap-1 mt-2">
            <span className="text-[12px]">🔒</span>
            <span
              className="text-[11px] text-[#1A2744]/30"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Subscribers only
            </span>
          </div>
        )}
      </div>

      {/* Footer: timestamp + reactions */}
      <div
        className="px-5 pb-3 flex items-center justify-between pt-2"
        style={{ borderTop: '1px solid rgba(26,39,68,0.05)' }}
      >
        <span
          className="text-[12px] text-[#1A2744]/30"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          suppressHydrationWarning
        >
          {formatRelativeTime(post.created_at)}
        </span>

        <ReactionBar
          postId={post.id}
          initialReactions={post.reactions}
          initialUserReactions={post.viewerReactions}
          viewerUserId={viewerUserId}
        />
      </div>

      {/* Delete button — own profile only, hover-visible */}
      {isOwner && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(26,39,68,0.2)' }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
          onMouseOut={(e)  => (e.currentTarget.style.color = 'rgba(26,39,68,0.2)')}
          aria-label="Delete post"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_outline</span>
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreatorPostsSection
// ---------------------------------------------------------------------------

interface Props {
  initialPosts:   CreatorPostWithReactions[]
  isOwner:        boolean
  viewerUserId:   string | null
  creatorUsername: string
}

export default function CreatorPostsSection({
  initialPosts,
  isOwner,
  viewerUserId,
  creatorUsername,
}: Props) {
  const [posts, setPosts] = useState<CreatorPostWithReactions[]>(initialPosts)

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (posts.length === 0) {
    if (!isOwner) return null

    return (
      <section className="w-full">
        <SectionDivider label="LATEST" />
        <div
          className="p-8 text-center"
          style={{ border: '2px dashed rgba(26,39,68,0.1)' }}
        >
          <p
            className="text-[15px] text-[#1A2744]/30"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Share what&apos;s on your mind with your community
          </p>
          <Link
            href="/dashboard"
            className="text-[13px] font-semibold mt-2 inline-block"
            style={{ color: '#E8705A', textDecoration: 'none', fontFamily: 'var(--font-dm-sans)' }}
          >
            Post an update →
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full">
      <SectionDivider label="LATEST" />

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isOwner={isOwner}
          viewerUserId={viewerUserId}
          onDelete={handleDelete}
        />
      ))}

      {/* Load more placeholder — pagination is future work */}
      {initialPosts.length === 10 && (
        <button
          className="w-full py-3 text-[13px] text-[#1A2744]/40 hover:text-[#1A2744]/70 transition-colors"
          style={{
            fontFamily:  'var(--font-dm-sans)',
            borderTop:   '1px solid rgba(26,39,68,0.05)',
          }}
        >
          Load more posts
        </button>
      )}
    </section>
  )
}
