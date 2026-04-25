'use client'

import { useState, useMemo } from 'react'
import type { ProposalWithMaker } from '@/app/actions/adda-bookings'
import RequestListRow from './RequestListRow'
import BookingRequestCard from './BookingRequestCard'

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

type TabKey = 'pending' | 'confirmed' | 'completed' | 'declined'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'declined',  label: 'Declined'  },
]

function filterForTab(proposals: ProposalWithMaker[], tab: TabKey): ProposalWithMaker[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (tab) {
    case 'pending':
      return proposals.filter(p => p.status === 'pending' || p.status === 'counter_offered')
    case 'confirmed':
      return proposals.filter(p => p.status === 'accepted' && new Date(p.proposed_date) >= today)
    case 'completed':
      return proposals.filter(p => p.status === 'accepted' && new Date(p.proposed_date) < today)
    case 'declined':
      return proposals.filter(p =>
        p.status === 'declined' || p.status === 'expired' || p.status === 'withdrawn'
      )
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EMPTY_COPY: Record<TabKey, { icon: string; title: string; body: string }> = {
  pending:   { icon: 'inbox',         title: 'No pending requests',   body: 'New booking requests from creators will appear here. Respond within 48h to keep your acceptance rate high.' },
  confirmed: { icon: 'event_available',title: 'No confirmed bookings', body: 'Accepted bookings with upcoming dates will appear here.' },
  completed: { icon: 'task_alt',       title: 'No completed events',   body: 'Past events that took place at your venue will appear here.' },
  declined:  { icon: 'cancel',         title: 'No declined requests',  body: 'Requests you declined or that expired will appear here.' },
}

function EmptyState({ tab }: { tab: TabKey }) {
  const { icon, title, body } = EMPTY_COPY[tab]
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '48px 32px',
      textAlign: 'center',
    }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 36, color: 'var(--adda-text-muted)', marginBottom: 16 }}
      >
        {icon}
      </span>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--adda-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12.5,
        color: 'var(--adda-text-muted)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        lineHeight: 1.6,
        maxWidth: 260,
      }}>
        {body}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail empty state (no selection)
// ---------------------------------------------------------------------------

function DetailPlaceholder() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 12,
    }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 40, color: 'var(--adda-text-muted)' }}
      >
        select_window
      </span>
      <div style={{
        fontSize: 13,
        color: 'var(--adda-text-muted)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}>
        Select a request to view details
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  addaId: string
  initialProposals: ProposalWithMaker[]
  fetchError: string | null
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingsPageClient({ addaId, initialProposals, fetchError }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [proposals, setProposals] = useState<ProposalWithMaker[]>(initialProposals)

  const tabList = useMemo(() => filterForTab(proposals, activeTab), [proposals, activeTab])

  const pendingCount = useMemo(
    () => proposals.filter(p => p.status === 'pending' || p.status === 'counter_offered').length,
    [proposals],
  )

  const selectedProposal = tabList.find(p => p.id === selectedId) ?? tabList[0] ?? null

  function handleSelect(id: string) {
    setSelectedId(id)
    setMobileDetailOpen(true)
  }

  function handleRespond(proposalId: string, action: 'accept' | 'decline') {
    setProposals(prev =>
      prev.map(p =>
        p.id === proposalId
          ? { ...p, status: action === 'accept' ? 'accepted' : 'declined' }
          : p,
      ),
    )
    // After responding to a pending proposal, select next pending or clear
    const remainingPending = proposals.filter(
      p => (p.status === 'pending' || p.status === 'counter_offered') && p.id !== proposalId
    )
    setSelectedId(remainingPending[0]?.id ?? null)
  }

  return (
    <>
      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}>

        {/* ── Left pane ───────────────────────────────────────────────────── */}
        <div style={{
          width: 400,
          flexShrink: 0,
          borderRight: '1px solid var(--adda-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--adda-bg-surface)',
          overflow: 'hidden',
        }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--adda-border-subtle)',
            padding: '0 4px',
            flexShrink: 0,
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key
              const count = tab.key === 'pending' ? pendingCount : null
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setSelectedId(null)
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '12px 4px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive
                      ? '2px solid var(--adda-amber)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--adda-text-primary)' : 'var(--adda-text-muted)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    transition: 'color 140ms ease, border-color 140ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span style={{
                      background: 'var(--adda-amber)',
                      color: '#000',
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 9999,
                      lineHeight: '14px',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Error state */}
          {fetchError && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.08)',
              borderBottom: '1px solid rgba(239,68,68,0.2)',
              fontSize: 12,
              color: 'var(--adda-danger)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {fetchError}
            </div>
          )}

          {/* Request list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tabList.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              tabList.map(proposal => (
                <RequestListRow
                  key={proposal.id}
                  proposal={proposal}
                  isSelected={proposal.id === (selectedProposal?.id)}
                  tab={activeTab}
                  onClick={() => handleSelect(proposal.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right pane ──────────────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--adda-bg-base)',
        }}>
          {selectedProposal ? (
            <BookingRequestCard
              proposal={selectedProposal}
              addaId={addaId}
              onRespond={handleRespond}
            />
          ) : (
            <DetailPlaceholder />
          )}
        </div>
      </div>

      {/* ── Mobile slide-over ───────────────────────────────────────────────── */}
      {mobileDetailOpen && selectedProposal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--adda-bg-base)',
            zIndex: 100,
            overflowY: 'auto',
            display: 'none', // shown via media query via inline style trick below
          }}
          className="mobile-detail-overlay"
        >
          <div style={{
            position: 'sticky',
            top: 0,
            height: 48,
            background: 'rgba(10,10,10,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--adda-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            zIndex: 10,
          }}>
            <button
              onClick={() => setMobileDetailOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--adda-amber)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                padding: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Back
            </button>
          </div>

          <BookingRequestCard
            proposal={selectedProposal}
            addaId={addaId}
            onRespond={(id, action) => {
              handleRespond(id, action)
              setMobileDetailOpen(false)
            }}
          />
        </div>
      )}

      {/* Mobile-specific styles */}
      <style>{`
        @media (max-width: 767px) {
          .mobile-detail-overlay { display: block !important; }
        }
      `}</style>
    </>
  )
}
