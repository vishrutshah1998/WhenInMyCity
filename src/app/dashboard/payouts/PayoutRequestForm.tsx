'use client'

import { useState, useTransition } from 'react'
import { requestPayout } from '@/app/actions/payouts'
import type { PayableEvent } from '@/app/actions/payouts'

function paise(p: number) {
  return '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface Props {
  events: PayableEvent[]
}

export default function PayoutRequestForm({ events }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [bankName, setBankName]       = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankIfsc, setBankIfsc]       = useState('')
  const [upiId, setUpiId]             = useState('')
  const [payMethod, setPayMethod]     = useState<'bank' | 'upi'>('upi')
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedEvents = events.filter((e) => selected.has(e.id))
  const totalMaker  = selectedEvents.reduce((s, e) => s + e.maker_paise, 0)
  const totalGross  = selectedEvents.reduce((s, e) => s + e.gross_paise, 0)

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await requestPayout({
        event_ids:    Array.from(selected),
        bank_name:    payMethod === 'bank' ? bankName || undefined : undefined,
        bank_account: payMethod === 'bank' ? bankAccount || undefined : undefined,
        bank_ifsc:    payMethod === 'bank' ? bankIfsc || undefined : undefined,
        upi_id:       payMethod === 'upi' ? upiId || undefined : undefined,
      })
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error ?? 'Something went wrong')
      }
    })
  }

  if (success) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: 16, padding: 32, textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#22C55E', display: 'block', marginBottom: 12 }}>check_circle</span>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Payout request submitted
        </div>
        <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
          We'll review your request and transfer {paise(totalMaker)} within 2 business days.
        </div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--wimc-bg-base)', border: '1px solid var(--wimc-border-default)',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--wimc-text-primary)',
    outline: 'none', boxSizing: 'border-box',
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: active ? '1px solid rgba(232,112,90,0.6)' : '1px solid transparent',
    background: active ? 'var(--wimc-coral-dim)' : 'transparent',
    color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Event checkboxes */}
      {events.map((ev) => {
        const checked = selected.has(ev.id)
        return (
          <label
            key={ev.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
              background: 'var(--wimc-bg-elevated)', border: `1px solid ${checked ? 'rgba(232,112,90,0.5)' : 'var(--wimc-border-default)'}`,
              borderRadius: 14, cursor: 'pointer', transition: 'border-color 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(ev.id)}
              style={{ width: 18, height: 18, accentColor: 'var(--wimc-coral)', cursor: 'pointer', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
                {new Date(ev.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}{ev.rsvp_count} ticket{ev.rsvp_count !== 1 ? 's' : ''}
                {' · '}{paise(ev.gross_paise)} gross
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>{paise(ev.maker_paise)}</div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)' }}>your cut</div>
            </div>
          </label>
        )
      })}

      {/* Summary + CTA */}
      {selected.size > 0 && (
        <div style={{
          background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? 20 : 0 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 2 }}>
                {selected.size} event{selected.size !== 1 ? 's' : ''} · {paise(totalGross)} gross
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-syne)', color: '#22C55E' }}>
                {paise(totalMaker)} to you
              </div>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Request Payout
              </button>
            )}
          </div>

          {showForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Payment method tabs */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Payment method
                </div>
                <div style={{ display: 'flex', gap: 8, background: 'var(--wimc-bg-base)', borderRadius: 10, padding: 4 }}>
                  <button onClick={() => setPayMethod('upi')} style={tabBtn(payMethod === 'upi')}>UPI</button>
                  <button onClick={() => setPayMethod('bank')} style={tabBtn(payMethod === 'bank')}>Bank Transfer</button>
                </div>
              </div>

              {payMethod === 'upi' && (
                <div>
                  <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>UPI ID</label>
                  <input
                    type="text"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {payMethod === 'bank' && (
                <>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Account holder name</label>
                    <input type="text" placeholder="Full name" value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Account number</label>
                      <input type="text" placeholder="XXXXXXXXXX" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>IFSC code</label>
                      <input type="text" placeholder="SBIN0001234" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} style={inputStyle} />
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={isPending}
                  style={{
                    background: 'transparent', border: '1px solid var(--wimc-border-default)',
                    color: 'var(--wimc-text-secondary)', borderRadius: 10, padding: '10px 20px',
                    fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  style={{
                    background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700,
                    cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1,
                  }}
                >
                  {isPending ? 'Submitting…' : `Confirm — ${paise(totalMaker)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
