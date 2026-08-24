'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminCommunityRow } from '@/app/actions/communities'
import { adminReviewCommunity } from '@/app/actions/communities'

const STATUS_TABS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all',      label: 'All' },
]

const STATUS_COLORS: Record<string, string> = {
  pending:  'var(--wimc-amber)',
  approved: 'var(--wimc-success)',
  rejected: 'var(--wimc-coral)',
}

interface Props {
  communities: AdminCommunityRow[]
  currentStatus: string
}

export default function CommunitiesClient({ communities, currentStatus }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [reason, setReason] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function setReasonFor(id: string, val: string) {
    setReason((prev) => ({ ...prev, [id]: val }))
  }

  async function doAction(id: string, decision: 'approved' | 'rejected') {
    setProcessing(id)
    setErrors((prev) => ({ ...prev, [id]: '' }))
    const result = await adminReviewCommunity(id, decision, reason[id])
    if (result.error) {
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
          Community Requests
        </h1>
        <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
          Approve or reject creator requests to start a new Community.
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--wimc-border-subtle)', paddingBottom: 0 }}>
        {STATUS_TABS.map((tab) => {
          const active = currentStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => router.push(`/admin/communities?status=${tab.value}`)}
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

      {communities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No {currentStatus !== 'all' ? currentStatus : ''} requests</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {communities.map((c) => (
            <CommunityCard
              key={c.id}
              community={c}
              reason={reason[c.id] ?? ''}
              onReasonChange={(v) => setReasonFor(c.id, v)}
              onAction={(decision) => doAction(c.id, decision)}
              isProcessing={processing === c.id}
              error={errors[c.id]}
              statusColor={STATUS_COLORS[c.status] ?? 'var(--wimc-text-muted)'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommunityCard({
  community, reason, onReasonChange, onAction, isProcessing, error, statusColor,
}: {
  community: AdminCommunityRow
  reason: string
  onReasonChange: (v: string) => void
  onAction: (decision: 'approved' | 'rejected') => void
  isProcessing: boolean
  error: string | undefined
  statusColor: string
}) {
  const date = new Date(community.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{
      background: 'var(--wimc-bg-raised)',
      border: '1px solid var(--wimc-border-subtle)',
      borderRadius: 10,
      padding: '18px 20px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{community.name}</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)' }}>
              /{community.slug}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
              background: `${statusColor}22`, color: statusColor,
              textTransform: 'capitalize',
            }}>
              {community.status}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11.5, color: 'var(--wimc-text-secondary)' }}>
            Requested {date} by {community.creator_name}
            {community.creator_username && (
              <span style={{ color: 'var(--wimc-text-muted)' }}>
                {' '}@{community.creator_username}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        padding: '10px 12px',
        background: 'var(--wimc-bg-base)',
        borderRadius: 7,
        fontSize: 12,
        marginBottom: 14,
      }}>
        {community.city && (
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            <span style={{ color: 'var(--wimc-text-muted)', marginRight: 4 }}>City</span>
            <span style={{ fontWeight: 600 }}>{community.city}</span>
          </div>
        )}
        {community.category && (
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            <span style={{ color: 'var(--wimc-text-muted)', marginRight: 4 }}>Category</span>
            <span style={{ fontWeight: 600 }}>{community.category}</span>
          </div>
        )}
        {community.description && (
          <div style={{ width: '100%', color: 'var(--wimc-text-secondary)' }}>
            {community.description}
          </div>
        )}
      </div>

      {/* Admin rejection reason */}
      {community.admin_rejection_reason && community.status === 'rejected' && (
        <div style={{
          fontSize: 12, color: 'var(--wimc-text-secondary)',
          padding: '8px 12px', borderRadius: 6,
          background: 'var(--wimc-bg-overlay)',
          marginBottom: 12,
        }}>
          <strong>Reason:</strong> {community.admin_rejection_reason}
        </div>
      )}

      {/* Actions — only for pending */}
      {community.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Rejection reason (optional)"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            style={{
              flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 7, fontSize: 12,
              border: '1px solid var(--wimc-border-subtle)',
              background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)',
            }}
          />

          <button
            onClick={() => onAction('approved')}
            disabled={isProcessing}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
              background: 'var(--wimc-neel)', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            Approve
          </button>

          <button
            onClick={() => onAction('rejected')}
            disabled={isProcessing}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
              background: 'transparent', color: 'var(--wimc-coral)',
              border: '1px solid var(--wimc-coral)', cursor: 'pointer',
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
