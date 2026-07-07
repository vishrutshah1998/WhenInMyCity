'use client'

import { useState } from 'react'
import { updateAddaContactInfo, type UpdateAddaContactInput } from '@/app/actions/venue'
import type { AddaProfile } from '@/types/database'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  surface:  'var(--venue-bg-surface)',
  elevated: 'var(--venue-bg-elevated)',
  border:   'var(--venue-border-subtle)',
  borderMd: 'var(--venue-border-default)',
  text:     'var(--venue-text-primary)',
  muted:    'var(--venue-text-muted)',
  secondary:'var(--venue-text-secondary)',
  amber:    'var(--venue-amber)',
  amberTint:'var(--venue-amber-tint)',
  success:  'var(--venue-success)',
  danger:   'var(--venue-danger)',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

const DAY_OPTIONS = [
  { key: 'monday', label: 'Mon' }, { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' }, { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' }, { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
]

interface Props {
  adda: AddaProfile
  authEmail?: string | null
}

function FieldLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--venue-text-muted)' }}>{icon}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--venue-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--venue-bg-elevated)',
  border: '1px solid var(--venue-border-default)',
  borderRadius: 4, padding: '10px 12px',
  fontFamily: INTER, fontSize: 14, color: 'var(--venue-text-primary)',
  outline: 'none', transition: 'border-color 160ms ease',
}

export default function VenueProfileForm({ adda, authEmail }: Props) {
  const [contactEmail,  setContactEmail]  = useState(adda.contact_email ?? authEmail ?? '')
  const [capacityMin,   setCapacityMin]   = useState(String(adda.capacity_min ?? ''))
  const [capacityMax,   setCapacityMax]   = useState(String(adda.capacity_max ?? ''))
  const [availableDays, setAvailableDays] = useState<string[]>(adda.available_days ?? [])

  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function toggleDay(day: string) {
    setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const payload: UpdateAddaContactInput = {
      contact_email:  contactEmail,
      capacity_min:   capacityMin ? parseInt(capacityMin, 10) : undefined,
      capacity_max:   capacityMax ? parseInt(capacityMax, 10) : undefined,
      available_days: availableDays,
    }
    const result = await updateAddaContactInfo(adda.id, payload)

    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: 2 }}>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.amber }}>edit</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.amber, letterSpacing: '1.4px', textTransform: 'uppercase' }}>
          Editable Details
        </span>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Contact Email */}
        <div>
          <FieldLabel label="Contact Email" icon="mail" />
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="bookings@yourvenue.com"
            style={inputStyle}
          />
          <p style={{ fontFamily: INTER, fontSize: 11, color: T.muted, margin: '4px 0 0' }}>
            Used for WIMC notifications — not shown publicly. WhatsApp & Instagram are managed in My Page.
          </p>
        </div>

        {/* Capacity */}
        <div>
          <FieldLabel label="Capacity" icon="groups" />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="number"
              value={capacityMin}
              onChange={e => setCapacityMin(e.target.value)}
              placeholder="Min"
              min={1}
              style={{ ...inputStyle, width: 100, flexShrink: 0 }}
            />
            <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted }}>to</span>
            <input
              type="number"
              value={capacityMax}
              onChange={e => setCapacityMax(e.target.value)}
              placeholder="Max"
              min={1}
              style={{ ...inputStyle, width: 100, flexShrink: 0 }}
            />
            <span style={{ fontFamily: INTER, fontSize: 13, color: T.muted }}>guests</span>
          </div>
        </div>

        {/* Available days */}
        <div>
          <FieldLabel label="Available Days" icon="calendar_month" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DAY_OPTIONS.map(d => {
              const active = availableDays.includes(d.key)
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  style={{
                    padding: '6px 14px', fontFamily: MONO, fontSize: 11,
                    letterSpacing: '0.08em', border: '1px solid',
                    borderColor: active ? T.amber : T.borderMd,
                    background: active ? T.amberTint : 'transparent',
                    color: active ? T.amber : T.secondary,
                    cursor: 'pointer', borderRadius: 2,
                    transition: 'all 160ms ease',
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 28px',
              background: saving ? 'rgba(245,168,0,0.5)' : T.amber,
              color: '#000', fontFamily: MONO, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              borderRadius: 2, transition: 'background 160ms ease',
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.success }}>check_circle</span>
              <span style={{ fontFamily: INTER, fontSize: 13, color: T.success }}>Saved successfully</span>
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.danger }}>error</span>
              <span style={{ fontFamily: INTER, fontSize: 13, color: T.danger }}>{error}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
