'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminAddaPayoutRow } from '@/app/actions/admin'
import { updateAddaPayoutStatus } from '@/app/actions/admin'

const STATUS_TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid',     label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all',      label: 'All' },
]

const STATUS_COLORS: Record<string, string> = {
  pending:  'var(--wimc-amber)',
  approved: '#3b82f6',
  paid:     '#22c55e',
  rejected: 'var(--wimc-coral)',
}

interface Props {
  payouts: AdminAddaPayoutRow[]
  currentStatus: string
}

export default function AddaPayoutsAdminClient({ payouts, currentStatus }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [actionNote, setActionNote] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function setNote(id: string, val: string) {
    setActionNote((prev) => ({ ...prev, [id]: val }))
  }

  async function doAction(id: string, status: 'approved' | 'paid' | 'rejected') {
    setProcessing(id)
    setErrors((prev) => ({ ...prev, [id]: '' }))
    const result = await updateAddaPayoutStatus({ id, status, notes: actionNote[id] })
    if (!result.success) {
      setErrors((prev) => ({ ...prev, [id]: result.error ?? 'Failed' }))
    } else {
      startTransition(() => router.refresh())
    }
    setProcessing(null)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
          Venue Payout Requests
        </h1>
        <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
          Approve or reject Adda venue payout requests.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--wimc-border-subtle)', paddingBottom: 0 }}>
        {STATUS_TABS.map((tab) => {
          const active = currentStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => router.push(`/admin/adda-payouts?status=${tab.value}`)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                border: 'none', background: 'none', cursor: 'pointer',
                color: active ? '#5DD9D0' : 'var(--wimc-text-secondary)',
                borderBottom: active ? '2px solid #5DD9D0' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 150ms',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {payouts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            No {currentStatus !== 'all' ? currentStatus : ''} requests
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {payouts.map((p) => (
            <AddaPayoutCard
              key={p.id}
              payout={p}
              note={actionNote[p.id] ?? ''}
              onNoteChange={(v) => setNote(p.id, v)}
              onAction={(status) => doAction(p.id, status)}
              isProcessing={processing === p.id}
              error={errors[p.id]}
              statusColor={STATUS_COLORS[p.status] ?? 'var(--wimc-text-muted)'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AddaPayoutCard({
  payout, note, onNoteChange, onAction, isProcessing, error, statusColor,
}: {
  payout: AdminAddaPayoutRow
  note: string
  onNoteChange: (v: string) => void
  onAction: (status: 'approved' | 'paid' | 'rejected') => void
  isProcessing: boolean
  error: string | undefined
  statusColor: string
}) {
  const addaRs    = (payout.adda_share_paise   / 100).toFixed(0)
  const grossRs   = (payout.gross_paise         / 100).toFixed(0)
  const platRs    = (payout.platform_fee_paise  / 100).toFixed(0)
  const date = new Date(payout.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{
      background: 'var(--wimc-bg-raised)',
      border: '1px solid var(--wimc-border-subtle)',
      borderRadius: 10,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{payout.adda_name}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
              background: `${statusColor}22`, color: statusColor,
              textTransform: 'capitalize',
            }}>
              {payout.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
            Requested {date} · {payout.booking_ids.length} event{payout.booking_ids.length !== 1 ? 's' : ''}
            {' · '}{payout.payment_method.toUpperCase()}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#5DD9D0', fontFamily: 'var(--font-jetbrains-mono)' }}>
            ₹{addaRs}
          </div>
          <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)' }}>
            of ₹{grossRs} gross · platform ₹{platRs}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        padding: '10px 12px', background: 'var(--wimc-bg-base)',
        borderRadius: 7, fontSize: 12, marginBottom: 14,
      }}>
        {payout.upi_id && (
          <div>
            <span style={{ color: 'var(--wimc-text-muted)', marginRight: 4 }}>UPI</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600 }}>{payout.upi_id}</span>
          </div>
        )}
        {payout.bank_account_number && (
          <>
            <div>
              <span style={{ color: 'var(--wimc-text-muted)', marginRight: 4 }}>Name</span>
              <span style={{ fontWeight: 600 }}>{payout.bank_account_name}</span>
            </div>
            <div>
              <span style={{ color: 'var(--wimc-text-muted)', marginRight: 4 }}>Acc</span>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600 }}>
                ****{payout.bank_account_number.slice(-4)}
              </span>
            </div>
            {payout.bank_ifsc && (
              <div>
                <span style={{ color: 'var(--wimc-text-muted)', marginRight: 4 }}>IFSC</span>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600 }}>{payout.bank_ifsc}</span>
              </div>
            )}
          </>
        )}
      </div>

      {payout.rejection_reason && payout.status === 'rejected' && (
        <div style={{
          fontSize: 12, color: 'var(--wimc-text-secondary)',
          padding: '8px 12px', borderRadius: 6,
          background: 'var(--wimc-bg-overlay)',
          marginBottom: 12,
        }}>
          <strong>Rejection reason:</strong> {payout.rejection_reason}
        </div>
      )}

      {(payout.status === 'pending' || payout.status === 'approved') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={payout.status === 'pending' ? 'Admin note (optional)' : 'Rejection reason (optional)'}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            style={{
              flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 7, fontSize: 12,
              border: '1px solid var(--wimc-border-subtle)',
              background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)',
            }}
          />

          {payout.status === 'pending' && (
            <button
              onClick={() => onAction('approved')}
              disabled={isProcessing}
              style={{
                padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer',
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              Approve
            </button>
          )}

          {payout.status === 'approved' && (
            <button
              onClick={() => onAction('paid')}
              disabled={isProcessing}
              style={{
                padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer',
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              Mark Paid
            </button>
          )}

          <button
            onClick={() => onAction('rejected')}
            disabled={isProcessing}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
              background: 'transparent', color: '#5DD9D0',
              border: '1px solid #5DD9D0', cursor: 'pointer',
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            Reject
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--wimc-coral)', marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}
