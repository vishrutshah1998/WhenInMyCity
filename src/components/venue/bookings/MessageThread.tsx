'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SenderType = 'venue' | 'creator'

interface Message {
  id: string
  sender: SenderType
  text: string
  timestamp: string // ISO
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

// TODO: replace with real messages from Supabase query:
//   supabase.from('booking_messages').select('*').eq('proposal_id', bookingId).order('created_at')
function getMockMessages(bookingId: string): Message[] {
  // Seed with bookingId so each booking gets the same deterministic thread
  void bookingId
  return [
    {
      id: 'mock-1',
      sender: 'creator',
      text: 'Hi! Really excited about hosting this at your space. Quick question — do you have a sound system available, or should I bring my own PA?',
      timestamp: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    },
    {
      id: 'mock-2',
      sender: 'venue',
      text: 'Hey! Yes, we have a full PA system with two floor monitors and a mixing board. It\'s included in the rental. What\'s the expected attendance for your event?',
      timestamp: new Date(Date.now() - 25 * 3_600_000).toISOString(),
    },
    {
      id: 'mock-3',
      sender: 'creator',
      text: 'That\'s great news! Expecting around 40–50 people. Will there be a separate green room or prep area we can use before the show?',
      timestamp: new Date(Date.now() - 24 * 3_600_000 - 18 * 60_000).toISOString(),
    },
    {
      id: 'mock-4',
      sender: 'venue',
      text: 'We have a back area that can serve as a prep space — fits about 4–5 people comfortably. I\'ll add 30 min of setup time before your slot at no extra charge.',
      timestamp: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
  ]
}

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

function Bubble({ message }: { message: Message }) {
  const isVenue = message.sender === 'venue'
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isVenue ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{
        maxWidth: '72%',
        padding: '10px 14px',
        borderRadius: isVenue ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isVenue ? 'var(--venue-amber-tint)' : 'var(--venue-bg-elevated)',
        border: `1px solid ${isVenue ? 'var(--venue-amber-border)' : 'var(--venue-border-subtle)'}`,
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
          {message.text}
        </p>
      </div>
      <span style={{
        fontSize: 11,
        color: 'var(--venue-text-muted)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        marginTop: 4,
        paddingLeft: isVenue ? 0 : 4,
        paddingRight: isVenue ? 4 : 0,
      }}>
        {formatTimestamp(message.timestamp)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  bookingId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessageThread({ bookingId }: Props) {
  // TODO: replace getMockMessages with Supabase Realtime subscription:
  //   const channel = supabase.channel(`booking-${bookingId}`)
  //   channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking_messages',
  //     filter: `proposal_id=eq.${bookingId}` }, (payload) => appendMessage(payload.new))
  //   channel.subscribe()
  const [messages, setMessages] = useState<Message[]>(() => getMockMessages(bookingId))
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  // TODO: wire to Supabase Realtime presence channel booking-{bookingId}
  // const [creatorIsTyping, setCreatorIsTyping] = useState(false)
  const creatorIsTyping = false

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  function handleSend() {
    const text = draft.trim()
    if (!text || isSending) return

    // TODO: replace with Supabase insert:
    //   await supabase.from('booking_messages').insert({ proposal_id: bookingId, sender: 'venue', text })
    setIsSending(true)
    const newMsg: Message = {
      id: `local-${Date.now()}`,
      sender: 'venue',
      text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, newMsg])
    setDraft('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setTimeout(() => setIsSending(false), 400)
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
        <span style={{
          fontSize: 10,
          color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          marginLeft: 4,
          fontStyle: 'italic',
        }}>
          {/* TODO: remove mock annotation when real data is wired */}
          (mock data)
        </span>
      </div>

      {/* Message list */}
      <div style={{ marginBottom: 4 }}>
        {messages.length === 0 ? (
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
          messages.map(m => <Bubble key={m.id} message={m} />)
        )}

        {/* Creator is typing indicator */}
        {creatorIsTyping && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            {/* Animated dots */}
            <div style={{
              padding: '8px 14px',
              background: 'var(--venue-bg-elevated)',
              border: '1px solid var(--venue-border-subtle)',
              borderRadius: '4px 16px 16px 16px',
              display: 'flex',
              gap: 4,
              alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--venue-text-muted)',
                    display: 'inline-block',
                    animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{
              fontSize: 11,
              color: 'var(--venue-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Creator is typing…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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
            background: canSend ? 'var(--venue-amber)' : 'var(--venue-bg-overlay)',
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

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  )
}
