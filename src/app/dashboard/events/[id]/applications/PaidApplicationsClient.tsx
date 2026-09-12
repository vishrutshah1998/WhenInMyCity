'use client'

// =============================================================================
// Paid-gated applications review queue (Phase B, migration 080).
//
// Deliberately a separate component from ApplicationsClient.tsx (Phase A,
// free/casual events) rather than one component branching internally — the
// two row shapes diverge enough (payment_deadline, ticket_tier_id, an
// approved-but-unpaid state Phase A never has) that forcing them through
// shared row-rendering logic would mean threading optional/undefined fields
// through Phase A's code path for no benefit. Layout, styling, the
// tab-switcher shape, and the bulk-action-bar selection pattern are still
// reused/mirrored.
//
// Bulk-approve (bulkDecidePaidApplications, event-applications.ts) differs
// from Phase A's bulk-approve in one deliberate way: it takes one
// creator-picked absolute deadline applied identically to every row in the
// batch (no per-applicant stagger) — surfaced here as an inline panel that
// expands under the bulk-action bar rather than firing immediately like
// decline/waitlist do.
// =============================================================================

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PaidApplicationRow } from '@/app/actions/event-applications'
import { decidePaidApplication, bulkDecidePaidApplications } from '@/app/actions/event-applications'
import type { EventApplicationStatus } from '@/types/database'
import type { TicketTier } from '@/types/events'

interface Props {
  eventId:             string
  eventTitle:          string
  applicationQuestion: string | null
  ticketTiers:         TicketTier[] | null
  applications:        PaidApplicationRow[]
}

type Decision = 'approved' | 'declined' | 'waitlisted'
type Tab = 'pending' | 'approved' | 'waitlisted' | 'declined' | 'expired'

const TAB_LABEL: Record<Tab, string> = {
  pending:    'Pending',
  approved:   'Approved',
  waitlisted: 'Waitlisted',
  declined:   'Declined',
  expired:    'Expired',
}

const STATUS_BADGE: Record<EventApplicationStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  approved:   { label: 'Approved',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  waitlisted: { label: 'Waitlisted', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  declined:   { label: 'Declined',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  expired:    { label: 'Expired',    color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
}

const URGENT_WINDOW_MS = 2 * 60 * 60 * 1000   // 2 hours

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

/**
 * Deadline urgency, computed at render time against the current clock — not
 * live-ticking. A tab left open for hours could show a stale "on track"
 * state a little past the point it should flip to "urgent"; router.refresh()
 * after any action, plus a normal page reload, both recompute it fresh.
 */
function deadlineUrgency(paymentDeadline: string): 'normal' | 'urgent' | 'elapsed' {
  const msLeft = new Date(paymentDeadline).getTime() - Date.now()
  if (msLeft <= 0) return 'elapsed'
  if (msLeft <= URGENT_WINDOW_MS) return 'urgent'
  return 'normal'
}

export default function PaidApplicationsClient({ eventId, eventTitle, applicationQuestion, ticketTiers, applications: initial }: Props) {
  const router = useRouter()
  const [, startRefresh] = useTransition()

  const [applications, setApplications] = useState(initial)
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [rowPending, setRowPending] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkPending, setBulkPending] = useState<Decision | null>(null)
  const [showApprovePanel, setShowApprovePanel] = useState(false)
  const [approveDeadline, setApproveDeadline] = useState('')
  const [approveError, setApproveError] = useState<string | null>(null)

  const tierNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of ticketTiers ?? []) map.set(t.id, t.name)
    return map
  }, [ticketTiers])

  const counts = useMemo(() => ({
    pending:    applications.filter((a) => a.status === 'pending').length,
    approved:   applications.filter((a) => a.status === 'approved').length,
    waitlisted: applications.filter((a) => a.status === 'waitlisted').length,
    declined:   applications.filter((a) => a.status === 'declined').length,
    expired:    applications.filter((a) => a.status === 'expired').length,
  }), [applications])

  // Within the Approved tab specifically, split by whether payment has
  // actually landed (rsvp_id set) — Phase A never needs this distinction
  // because a free casual RSVP row IS the confirmed attendee; here
  // "approved" only means "may now pay," not "is coming."
  const approvedSplit = useMemo(() => {
    const approved = applications.filter((a) => a.status === 'approved')
    return {
      awaitingPayment: approved.filter((a) => !a.rsvp_id).length,
      booked:          approved.filter((a) => !!a.rsvp_id).length,
    }
  }, [applications])

  const filtered = applications.filter((a) => {
    if (a.status !== tab) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.applicant_name.toLowerCase().includes(q) || a.applicant_phone.includes(search)
  })

  const canDecide = tab === 'pending' || tab === 'waitlisted'

  function applyDecisionLocally(ids: string[], decision: Decision) {
    setApplications((prev) =>
      prev.map((a) =>
        ids.includes(a.id)
          // payment_deadline for an 'approved' transition (single or bulk)
          // is authoritative server-side — left stale here (router.refresh()
          // below replaces it with the real value within moments).
          ? { ...a, status: decision, decided_at: new Date().toISOString() }
          : a,
      ),
    )
  }

  function switchTab(t: Tab) {
    setTab(t)
    setSelected(new Set())
    setShowApprovePanel(false)
    setApproveError(null)
  }

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

  async function handleDecide(applicationId: string, decision: Decision) {
    setActionError(null)
    setRowPending(applicationId)
    const result = await decidePaidApplication(eventId, applicationId, decision)
    if (result.success) {
      applyDecisionLocally([applicationId], decision)
      startRefresh(() => router.refresh())
    } else {
      setActionError(result.error ?? 'Failed to update application.')
    }
    setRowPending(null)
  }

  // Decline/waitlist fire immediately, same as Phase A's bulk bar. Approve
  // is handled separately by handleApproveConfirm — it needs a deadline
  // first, so the Approve button only opens the inline panel below.
  async function handleBulkDecide(decision: 'declined' | 'waitlisted') {
    if (selected.size === 0) return
    setActionError(null)
    setBulkPending(decision)
    const ids = [...selected]
    const result = await bulkDecidePaidApplications(eventId, ids, decision)
    if (result.success) {
      applyDecisionLocally(ids, decision)
      setSelected(new Set())
      startRefresh(() => router.refresh())
    } else {
      setActionError(result.error ?? 'Failed to update applications.')
    }
    setBulkPending(null)
  }

  async function handleApproveConfirm() {
    if (selected.size === 0 || !approveDeadline) return
    setApproveError(null)
    setBulkPending('approved')
    const ids = [...selected]
    const isoDeadline = new Date(approveDeadline).toISOString()
    const result = await bulkDecidePaidApplications(eventId, ids, 'approved', isoDeadline)
    if (result.success) {
      applyDecisionLocally(ids, 'approved')
      setSelected(new Set())
      setShowApprovePanel(false)
      setApproveDeadline('')
      startRefresh(() => router.refresh())
    } else {
      setApproveError(result.error ?? 'Failed to approve applications.')
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
        {(['pending', 'approved', 'waitlisted', 'declined', 'expired'] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              flex: 1, minWidth: 90, padding: '12px 0', border: 'none', background: 'none',
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

        {tab === 'approved' && counts.approved > 0 && (
          <div style={{
            fontSize: 12.5, color: 'var(--wimc-text-secondary)', marginBottom: 14,
            display: 'flex', gap: 14, fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            <span style={{ color: approvedSplit.awaitingPayment > 0 ? '#F59E0B' : 'var(--wimc-text-muted)' }}>
              {approvedSplit.awaitingPayment} awaiting payment
            </span>
            <span style={{ color: 'var(--wimc-teal)' }}>{approvedSplit.booked} booked</span>
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

        {/* Bulk action bar — mirrors ApplicationsClient.tsx's (Phase A) bar.
            Decline/Waitlist fire immediately; Approve expands the inline
            deadline panel below instead of firing on click. */}
        {canDecide && filtered.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 4px',
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
                    onClick={() => setShowApprovePanel((v) => !v)}
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

            {selected.size > 0 && showApprovePanel && (
              <div style={{
                background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
                borderRadius: 10, padding: '12px 14px', marginTop: 4,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--wimc-text-primary)' }}>
                  Every selected applicant gets the same payment deadline — no per-applicant staggering.
                </div>
                <input
                  type="datetime-local"
                  value={approveDeadline}
                  onChange={(e) => setApproveDeadline(e.target.value)}
                  style={{
                    padding: '8px 10px', background: 'var(--wimc-bg-raised)',
                    border: '1px solid var(--wimc-border-subtle)', borderRadius: 8,
                    fontSize: 13, color: 'var(--wimc-text-primary)', outline: 'none',
                  }}
                />
                {approveDeadline && (
                  <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {selected.size} applicant{selected.size === 1 ? '' : 's'}, all due by {formatDateTime(new Date(approveDeadline).toISOString())}
                  </div>
                )}
                {approveError && (
                  <div style={{ fontSize: 12.5, color: '#EF4444' }}>{approveError}</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleApproveConfirm}
                    disabled={bulkPending !== null || !approveDeadline}
                    style={{
                      background: '#22C55E', border: 'none', color: '#fff',
                      borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', opacity: bulkPending || !approveDeadline ? 0.6 : 1,
                    }}
                  >
                    {bulkPending === 'approved' ? 'Approving…' : 'Confirm approve'}
                  </button>
                  <button
                    onClick={() => { setShowApprovePanel(false); setApproveError(null) }}
                    disabled={bulkPending !== null}
                    style={{
                      background: 'transparent', border: '1px solid var(--wimc-border-subtle)',
                      color: 'var(--wimc-text-secondary)', borderRadius: 8, padding: '7px 14px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
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
              const badge = STATUS_BADGE[a.status]
              const tierName = a.ticket_tier_id ? (tierNameById.get(a.ticket_tier_id) ?? a.ticket_tier_id) : null
              const awaitingPayment = a.status === 'approved' && !a.rsvp_id
              const urgency = a.payment_deadline ? deadlineUrgency(a.payment_deadline) : null
              const urgencyColor = urgency === 'elapsed' ? '#EF4444' : urgency === 'urgent' ? '#F59E0B' : 'var(--wimc-text-secondary)'

              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: 'var(--wimc-bg-raised)',
                    border: urgency === 'urgent' || urgency === 'elapsed'
                      ? `1px solid ${urgencyColor}` : '1px solid var(--wimc-border-subtle)',
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>{a.applicant_name}</span>
                      {a.isReturningGuest && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(77,210,177,0.15)', color: 'var(--wimc-teal)',
                        }}>
                          Returning guest
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '1px 6px', borderRadius: 4,
                        background: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                      {/* Approved-but-unpaid vs. actually booked — Phase A's
                          single 'approved' state never needs this split
                          because there's no payment step after approval. */}
                      {a.status === 'approved' && (
                        awaitingPayment ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            padding: '1px 6px', borderRadius: 4,
                            background: urgency === 'urgent' || urgency === 'elapsed' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                            color: urgency === 'urgent' || urgency === 'elapsed' ? '#EF4444' : '#F59E0B',
                          }}>
                            Awaiting payment
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            padding: '1px 6px', borderRadius: 4,
                            background: 'rgba(77,210,177,0.15)', color: 'var(--wimc-teal)',
                          }}>
                            Booked
                          </span>
                        )
                      )}
                      {tierName && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
                          padding: '1px 6px', borderRadius: 4,
                          background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-secondary)',
                        }}>
                          {tierName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>
                      {a.applicant_phone || '—'} · Applied {formatDateTime(a.created_at)}
                      {a.decided_at && (
                        <span> · Decided {formatDateTime(a.decided_at)}</span>
                      )}
                    </div>

                    {/* Payment deadline — shown for an approved-and-unpaid row,
                        and for an already-'expired' row using expired_at
                        (when the sweep actually ran), not payment_deadline
                        (what it was checking against) — those two can differ
                        by however long the sweep took to notice. Urgency
                        ramps once within 2h of the deadline. */}
                    {a.status === 'expired' && (
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: '#EF4444' }}>
                        {a.expired_at
                          ? `Window closed ${formatDateTime(a.expired_at)}`
                          : a.payment_deadline
                            ? `Window closed ${formatDateTime(a.payment_deadline)}`
                            : 'Window closed'}
                      </div>
                    )}
                    {awaitingPayment && a.payment_deadline && (
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: urgencyColor }}>
                        {urgency === 'elapsed'
                          ? `Payment window elapsed ${formatDateTime(a.payment_deadline)} — awaiting expiry sweep`
                          : `Pay by ${formatDateTime(a.payment_deadline)}${urgency === 'urgent' ? ' — closing soon' : ''}`}
                      </div>
                    )}

                    {a.answer && (
                      <div style={{
                        fontSize: 13, color: 'var(--wimc-text-secondary)', marginTop: 8,
                        background: 'var(--wimc-bg-base)', border: '1px solid var(--wimc-border-subtle)',
                        borderRadius: 8, padding: '8px 10px', lineHeight: 1.5,
                      }}>
                        {a.answer}
                      </div>
                    )}

                    {canDecide && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {a.status !== 'approved' && (
                          <button
                            onClick={() => handleDecide(a.id, 'approved')}
                            disabled={rowPending === a.id}
                            style={{ ...decisionButtonStyle('#22C55E'), opacity: rowPending === a.id ? 0.6 : 1 }}
                          >
                            Approve
                          </button>
                        )}
                        {a.status === 'pending' && (
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
