'use client'

import { useState, useTransition } from 'react'
import type { AddaPayoutSummary, PayableBooking, PayoutRequest } from '@/app/actions/venue-payouts'
import { requestVenuePayout } from '@/app/actions/venue-payouts'

// ── Helpers ────────────────────────────────────────────────────────────────────

function paise2inr(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_COLORS: Record<string, string> = {
  pending:  '#F59E0B',
  approved: '#3B82F6',
  paid:     '#22C55E',
  rejected: '#EF4444',
}

// ── Theme tokens ───────────────────────────────────────────────────────────────

const A = {
  bg:      'var(--venue-bg-base)',
  surface: 'var(--venue-bg-surface)',
  border:  'var(--venue-border)',
  text:    'var(--venue-text-primary)',
  textSub: 'var(--venue-text-secondary)',
  accent:  'var(--venue-accent)',
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  addaId: string
  summary: AddaPayoutSummary
  initialPayableBookings: PayableBooking[]
  initialPayoutHistory: PayoutRequest[]
  serverError: string | null
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VenuePayoutsClient({
  addaId,
  summary,
  initialPayableBookings,
  initialPayoutHistory,
  serverError,
}: Props) {
  const [payableBookings] = useState<PayableBooking[]>(initialPayableBookings)
  const [payoutHistory]   = useState<PayoutRequest[]>(initialPayoutHistory)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [payMethod, setPayMethod] = useState<'bank' | 'upi'>('upi')
  const [upiId,     setUpiId]     = useState('')
  const [bankName,  setBankName]  = useState('')
  const [bankNum,   setBankNum]   = useState('')
  const [bankIfsc,  setBankIfsc]  = useState('')
  const [isPending, startTransition] = useTransition()
  const [error,     setError]     = useState<string | null>(serverError)
  const [submitted, setSubmitted] = useState(false)

  function toggleBooking(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(payableBookings.map(b => b.id)))
  }

  const selectedTotal = payableBookings
    .filter(b => selectedIds.has(b.id))
    .reduce((s, b) => s + b.adda_share_paise, 0)

  async function handleSubmit() {
    if (selectedIds.size === 0 || isPending) return
    setError(null)
    startTransition(async () => {
      const { success, error: err } = await requestVenuePayout(addaId, {
        bookingIds: Array.from(selectedIds),
        paymentMethod: payMethod,
        upiId: payMethod === 'upi' ? upiId : undefined,
        bankName: payMethod === 'bank' ? bankName : undefined,
        bankNumber: payMethod === 'bank' ? bankNum : undefined,
        bankIfsc: payMethod === 'bank' ? bankIfsc : undefined,
      })
      if (!success) { setError(err); return }
      setSubmitted(true)
    })
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    background: A.bg, color: A.text,
    border: `1px solid ${A.border}`, borderRadius: 8,
    padding: '8px 12px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '32px 32px', maxWidth: 800 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 24, color: A.text, margin: '0 0 6px' }}>
          Payouts
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: A.textSub, margin: 0 }}>
          Request payouts for completed bookings at your venue.
        </p>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Available', value: summary.availablePaise, color: '#22C55E' },
          { label: 'Pending',   value: summary.pendingPaise,   color: '#F59E0B' },
          { label: 'Total paid out', value: summary.totalPaidPaise, color: A.text },
        ].map(s => (
          <div key={s.label} style={{
            background: A.surface, border: `1px solid ${A.border}`,
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub, marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 22, color: s.color }}>
              {paise2inr(s.value)}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid #EF4444',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#EF4444',
        }}>
          {error}
        </div>
      )}

      {submitted ? (
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid #22C55E',
          borderRadius: 12, padding: '24px', textAlign: 'center', marginBottom: 24,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#22C55E', display: 'block', marginBottom: 8, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: A.text, marginBottom: 4 }}>
            Payout request submitted
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub }}>
            We&apos;ll process it within 3–5 business days.
          </div>
        </div>
      ) : (
        <>
          {/* ── Request payout card ─────────────────────────────────────── */}
          <div style={{
            background: A.surface, border: `1px solid ${A.border}`,
            borderRadius: 12, marginBottom: 24, overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${A.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: A.accent }}>payments</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: A.text }}>
                  Request Payout
                </span>
              </div>
              {payableBookings.length > 0 && (
                <button
                  onClick={selectAll}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.accent }}
                >
                  Select all
                </button>
              )}
            </div>

            <div style={{ padding: 20 }}>
              {payableBookings.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: A.textSub, margin: 0 }}>
                  No completed bookings available for payout yet.
                </p>
              ) : (
                <>
                  {/* Booking list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {payableBookings.map(b => (
                      <label key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: selectedIds.has(b.id) ? 'rgba(0,0,0,0.04)' : 'transparent',
                        border: `1px solid ${selectedIds.has(b.id) ? A.accent : A.border}`,
                        transition: 'border-color 0.15s',
                      }}>
                        <input
                          type="checkbox" checked={selectedIds.has(b.id)}
                          onChange={() => toggleBooking(b.id)}
                          style={{ accentColor: A.accent, width: 16, height: 16 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: A.text }}>
                            {b.event_name}
                          </div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: A.textSub }}>
                            {fmtDate(b.event_date)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: A.text }}>
                            {paise2inr(b.adda_share_paise)}
                          </div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: A.textSub }}>
                            your share
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Payment method */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: A.text, marginBottom: 10 }}>
                      Payment method
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      {(['upi', 'bank'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setPayMethod(m)}
                          style={{
                            padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13,
                            background: payMethod === m ? A.accent : 'transparent',
                            color: payMethod === m ? '#fff' : A.textSub,
                            border: `1px solid ${payMethod === m ? A.accent : A.border}`,
                          }}
                        >
                          {m === 'upi' ? 'UPI' : 'Bank Transfer'}
                        </button>
                      ))}
                    </div>

                    {payMethod === 'upi' ? (
                      <input
                        type="text" placeholder="yourname@upi"
                        value={upiId} onChange={e => setUpiId(e.target.value)}
                        style={inputStyle}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input type="text" placeholder="Account holder name" value={bankName} onChange={e => setBankName(e.target.value)} style={inputStyle} />
                        <input type="text" placeholder="Account number" value={bankNum} onChange={e => setBankNum(e.target.value)} style={inputStyle} />
                        <input type="text" placeholder="IFSC code" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} style={inputStyle} />
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: A.text }}>
                      {selectedIds.size > 0 ? paise2inr(selectedTotal) : '₹0'} selected
                    </span>
                    <button
                      onClick={handleSubmit}
                      disabled={selectedIds.size === 0 || isPending}
                      style={{
                        background: selectedIds.size === 0 ? 'rgba(0,0,0,0.1)' : A.accent,
                        color: '#fff',
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
                        padding: '10px 24px', border: 'none', borderRadius: 10,
                        cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.7 : 1,
                      }}
                    >
                      {isPending ? 'Submitting…' : 'Submit request'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Payout history ──────────────────────────────────────────────── */}
      <div style={{
        background: A.surface, border: `1px solid ${A.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: A.accent }}>history</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: A.text }}>Payout History</span>
        </div>
        {payoutHistory.length === 0 ? (
          <div style={{ padding: 20 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: A.textSub, margin: 0 }}>
              No payout requests yet.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                {['Date', 'Bookings', 'Amount', 'Method', 'Status', 'Processed'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12,
                    color: A.textSub, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payoutHistory.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${A.border}` }}>
                  <td style={{ padding: '12px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.text }}>{fmtDate(p.requested_at)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub }}>{p.booking_ids.length}</td>
                  <td style={{ padding: '12px 16px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: A.text }}>{paise2inr(p.adda_share_paise)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub, textTransform: 'uppercase' }}>{p.payment_method}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: `${STATUS_COLORS[p.status]}20`,
                      color: STATUS_COLORS[p.status],
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11,
                      padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize',
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: A.textSub }}>
                    {p.processed_at ? fmtDate(p.processed_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
