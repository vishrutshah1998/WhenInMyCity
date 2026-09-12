'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ApplicationRow } from '@/app/actions/rsvp'
import { decideApplication, bulkDecideApplications } from '@/app/actions/rsvp'
import type { ApplicationStatus } from '@/types/database'

interface Props {
  eventId:             string
  eventTitle:          string
  applicationQuestion: string | null
  applications:        ApplicationRow[]
}

type Decision = 'approved' | 'declined' | 'waitlisted'
type Tab = 'pending' | 'approved' | 'declined' | 'waitlisted'

const TAB_LABEL: Record<Tab, string> = {
  pending:    'Pending',
  approved:   'Approved',
  declined:   'Declined',
  waitlisted: 'Waitlisted',
}

const STATUS_BADGE: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  approved:   { label: 'Approved',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  declined:   { label: 'Declined',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  waitlisted: { label: 'Waitlisted', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function ApplicationsClient({ eventId, eventTitle, applicationQuestion, applications: initial }: Props) {
  const router = useRouter()
  const [, startRefresh] = useTransition()

  const [applications, setApplications] = useState(initial)
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rowPending, setRowPending] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState<Decision | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const counts = useMemo(() => ({
    pending:    applications.filter((a) => a.application_status === 'pending').length,
    approved:   applications.filter((a) => a.application_status === 'approved').length,
    declined:   applications.filter((a) => a.application_status === 'declined').length,
    waitlisted: applications.filter((a) => a.application_status === 'waitlisted').length,
  }), [applications])

  const filtered = applications.filter((a) => {
    if (a.application_status !== tab) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.attendee_name.toLowerCase().includes(q) || a.attendee_phone.includes(search)
  })

  const canDecide = tab === 'pending' || tab === 'waitlisted'

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((a) => a.id)),
    )
  }

  function applyDecisionLocally(ids: string[], decision: Decision) {
    setApplications((prev) =>
      prev.map((a) =>
        ids.includes(a.id)
          ? { ...a, application_status: decision, application_decided_at: new Date().toISOString() }
          : a,
      ),
    )
    setSelected(new Set())
  }

  async function handleDecide(rsvpId: string, decision: Decision) {
    setActionError(null)
    setRowPending(rsvpId)
    const result = await decideApplication(eventId, rsvpId, decision)
    if (result.success) {
      applyDecisionLocally([rsvpId], decision)
      startRefresh(() => router.refresh())
    } else {
      setActionError(result.error ?? 'Failed to update application.')
    }
    setRowPending(null)
  }

  async function handleBulkDecide(decision: Decision) {
    if (selected.size === 0) return
    setActionError(null)
    setBulkPending(decision)
    const ids = [...selected]
    const result = await bulkDecideApplications(eventId, ids, decision)
    if (result.success) {
      applyDecisionLocally(ids, decision)
      startRefresh(() => router.refresh())
    } else {
      setActionError(result.error ?? 'Failed to update applications.')
    }
    setBulkPending(null)
  }

  const decisionButtonStyle = (color: string): React.CSSProperties => ({
    background: 'transparent', border: `1px solid ${color}`, color,
    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 56, borderBottom: '1px solid var(--wimc-border-subtle)',
        background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push(`/dashboard/events/${eventId}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-secondary)', display: 'grid', placeItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Applications
            </div>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {eventTitle}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          fontFamily: 'var(--font-jetbrains-mono)',
          color: counts.pending > 0 ? '#F59E0B' : 'var(--wimc-text-muted)',
        }}>
          {counts.pending} pending
        </div>
      </header>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--wimc-border-subtle)',
        background: 'var(--wimc-bg-raised)', overflowX: 'auto',
      }}>
        {(['pending', 'approved', 'waitlisted', 'declined'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(new Set()) }}
            style={{
              flex: 1, minWidth: 100, padding: '12px 0', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: tab === t ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
              borderBottom: tab === t ? '2px solid var(--wimc-coral)' : '2px solid transparent',
            }}
          >
            {TAB_LABEL[t]} ({counts[t]})
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
        {applicationQuestion && (
          <div style={{
            fontSize: 13, color: 'var(--wimc-text-secondary)', background: 'var(--wimc-bg-elevated)',
            border: '1px solid var(--wimc-border-default)', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          }}>
            <span style={{ fontWeight: 700, color: 'var(--wimc-text-primary)' }}>Your question: </span>
            {applicationQuestion}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span className="material-symbols-outlined" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 18, color: 'var(--wimc-text-muted)', pointerEvents: 'none',
          }}>search</span>
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 38px',
              background: 'var(--wimc-bg-raised)',
              border: '1px solid var(--wimc-border-subtle)',
              borderRadius: 10, fontSize: 14, color: 'var(--wimc-text-primary)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {actionError && (
          <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            {actionError}
          </div>
        )}

        {/* Bulk action bar */}
        {canDecide && filtered.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, padding: '8px 4px',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--wimc-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
              />
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </label>
            {selected.size > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleBulkDecide('approved')}
                  disabled={bulkPending !== null}
                  style={{ ...decisionButtonStyle('#22C55E'), opacity: bulkPending ? 0.6 : 1 }}
                >
                  {bulkPending === 'approved' ? 'Approving…' : 'Approve'}
                </button>
                {tab === 'pending' && (
                  <button
                    onClick={() => handleBulkDecide('waitlisted')}
                    disabled={bulkPending !== null}
                    style={{ ...decisionButtonStyle('#3B82F6'), opacity: bulkPending ? 0.6 : 1 }}
                  >
                    {bulkPending === 'waitlisted' ? 'Waitlisting…' : 'Waitlist'}
                  </button>
                )}
                <button
                  onClick={() => handleBulkDecide('declined')}
                  disabled={bulkPending !== null}
                  style={{ ...decisionButtonStyle('#EF4444'), opacity: bulkPending ? 0.6 : 1 }}
                >
                  {bulkPending === 'declined' ? 'Declining…' : 'Decline'}
                </button>
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--wimc-text-muted)', fontSize: 14 }}>
            No {TAB_LABEL[tab].toLowerCase()} applications
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((a) => {
              const badge = a.application_status ? STATUS_BADGE[a.application_status] : null
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: 'var(--wimc-bg-raised)',
                    border: '1px solid var(--wimc-border-subtle)',
                    borderRadius: 10, padding: '12px 14px',
                  }}
                >
                  {canDecide && (
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelected(a.id)}
                      style={{ marginTop: 3 }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>{a.attendee_name}</span>
                      {a.isReturningGuest && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(77,210,177,0.15)', color: 'var(--wimc-teal)',
                        }}>
                          Returning guest
                        </span>
                      )}
                      {badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '1px 6px', borderRadius: 4,
                          background: badge.bg, color: badge.color,
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>
                      {a.attendee_phone || '—'} · Applied {formatDateTime(a.created_at)}
                      {a.application_decided_at && (
                        <span> · Decided {formatDateTime(a.application_decided_at)}</span>
                      )}
                    </div>
                    {a.application_answer && (
                      <div style={{
                        fontSize: 13, color: 'var(--wimc-text-secondary)', marginTop: 8,
                        background: 'var(--wimc-bg-base)', border: '1px solid var(--wimc-border-subtle)',
                        borderRadius: 8, padding: '8px 10px', lineHeight: 1.5,
                      }}>
                        {a.application_answer}
                      </div>
                    )}

                    {canDecide && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {a.application_status !== 'approved' && (
                          <button
                            onClick={() => handleDecide(a.id, 'approved')}
                            disabled={rowPending === a.id}
                            style={{ ...decisionButtonStyle('#22C55E'), opacity: rowPending === a.id ? 0.6 : 1 }}
                          >
                            Approve
                          </button>
                        )}
                        {a.application_status === 'pending' && (
                          <button
                            onClick={() => handleDecide(a.id, 'waitlisted')}
                            disabled={rowPending === a.id}
                            style={{ ...decisionButtonStyle('#3B82F6'), opacity: rowPending === a.id ? 0.6 : 1 }}
                          >
                            Waitlist
                          </button>
                        )}
                        <button
                          onClick={() => handleDecide(a.id, 'declined')}
                          disabled={rowPending === a.id}
                          style={{ ...decisionButtonStyle('#EF4444'), opacity: rowPending === a.id ? 0.6 : 1 }}
                        >
                          {rowPending === a.id ? '…' : 'Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
