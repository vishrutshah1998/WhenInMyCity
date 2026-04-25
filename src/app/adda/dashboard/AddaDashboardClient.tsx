'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { respondToProposal } from '@/app/actions/adda'
import type { AddaProfile, AddaAvailability, MakerAddaProposal, Event } from '@/types/database'
import type { AddaDashboardStats, RevenueEntry } from '@/app/actions/adda-dashboard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInr(paise: number) {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  available:      { bg: 'rgba(77,210,177,0.12)',  color: 'var(--wimc-teal)' },
  blocked:        { bg: 'rgba(255,255,255,0.06)',  color: 'var(--wimc-text-secondary)' },
  pending:        { bg: 'rgba(255,180,60,0.12)',   color: 'var(--wimc-amber)' },
  confirmed:      { bg: 'rgba(232,112,90,0.12)',   color: 'var(--wimc-coral)' },
  pending_proposal: { bg: 'rgba(255,180,60,0.12)', color: 'var(--wimc-amber)' },
  accepted:       { bg: 'rgba(77,210,177,0.12)',   color: 'var(--wimc-teal)' },
  declined:       { bg: 'rgba(255,255,255,0.06)',  color: 'var(--wimc-text-secondary)' },
  counter_offered:{ bg: 'rgba(232,112,90,0.12)',  color: 'var(--wimc-coral)' },
}

function Pill({ status, label }: { status: string; label?: string }) {
  const s = STATUS_PILL[status] ?? STATUS_PILL.blocked
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)',
      background: s.bg, color: s.color, textTransform: 'capitalize',
    }}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Calendar section
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function CalendarSection({
  availability,
  addaId,
}: {
  availability: AddaAvailability[]
  addaId: string
}) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  // Build date → status map
  const dateMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const slot of availability) {
      // If a date has any confirmed/pending slot, that takes priority
      const prev = m[slot.date]
      if (!prev || slot.status === 'confirmed' || (slot.status === 'pending' && prev === 'available')) {
        m[slot.date] = slot.status
      }
    }
    return m
  }, [availability])

  const today = now.toISOString().slice(0, 10)

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)' }}>
          {[
            { label: 'Available', color: 'var(--wimc-teal)' },
            { label: 'Pending',   color: 'var(--wimc-amber)' },
            { label: 'Confirmed', color: 'var(--wimc-coral)' },
            { label: 'Blocked',   color: 'var(--wimc-border-default)' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {DAY_LABELS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const status = dateMap[dateStr]
            const isToday = dateStr === today
            const dotColor =
              status === 'available'  ? 'var(--wimc-teal)' :
              status === 'pending'    ? 'var(--wimc-amber)' :
              status === 'confirmed'  ? 'var(--wimc-coral)' :
              status === 'blocked'    ? 'var(--wimc-border-default)' : 'transparent'

            return (
              <div key={dateStr} style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: isToday ? 'var(--wimc-coral-dim)' : 'transparent',
                border: isToday ? '1px solid rgba(232,112,90,0.3)' : '1px solid transparent',
              }}>
                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--wimc-coral)' : 'var(--wimc-text-primary)' }}>
                  {day}
                </span>
                {status && (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Proposal card
// ---------------------------------------------------------------------------

function ProposalCard({ proposal, onRespond }: { proposal: MakerAddaProposal; onRespond: (id: string, response: 'accept' | 'decline') => void }) {
  const [isPending, startTransition] = useTransition()

  function handle(response: 'accept' | 'decline') {
    startTransition(() => onRespond(proposal.id, response))
  }

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{proposal.event_title}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            <span>{formatDate(proposal.proposed_date)}</span>
            <span style={{ textTransform: 'capitalize' }}>{proposal.proposed_slot.replace('_', ' ')}</span>
            {proposal.expected_attendees && <span>{proposal.expected_attendees} attendees</span>}
            {proposal.expected_revenue_paise && <span>~{formatInr(proposal.expected_revenue_paise)} revenue</span>}
          </div>
          {proposal.message && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--wimc-text-secondary)', fontStyle: 'italic', maxWidth: 480 }}>
              &ldquo;{proposal.message}&rdquo;
            </div>
          )}
        </div>
        <Pill status={proposal.status} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => handle('accept')}
          disabled={isPending}
          style={{
            padding: '6px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: 'none',
            background: 'var(--wimc-teal)', color: '#0a0a0b',
            opacity: isPending ? 0.5 : 1,
          }}
        >
          Accept
        </button>
        <button
          onClick={() => handle('decline')}
          disabled={isPending}
          style={{
            padding: '6px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--wimc-border-default)',
            color: 'var(--wimc-text-secondary)',
            opacity: isPending ? 0.5 : 1,
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  addaId:              string
  adda:                AddaProfile
  upcomingEvents:      Event[]
  pendingProposals:    MakerAddaProposal[]
  recentRevenue:       RevenueEntry[]
  availabilityThisMonth: AddaAvailability[]
  stats:               AddaDashboardStats
}

export default function AddaDashboardClient({
  addaId,
  adda,
  upcomingEvents,
  pendingProposals: initialProposals,
  recentRevenue,
  availabilityThisMonth,
  stats,
}: Props) {
  const router = useRouter()
  const [proposals, setProposals] = useState(initialProposals)
  const [proposalError, setProposalError] = useState<string | null>(null)

  async function handleProposalResponse(id: string, response: 'accept' | 'decline') {
    setProposalError(null)
    const result = await respondToProposal(id, response)
    if (result.error) { setProposalError(result.error); return }
    setProposals((prev) => prev.filter((p) => p.id !== id))
    router.refresh()
  }

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  const totalRevenuePaise = recentRevenue.reduce((sum, e) => sum + e.adda_share_paise, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Top bar */}
      <header style={topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--wimc-coral)', fontSize: 22 }}>storefront</span>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{adda.name}</div>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>Adda Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {adda.is_verified && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--wimc-teal)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
              Verified
            </span>
          )}
          <a href={`/adda/${adda.slug}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--wimc-coral)', textDecoration: 'none', fontWeight: 600 }}>
            View listing
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          </a>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--wimc-text-secondary)', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
            Creator Dashboard
          </a>
        </div>
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Events Hosted', value: stats.total_events_hosted, color: 'var(--wimc-coral)',          icon: 'event' },
            { label: 'This Month',    value: stats.this_month_events,   color: 'var(--wimc-teal)',           icon: 'calendar_today' },
            { label: 'Total Earned',  value: formatInr(stats.total_revenue_paise), color: 'var(--wimc-amber)', icon: 'payments' },
            { label: 'Avg Rating',    value: stats.average_maker_rating > 0 ? stats.average_maker_rating.toFixed(1) + ' ★' : '—', color: 'var(--wimc-text-primary)', icon: 'star' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 16, padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: 'grid', placeItems: 'center', color, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 22, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid: proposals + calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Booking requests */}
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>Booking Requests</span>
              {proposals.length > 0 && (
                <span style={{ background: 'var(--wimc-coral)', color: '#fff', borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: '1px 8px' }}>
                  {proposals.length}
                </span>
              )}
            </div>
            {proposalError && (
              <div style={{ padding: '10px 24px', background: 'rgba(232,112,90,0.08)', fontSize: 12, color: 'var(--wimc-coral)' }}>
                {proposalError}
              </div>
            )}
            {proposals.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13 }}>
                No pending booking requests.
              </div>
            ) : (
              proposals.map((p) => (
                <ProposalCard key={p.id} proposal={p} onRespond={handleProposalResponse} />
              ))
            )}
          </div>

          {/* Calendar */}
          <CalendarSection availability={availabilityThisMonth} addaId={addaId} />
        </div>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
              Upcoming Events This Month
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                    {['Event', 'Date', 'Status', 'Ticket Price'].map((h) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600, color: 'var(--wimc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcomingEvents.map((ev, i) => (
                    <tr key={ev.id} style={{ borderBottom: i < upcomingEvents.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{ev.title}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--wimc-text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(ev.starts_at)}</td>
                      <td style={{ padding: '12px 20px' }}><Pill status={ev.status} /></td>
                      <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, color: 'var(--wimc-teal)' }}>
                        {ev.ticket_price > 0 ? formatInr(ev.ticket_price) : 'Free'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue summary */}
        {recentRevenue.length > 0 && (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>Revenue Summary</span>
              <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                Total earned: <strong style={{ color: 'var(--wimc-coral)' }}>{formatInr(totalRevenuePaise)}</strong>
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                    {['Event', 'Date', 'Attendees', 'Ticket Revenue', 'Your Share'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600, color: 'var(--wimc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRevenue.map((e, i) => (
                    <tr key={e.event_id} style={{ borderBottom: i < recentRevenue.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.event_title}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--wimc-text-secondary)', whiteSpace: 'nowrap' }}>{formatShortDate(e.event_date)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'var(--font-jetbrains-mono)' }}>{e.attendee_count}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)' }}>{formatInr(e.ticket_revenue_paise)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, color: 'var(--wimc-coral)' }}>{formatInr(e.adda_share_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listing info card */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Listing Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { label: 'Venue Name',   value: adda.name },
              { label: 'City',         value: adda.city.replace(/_/g, ' ') },
              { label: 'Neighbourhood', value: adda.neighbourhood ?? '—' },
              { label: 'Venue Types',  value: adda.adda_type.map((t) => t.replace(/_/g, ' ')).join(', ') || '—' },
              { label: 'Capacity',     value: adda.capacity_min && adda.capacity_max ? `${adda.capacity_min}–${adda.capacity_max} pax` : adda.capacity_max ? `Up to ${adda.capacity_max} pax` : '—' },
              { label: 'Pricing Model', value: adda.pricing_model.replace(/_/g, ' ') },
              { label: 'WhatsApp',     value: adda.contact_whatsapp ?? '—' },
              { label: 'Email',        value: adda.contact_email ?? '—' },
              { label: 'Instagram',    value: adda.instagram_handle ? `@${adda.instagram_handle}` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{value}</div>
              </div>
            ))}
          </div>
          {adda.description && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--wimc-border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--wimc-text-secondary)' }}>{adda.description}</div>
            </div>
          )}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--wimc-border-subtle)' }}>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Amenities</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {adda.amenities.length > 0 ? adda.amenities.map((a) => (
                <span key={a} style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', textTransform: 'capitalize' }}>
                  {a.replace(/_/g, ' ')}
                </span>
              )) : <span style={{ color: 'var(--wimc-text-secondary)', fontSize: 13 }}>None listed</span>}
            </div>
          </div>
        </div>

      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
