'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MyTicket } from '@/app/actions/rsvp'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toUpperCase()
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'Free'
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
}

function qrImageUrl(token: string): string {
  const data = encodeURIComponent(`WIMC-${token}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}&color=3b0a00&bgcolor=ffffff&margin=10`
}

function ticketNumber(token: string): string {
  return `WIMC-${token.slice(0, 8).toUpperCase()}`
}

function isPast(iso: string): boolean {
  return new Date(iso) < new Date()
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const [expanded, setExpanded] = useState(false)
  const past = isPast(ticket.eventStartsAt)

  return (
    <div style={{
      borderRadius: 16,
      background: 'var(--wimc-bg-raised)',
      border: `1px solid ${ticket.checkedIn ? 'rgba(77,210,177,0.3)' : past ? 'var(--wimc-border-subtle)' : 'var(--wimc-border-subtle)'}`,
      overflow: 'hidden',
      opacity: past && !expanded ? 0.75 : 1,
      transition: 'opacity 150ms',
    }}>
      {/* ── Top: event info ── */}
      <div style={{ display: 'flex', gap: 14, padding: 16 }}>
        {/* Cover */}
        <div style={{
          position: 'relative', flexShrink: 0,
          width: 80, height: 80, borderRadius: 10, overflow: 'hidden',
          background: 'var(--wimc-bg-overlay)',
        }}>
          {ticket.eventCoverUrl ? (
            <Image src={ticket.eventCoverUrl} alt={ticket.eventTitle} fill style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--wimc-text-muted)', fontSize: 32 }}>
                confirmation_number
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <Link
              href={`/events/${ticket.eventSlug}`}
              style={{
                fontSize: 15, fontWeight: 700,
                color: 'var(--wimc-text-primary)',
                textDecoration: 'none', lineHeight: 1.3,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}
            >
              {ticket.eventTitle}
            </Link>
            {ticket.checkedIn && (
              <span style={{
                flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 9999,
                background: 'rgba(77,210,177,0.12)',
                border: '1px solid rgba(77,210,177,0.3)',
                color: 'var(--wimc-teal)', fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-jetbrains-mono)',
                whiteSpace: 'nowrap',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
                Checked in
              </span>
            )}
          </div>

          <div style={{
            fontSize: 12, color: 'var(--wimc-text-secondary)',
            fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 4,
          }}>
            {formatDate(ticket.eventStartsAt)} · {formatTime(ticket.eventStartsAt)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--wimc-text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ticket.venueName}
            </span>
          </div>
        </div>
      </div>

      {/* ── Divider: dashed ticket perforation ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: -12, width: 24, height: 24, borderRadius: '50%',
          background: 'var(--wimc-bg-base)',
          border: '1px solid var(--wimc-border-subtle)',
          boxSizing: 'border-box',
        }} />
        <div style={{
          flex: 1,
          borderTop: '1.5px dashed var(--wimc-border-subtle)',
          margin: '0 8px',
        }} />
        <div style={{
          position: 'absolute', right: -12, width: 24, height: 24, borderRadius: '50%',
          background: 'var(--wimc-bg-base)',
          border: '1px solid var(--wimc-border-subtle)',
          boxSizing: 'border-box',
        }} />
      </div>

      {/* ── Bottom: ticket meta + expand toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
      }}>
        <div>
          <div style={{
            fontSize: 11, color: 'var(--wimc-text-muted)', marginBottom: 2,
            fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Ticket
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--wimc-coral)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {ticketNumber(ticket.qrToken)}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 11, color: 'var(--wimc-text-muted)', marginBottom: 2,
            fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Paid
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: ticket.amountPaid === 0 ? 'var(--wimc-teal)' : 'var(--wimc-text-primary)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {formatPrice(ticket.amountPaid)}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 9999,
            background: expanded ? 'var(--wimc-coral)' : 'var(--wimc-bg-overlay)',
            border: `1px solid ${expanded ? 'var(--wimc-coral)' : 'var(--wimc-border-subtle)'}`,
            color: expanded ? '#fff' : 'var(--wimc-text-secondary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {expanded ? 'qr_code_scanner' : 'qr_code'}
          </span>
          {expanded ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {/* ── Expanded QR panel ── */}
      {expanded && (
        <div style={{
          padding: '0 16px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          borderTop: '1px solid var(--wimc-border-subtle)',
          paddingTop: 20,
        }}>
          {/* QR code */}
          <div style={{
            padding: 16, borderRadius: 12,
            background: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            <Image
              src={qrImageUrl(ticket.qrToken)}
              alt="Ticket QR code"
              width={200}
              height={200}
              unoptimized
            />
          </div>

          {/* Instructions */}
          <div style={{
            textAlign: 'center',
            fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.5,
          }}>
            Show this QR code at the venue entrance.
            {ticket.checkedIn && ticket.checkedInAt && (
              <div style={{ marginTop: 6, color: 'var(--wimc-teal)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 3 }}>
                  check_circle
                </span>
                Checked in {new Date(ticket.checkedInAt).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
                })}
              </div>
            )}
          </div>

          {/* Creator */}
          {ticket.creatorName && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--wimc-text-muted)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
              Hosted by{' '}
              <Link
                href={`/${ticket.creatorUsername}`}
                style={{ color: 'var(--wimc-coral)', textDecoration: 'none', fontWeight: 600 }}
              >
                {ticket.creatorName}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketsClient({ tickets }: { tickets: MyTicket[] }) {
  const now = new Date()
  const upcoming = tickets.filter((t) => new Date(t.eventStartsAt) >= now)
  const past     = tickets.filter((t) => new Date(t.eventStartsAt) < now)

  if (tickets.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '80px 24px', gap: 16, textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 56, color: 'var(--wimc-text-muted)', opacity: 0.35,
        }}>
          confirmation_number
        </span>
        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20 }}>
          No tickets yet
        </div>
        <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', maxWidth: 280 }}>
          When you book an event, your tickets will appear here.
        </div>
        <Link
          href="/explore"
          style={{
            marginTop: 8,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10,
            background: 'var(--wimc-coral)', color: '#fff',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>explore</span>
          Discover Events
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-syne)', fontWeight: 800,
          fontSize: 24, margin: '0 0 4px',
        }}>
          My Tickets
        </h1>
        <div style={{ fontSize: 13, color: 'var(--wimc-text-muted)' }}>
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · tap a ticket to show the QR code
        </div>
      </div>

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionLabel label="Upcoming" count={upcoming.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {upcoming.map((t) => <TicketCard key={t.rsvpId} ticket={t} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <SectionLabel label="Past" count={past.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {past.map((t) => <TicketCard key={t.rsvpId} ticket={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
    }}>
      <span style={{
        fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
        color: 'var(--wimc-text-secondary)', textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)',
        color: 'var(--wimc-text-muted)',
      }}>
        {count}
      </span>
    </div>
  )
}
