'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  Community,
  CommunityMembershipStatus,
  CommunityFeedPost,
  CommunityEventLink,
  CommunityEventPreview,
  PendingJoinRequest,
} from '@/app/actions/communities'
import {
  createCommunityPost,
  requestJoinCommunity,
  respondToJoinRequest,
} from '@/app/actions/communities'
import type { Event } from '@/types/database'
import CommunityReactionBar from '@/components/communities/CommunityReactionBar'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalendarEntry = CommunityEventLink & {
  event: Event | null
  preview: CommunityEventPreview | null
  previewOnly: boolean
}

interface Props {
  community: Community
  membership: CommunityMembershipStatus
  memberCount: number
  initialFeed: { posts: CommunityFeedPost[]; nextCursor: string | null; done: boolean }
  calendar: CalendarEntry[]
  pendingRequests: PendingJoinRequest[]
  viewerUserId: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day} days ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_COLORS = ['#3B6BCC', '#0D9488', '#D97706', '#8896B0']
function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function CircleClient({
  community,
  membership,
  memberCount,
  initialFeed,
  calendar,
  pendingRequests,
  viewerUserId,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'feed' | 'calendar'>('feed')
  const [membershipState, setMembershipState] = useState(membership)

  const canAddEvent = membershipState.isMember || membershipState.isOwner

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      <CircleHeader community={community} />

      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-secondary)' }}>groups</span>
          <span style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
            {memberCount} member{memberCount === 1 ? '' : 's'}
          </span>
        </div>
        <MembershipStatus
          communityId={community.id}
          membership={membershipState}
          onChange={setMembershipState}
          router={router}
        />
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <TabToggle tab={tab} onChange={setTab} />
      </div>

      {membershipState.isOwner && pendingRequests.length > 0 && (
        <OwnerJoinRequests requests={pendingRequests} router={router} />
      )}

      {tab === 'feed' ? (
        <FeedTab
          community={community}
          canPost={membershipState.isMember || membershipState.isOwner}
          canAddEvent={canAddEvent}
          initialFeed={initialFeed}
          viewerUserId={viewerUserId}
        />
      ) : (
        <CalendarTab community={community} canAddEvent={canAddEvent} calendar={calendar} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function CircleHeader({ community }: { community: Community }) {
  return (
    <div style={{ position: 'relative', height: 172, overflow: 'hidden' }}>
      {community.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={community.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 140% at 15% 0%, #E9DFC8 0%, #DED0AE 42%, #CBB985 100%)',
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(26,39,68,0.05) 0px, rgba(26,39,68,0.05) 1px, transparent 1px, transparent 28px)' }} />

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(0deg, rgba(26,39,68,0.55), transparent)' }}>
        {community.category && (
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fontWeight: 700, color: '#FEFCF8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
            {community.category}{community.city ? ` · ${community.city}` : ''}
          </div>
        )}
        <h1 style={{ margin: 0, fontFamily: 'var(--font-abril)', fontSize: 26, lineHeight: 1.1, color: '#FEFCF8', fontWeight: 400 }}>
          {community.name}
        </h1>
      </div>
    </div>
  )
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
      background: `${color}22`, border: `1px solid ${color}55`,
    }}>
      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, color }}>{label}</span>
    </div>
  )
}

function MembershipStatus({
  communityId, membership, onChange, router,
}: {
  communityId: string
  membership: CommunityMembershipStatus
  onChange: (m: CommunityMembershipStatus) => void
  router: ReturnType<typeof useRouter>
}) {
  const [pending, setPending] = useState(false)

  async function handleJoin() {
    setPending(true)
    const result = await requestJoinCommunity(communityId)
    setPending(false)
    if (result.success) {
      onChange({ ...membership, isPending: true })
      router.refresh()
    }
  }

  if (membership.isOwner) return <StatusPill color="var(--wimc-coral)" label="Owner" />
  if (membership.isMember) return <StatusPill color="var(--wimc-teal)" label="Member" />
  if (membership.isPending) return <StatusPill color="var(--wimc-amber)" label="Request pending" />

  return (
    <button
      onClick={handleJoin}
      disabled={pending}
      style={{
        border: 'none', cursor: 'pointer', padding: '9px 18px', borderRadius: 999,
        background: 'var(--wimc-coral)', color: '#FEFCF8',
        fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 13,
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? 'Joining…' : 'Join Circle'}
    </button>
  )
}

function TabToggle({ tab, onChange }: { tab: 'feed' | 'calendar'; onChange: (t: 'feed' | 'calendar') => void }) {
  return (
    <div style={{ display: 'flex', padding: 4, gap: 4, background: 'var(--wimc-bg-raised)', border: '1px solid var(--wimc-border-default)', borderRadius: 999 }}>
      {(['feed', 'calendar'] as const).map((t) => {
        const active = tab === t
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: active ? 'var(--wimc-coral)' : 'transparent',
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fontWeight: 700,
              color: active ? '#FEFCF8' : 'var(--wimc-text-secondary)',
            }}
          >
            {t === 'feed' ? 'Notice Board' : 'Calendar'}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Owner — pending join requests
// ---------------------------------------------------------------------------

function OwnerJoinRequests({ requests, router }: { requests: PendingJoinRequest[]; router: ReturnType<typeof useRouter> }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  async function respond(id: string, decision: 'approved' | 'rejected') {
    setProcessing(id)
    const result = await respondToJoinRequest(id, decision)
    setProcessing(null)
    if (result.success) {
      setResolved((prev) => new Set(prev).add(id))
      router.refresh()
    }
  }

  const visible = requests.filter((r) => !resolved.has(r.id))
  if (visible.length === 0) return null

  return (
    <div style={{ margin: '16px 20px 0', padding: '12px 14px', background: 'var(--wimc-bg-raised)', border: '1px solid var(--wimc-border-subtle)', borderRadius: 10 }}>
      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Join requests ({visible.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999, background: avatarColor(r.user_id), color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {initialsOf(r.user?.display_name ?? '?')}
            </div>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
              {r.user?.display_name ?? 'Someone'}
            </span>
            <button
              onClick={() => respond(r.id, 'approved')}
              disabled={processing === r.id}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'var(--wimc-neel)', color: '#fff', opacity: processing === r.id ? 0.6 : 1 }}
            >
              Approve
            </button>
            <button
              onClick={() => respond(r.id, 'rejected')}
              disabled={processing === r.id}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: '1px solid var(--wimc-coral)', cursor: 'pointer', background: 'transparent', color: 'var(--wimc-coral)', opacity: processing === r.id ? 0.6 : 1 }}
            >
              Decline
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feed tab
// ---------------------------------------------------------------------------

function FeedTab({
  community, canPost, canAddEvent, initialFeed, viewerUserId,
}: {
  community: Community
  canPost: boolean
  canAddEvent: boolean
  initialFeed: { posts: CommunityFeedPost[]; nextCursor: string | null; done: boolean }
  viewerUserId: string | null
}) {
  const [posts, setPosts] = useState(initialFeed.posts)

  function handlePosted(post: CommunityFeedPost) {
    setPosts((prev) => [post, ...prev])
  }

  return (
    <div style={{ padding: '16px 20px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canPost && <PostComposer communityId={community.id} onPosted={handlePosted} />}

      {posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        posts.map((post) => (
          <FeedPostCard key={post.id} post={post} viewerUserId={viewerUserId} />
        ))
      )}

      {canAddEvent && (
        <Link
          href={`/dashboard/events/create?communityId=${community.id}`}
          style={{
            marginTop: 4, textAlign: 'center', padding: '13px 0', borderRadius: 999,
            background: 'var(--wimc-coral)', color: '#FEFCF8', textDecoration: 'none',
            fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 13.5,
          }}
        >
          + Add event
        </Link>
      )}
    </div>
  )
}

function EmptyFeed() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--wimc-text-muted)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>push_pin</span>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-dm-sans)' }}>No posts yet — be the first to share something.</div>
    </div>
  )
}

function PostComposer({ communityId, onPosted }: { communityId: string; onPosted: (post: CommunityFeedPost) => void }) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)
    const { post, error: err } = await createCommunityPost(communityId, trimmed)
    setSubmitting(false)
    if (err || !post) {
      setError(err ?? 'Failed to post.')
      return
    }
    onPosted({
      ...post,
      event: null,
      preview: null,
      previewOnly: false,
      reactions: [],
      viewerReactions: [],
      author: null,
    })
    setContent('')
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,39,68,0.08)', boxShadow: '2px 4px 12px rgba(0,0,0,0.06)', padding: '14px 16px' }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Post an update to this circle…"
        maxLength={2000}
        style={{
          width: '100%', minHeight: 60, border: 'none', outline: 'none', resize: 'none',
          fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--wimc-text-primary)', background: 'transparent',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        {error && <span style={{ fontSize: 11, color: 'var(--wimc-coral)', marginRight: 'auto' }}>{error}</span>}
        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          style={{
            border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 999,
            background: 'var(--wimc-coral)', color: '#FEFCF8',
            fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 12.5,
            opacity: submitting || !content.trim() ? 0.5 : 1,
          }}
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}

function FeedPostCard({ post, viewerUserId }: { post: CommunityFeedPost; viewerUserId: string | null }) {
  if (post.post_type === 'event_share') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PostAuthorLine post={post} verb="shared an event" />
        {post.previewOnly && post.preview ? (
          <DraftEventCard title={post.preview.title} authorName={post.author?.display_name ?? 'Someone'} />
        ) : post.event ? (
          <EventShareCard event={post.event} />
        ) : (
          // event_id set but neither the full row nor the preview resolved
          // (e.g. viewer isn't an approved member) — fall back to the frozen text.
          <UpdatePostCard post={post} viewerUserId={viewerUserId} />
        )}
      </div>
    )
  }

  return <UpdatePostCard post={post} viewerUserId={viewerUserId} />
}

function PostAuthorLine({ post, verb }: { post: CommunityFeedPost; verb: string }) {
  const name = post.author?.display_name ?? 'Someone'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 999, background: avatarColor(post.author_id), color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {initialsOf(name)}
      </div>
      <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
        <strong style={{ color: 'var(--wimc-text-primary)', fontWeight: 600 }}>{name}</strong> {verb}
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(26,39,68,0.3)', fontFamily: 'var(--font-dm-sans)' }}>
        {formatRelativeTime(post.created_at)}
      </div>
    </div>
  )
}

function UpdatePostCard({ post, viewerUserId }: { post: CommunityFeedPost; viewerUserId: string | null }) {
  const name = post.author?.display_name ?? 'Someone'
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,39,68,0.08)', boxShadow: '2px 4px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '14px 18px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 999, background: avatarColor(post.author_id), color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {initialsOf(name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>{name}</div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,39,68,0.3)', fontFamily: 'var(--font-dm-sans)', flexShrink: 0 }}>
          {formatRelativeTime(post.created_at)}
        </div>
      </div>

      <div style={{ padding: '10px 18px 14px', fontSize: 15, lineHeight: 1.55, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)', whiteSpace: 'pre-line' }}>
        {post.content}
      </div>

      <div style={{ padding: '12px 18px 14px', borderTop: '1px solid rgba(26,39,68,0.05)' }}>
        <CommunityReactionBar
          postId={post.id}
          initialReactions={post.reactions}
          initialUserReactions={post.viewerReactions}
          viewerUserId={viewerUserId}
        />
      </div>
    </div>
  )
}

function EventShareCard({ event }: { event: Event }) {
  const starts = new Date(event.starts_at)
  return (
    <div style={{ background: '#FAF7F0', border: '2px dashed rgba(26,39,68,0.22)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--wimc-coral)' }} />
      <div style={{ display: 'flex' }}>
        <div style={{ width: 96, height: 96, flexShrink: 0, position: 'relative', borderRight: '1px dashed rgba(26,39,68,0.22)' }}>
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'repeating-linear-gradient(135deg, #DCD2B8, #DCD2B8 6px, #D0C4A2 6px, #D0C4A2 12px)',
            }} />
          )}
        </div>
        <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-abril)', fontSize: 16, color: 'var(--wimc-text-primary)', lineHeight: 1.2, marginBottom: 6 }}>
            {event.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>calendar_today</span>
            <span style={{ fontSize: 11.5, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
              {starts.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {starts.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>location_on</span>
            <span style={{ fontSize: 11.5, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>{event.venue_name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DraftEventCard({ title, authorName }: { title: string; authorName: string }) {
  return (
    <div style={{ background: 'var(--wimc-bg-raised)', border: '2px dashed rgba(26,39,68,0.16)', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 999, background: 'rgba(26,39,68,0.06)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--wimc-text-muted)' }}>schedule</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--wimc-text-primary)', fontWeight: 600 }}>{authorName}</strong> is preparing &ldquo;{title}&rdquo;
        </div>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9.5, color: 'var(--wimc-text-muted)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Full details appear once it&apos;s published
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendar tab
// ---------------------------------------------------------------------------

function CalendarTab({
  community, canAddEvent, calendar,
}: {
  community: Community
  canAddEvent: boolean
  calendar: CalendarEntry[]
}) {
  const today = new Date()
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  // Group calendar entries by their REAL date — full events by starts_at,
  // draft/previewOnly events by preview.starts_at (migration 072 makes this
  // resolvable now; no more dateless "in the works" tray).
  const byDay = new Map<string, CalendarEntry[]>()
  for (const entry of calendar) {
    const iso = entry.event?.starts_at ?? entry.preview?.starts_at
    if (!iso) continue
    const key = dayKey(iso)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(entry)
  }

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Date[] = []
  for (let i = 0; i < startOffset; i++) cells.push(new Date(year, month, i - startOffset + 1))
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(new Date(year, month, daysInMonth + (cells.length - startOffset - daysInMonth) + 1))

  const selectedEntries = byDay.get(dayKey(selectedDate.toISOString())) ?? []

  return (
    <div style={{ padding: '16px 20px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
          style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid var(--wimc-border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-secondary)' }}>chevron_left</span>
        </button>
        <div style={{ fontFamily: 'var(--font-abril)', fontSize: 19, color: 'var(--wimc-text-primary)' }}>
          {monthCursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
          style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid var(--wimc-border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-secondary)' }}>chevron_right</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9.5, color: 'var(--wimc-text-muted)', fontWeight: 700 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', border: '1px solid rgba(26,39,68,0.08)', borderRight: 'none', borderBottom: 'none' }}>
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month
          const isToday = date.toDateString() === today.toDateString()
          const isSelected = date.toDateString() === selectedDate.toDateString()
          const entries = byDay.get(dayKey(date.toISOString())) ?? []
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              style={{
                border: 'none', borderRight: '1px solid rgba(26,39,68,0.08)', borderBottom: '1px solid rgba(26,39,68,0.08)',
                background: 'transparent', cursor: 'pointer', aspectRatio: '1', padding: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6,
              }}
            >
              <span style={{
                fontSize: 13, fontFamily: 'var(--font-dm-sans)', width: 26, height: 26, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isSelected ? '#FEFCF8' : inMonth ? 'var(--wimc-text-primary)' : 'var(--wimc-text-muted)',
                background: isSelected ? 'var(--wimc-coral)' : 'transparent',
                border: isToday && !isSelected ? '1.5px solid var(--wimc-text-primary)' : 'none',
                fontWeight: isSelected ? 700 : 400,
              }}>
                {date.getDate()}
              </span>
              {entries.length > 0 && (
                <div style={{ width: 5, height: 5, borderRadius: 999, marginTop: 4, background: isSelected ? '#FEFCF8' : 'var(--wimc-coral)' }} />
              )}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-coral)', marginBottom: 10, textTransform: 'uppercase' }}>
          {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>

        {selectedEntries.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-dm-sans)' }}>Nothing on the calendar this day.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedEntries.map((entry) => (
              entry.previewOnly && entry.preview ? (
                <DraftEventCard key={entry.id} title={entry.preview.title} authorName="The organiser" />
              ) : entry.event ? (
                <EventShareCard key={entry.id} event={entry.event} />
              ) : null
            ))}
          </div>
        )}
      </div>

      {canAddEvent && (
        <Link
          href={`/dashboard/events/create?communityId=${community.id}`}
          style={{
            display: 'block', marginTop: 24, textAlign: 'center', padding: '13px 0', borderRadius: 999,
            background: 'var(--wimc-coral)', color: '#FEFCF8', textDecoration: 'none',
            fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 13.5,
          }}
        >
          + Add event
        </Link>
      )}
    </div>
  )
}
