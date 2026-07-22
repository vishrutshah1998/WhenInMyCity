'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { updateInquiryStatus, toggleInquiryAccepted } from '@/app/actions/booking'

interface SlimEvent {
  id: string
  title: string
  starts_at: string
  status: string
  ticket_price: number
}

interface SlimRsvp {
  id: string
  event_id: string
  attendee_name: string
  payment_status: string
  amount_paid: number | null
  created_at: string
}

interface SlimInquiry {
  id: string
  requester_name: string
  requester_email: string
  event_type: string | null
  message: string | null
  status: string
  accepted_at: string | null
  created_at: string
}

interface BookingsClientProps {
  events: SlimEvent[]
  rsvps: SlimRsvp[]
  inquiries: SlimInquiry[]
}

function formatRevenue(paise: number) {
  const rs = paise / 100
  if (rs >= 100000) return `₹${(rs / 100000).toFixed(2)}L`
  if (rs >= 1000) return `₹${(rs / 1000).toFixed(1)}K`
  return `₹${rs.toLocaleString('en-IN')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Ticket Sales tab ──────────────────────────────────────────────────────────

function TicketSalesTab({ events, rsvps }: { events: SlimEvent[]; rsvps: SlimRsvp[] }) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const cutoff = period === 'all' ? null : new Date(Date.now() - { '7d': 7, '30d': 30, '90d': 90 }[period] * 86400000)
  const filtered = rsvps.filter((r) => !cutoff || new Date(r.created_at) >= cutoff)

  const totalRevenue = filtered.reduce((s, r) => s + (r.amount_paid ?? 0), 0)
  const eventMap = Object.fromEntries(events.map((e) => [e.id, e]))

  const byEvent: Record<string, { title: string; count: number; revenue: number }> = {}
  for (const r of filtered) {
    const e = eventMap[r.event_id]
    if (!byEvent[r.event_id]) byEvent[r.event_id] = { title: e?.title ?? '—', count: 0, revenue: 0 }
    byEvent[r.event_id].count++
    byEvent[r.event_id].revenue += r.amount_paid ?? 0
  }
  const eventSummary = Object.values(byEvent).sort((a, b) => b.revenue - a.revenue)

  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
  const now = new Date()
  const dayLabels: string[] = []
  const dayValues: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    dayLabels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))
    dayValues.push(filtered.filter((r) => new Date(r.created_at).toDateString() === d.toDateString()).reduce((s, r) => s + (r.amount_paid ?? 0), 0))
  }
  const maxVal = Math.max(...dayValues, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Period filter */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--wimc-bg-elevated)', borderRadius: 0, border: '1px solid var(--wimc-border-default)', alignSelf: 'flex-start' }}>
        {(['7d', '30d', '90d', 'all'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '4px 12px', borderRadius: 0, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: 'none',
            background: period === p ? 'var(--wimc-coral)' : 'transparent',
            color: period === p ? '#fff' : 'var(--wimc-text-secondary)',
          }}>
            {p === 'all' ? 'All time' : p}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Revenue', value: formatRevenue(totalRevenue), color: 'var(--wimc-amber)', icon: 'payments' },
          { label: 'Total Tickets', value: filtered.length, color: 'var(--wimc-coral)', icon: 'receipt_long' },
          { label: 'Avg. Ticket Value', value: filtered.length ? formatRevenue(Math.round(totalRevenue / filtered.length)) : '₹0', color: 'var(--wimc-teal)', icon: 'trending_up' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderLeft: `3px solid ${color}`, borderRadius: 0, padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 0, background: `${color}22`, display: 'grid', placeItems: 'center', color, flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22, marginBottom: 20 }}>Revenue over time</div>
        {filtered.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
              {dayValues.map((v, i) => (
                <div key={i} title={`${dayLabels[i]}: ${formatRevenue(v)}`} style={{
                  flex: 1, minWidth: 0,
                  height: `${Math.max(4, Math.round((v / maxVal) * 80))}px`,
                  background: v > 0 ? 'var(--wimc-amber)' : 'rgba(26,39,68,0.08)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 300ms ease',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)' }}>
              <span>{dayLabels[0]}</span>
              <span>{dayLabels[dayLabels.length - 1]}</span>
            </div>
          </>
        ) : (
          <div style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontFamily: 'var(--font-jetbrains-mono)',
            color: 'var(--wimc-text-secondary)',
          }}>
            No sales in this period
          </div>
        )}
      </div>

      {/* Per-event breakdown */}
      {eventSummary.length > 0 && (
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-abril)', fontSize: 22 }}>By event</div>
          {eventSummary.map((ev, i) => (
            <div key={ev.title + i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px',
              borderBottom: i < eventSummary.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>{ev.count} ticket{ev.count !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--wimc-amber)' }}>{formatRevenue(ev.revenue)}</div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ border: '2px dashed var(--wimc-border-default)', borderRadius: 0, padding: 48, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 12 }}>receipt_long</span>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No ticket sales in this period</div>
          <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 20 }}>Paid ticket purchases will appear here.</div>
          <Link
            href="/dashboard/events/create"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 0, fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-dm-sans)', background: 'var(--wimc-coral)',
              color: '#fff', textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
            Create event
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Booking Inquiries tab ─────────────────────────────────────────────────────

const STATUS_META: Record<string, { color: string; label: string }> = {
  new:      { color: 'var(--wimc-coral)',          label: 'New'      },
  read:     { color: 'var(--wimc-amber)',           label: 'Read'     },
  replied:  { color: 'var(--wimc-teal)',            label: 'Replied'  },
  declined: { color: 'var(--wimc-text-secondary)',  label: 'Declined' },
}

const NEXT_STATUSES: Record<string, Array<'read' | 'replied' | 'declined'>> = {
  new:      ['read', 'replied', 'declined'],
  read:     ['replied', 'declined'],
  replied:  ['declined'],
  declined: [],
}

function InquiryCard({ inquiry: initial }: { inquiry: SlimInquiry }) {
  const [inq, setInq] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [isAcceptPending, startAcceptTransition] = useTransition()

  function handleStatus(status: 'read' | 'replied' | 'declined') {
    const prev = inq
    setInq((i) => ({ ...i, status }))
    startTransition(async () => {
      const result = await updateInquiryStatus(inq.id, status)
      if (!result.success) setInq(prev)
    })
  }

  function handleToggleAccepted() {
    const prev = inq
    setInq((i) => ({ ...i, accepted_at: i.accepted_at ? null : new Date().toISOString() }))
    startAcceptTransition(async () => {
      const result = await toggleInquiryAccepted(inq.id)
      if (!result.success) setInq(prev)
    })
  }

  const meta = STATUS_META[inq.status] ?? STATUS_META.new
  const nextActions = NEXT_STATUSES[inq.status] ?? []
  const isAccepted = !!inq.accepted_at

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: `1px solid ${inq.status === 'new' ? 'rgba(232,112,90,0.3)' : 'var(--wimc-border-default)'}`,
      borderRadius: 0, padding: 20,
      opacity: isPending ? 0.7 : 1,
      transition: 'opacity 150ms',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{inq.requester_name}</div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)', marginTop: 2 }}>
            {inq.requester_email}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleToggleAccepted}
            disabled={isAcceptPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)',
              padding: '3px 10px', borderRadius: 9999, cursor: isAcceptPending ? 'default' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              border: `1px solid ${isAccepted ? 'var(--wimc-teal)' : 'var(--wimc-border-default)'}`,
              background: isAccepted ? 'var(--wimc-teal)' : 'transparent',
              color: isAccepted ? '#fff' : 'var(--wimc-text-secondary)',
              opacity: isAcceptPending ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: isAccepted ? "'FILL' 1" : "'FILL' 0" }}>
              {isAccepted ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            {isAccepted ? 'Accepted' : 'Accept'}
          </button>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)',
            padding: '3px 8px', borderRadius: 9999,
            background: `${meta.color}22`, color: meta.color,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            {formatDate(inq.created_at)}
          </span>
        </div>
      </div>

      {/* Event type */}
      {inq.event_type && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--wimc-text-secondary)' }}>event</span>
          <span style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>{inq.event_type}</span>
        </div>
      )}

      {/* Message */}
      {inq.message && (
        <p style={{
          fontSize: 13, lineHeight: 1.6, color: 'var(--wimc-text-secondary)',
          background: 'var(--wimc-bg-overlay)', borderRadius: 0, padding: '10px 12px', margin: 0,
        }}>
          {inq.message}
        </p>
      )}

      {/* Actions */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href={`mailto:${inq.requester_email}?subject=Re: Booking inquiry via WIMC`}
          onClick={() => inq.status === 'new' && handleStatus('read')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 0, fontSize: 12, fontWeight: 600,
            background: 'var(--wimc-teal-dim)', color: 'var(--wimc-teal)',
            textDecoration: 'none', border: '1px solid rgba(93,217,208,0.2)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>reply</span>
          Reply via email
        </a>

        {nextActions.map((s) => (
          <button
            key={s}
            onClick={() => handleStatus(s)}
            disabled={isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 0, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-dm-sans)', cursor: isPending ? 'default' : 'pointer',
              background: 'transparent', color: 'var(--wimc-text-secondary)',
              border: '1px solid var(--wimc-border-default)',
            }}
          >
            Mark {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function InquiriesTab({ inquiries }: { inquiries: SlimInquiry[] }) {
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'declined'>('all')

  const filtered = filter === 'all' ? inquiries : inquiries.filter((i) => i.status === filter)
  const newCount = inquiries.filter((i) => i.status === 'new').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'new', 'read', 'replied', 'declined'] as const).map((s) => {
          const count = s === 'all' ? inquiries.length : inquiries.filter((i: SlimInquiry) => i.status === s).length
          const active = filter === s
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: 'none',
              background: active ? 'var(--wimc-coral)' : 'var(--wimc-bg-elevated)',
              color: active ? '#fff' : 'var(--wimc-text-secondary)',
            }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{
                background: active ? 'rgba(26,39,68,0.12)' : 'var(--wimc-bg-overlay)',
                borderRadius: 9999, padding: '0 5px', fontSize: 10,
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {newCount > 0 && filter !== 'new' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--wimc-coral-dim)', border: '1px solid rgba(232,112,90,0.3)',
          borderRadius: 0, padding: '10px 16px', fontSize: 13, color: 'var(--wimc-coral-light)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
          {newCount} new {newCount === 1 ? 'inquiry' : 'inquiries'} awaiting your response
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ border: '2px dashed var(--wimc-border-default)', borderRadius: 0, padding: 48, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 12 }}>calendar_month</span>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {filter === 'all' ? 'No booking inquiries yet' : `No ${filter} inquiries`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: filter === 'all' ? 20 : 0 }}>
            {filter === 'all'
              ? 'Add a Booking Request block to your page to start receiving inquiries.'
              : 'Change the filter to see other inquiries.'}
          </div>
          {filter === 'all' && (
            <Link
              href="/dashboard/studio"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 0, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)', background: 'var(--wimc-coral)',
                color: '#fff', textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add_box</span>
              Add blocks in Studio
            </Link>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((inq) => (
          <InquiryCard key={inq.id} inquiry={inq} />
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingsClient({ events, rsvps, inquiries }: BookingsClientProps) {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'inquiries' ? 'inquiries' : 'sales'
  const [tab, setTab] = useState<'sales' | 'inquiries'>(defaultTab)

  const newInquiryCount = inquiries.filter((i) => i.status === 'new').length

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
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
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Bookings</div>
        </div>

        <div style={{ display: 'flex', gap: 2, padding: 4, background: 'var(--wimc-bg-overlay)', borderRadius: 0, border: '1px solid var(--wimc-border-default)', marginLeft: 8 }}>
          {([
            { key: 'sales', label: 'Ticket Sales' },
            { key: 'inquiries', label: 'Inquiries' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 0, fontSize: 12.5, fontWeight: 600,
              fontFamily: 'var(--font-dm-sans)', cursor: 'pointer', border: 'none',
              background: tab === key ? 'var(--wimc-coral)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--wimc-text-secondary)',
              transition: 'all 180ms ease',
            }}>
              {label}
              {key === 'inquiries' && newInquiryCount > 0 && (
                <span style={{
                  background: tab === key ? 'rgba(255,255,255,0.3)' : 'var(--wimc-coral)',
                  color: tab === key ? '#fff' : '#fff',
                  fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)',
                  padding: '0 5px', borderRadius: 9999, fontWeight: 700,
                }}>
                  {newInquiryCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px' }}>
        {tab === 'sales'
          ? <TicketSalesTab events={events} rsvps={rsvps} />
          : <InquiriesTab inquiries={inquiries} />
        }
      </div>
    </>
  )
}
