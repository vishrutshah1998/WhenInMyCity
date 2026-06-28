'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import {
  getMessages,
  sendConnectionRequest,
  respondToConnection,
  sendMessage,
} from '@/app/actions/hub'
import type { DiscoverCreator, HubConnection, HubMessage } from '@/app/actions/hub'

// ── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#07070A'
const CARD    = '#131317'
const ELEVATED = '#1b1b1f'
const BORDER  = '#57423e'
const TEAL    = '#5DD9D0'
const TEXT    = '#F0EFF8'
const MUTED   = '#9896B0'
const FAINT   = '#57423e'

type Tab = 'discover' | 'requests' | 'messages'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${TEAL}, #9B8FFF)`,
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.35, fontWeight: 700,
      color: '#07070A', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── TierDot ──────────────────────────────────────────────────────────────────

function TierDot({ tier }: { tier: string }) {
  if (tier !== 'lantern' && tier !== 'beacon') return null
  const color = tier === 'beacon' ? '#a855f7' : '#F5A800'
  const icon  = tier === 'beacon' ? 'workspace_premium' : 'light_mode'
  return (
    <div style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 16, height: 16, borderRadius: '50%',
      background: color, display: 'grid', placeItems: 'center',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 10, color: '#fff' }}>{icon}</span>
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  currentUserId: string
  discover:      DiscoverCreator[]
  connections:   HubConnection[]
}

// ── Main component ───────────────────────────────────────────────────────────

export function HubClient({ currentUserId, discover, connections }: Props) {
  const [tab, setTab]                   = useState<Tab>('discover')
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null)
  const [messages, setMessages]         = useState<HubMessage[]>([])
  const [loadingMsgs, setLoadingMsgs]   = useState(false)
  const [hasMore, setHasMore]           = useState(false)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null)
  const [draft, setDraft]               = useState('')
  const [sending, setSending]           = useState(false)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [respondedMap, setRespondedMap] = useState<Map<string, 'accepted' | 'declined'>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)
  const [, startTransition] = useTransition()

  // Read initial tab / connection from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab') as Tab
    if (t === 'requests' || t === 'messages' || t === 'discover') setTab(t)
    const conn = params.get('connection')
    if (conn) { setSelectedConnId(conn); setTab('messages') }
  }, [])

  // Load messages when a connection is selected
  useEffect(() => {
    if (!selectedConnId) return
    setLoadingMsgs(true)
    getMessages(selectedConnId).then((msgs) => {
      setMessages(msgs)
      setHasMore(msgs.length === 50)
      setOldestTimestamp(msgs[0]?.sentAt ?? null)
      setLoadingMsgs(false)
    })
  }, [selectedConnId])

  // Scroll to bottom on new messages, but NOT when loading earlier pages
  useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loadingMore])

  // Derived lists
  const pendingReceived = connections.filter((c) => c.status === 'pending' && !c.isRequester)
  const pendingSent     = connections.filter((c) => c.status === 'pending' && c.isRequester)
  const accepted        = connections.filter((c) => c.status === 'accepted')
  const selectedConn    = accepted.find((c) => c.connectionId === selectedConnId) ?? null

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleConnect(creatorId: string) {
    setRequestedIds((prev) => new Set(prev).add(creatorId))
    startTransition(async () => { await sendConnectionRequest(creatorId) })
  }

  function handleRespond(connectionId: string, action: 'accepted' | 'declined') {
    setRespondedMap((prev) => new Map(prev).set(connectionId, action))
    startTransition(async () => { await respondToConnection(connectionId, action) })
  }

  async function handleSend() {
    if (!selectedConnId || !draft.trim() || sending) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    const optimistic: HubMessage = {
      id: `opt-${Date.now()}`,
      senderId: currentUserId,
      body,
      sentAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((prev) => [...prev, optimistic])
    await sendMessage(selectedConnId, body)
    setSending(false)
  }

  async function loadEarlier() {
    if (!selectedConnId || !oldestTimestamp) return
    setLoadingMore(true)
    const older = await getMessages(selectedConnId, oldestTimestamp)
    setMessages((prev) => [...older, ...prev])
    setHasMore(older.length === 50)
    setOldestTimestamp(older[0]?.sentAt ?? null)
    setLoadingMore(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Shared label style ────────────────────────────────────────────────────

  const sectionLabel = (color = MUTED): React.CSSProperties => ({
    fontFamily: 'var(--font-jetbrains-mono)',
    fontSize: 10, color,
    textTransform: 'uppercase', letterSpacing: '0.15em',
    marginBottom: 16,
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 32px 0' }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
          HUB
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 30, color: TEXT, margin: '0 0 8px' }}>
          Your Creative Network
        </h1>
        <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: MUTED, margin: 0 }}>
          Connect with creators, venues, and brands in your city.
        </p>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginTop: 24 }}>
          {([
            { id: 'discover',  label: 'Discover',  count: 0 },
            { id: 'requests',  label: `Requests`,  count: pendingReceived.length },
            { id: 'messages',  label: 'Messages',  count: 0 },
          ] as { id: Tab; label: string; count: number }[]).map(({ id, label, count }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  padding: '12px 20px', background: 'transparent', border: 'none',
                  borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                  color: active ? TEXT : MUTED,
                  fontFamily: 'var(--font-dm-sans)', fontSize: 14,
                  fontWeight: active ? 600 : 400, cursor: 'pointer',
                  marginBottom: -1, display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'color 150ms',
                }}
              >
                {label}
                {count > 0 && (
                  <span style={{
                    background: '#F5A800', color: '#07070A', fontSize: 10,
                    fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)',
                    padding: '1px 6px', borderRadius: 9999,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════ DISCOVER TAB ══════════════════════════════════ */}
      {tab === 'discover' && (
        <div style={{ padding: 32 }}>
          {discover.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#353438' }}>hub</span>
              <p style={{ color: MUTED, fontFamily: 'var(--font-dm-sans)', fontSize: 14, margin: 0 }}>
                No new creators in your city yet.
              </p>
              <p style={{ color: FAINT, fontFamily: 'var(--font-dm-sans)', fontSize: 13, margin: 0 }}>
                Be the first to connect.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {discover.map((creator) => {
                const requested = requestedIds.has(creator.id)
                return (
                  <div key={creator.id} style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 20 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar name={creator.displayName} url={creator.avatarUrl} size={48} />
                          <TierDot tier={creator.userTier} />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 15, fontWeight: 600, color: TEXT }}>
                            {creator.displayName}
                          </div>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED, marginTop: 2 }}>
                            @{creator.username} · {creator.city}
                          </div>
                        </div>
                      </div>
                      {creator.creatorType && (
                        <div style={{
                          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
                          border: `1px solid ${BORDER}`, color: MUTED,
                          padding: '2px 8px', textTransform: 'uppercase',
                          letterSpacing: '0.08em', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {creator.creatorType.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>

                    {/* Interest tags */}
                    {creator.interestTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                        {creator.interestTags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{
                            padding: '2px 8px', background: ELEVATED,
                            border: `1px solid ${BORDER}`,
                            fontFamily: 'var(--font-jetbrains-mono)',
                            fontSize: 9, color: MUTED,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom row */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      paddingTop: 16, borderTop: `1px dashed ${BORDER}`,
                    }}>
                      <div>
                        {creator.matchScore > 0 ? (
                          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: TEAL }}>
                            ✦ {creator.matchScore} shared interest{creator.matchScore !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: MUTED }}>
                            In {creator.city}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => !requested && handleConnect(creator.id)}
                        disabled={requested}
                        style={{
                          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                          padding: '8px 16px', border: 'none',
                          cursor: requested ? 'not-allowed' : 'pointer',
                          background: requested ? 'rgba(255,255,255,0.08)' : TEAL,
                          color: requested ? MUTED : '#07070A',
                          transition: 'background 150ms',
                        }}
                      >
                        {requested ? 'Requested ✓' : 'Connect →'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ REQUESTS TAB ══════════════════════════════════ */}
      {tab === 'requests' && (
        <div style={{ padding: 32 }}>

          {/* Incoming */}
          <div style={{ marginBottom: 40 }}>
            <div style={sectionLabel(TEAL)}>WAITING FOR YOU</div>
            {pendingReceived.length === 0 ? (
              <div style={{ color: MUTED, fontSize: 13, fontFamily: 'var(--font-dm-sans)', textAlign: 'center', padding: '24px 0' }}>
                No pending requests
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingReceived.map((conn) => {
                  if (respondedMap.has(conn.connectionId)) return null
                  return (
                    <div key={conn.connectionId} style={{
                      background: CARD, borderLeft: `2px solid ${TEAL}`,
                      padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={conn.otherUser.displayName} url={conn.otherUser.avatarUrl} size={44} />
                        <div>
                          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 600, color: TEXT }}>
                            {conn.otherUser.displayName}
                          </div>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED, marginTop: 2 }}>
                            @{conn.otherUser.username} · {conn.otherUser.city}
                          </div>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: FAINT, marginTop: 2 }}>
                            {timeAgo(conn.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleRespond(conn.connectionId, 'accepted')}
                          style={{
                            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700,
                            padding: '8px 16px', border: 'none', cursor: 'pointer',
                            background: TEAL, color: '#07070A', textTransform: 'uppercase',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(conn.connectionId, 'declined')}
                          style={{
                            fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                            padding: '8px 16px', border: `1px solid ${BORDER}`,
                            cursor: 'pointer', background: 'transparent', color: MUTED,
                            textTransform: 'uppercase',
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <div style={sectionLabel()}>SENT BY YOU</div>
            {pendingSent.length === 0 ? (
              <div style={{ color: MUTED, fontSize: 13, fontFamily: 'var(--font-dm-sans)', textAlign: 'center', padding: '24px 0' }}>
                No pending requests
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingSent.map((conn) => (
                  <div key={conn.connectionId} style={{
                    background: CARD, border: `1px solid ${BORDER}`,
                    padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={conn.otherUser.displayName} url={conn.otherUser.avatarUrl} size={44} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 600, color: TEXT }}>
                          {conn.otherUser.displayName}
                        </div>
                        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED, marginTop: 2 }}>
                          @{conn.otherUser.username} · {conn.otherUser.city}
                        </div>
                        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: FAINT, marginTop: 2 }}>
                          {timeAgo(conn.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED }}>
                      Pending…
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ MESSAGES TAB ══════════════════════════════════ */}
      {tab === 'messages' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 236px)', overflow: 'hidden' }}>

          {/* Left panel — conversation list */}
          <div style={{ width: 320, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED, padding: '12px 16px 8px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              CONVERSATIONS
            </div>
            {accepted.length === 0 ? (
              <div style={{ padding: '24px 16px', color: MUTED, fontSize: 13, fontFamily: 'var(--font-dm-sans)', lineHeight: 1.5 }}>
                No connections yet. Discover creators to connect.
              </div>
            ) : (
              accepted.map((conn) => {
                const isActive  = conn.connectionId === selectedConnId
                const hasUnread = conn.unreadCount > 0
                return (
                  <button
                    key={conn.connectionId}
                    onClick={() => setSelectedConnId(conn.connectionId)}
                    style={{
                      width: '100%', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: isActive ? CARD : 'transparent', border: 'none',
                      borderLeft: isActive ? `2px solid ${TEAL}` : '2px solid transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar name={conn.otherUser.displayName} url={conn.otherUser.avatarUrl} size={40} />
                      {hasUnread && (
                        <div style={{
                          position: 'absolute', top: -2, right: -2,
                          width: 10, height: 10, borderRadius: '50%',
                          background: TEAL, border: `2px solid ${BG}`,
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 500, color: TEXT, marginBottom: 2 }}>
                        {conn.otherUser.displayName}
                      </div>
                      {conn.lastMessage && (
                        <div style={{
                          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {conn.lastMessage.body}
                        </div>
                      )}
                    </div>
                    {conn.lastMessage && (
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: FAINT, flexShrink: 0 }}>
                        {timeAgo(conn.lastMessage.sentAt)}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Right panel — thread or empty state */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!selectedConn ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#353438' }}>chat_bubble</span>
                <span style={{ color: MUTED, fontFamily: 'var(--font-dm-sans)', fontSize: 14 }}>
                  Select a conversation
                </span>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <Avatar name={selectedConn.otherUser.displayName} url={selectedConn.otherUser.avatarUrl} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 600, color: TEXT }}>
                      {selectedConn.otherUser.displayName}
                    </div>
                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: MUTED }}>
                      @{selectedConn.otherUser.username} · {selectedConn.otherUser.city}
                    </div>
                  </div>
                  <a
                    href={`/${selectedConn.otherUser.username}`}
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: TEAL, textDecoration: 'none', flexShrink: 0 }}
                  >
                    View profile →
                  </a>
                </div>

                {/* Messages area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Load earlier button — shown when there may be older messages */}
                  {hasMore && (
                    <button
                      onClick={loadEarlier}
                      disabled={loadingMore}
                      style={{
                        width: '100%', padding: '8px 0',
                        fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                        color: MUTED, background: 'none', border: 'none',
                        cursor: loadingMore ? 'default' : 'pointer',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        opacity: loadingMore ? 0.5 : 1,
                      }}
                    >
                      {loadingMore ? 'Loading…' : '↑ Load earlier messages'}
                    </button>
                  )}

                  {loadingMsgs ? (
                    <div style={{ textAlign: 'center', color: MUTED, fontSize: 13, padding: '40px 0' }}>
                      Loading…
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: MUTED, fontSize: 13, padding: '40px 0' }}>
                      No messages yet. Say hello!
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.senderId === currentUserId
                      const time = new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                          <div>
                            <div style={{
                              maxWidth: 400, padding: '10px 16px',
                              background: isMine ? TEAL : CARD,
                              color: isMine ? '#07070A' : TEXT,
                              border: isMine ? 'none' : `1px solid ${BORDER}`,
                              borderRadius: isMine ? '12px 0 12px 12px' : '0 12px 12px 12px',
                              fontFamily: 'var(--font-dm-sans)', fontSize: 14, lineHeight: 1.5,
                            }}>
                              {m.body}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: FAINT,
                              marginTop: 4, textAlign: isMine ? 'right' : 'left',
                            }}>
                              {time}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input area */}
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    rows={1}
                    style={{
                      flex: 1, resize: 'none',
                      background: CARD, border: `1px solid ${BORDER}`,
                      color: TEXT, fontFamily: 'var(--font-dm-sans)', fontSize: 14,
                      padding: '12px 16px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    style={{
                      padding: 12, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
                      background: draft.trim() ? TEAL : 'rgba(255,255,255,0.05)',
                      color: draft.trim() ? '#07070A' : MUTED,
                      transition: 'background 150ms', flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
