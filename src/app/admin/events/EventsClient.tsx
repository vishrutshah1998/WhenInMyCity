'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AdminEventRow } from '@/app/actions/admin'
import { CITIES } from '@/lib/constants/interests'

const STATUS_TABS = [
  { value: 'all',       label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft',     label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  published: '#22c55e',
  draft:     'var(--wimc-amber)',
  completed: '#3b82f6',
  cancelled: 'var(--wimc-coral)',
}

interface Props {
  events: AdminEventRow[]
  currentStatus: string
}

export default function EventsClient({ events, currentStatus }: Props) {
  const router = useRouter()

  const totalGross = events.reduce((s, e) => s + e.gross_paise, 0)
  const totalRsvps = events.reduce((s, e) => s + e.rsvp_count, 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
          All Events
        </h1>
        <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
          {events.length} event{events.length !== 1 ? 's' : ''} · {totalRsvps} RSVPs · ₹{(totalGross / 100).toLocaleString('en-IN')} GMV
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--wimc-border-subtle)' }}>
        {STATUS_TABS.map((tab) => {
          const active = currentStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => router.push(`/admin/events?status=${tab.value}`)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                border: 'none', background: 'none', cursor: 'pointer',
                color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                borderBottom: active ? '2px solid var(--wimc-coral)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 150ms',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No events found</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                {['Event', 'Creator', 'Status', 'Date', 'RSVPs', 'GMV', ''].map((h) => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
                    color: 'var(--wimc-text-muted)', textTransform: 'uppercase',
                    fontFamily: 'var(--font-jetbrains-mono)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const dateStr = new Date(event.starts_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                const cityName = CITIES.find((c) => c.id === event.city)?.name ?? event.city ?? '—'
                const statusColor = STATUS_COLORS[event.status] ?? 'var(--wimc-text-muted)'

                return (
                  <tr
                    key={event.id}
                    style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}
                  >
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 2 }}>{cityName}</div>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <Link
                        href={`/${event.creator_slug}`}
                        target="_blank"
                        style={{ color: 'var(--wimc-text-secondary)', textDecoration: 'none', fontSize: 12 }}
                      >
                        {event.creator_name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                        background: `${statusColor}22`, color: statusColor,
                        textTransform: 'capitalize',
                      }}>
                        {event.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', color: 'var(--wimc-text-secondary)', whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: '12px 12px', fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {event.rsvp_count}
                    </td>
                    <td style={{ padding: '12px 12px', fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-coral)' }}>
                      {event.gross_paise > 0 ? `₹${(event.gross_paise / 100).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <Link
                        href={`/events/${event.slug}`}
                        target="_blank"
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                          border: '1px solid var(--wimc-border-subtle)',
                          color: 'var(--wimc-text-secondary)', textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View ↗
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
