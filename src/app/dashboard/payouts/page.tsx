import { getPayableEvents, getPayoutHistory } from '@/app/actions/payouts'
import PayoutRequestForm from './PayoutRequestForm'
import type { PayoutStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paise(p: number) {
  return '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const map: Record<PayoutStatus, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Pending',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    approved: { label: 'Approved', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    paid:     { label: 'Paid',     color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
    rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
  }
  const { label, color, bg } = map[status]
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, color, background: bg,
    }}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PayoutsPage() {
  const [{ data: payable }, { data: history }] = await Promise.all([
    getPayableEvents(),
    getPayoutHistory(),
  ])

  const payableEvents = payable ?? []
  const payoutHistory = history ?? []

  const pendingCount  = payoutHistory.filter((r) => r.status === 'pending').length
  const totalPaid     = payoutHistory.filter((r) => r.status === 'paid').reduce((s, r) => s + r.maker_paise, 0)
  const availablePaise = payableEvents.reduce((s, e) => s + e.maker_paise, 0)

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  const card: React.CSSProperties = {
    background: 'var(--wimc-bg-elevated)',
    border: '1px solid var(--wimc-border-default)',
    borderRadius: 18,
    padding: 24,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Payouts</div>
        {pendingCount > 0 && (
          <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Available to Withdraw', value: paise(availablePaise), sub: `from ${payableEvents.length} event${payableEvents.length !== 1 ? 's' : ''}` },
            { label: 'Total Paid Out',         value: paise(totalPaid),      sub: `${payoutHistory.filter(r => r.status === 'paid').length} payout${payoutHistory.filter(r => r.status === 'paid').length !== 1 ? 's' : ''}` },
            { label: 'Pending Requests',       value: String(pendingCount),  sub: pendingCount > 0 ? 'under review' : 'none' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-syne)' }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Payable events */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#22C55E' }}>payments</span>
            Request a Payout
          </div>

          {payableEvents.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--wimc-coral-dim)', border: '1px solid rgba(232,112,90,0.3)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--wimc-coral)' }}>
                  account_balance_wallet
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                No events ready for payout
              </div>
              <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
                Events become payable once they have passed and have at least one confirmed ticket.
                Past events already included in a payout request are excluded.
              </div>
            </div>
          ) : (
            <PayoutRequestForm events={payableEvents} />
          )}
        </div>

        {/* Payout history */}
        {payoutHistory.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Payout History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {payoutHistory.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px 90px',
                    gap: 16,
                    alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: i < payoutHistory.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                      {r.event_ids.length} event{r.event_ids.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
                      {r.upi_id ? `UPI · ${r.upi_id}` : r.bank_account ? `Bank · ****${r.bank_account.slice(-4)}` : '—'}
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>{r.notes}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <div style={{ fontWeight: 700 }}>{paise(r.maker_paise)}</div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>{paise(r.gross_paise)} gross</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
                    {new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fee breakdown note */}
        <div style={{
          fontSize: 13, color: 'var(--wimc-text-secondary)',
          background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-subtle)',
          borderRadius: 12, padding: '14px 18px', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--wimc-text-primary)' }}>Platform fee: </strong>
          Your payout amount is your share of ticket revenue after the platform fee (15% for Mohalla, 10% for Nukkad, 8% for Chowk, 5% for Maidan).
          Razorpay processing fees (2%) are deducted from the platform's share, not yours.
        </div>

      </div>
    </>
  )
}
