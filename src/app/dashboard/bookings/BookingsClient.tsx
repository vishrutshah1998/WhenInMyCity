'use client'

import { useState } from 'react'

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

interface BookingsClientProps {
  events: SlimEvent[]
  rsvps: SlimRsvp[]
}

function formatRevenue(paise: number) {
  const rs = paise / 100
  if (rs >= 100000) return `₹${(rs / 100000).toFixed(2)}L`
  if (rs >= 1000) return `₹${(rs / 1000).toFixed(1)}K`
  return `₹${rs.toLocaleString('en-IN')}`
}

export default function BookingsClient({ events, rsvps }: BookingsClientProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const cutoff = period === 'all' ? null : new Date(Date.now() - { '7d': 7, '30d': 30, '90d': 90 }[period] * 86400000)
  const filtered = rsvps.filter((r) => !cutoff || new Date(r.created_at) >= cutoff)

  const totalRevenue = filtered.reduce((s, r) => s + (r.amount_paid ?? 0), 0)
  const eventMap = Object.fromEntries(events.map((e) => [e.id, e]))

  // Revenue by event
  const byEvent: Record<string, { title: string; count: number; revenue: number }> = {}
  for (const r of filtered) {
    const e = eventMap[r.event_id]
    if (!byEvent[r.event_id]) byEvent[r.event_id] = { title: e?.title ?? '—', count: 0, revenue: 0 }
    byEvent[r.event_id].count++
    byEvent[r.event_id].revenue += r.amount_paid ?? 0
  }
  const eventSummary = Object.values(byEvent).sort((a, b) => b.revenue - a.revenue)

  // Revenue by day (last 30 entries)
  const now = new Date()
  const dayLabels: string[] = []
  const dayValues: number[] = []
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const val = filtered
      .filter((r) => new Date(r.created_at).toDateString() === d.toDateString())
      .reduce((s, r) => s + (r.amount_paid ?? 0), 0)
    dayLabels.push(label); dayValues.push(val)
  }
  const maxVal = Math.max(...dayValues, 1)

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Bookings</div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--wimc-bg-elevated)', borderRadius: 8, border: '1px solid var(--wimc-border-default)' }}>
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '4px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: 'none',
              background: period === p ? 'var(--wimc-coral)' : 'transparent',
              color: period === p ? '#fff' : 'var(--wimc-text-secondary)',
            }}>
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Revenue', value: formatRevenue(totalRevenue), color: 'var(--wimc-amber)', icon: 'payments' },
            { label: 'Total Bookings', value: filtered.length, color: 'var(--wimc-coral)', icon: 'receipt_long' },
            { label: 'Avg. Ticket Value', value: filtered.length ? formatRevenue(Math.round(totalRevenue / filtered.length)) : '₹0', color: 'var(--wimc-teal)', icon: 'trending_up' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 16, padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: 'grid', placeItems: 'center', color, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 26, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        {filtered.length > 0 && (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Revenue over time</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
              {dayValues.map((v, i) => (
                <div key={i} title={`${dayLabels[i]}: ${formatRevenue(v)}`} style={{
                  flex: 1, minWidth: 0,
                  height: `${Math.max(4, Math.round((v / maxVal) * 80))}px`,
                  background: v > 0 ? 'var(--wimc-amber)' : 'var(--wimc-bg-overlay)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 300ms ease',
                  cursor: 'default',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)' }}>
              <span>{dayLabels[0]}</span>
              <span>{dayLabels[dayLabels.length - 1]}</span>
            </div>
          </div>
        )}

        {/* Per-event breakdown */}
        {eventSummary.length > 0 && (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>By Event</div>
            {eventSummary.map((ev, i) => (
              <div key={ev.title + i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px',
                borderBottom: i < eventSummary.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>{ev.count} booking{ev.count !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--wimc-amber)' }}>{formatRevenue(ev.revenue)}</div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ border: '2px dashed var(--wimc-border-default)', borderRadius: 18, padding: 48, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 12 }}>receipt_long</span>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No bookings in this period</div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>Paid bookings will appear here once attendees purchase tickets.</div>
          </div>
        )}
      </div>
    </>
  )
}
