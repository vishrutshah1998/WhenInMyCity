'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { HubCreator, HubConnection, HubMessage } from '@/app/actions/hub'
import {
  sendConnectionRequest,
  respondToConnection,
  sendMessage,
  getMessages,
} from '@/app/actions/hub'
import type { UserTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_META: Record<'lantern' | 'beacon', { label: string; color: string; icon: string }> = {
  lantern: { label: 'Lantern', color: 'var(--wimc-amber)',  icon: 'light_mode' },
  beacon:  { label: 'Beacon',  color: '#a855f7',            icon: 'workspace_premium' },
}

type Tab = 'discover' | 'connections' | 'messages'

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: UserTier }) {
  if (tier !== 'lantern' && tier !== 'beacon') return null
  const meta = TIER_META[tier]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 9999,
      background: `${meta.color}18`,
      border: `1px solid ${meta.color}44`,
      fontSize: 10, fontWeight: 700, color: meta.color,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{meta.icon}</span>
      {meta.label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({ name, url, size = 40, tier }: { name: string; url: string | null; size?: number; tier?: UserTier }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const gradient = tier === 'beacon'
    ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
    : tier === 'lantern'
    ? 'linear-gradient(135deg, var(--wimc-amber), var(--wimc-coral))'
    : 'linear-gradient(135deg, var(--wimc-teal), var(--wimc-coral))'

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: gradient, display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Creator card (Discover tab)
// ---------------------------------------------------------------------------

function CreatorCard({ creator, currentUserId }: { creator: HubCreator; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(creator.connectionStatus)
  const [localConnId, setLocalConnId] = useState(creator.connectionId)

  function handleConnect() {
    startTransition(async () => {
      const res = await sendConnectionRequest(creator.id)
      if (res.success) setLocalStatus('pending')
    })
  }

  function handleRespond(response: 'accepted' | 'declined') {
    if (!localConnId) return
    startTransition(async () => {
      const res = await respondToConnection(localConnId, response)
      if (res.success) setLocalStatus(response)
    })
  }

  const isIncoming = localStatus === 'pending' && !creator.isRequester

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Avatar name={creator.displayName} url={creator.avatarUrl} size={48} tier={creator.userTier} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
              {creator.displayName}
            </span>
            <TierBadge tier={creator.userTier} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
            {creator.city}
            <span style={{ color: 'var(--wimc-border-default)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>@{creator.username}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {creator.bio && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {creator.bio}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
        <span>
          <strong style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)' }}>
            {creator.cumulativeEventsHosted}
          </strong>{' '}events
        </span>
        <span>
          <strong style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)' }}>
            {creator.averageEventRating.toFixed(1)}
          </strong>{' '}★
        </span>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!localStatus && (
          <button
            onClick={handleConnect}
            disabled={isPending}
            style={{
              padding: '7px 18px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              background: 'var(--wimc-teal)', color: '#000',
              border: 'none', fontFamily: 'var(--font-dm-sans)',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Connect
          </button>
        )}
        {localStatus === 'pending' && creator.isRequester && (
          <span style={{
            padding: '7px 18px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
            background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-secondary)',
            border: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-dm-sans)',
          }}>
            Pending
          </span>
        )}
        {isIncoming && (
          <>
            <button
              onClick={() => handleRespond('accepted')}
              disabled={isPending}
              style={{
                padding: '7px 18px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                background: 'var(--wimc-teal)', color: '#000',
                border: 'none', fontFamily: 'var(--font-dm-sans)', opacity: isPending ? 0.6 : 1,
              }}
            >
              Accept
            </button>
            <button
              onClick={() => handleRespond('declined')}
              disabled={isPending}
              style={{
                padding: '7px 18px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                background: 'transparent', color: 'var(--wimc-text-secondary)',
                border: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-dm-sans)',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              Decline
            </button>
          </>
        )}
        {localStatus === 'accepted' && (
          <span style={{
            padding: '7px 18px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
            background: 'rgba(77,210,177,0.1)', color: 'var(--wimc-teal)',
            border: '1px solid rgba(77,210,177,0.3)', fontFamily: 'var(--font-dm-sans)',
          }}>
            ✓ Connected
          </span>
        )}
        {localStatus === 'declined' && (
          <span style={{
            padding: '7px 18px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
            background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-muted)',
            border: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-dm-sans)',
          }}>
            Declined
          </span>
        )}
        <Link href={`/${creator.username}`} style={{
          padding: '7px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
          color: 'var(--wimc-text-secondary)', border: '1px solid var(--wimc-border-subtle)',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'var(--font-dm-sans)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          View
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message thread view
// ---------------------------------------------------------------------------

function MessageThread({
  connection,
  currentUserId,
  onBack,
}: {
  connection: HubConnection
  currentUserId: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<HubMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMessages(connection.connectionId).then((msgs) => {
      setMessages(msgs)
      setLoading(false)
    })
  }, [connection.connectionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!draft.trim() || sending) return
    setSending(true)
    const res = await sendMessage(connection.connectionId, draft)
    if (res.success) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        senderId: currentUserId,
        body: draft.trim(),
        sentAt: new Date().toISOString(),
        readAt: null,
      }])
      setDraft('')
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
        borderBottom: '1px solid var(--wimc-border-subtle)', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--wimc-text-secondary)', display: 'flex', alignItems: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
        </button>
        <Avatar
          name={connection.otherUser.displayName}
          url={connection.otherUser.avatarUrl}
          size={36}
          tier={connection.otherUser.userTier}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{connection.otherUser.displayName}</div>
          <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)' }}>@{connection.otherUser.username}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <TierBadge tier={connection.otherUser.userTier} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--wimc-text-muted)', fontSize: 13, padding: '40px 0' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--wimc-text-muted)', fontSize: 13, padding: '40px 0' }}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId
            return (
              <div
                key={m.id}
                style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}
              >
                <div style={{
                  maxWidth: '70%', padding: '10px 14px', borderRadius: 14,
                  background: isMine ? 'var(--wimc-teal)' : 'var(--wimc-bg-elevated)',
                  color: isMine ? '#000' : 'var(--wimc-text-primary)',
                  border: isMine ? 'none' : '1px solid var(--wimc-border-subtle)',
                  fontSize: 13.5, lineHeight: 1.5,
                  borderBottomRightRadius: isMine ? 4 : 14,
                  borderBottomLeftRadius: isMine ? 14 : 4,
                }}>
                  {m.body}
                  <div style={{
                    fontSize: 10, marginTop: 4,
                    color: isMine ? 'rgba(0,0,0,0.55)' : 'var(--wimc-text-muted)',
                    textAlign: 'right',
                    fontFamily: 'var(--font-jetbrains-mono)',
                  }}>
                    {new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, padding: '14px 20px',
        borderTop: '1px solid var(--wimc-border-subtle)', flexShrink: 0,
      }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send)"
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '10px 14px',
            background: 'var(--wimc-bg-overlay)',
            border: '1px solid var(--wimc-border-default)',
            borderRadius: 10, color: 'var(--wimc-text-primary)',
            fontSize: 13.5, fontFamily: 'var(--font-dm-sans)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            padding: '0 18px', borderRadius: 10, border: 'none',
            background: draft.trim() ? 'var(--wimc-teal)' : 'var(--wimc-bg-overlay)',
            color: draft.trim() ? '#000' : 'var(--wimc-text-muted)',
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Connections list row
// ---------------------------------------------------------------------------

function ConnectionRow({
  conn,
  onClick,
}: {
  conn: HubConnection
  onClick: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(conn.status)

  function handleAccept(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await respondToConnection(conn.connectionId, 'accepted')
      if (res.success) setLocalStatus('accepted')
    })
  }

  function handleDecline(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await respondToConnection(conn.connectionId, 'declined')
      if (res.success) setLocalStatus('declined')
    })
  }

  return (
    <div
      onClick={localStatus === 'accepted' ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        borderRadius: 12, cursor: localStatus === 'accepted' ? 'pointer' : 'default',
        background: 'var(--wimc-bg-elevated)',
        border: '1px solid var(--wimc-border-default)',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={(e) => { if (localStatus === 'accepted') (e.currentTarget as HTMLElement).style.borderColor = 'var(--wimc-border-strong)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--wimc-border-default)' }}
    >
      <div style={{ position: 'relative' }}>
        <Avatar name={conn.otherUser.displayName} url={conn.otherUser.avatarUrl} size={44} tier={conn.otherUser.userTier} />
        {conn.unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--wimc-coral)', fontSize: 9, fontWeight: 700,
            display: 'grid', placeItems: 'center', color: '#fff',
          }}>
            {conn.unreadCount > 9 ? '9+' : conn.unreadCount}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{conn.otherUser.displayName}</span>
          <TierBadge tier={conn.otherUser.userTier} />
        </div>
        {conn.lastMessage ? (
          <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {conn.lastMessage.body}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginTop: 2 }}>
            {conn.otherUser.city}
          </div>
        )}
      </div>

      {localStatus === 'pending' && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleAccept}
            disabled={isPending}
            style={{
              padding: '5px 12px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
              background: 'var(--wimc-teal)', color: '#000', border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
            }}
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            disabled={isPending}
            style={{
              padding: '5px 12px', borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
              background: 'transparent', color: 'var(--wimc-text-secondary)',
              border: '1px solid var(--wimc-border-subtle)',
              cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
            }}
          >
            Decline
          </button>
        </div>
      )}
      {localStatus === 'accepted' && (
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--wimc-text-muted)', flexShrink: 0 }}>
          chevron_right
        </span>
      )}
      {localStatus === 'declined' && (
        <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', flexShrink: 0 }}>Declined</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  currentUserId: string
  currentTier:   UserTier
  currentCity:   string
  creators:      HubCreator[]
  connections:   HubConnection[]
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HubClient({ currentUserId, currentTier, currentCity, creators, connections }: Props) {
  const [tab, setTab] = useState<Tab>('discover')
  const [activeThread, setActiveThread] = useState<HubConnection | null>(null)
  const [tierFilter, setTierFilter] = useState<'all' | 'lantern' | 'beacon'>('all')
  const [search, setSearch] = useState('')
  const [showOtherCities, setShowOtherCities] = useState(false)
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())

  const isGated = currentTier === 'wanderer' || currentTier === 'local'

  const pending = connections.filter((c) => c.status === 'pending')
  const accepted = connections.filter((c) => c.status === 'accepted')
  const totalUnread = connections.reduce((s, c) => s + c.unreadCount, 0)

  const baseFiltered = creators.filter((c) => {
    if (tierFilter !== 'all' && c.userTier !== tierFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.displayName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    }
    return true
  })

  const cityMatch = (c: HubCreator) => c.city.toLowerCase() === currentCity.toLowerCase()
  const myCityCreators    = baseFiltered.filter(cityMatch)
  const otherCityCreators = baseFiltered.filter((c) => !cityMatch(c))

  // ── Gated state ──────────────────────────────────────────────────────────
  if (isGated) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%', marginBottom: 24,
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 34, color: '#a855f7' }}>lock</span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, margin: '0 0 12px' }}>
          Creator Hub
        </h2>
        <p style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', maxWidth: 360, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Connect with fellow Lantern and Beacon creators. Host {currentTier === 'local' ? '3 events' : '6 events'} and reach Lantern tier to unlock the Hub.
        </p>
        <Link href="/dashboard/tier" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 22px', borderRadius: 9999,
          background: '#a855f7', color: '#fff',
          textDecoration: 'none', fontSize: 13.5, fontWeight: 600,
          fontFamily: 'var(--font-dm-sans)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>workspace_premium</span>
          View Tier Progress
        </Link>
      </div>
    )
  }

  // ── Thread open ───────────────────────────────────────────────────────────
  if (activeThread) {
    return (
      <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
        <MessageThread
          connection={activeThread}
          currentUserId={currentUserId}
          onBack={() => setActiveThread(null)}
        />
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
          padding: '4px 14px', borderRadius: 9999,
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#a855f7' }}>hub</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Creator Hub
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 26, margin: '0 0 6px' }}>
          Your creative network
        </h1>
        <p style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', margin: 0 }}>
          Discover, connect, and message fellow Lantern &amp; Beacon creators.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, borderBottom: '1px solid var(--wimc-border-subtle)', paddingBottom: 0 }}>
        {([
          { id: 'discover',     label: 'Discover',     icon: 'explore',              badge: 0 },
          { id: 'connections',  label: 'Connections',  icon: 'people',               badge: pending.length },
          { id: 'messages',     label: 'Messages',     icon: 'forum',                badge: totalUnread },
        ] as { id: Tab; label: string; icon: string; badge: number }[]).map(({ id, label, icon, badge }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 16px', borderRadius: 0, border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-dm-sans)', fontSize: 13.5, fontWeight: active ? 700 : 500,
                color: active ? 'var(--wimc-text-primary)' : 'var(--wimc-text-secondary)',
                borderBottom: active ? '2px solid var(--wimc-teal)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
              {label}
              {badge > 0 && (
                <span style={{
                  background: 'var(--wimc-coral)', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  borderRadius: 9999, fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Discover tab */}
      {tab === 'discover' && (
        <div>
          {/* Search + tier filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18, color: 'var(--wimc-text-muted)', pointerEvents: 'none',
              }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search by name, city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 14px 9px 38px',
                  background: 'var(--wimc-bg-overlay)',
                  border: '1px solid var(--wimc-border-default)',
                  borderRadius: 9999, color: 'var(--wimc-text-primary)',
                  fontSize: 13.5, fontFamily: 'var(--font-dm-sans)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {(['all', 'lantern', 'beacon'] as const).map((f) => {
              const active = tierFilter === f
              const label = f === 'all' ? 'All tiers' : f === 'lantern' ? '🕯️ Lanterns' : '⭐ Beacons'
              return (
                <button
                  key={f}
                  onClick={() => setTierFilter(f)}
                  style={{
                    padding: '8px 16px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                    border: `1.5px solid ${active ? 'var(--wimc-teal)' : 'var(--wimc-border-subtle)'}`,
                    background: active ? 'rgba(77,210,177,0.12)' : 'transparent',
                    color: active ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* ── In your city ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-teal)' }}>location_on</span>
              <span style={{
                fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'var(--wimc-teal)', fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700,
              }}>
                In {currentCity}
              </span>
              <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-dm-sans)' }}>
                · {myCityCreators.length} creator{myCityCreators.length !== 1 ? 's' : ''}
              </span>
            </div>

            {myCityCreators.length === 0 ? (
              <div style={{
                padding: '32px 24px', borderRadius: 14, textAlign: 'center',
                background: 'var(--wimc-bg-overlay)', border: '1px dashed var(--wimc-border-subtle)',
                color: 'var(--wimc-text-muted)', fontSize: 13.5,
              }}>
                No Lantern or Beacon creators in {currentCity} yet — be the first to reach Lantern tier here!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                {myCityCreators.map((c) => (
                  <CreatorCard key={c.id} creator={c} currentUserId={currentUserId} />
                ))}
              </div>
            )}
          </div>

          {/* ── Other cities ─────────────────────────────────────────────── */}
          {otherCityCreators.length > 0 && (() => {
            // Group by city, sorted by count desc
            const cityGroups: { city: string; creators: HubCreator[] }[] = []
            const seen = new Map<string, HubCreator[]>()
            for (const c of otherCityCreators) {
              const key = c.city
              if (!seen.has(key)) seen.set(key, [])
              seen.get(key)!.push(c)
            }
            for (const [city, list] of Array.from(seen.entries()).sort((a, b) => b[1].length - a[1].length)) {
              cityGroups.push({ city, creators: list })
            }

            return (
              <div>
                {/* Section toggle */}
                <button
                  onClick={() => setShowOtherCities((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: showOtherCities ? 20 : 0,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-dm-sans)', width: '100%',
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: 'var(--wimc-border-subtle)' }} />
                  <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {showOtherCities
                      ? 'Hide other cities'
                      : `Other cities — ${cityGroups.length} cit${cityGroups.length !== 1 ? 'ies' : 'y'}, ${otherCityCreators.length} creator${otherCityCreators.length !== 1 ? 's' : ''}`
                    }
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-muted)' }}>
                    {showOtherCities ? 'expand_less' : 'expand_more'}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--wimc-border-subtle)' }} />
                </button>

                {/* Per-city sub-sections */}
                {showOtherCities && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {cityGroups.map(({ city, creators: cityCreators }) => {
                      const isExpanded = expandedCities.has(city)
                      function toggle() {
                        setExpandedCities((prev) => {
                          const next = new Set(prev)
                          if (next.has(city)) next.delete(city)
                          else next.add(city)
                          return next
                        })
                      }
                      return (
                        <div key={city}>
                          {/* City header row */}
                          <button
                            onClick={toggle}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0 0 12px', width: '100%',
                              fontFamily: 'var(--font-dm-sans)',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--wimc-text-muted)' }}>
                              location_city
                            </span>
                            <span style={{
                              fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
                              color: 'var(--wimc-text-secondary)',
                              fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700,
                            }}>
                              {city}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-dm-sans)' }}>
                              · {cityCreators.length} creator{cityCreators.length !== 1 ? 's' : ''}
                            </span>
                            <span className="material-symbols-outlined" style={{
                              fontSize: 16, color: 'var(--wimc-text-muted)', marginLeft: 'auto',
                            }}>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                              {cityCreators.map((c) => (
                                <CreatorCard key={c.id} creator={c} currentUserId={currentUserId} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {baseFiltered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--wimc-text-muted)', fontSize: 14 }}>
              No creators found. Try adjusting your filters.
            </div>
          )}
        </div>
      )}

      {/* Connections tab */}
      {tab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 12 }}>
                Pending ({pending.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map((c) => (
                  <ConnectionRow key={c.connectionId} conn={c} onClick={() => setActiveThread(c)} />
                ))}
              </div>
            </div>
          )}

          {accepted.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 12 }}>
                Connected ({accepted.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {accepted.map((c) => (
                  <ConnectionRow key={c.connectionId} conn={c} onClick={() => { setActiveThread(c); setTab('messages') }} />
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && accepted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--wimc-text-muted)', fontSize: 14 }}>
              No connections yet — head to Discover to find fellow creators.
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          {accepted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--wimc-text-muted)', fontSize: 14 }}>
              Accept connections to start messaging.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {accepted.map((c) => (
                <ConnectionRow key={c.connectionId} conn={c} onClick={() => setActiveThread(c)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
