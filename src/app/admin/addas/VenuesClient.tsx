'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminAddaRow } from '@/app/actions/admin'
import { toggleAddaActive, toggleAddaVerified } from '@/app/actions/admin'
import { CITIES } from '@/lib/constants/interests'

const PRICING_LABELS: Record<string, string> = {
  fixed_rental:    'Fixed Rental',
  door_split:      'Door Split',
  hybrid:          'Hybrid',
  f_and_b_minimum: 'F&B Minimum',
}

interface Props {
  addas: AdminAddaRow[]
}

export default function VenuesClient({ addas: initial }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [addas, setAddas] = useState(initial)
  const [toggling, setToggling] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const activeCount = addas.filter((a) => a.is_active).length

  async function handleToggleActive(id: string, current: boolean) {
    setToggling(id + '-active')
    const result = await toggleAddaActive({ id, is_active: !current })
    if (result.success) {
      setAddas((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a))
      startTransition(() => router.refresh())
    } else {
      setErrors((prev) => ({ ...prev, [id]: result.error ?? 'Failed' }))
    }
    setToggling(null)
  }

  async function handleToggleVerified(id: string, current: boolean) {
    setToggling(id + '-verified')
    const result = await toggleAddaVerified({ id, is_verified: !current })
    if (result.success) {
      setAddas((prev) => prev.map((a) => a.id === id ? { ...a, is_verified: !current } : a))
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
          {addas.length} Venue{addas.length !== 1 ? 's' : ''} · {activeCount} active
        </p>
      </div>

      {addas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No addas yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {addas.map((adda) => {
            const cityName = CITIES.find((c) => c.id === adda.city)?.name ?? adda.city
            const revenueRs = (adda.total_revenue_earned_paise / 100).toLocaleString('en-IN')
            const createdDate = new Date(adda.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })

            return (
              <div
                key={adda.id}
                style={{
                  background: 'var(--wimc-bg-raised)',
                  border: '1px solid var(--wimc-border-subtle)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  opacity: adda.is_active ? 1 : 0.65,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{adda.name}</span>
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)' }}>
                        @{adda.slug}
                      </span>
                      {adda.is_verified && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 9999,
                          background: '#3b82f622', color: '#3b82f6',
                        }}>
                          ✓ Verified
                        </span>
                      )}
                      {!adda.is_active && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 9999,
                          background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-muted)',
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 8 }}>
                      {cityName} · {adda.address}
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                      <span style={{ color: 'var(--wimc-text-muted)' }}>
                        {PRICING_LABELS[adda.pricing_model] ?? adda.pricing_model}
                      </span>
                      <span style={{ color: 'var(--wimc-text-muted)' }}>
                        {adda.total_events_hosted} events hosted
                      </span>
                      <span style={{ color: 'var(--wimc-text-muted)' }}>
                        {adda.proposal_count} proposals
                      </span>
                      {adda.total_revenue_earned_paise > 0 && (
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
                      onClick={() => handleToggleActive(adda.id, adda.is_active)}
                      disabled={toggling === adda.id + '-active'}
                      style={{
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--wimc-border-subtle)',
                        background: adda.is_active ? 'var(--wimc-coral-dim)' : 'var(--wimc-bg-base)',
                        color: adda.is_active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                        cursor: 'pointer',
                        opacity: toggling === adda.id + '-active' ? 0.5 : 1,
                        transition: 'all 150ms',
                      }}
                    >
                      {adda.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => handleToggleVerified(adda.id, adda.is_verified)}
                      disabled={toggling === adda.id + '-verified'}
                      style={{
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--wimc-border-subtle)',
                        background: adda.is_verified ? '#3b82f611' : 'var(--wimc-bg-base)',
                        color: adda.is_verified ? '#3b82f6' : 'var(--wimc-text-secondary)',
                        cursor: 'pointer',
                        opacity: toggling === adda.id + '-verified' ? 0.5 : 1,
                        transition: 'all 150ms',
                      }}
                    >
                      {adda.is_verified ? 'Unverify' : 'Verify'}
                    </button>
                  </div>
                </div>

                {errors[adda.id] && (
                  <p style={{ fontSize: 12, color: 'var(--wimc-coral)', marginTop: 8 }}>{errors[adda.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
