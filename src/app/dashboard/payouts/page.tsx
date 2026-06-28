import { getPayableEvents, getPayoutHistory } from '@/app/actions/payouts'
import { requireProfile } from '@/lib/auth/requireAuth'
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
  const [{ profile }, [{ data: payable }, { data: history }]] = await Promise.all([
    requireProfile(),
    Promise.all([getPayableEvents(), getPayoutHistory()]),
  ])

  const payableEvents = payable ?? []
  const payoutHistory = history ?? []

  const pendingCount  = payoutHistory.filter((r) => r.status === 'pending').length
  const totalPaid     = payoutHistory.filter((r) => r.status === 'paid').reduce((s, r) => s + r.maker_paise, 0)
  const availablePaise = payableEvents.reduce((s, e) => s + e.maker_paise, 0)

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  const card: React.CSSProperties = {
    background: 'var(--wimc-bg-elevated)',
    border: '1px solid rgba(26,39,68,0.14)',
    borderRadius: 0,
    padding: 24,
  }

  return (
    <>
      <header style={topbar}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 2 }}>
            Creator Studio
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Payouts</div>
        </div>
        {pendingCount > 0 && (
          <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Available to Withdraw', value: paise(availablePaise), sub: `from ${payableEvents.length} event${payableEvents.length !== 1 ? 's' : ''}`, color: 'var(--wimc-coral)' },
            { label: 'Total Paid Out',         value: paise(totalPaid),      sub: `${payoutHistory.filter(r => r.status === 'paid').length} payout${payoutHistory.filter(r => r.status === 'paid').length !== 1 ? 's' : ''}`, color: 'var(--wimc-teal)' },
            { label: 'Pending Requests',       value: String(pendingCount),  sub: pendingCount > 0 ? 'under review' : 'none', color: 'var(--wimc-amber)' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ ...card, borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Beacon annual subscription CTA */}
        {profile.user_tier === 'beacon' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(77,210,177,0.08) 100%)',
            border: '1px solid rgba(168,85,247,0.35)',
            borderRadius: 0, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)',
              display: 'grid', placeItems: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#a855f7' }}>workspace_premium</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22, color: 'var(--wimc-text-primary)', marginBottom: 4 }}>
                Switch subscribers to annual
              </div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.5 }}>
                Save your subscribers 15% and unlock 10% more revenue on every annual renewal — Beacon exclusive.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: 0, padding: '8px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#a855f7' }}>−15%</div>
                <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>for subscribers</div>
              </div>
              <div style={{
                background: 'rgba(77,210,177,0.12)', border: '1px solid rgba(77,210,177,0.3)',
                borderRadius: 0, padding: '8px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wimc-teal)' }}>+10%</div>
                <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>for you</div>
              </div>
            </div>
          </div>
        )}

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
          borderRadius: 0, padding: '14px 18px', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--wimc-text-primary)' }}>Platform fee: </strong>
          Your payout amount is your share of ticket revenue after the platform fee (10% for Wanderer/Local, 8% for Lantern, 5% for Beacon).
          Razorpay processing fees (2%) are deducted from the platform's share, not yours.
        </div>

      </div>
    </>
  )
}
