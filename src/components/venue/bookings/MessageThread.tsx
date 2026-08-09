'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBookingMessages, sendBookingMessage, type BookingMessageDTO } from '@/app/actions/venue-bookings'

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = diffMs / 3_600_000

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / 60_000)
    return mins <= 1 ? 'just now' : `${mins}m ago`
  }
  if (diffHours < 24) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function Bubble({ message, isMine }: { message: BookingMessageDTO; isMine: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMine ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{
        maxWidth: '72%',
        padding: '10px 14px',
        borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isMine ? 'var(--venue-accent-tint)' : 'var(--venue-bg-elevated)',
        border: `1px solid ${isMine ? 'var(--venue-accent-border)' : 'var(--venue-border-subtle)'}`,
      }}>
        <p style={{
          margin: 0,
          fontSize: 13.5,
          color: 'var(--venue-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.body}
        </p>
      </div>
      <span style={{
        fontSize: 11,
        color: 'var(--venue-text-muted)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        marginTop: 4,
        paddingLeft: isMine ? 0 : 4,
        paddingRight: isMine ? 4 : 0,
      }}>
        {formatTimestamp(message.sentAt)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  proposalId: string
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessageThread({ proposalId, currentUserId }: Props) {
  const [messages, setMessages] = useState<BookingMessageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initial load
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBookingMessages(proposalId).then(({ messages: msgs }) => {
      if (!cancelled) { setMessages(msgs); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [proposalId])

  // Live delivery of the other party's messages
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`booking-messages-${proposalId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages', filter: `proposal_id=eq.${proposalId}` },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; body: string; sent_at: string; read_at: string | null }
          if (row.sender_id === currentUserId) return // own sends are appended locally on success
          setMessages((prev) => (
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, { id: row.id, senderId: row.sender_id, body: row.body, sentAt: row.sent_at, readAt: row.read_at }]
          ))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [proposalId, currentUserId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || isSending) return

    setIsSending(true)
    setError(null)
    const { error: sendError } = await sendBookingMessage(proposalId, text)
    if (sendError) {
      setError(sendError)
      setIsSending(false)
      return
    }

    setMessages((prev) => [...prev, {
      id: `local-${Date.now()}`,
      senderId: currentUserId,
      body: text,
      sentAt: new Date().toISOString(),
      readAt: null,
    }])
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsSending(false)
  }

  const canSend = draft.trim().length > 0 && !isSending

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderTop: '1px solid var(--venue-border-subtle)',
      marginTop: 8,
    }}>
      {/* Thread header */}
      <div style={{
        padding: '14px 0 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, color: 'var(--venue-text-muted)' }}
        >
          chat
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
          Messages
        </span>
      </div>

      {/* Message list */}
      <div style={{ marginBottom: 4 }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            fontSize: 13,
            color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            fontSize: 13,
            color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map(m => <Bubble key={m.id} message={m} isMine={m.senderId === currentUserId} />)
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '8px 12px',
          marginBottom: 8,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6,
          fontSize: 12.5,
          color: 'var(--venue-danger)',
        }}>
          {error}
        </div>
      )}

      {/* Composer */}
      <div style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
        padding: '12px 14px',
        background: 'var(--venue-bg-elevated)',
        border: '1px solid var(--venue-border-default)',
        borderRadius: 10,
        marginTop: 8,
      }}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => { setDraft(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 13.5,
            color: 'var(--venue-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            lineHeight: 1.6,
            overflowY: 'hidden',
            padding: 0,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          title="Send message"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: canSend ? 'var(--venue-accent)' : 'var(--venue-bg-overlay)',
            border: 'none',
            cursor: canSend ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'background 160ms ease',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: canSend ? '#000' : 'var(--venue-text-muted)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            arrow_upward
          </span>
        </button>
      </div>
    </div>
  )
}
