'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MyTicket } from '@/app/actions/rsvp'

const LAVENDER = '#9B8FFF'

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso))
}

function fmtCheckedInAt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

function qrImageUrl(token: string): string {
  const data = encodeURIComponent(`WIMC-${token}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}&color=3b0a00&bgcolor=ffffff&margin=10`
}

function TicketCard({ ticket, past }: { ticket: MyTicket; past: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: '#FAF7F0',
      border: '1.5px dashed rgba(26,39,68,0.25)',
      borderLeft: `3px solid ${past ? 'rgba(152,150,176,0.5)' : LAVENDER}`,
      padding: '14px 16px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Ticket header */}
        <div style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 8, color: 'rgba(26,39,68,0.40)',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          WHEN IN MY CITY · {past ? 'ATTENDED' : 'UPCOMING'}
        </div>

        <div style={{ borderTop: '1px dashed rgba(26,39,68,0.15)', marginBottom: 8 }} />

        <Link href={`/events/${ticket.eventSlug}`} style={{ textDecoration: 'none' }}>
          <div style={{
            fontFamily: 'var(--font-outfit)',
            fontSize: 16, fontWeight: 700, color: '#1A1711',
            marginBottom: 4,
          }}>
            {ticket.eventTitle}
          </div>
        </Link>
        <div style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 10, color: 'rgba(26,39,68,0.50)', marginBottom: ticket.creatorName ? 6 : 10,
        }}>
          {ticket.venueName} · {fmtDate(ticket.eventStartsAt)}
        </div>

        {ticket.creatorName && (
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 9, color: 'rgba(26,39,68,0.45)', marginBottom: 10,
          }}>
            Hosted by{' '}
            {ticket.creatorUsername ? (
              <Link href={`/${ticket.creatorUsername}`} style={{ color: LAVENDER, fontWeight: 700, textDecoration: 'none' }}>
                {ticket.creatorName}
              </Link>
            ) : (
              <span style={{ fontWeight: 700, color: 'rgba(26,39,68,0.6)' }}>{ticket.creatorName}</span>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px dashed rgba(26,39,68,0.15)', paddingTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {!past && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                background: expanded ? 'transparent' : LAVENDER,
                border: `1px solid ${LAVENDER}`,
                color: expanded ? LAVENDER : '#07070A',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                {expanded ? 'qr_code_scanner' : 'qr_code'}
              </span>
              {expanded ? 'Hide QR' : 'Show QR'}
            </button>
          )}
          {past && (
            <Link
              href={`/events/${ticket.eventSlug}#rate`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                border: '1px solid rgba(245,168,0,0.4)',
                color: '#F5A800',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>star</span>
              Rate event
            </Link>
          )}
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 9, color: 'rgba(26,39,68,0.45)',
          }}>
            ₹{Math.round(ticket.amountPaid / 100).toLocaleString('en-IN')}
          </span>
          {ticket.checkedIn && (
            <span style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 9, color: '#22C55E',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              ✓ Checked in{ticket.checkedInAt ? ` · ${fmtCheckedInAt(ticket.checkedInAt)}` : ''}
            </span>
          )}
        </div>

        {expanded && !past && (
          <div style={{
            marginTop: 14, paddingTop: 14,
            borderTop: '1px dashed rgba(26,39,68,0.15)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              padding: 14, borderRadius: 8,
              background: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            }}>
              <Image
                src={qrImageUrl(ticket.qrToken)}
                alt="Ticket QR code"
                width={180}
                height={180}
                unoptimized
              />
            </div>
            <div style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 9, color: 'rgba(26,39,68,0.5)',
              textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Show this at the Venue entrance
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TicketsDashboardClient({ tickets }: { tickets: MyTicket[] }) {
  const now = new Date().toISOString()
  const upcoming = tickets.filter(t => t.eventStartsAt > now)
  const past     = tickets.filter(t => t.eventStartsAt <= now)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 8 }}>
        Tickets
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 28 }}>
        Your confirmed event tickets.
      </p>

      {tickets.length === 0 ? (
        <div style={{
          background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
          padding: '40px 24px', textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#9896B0', display: 'block', marginBottom: 10 }}>
            confirmation_number
          </span>
          <p style={{ fontSize: 13, color: '#9896B0', margin: '0 0 16px' }}>
            No tickets yet. Find your next event.
          </p>
          <Link
            href="/explore"
            style={{
              display: 'inline-block', padding: '9px 20px',
              background: LAVENDER, color: '#07070A',
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Browse events →
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 9, fontWeight: 700,
                color: LAVENDER, letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                Upcoming · {upcoming.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(t => <TicketCard key={t.rsvpId} ticket={t} past={false} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 9, fontWeight: 700,
                color: '#9896B0', letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                Past · {past.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {past.map(t => <TicketCard key={t.rsvpId} ticket={t} past={true} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
