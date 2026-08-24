'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ProposalWithMaker } from '@/app/actions/venue-bookings'
import type { PricingConfig, PricingModel, ProposedSplitConfig } from '@/types/marketplace'
import type { Json } from '@/types/database'
import RequestListRow from './RequestListRow'
import BookingRequestCard from './BookingRequestCard'
import { VENUE_RADIUS } from '@/components/venue/ui/primitives'

// ---------------------------------------------------------------------------
// Creator category filter — buckets the full creator_type enum into a
// handful of chips, mirroring the pattern already proven in the brand
// persona's Browse Creators page (src/app/business/brand/creators/
// BrowseCreatorsClient.tsx). Kept as its own local copy rather than
// importing that file's constants, since they're brand-styled and this is
// the first venue-side use of the pattern.
// ---------------------------------------------------------------------------

const CATEGORY_FILTERS = [
  { id: 'all',       label: 'All',          icon: 'people' },
  { id: 'music',     label: 'Music',        icon: 'music_note' },
  { id: 'comedy',    label: 'Comedy',       icon: 'sentiment_very_satisfied' },
  { id: 'art',       label: 'Art & Design', icon: 'palette' },
  { id: 'education', label: 'Education',    icon: 'school' },
  { id: 'food',      label: 'Food',         icon: 'restaurant' },
  { id: 'lifestyle', label: 'Lifestyle',    icon: 'spa' },
  { id: 'video',     label: 'Video',        icon: 'videocam' },
  { id: 'dance',     label: 'Dance',        icon: 'nightlife' },
] as const

type CategoryId = typeof CATEGORY_FILTERS[number]['id']

const CREATOR_TYPE_TO_CATEGORY: Record<string, CategoryId> = {
  music:                  'music',
  music_performance:      'music',
  comedy_theatre:         'comedy',
  comedy_open_mic:        'comedy',
  art_design:             'art',
  crafts_making:          'art',
  literature_poetry:      'art',
  teaching_coaching:      'education',
  workshops_teaching:     'education',
  professional_portfolio: 'education',
  food_culinary:          'food',
  food_lifestyle:         'food',
  lifestyle_wellness:     'lifestyle',
  fitness_wellness:       'lifestyle',
  spirituality:           'lifestyle',
  travel_adventure:       'lifestyle',
  community_impact:       'lifestyle',
  video_content:          'video',
  content_creation:       'video',
  dance:                  'dance',
}

function CategoryChip({
  filter,
  active,
  onClick,
}: {
  filter: typeof CATEGORY_FILTERS[number]
  active: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        borderRadius: VENUE_RADIUS.full,
        background: active ? 'var(--venue-accent)' : hovered ? 'var(--venue-accent-tint)' : 'transparent',
        border: `1px solid ${active ? 'var(--venue-accent)' : 'var(--venue-border-default)'}`,
        color: active ? '#000' : 'var(--venue-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 140ms ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{filter.icon}</span>
      {filter.label}
    </button>
  )
}

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
  completed: { icon: 'task_alt',       title: 'No completed events',   body: 'Past events that took place at your Venue will appear here.' },
  declined:  { icon: 'cancel',         title: 'No declined requests',  body: 'Requests you declined or that expired will appear here.' },
}

function EmptyState({ tab, categoryLabel }: { tab: TabKey; categoryLabel?: string }) {
  const { icon, title, body } = categoryLabel
    ? { icon: 'filter_alt_off', title: `No ${categoryLabel.toLowerCase()} requests`, body: 'Try a different category, or select "All" to see every request in this tab.' }
    : EMPTY_COPY[tab]
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
        style={{ fontSize: 36, color: 'var(--venue-text-muted)', marginBottom: 16 }}
      >
        {icon}
      </span>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--venue-text-secondary)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12.5,
        color: 'var(--venue-text-muted)',
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
        style={{ fontSize: 40, color: 'var(--venue-text-muted)' }}
      >
        select_window
      </span>
      <div style={{
        fontSize: 13,
        color: 'var(--venue-text-muted)',
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
  venueId: string
  currentUserId: string
  pricingModel: PricingModel
  pricingConfig: PricingConfig | null
  initialProposals: ProposalWithMaker[]
  fetchError: string | null
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingsPageClient({ venueId, currentUserId, pricingModel, pricingConfig, initialProposals, fetchError }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [proposals, setProposals] = useState<ProposalWithMaker[]>(initialProposals)

  const tabList = useMemo(() => {
    const forTab = filterForTab(proposals, activeTab)
    if (activeCategory === 'all') return forTab
    return forTab.filter(p => CREATOR_TYPE_TO_CATEGORY[p.maker.creator_type] === activeCategory)
  }, [proposals, activeTab, activeCategory])

  const pendingCount = useMemo(
    () => proposals.filter(p => p.status === 'pending' || p.status === 'counter_offered').length,
    [proposals],
  )

  const selectedProposal = tabList.find(p => p.id === selectedId) ?? tabList[0] ?? null

  function handleSelect(id: string) {
    setSelectedId(id)
    setMobileDetailOpen(true)
  }

  function handleRespond(
    proposalId: string,
    action: 'accept' | 'decline' | 'counter_offer',
    counterOffer?: ProposedSplitConfig,
    note?: string,
  ) {
    setProposals(prev =>
      prev.map(p =>
        p.id === proposalId
          ? {
              ...p,
              status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'counter_offered',
              ...(action === 'counter_offer'
                ? { counter_offer: counterOffer as unknown as Json, venue_response_note: note ?? null }
                : {}),
            }
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
          borderRight: '1px solid var(--venue-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--venue-bg-surface)',
          overflow: 'hidden',
        }}>

          {/* Back to Business */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--venue-border-subtle)',
            flexShrink: 0,
          }}>
            <Link
              href="/business/venue/dashboard?panel=business"
              aria-label="Back to Business"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, color: 'var(--venue-text-primary)', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            </Link>
            <span style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--venue-text-primary)' }}>
              Bookings
            </span>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--venue-border-subtle)',
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
                      ? '2px solid var(--venue-accent)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--venue-text-primary)' : 'var(--venue-text-muted)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    transition: 'color 140ms ease, border-color 140ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span style={{
                      background: 'var(--venue-accent)',
                      color: '#000',
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: VENUE_RADIUS.full,
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

          {/* Creator-category filter */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '10px 12px',
            borderBottom: '1px solid var(--venue-border-subtle)',
            overflowX: 'auto',
            flexShrink: 0,
          }}>
            {CATEGORY_FILTERS.map(filter => (
              <CategoryChip
                key={filter.id}
                filter={filter}
                active={activeCategory === filter.id}
                onClick={() => setActiveCategory(filter.id)}
              />
            ))}
          </div>

          {/* Error state */}
          {fetchError && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.08)',
              borderBottom: '1px solid rgba(239,68,68,0.2)',
              fontSize: 12,
              color: 'var(--venue-danger)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {fetchError}
            </div>
          )}

          {/* Request list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tabList.length === 0 ? (
              <EmptyState
                tab={activeTab}
                categoryLabel={activeCategory !== 'all' ? CATEGORY_FILTERS.find(f => f.id === activeCategory)?.label : undefined}
              />
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
          background: 'var(--venue-bg-base)',
        }}>
          {selectedProposal ? (
            <BookingRequestCard
              proposal={selectedProposal}
              venueId={venueId}
              currentUserId={currentUserId}
              pricingModel={pricingModel}
              pricingConfig={pricingConfig}
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
            background: 'var(--venue-bg-base)',
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
            borderBottom: '1px solid var(--venue-border-subtle)',
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
                color: 'var(--venue-accent)',
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
            venueId={venueId}
            currentUserId={currentUserId}
            pricingModel={pricingModel}
            pricingConfig={pricingConfig}
            onRespond={(id, action, counterOffer, note) => {
              handleRespond(id, action, counterOffer, note)
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
