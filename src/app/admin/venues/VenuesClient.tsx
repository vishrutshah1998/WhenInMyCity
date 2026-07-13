'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminVenueRow } from '@/app/actions/admin'
import { toggleVenueActive, toggleVenueVerified } from '@/app/actions/admin'
import { CITIES } from '@/lib/constants/interests'

const PRICING_LABELS: Record<string, string> = {
  fixed_rental:    'Fixed Rental',
  door_split:      'Door Split',
  hybrid:          'Hybrid',
  f_and_b_minimum: 'F&B Minimum',
}

interface Props {
  venues: AdminVenueRow[]
}

export default function VenuesClient({ venues: initial }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [venues, setVenues] = useState(initial)
  const [toggling, setToggling] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const activeCount = venues.filter((a) => a.is_active).length

  async function handleToggleActive(id: string, current: boolean) {
    setToggling(id + '-active')
    const result = await toggleVenueActive({ id, is_active: !current })
    if (result.success) {
      setVenues((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a))
      startTransition(() => router.refresh())
    } else {
      setErrors((prev) => ({ ...prev, [id]: result.error ?? 'Failed' }))
    }
    setToggling(null)
  }

  async function handleToggleVerified(id: string, current: boolean) {
    setToggling(id + '-verified')
    const result = await toggleVenueVerified({ id, is_verified: !current })
    if (result.success) {
      setVenues((prev) => prev.map((a) => a.id === id ? { ...a, is_verified: !current } : a))
      startTransition(() => router.refresh())
    } else {
      setErrors((prev) => ({ ...prev, [id]: result.error ?? 'Failed' }))
    }
    setToggling(null)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
          Venues
        </h1>
        <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
          {venues.length} Venue{venues.length !== 1 ? 's' : ''} · {activeCount} active
        </p>
      </div>

      {venues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No venues yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {venues.map((venue) => {
            const cityName = CITIES.find((c) => c.id === venue.city)?.name ?? venue.city
            const revenueRs = (venue.total_revenue_earned_paise / 100).toLocaleString('en-IN')
            const createdDate = new Date(venue.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })

            return (
              <div
                key={venue.id}
                style={{
                  background: 'var(--wimc-bg-raised)',
                  border: '1px solid var(--wimc-border-subtle)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  opacity: venue.is_active ? 1 : 0.65,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{venue.name}</span>
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)' }}>
                        @{venue.slug}
                      </span>
                      {venue.is_verified && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 9999,
                          background: 'rgba(59,107,204,0.12)', color: 'var(--wimc-neel)',
                        }}>
                          ✓ Verified
                        </span>
                      )}
                      {!venue.is_active && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 9999,
                          background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-muted)',
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 8 }}>
                      {cityName} · {venue.address}
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                      <span style={{ color: 'var(--wimc-text-muted)' }}>
                        {PRICING_LABELS[venue.pricing_model] ?? venue.pricing_model}
                      </span>
                      <span style={{ color: 'var(--wimc-text-muted)' }}>
                        {venue.total_events_hosted} events hosted
                      </span>
                      <span style={{ color: 'var(--wimc-text-muted)' }}>
                        {venue.proposal_count} proposals
                      </span>
                      {venue.total_revenue_earned_paise > 0 && (
                        <span style={{ color: 'var(--wimc-coral)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                          ₹{revenueRs} earned
                        </span>
                      )}
                      <span style={{ color: 'var(--wimc-text-muted)' }}>Joined {createdDate}</span>
                    </div>
                  </div>

                  {/* Toggle buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggleActive(venue.id, venue.is_active)}
                      disabled={toggling === venue.id + '-active'}
                      style={{
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--wimc-border-subtle)',
                        background: venue.is_active ? 'var(--wimc-coral-dim)' : 'var(--wimc-bg-base)',
                        color: venue.is_active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                        cursor: 'pointer',
                        opacity: toggling === venue.id + '-active' ? 0.5 : 1,
                        transition: 'all 150ms',
                      }}
                    >
                      {venue.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => handleToggleVerified(venue.id, venue.is_verified)}
                      disabled={toggling === venue.id + '-verified'}
                      style={{
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--wimc-border-subtle)',
                        background: venue.is_verified ? 'rgba(59,107,204,0.07)' : 'var(--wimc-bg-base)',
                        color: venue.is_verified ? 'var(--wimc-neel)' : 'var(--wimc-text-secondary)',
                        cursor: 'pointer',
                        opacity: toggling === venue.id + '-verified' ? 0.5 : 1,
                        transition: 'all 150ms',
                      }}
                    >
                      {venue.is_verified ? 'Unverify' : 'Verify'}
                    </button>
                  </div>
                </div>

                {errors[venue.id] && (
                  <p style={{ fontSize: 12, color: 'var(--wimc-coral)', marginTop: 8 }}>{errors[venue.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
