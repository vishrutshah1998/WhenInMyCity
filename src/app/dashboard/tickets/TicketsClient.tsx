'use client'

import { useState } from 'react'
import type { Rsvp, PaymentStatus } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlimEvent {
  id: string
  title: string
  starts_at: string
  status: string
  slug: string
  capacity: number | null
  ticket_price: number
}

type SlimRsvp = Pick<Rsvp, 'id' | 'event_id' | 'attendee_name' | 'attendee_phone' | 'payment_status' | 'amount_paid' | 'checked_in' | 'checked_in_at' | 'created_at' | 'qr_code_token'>

interface TicketsClientProps {
  events: SlimEvent[]
  rsvps: SlimRsvp[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso))
}

const STATUS_PILL: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
  captured:      { label: 'Paid',           bg: 'rgba(93,217,208,0.15)', color: 'var(--wimc-teal)' },
  pending:       { label: 'Pending',        bg: 'rgba(245,168,0,0.15)',  color: 'var(--wimc-amber)' },
  failed:        { label: 'Failed',         bg: 'rgba(232,52,42,0.15)',  color: '#E8342A' },
  refunded:      { label: 'Refunded',       bg: 'rgba(59,107,204,0.15)', color: '#3B6BCC' },
  refund_failed: { label: 'Refund Failed',  bg: 'rgba(232,52,42,0.10)',  color: '#E8342A' },
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TicketsClient({ events, rsvps }: TicketsClientProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filteredRsvps = rsvps.filter((r) => {
    const matchEvent = selectedEventId === 'all' || r.event_id === selectedEventId
    const matchSearch = !search || r.attendee_name.toLowerCase().includes(search.toLowerCase()) || r.attendee_phone.includes(search)
    return matchEvent && matchSearch
  })

  const totalCheckedIn = filteredRsvps.filter((r) => r.checked_in).length
  const totalPaid      = filteredRsvps.filter((r) => r.payment_status === 'captured').length
  const eventMap       = Object.fromEntries(events.map((e) => [e.id, e]))

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 2 }}>
            Creator Studio
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Tickets</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-secondary)' }}>search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendees…"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--wimc-text-primary)', width: 180, fontFamily: 'var(--font-dm-sans)' }}
            />
          </div>
          {/* Event filter */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{
              padding: '6px 12px', background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
              borderRadius: 0, fontSize: 13, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)', cursor: 'pointer',
            }}
          >
            <option value="all">All Events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total Registrations', value: filteredRsvps.length, color: 'var(--wimc-coral)' },
            { label: 'Checked In', value: `${totalCheckedIn} / ${filteredRsvps.length}`, color: 'var(--wimc-teal)' },
            { label: 'Confirmed', value: totalPaid, color: 'var(--wimc-amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderLeft: `3px solid ${color}`, borderRadius: 0, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1, color }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {filteredRsvps.length === 0 ? (
          <div style={{ border: '2px dashed var(--wimc-border-default)', borderRadius: 0, padding: 48, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 12 }}>confirmation_number</span>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No tickets yet</div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>Attendees will appear here once they register for your events.</div>
          </div>
        ) : (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0 }}>
            <div style={{ overflowX: 'auto' }}>
            {/* Table head */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 100px 100px', minWidth: 520,
              padding: '12px 24px', borderBottom: '1px solid var(--wimc-border-subtle)',
              fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
              letterSpacing: '0.8px', color: 'var(--wimc-text-secondary)',
            }}>
              {['Attendee', 'Event', 'Registered', 'Status', 'Check-in'].map((h) => <div key={h}>{h}</div>)}
            </div>
            {filteredRsvps.map((rsvp, i) => {
              const event = eventMap[rsvp.event_id]
              const pill = STATUS_PILL[rsvp.payment_status] ?? STATUS_PILL.pending
              return (
                <div key={rsvp.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 100px 100px', minWidth: 520,
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: i < filteredRsvps.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                  fontSize: 13, transition: 'background 200ms',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-overlay)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{rsvp.attendee_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>{rsvp.attendee_phone}</div>
                  </div>
                  <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 12 }}>{event?.title ?? '—'}</div>
                  <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {new Date(rsvp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <div>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 9999, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      fontSize: 11, padding: '3px 9px', borderRadius: 9999, fontWeight: 600,
                      fontFamily: 'var(--font-jetbrains-mono)',
                      background: rsvp.checked_in ? 'rgba(93,217,208,0.15)' : 'var(--wimc-bg-overlay)',
                      color: rsvp.checked_in ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)',
                    }}>
                      {rsvp.checked_in ? '✓ In' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
            </div>{/* /overflowX */}
          </div>
        )}
      </div>
    </>
  )
}
