'use client'

import { useState, useTransition } from 'react'
import { updateBrandProfile } from '@/app/actions/business'
import { signOut } from '@/app/actions/auth'
import { deleteAccount } from '@/app/actions/profile'
import type { UserProfile } from '@/types/database'

const T = {
  surface:   'var(--venue-bg-surface)',
  elevated:  'var(--venue-bg-elevated)',
  border:    'var(--venue-border-subtle)',
  borderMd:  'var(--venue-border-default)',
  text:      'var(--venue-text-primary)',
  muted:     'var(--venue-text-muted)',
  secondary: 'var(--venue-text-secondary)',
  amber:     'var(--venue-amber)',
  amberTint: 'var(--venue-amber-tint)',
  success:   'var(--venue-success)',
  danger:    'var(--venue-danger)',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

const WIMC_GOAL_OPTIONS = [
  { id: 'reach_creators',  label: 'Reach Creators' },
  { id: 'host_collabs',    label: 'Host Collabs' },
  { id: 'sponsor_events',  label: 'Sponsor Events' },
  { id: 'build_community', label: 'Build Community' },
  { id: 'grow_brand',      label: 'Grow Brand' },
]

const AUDIENCE_OPTIONS = [
  'GEN Z CREATORS', 'LOCAL ARTISTS', 'EVENT GOERS', 'VENUE OWNERS', 'CULTURE FANS',
]

interface Props {
  profile: UserProfile
}

function FieldLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: T.muted }}>{icon}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
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

export default function BrandProfileForm({ profile }: Props) {
  const [bio,             setBio]             = useState(profile.bio ?? '')
  const [contactEmail,    setContactEmail]    = useState(profile.contact_email ?? '')
  const [instagramHandle, setInstagramHandle] = useState(profile.instagram_handle ?? '')
  const [websiteUrl,      setWebsiteUrl]      = useState(profile.website_url ?? '')
  const [wimcGoals,       setWimcGoals]       = useState<string[]>(profile.wimc_goals ?? [])
  const [targetAudience,  setTargetAudience]  = useState<string[]>(profile.target_audience ?? [])

  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, startDeleting] = useTransition()

  function toggleGoal(id: string) {
    setWimcGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  function toggleAudience(label: string) {
    setTargetAudience(prev => prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const result = await updateBrandProfile({
      bio:              bio || undefined,
      contact_email:    contactEmail,
      instagram_handle: instagramHandle,
      website_url:      websiteUrl,
      wimc_goals:       wimcGoals,
      target_audience:  targetAudience,
    })

    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <>
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

        {/* Bio */}
        <div>
          <FieldLabel label="Brand Bio" icon="description" />
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Describe your brand — mission, values, what you stand for…"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 10, color: T.muted, marginTop: 4 }}>
            {bio.length}/500
          </div>
        </div>

        {/* Contact row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <FieldLabel label="Contact Email" icon="mail" />
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="hello@yourbrand.com"
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel label="Website" icon="language" />
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Instagram */}
        <div>
          <FieldLabel label="Instagram Handle" icon="alternate_email" />
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontFamily: INTER, fontSize: 14, color: T.muted, userSelect: 'none',
            }}>@</span>
            <input
              type="text"
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ''))}
              placeholder="yourbrand"
              style={{ ...inputStyle, paddingLeft: 28 }}
            />
          </div>
        </div>

        {/* WIMC Goals */}
        <div>
          <FieldLabel label="Goals on WIMC" icon="flag" />
          <p style={{ fontFamily: INTER, fontSize: 12, color: T.muted, margin: '0 0 10px' }}>
            What do you want to achieve on the platform?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WIMC_GOAL_OPTIONS.map(goal => {
              const active = wimcGoals.includes(goal.id)
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  style={{
                    padding: '6px 14px', fontFamily: INTER, fontSize: 12,
                    border: '1px solid',
                    borderColor: active ? T.amber : T.borderMd,
                    background: active ? T.amberTint : 'transparent',
                    color: active ? T.amber : T.secondary,
                    cursor: 'pointer', borderRadius: 9999,
                    transition: 'all 160ms ease',
                  }}
                >
                  {goal.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <FieldLabel label="Target Audience" icon="people" />
          <p style={{ fontFamily: INTER, fontSize: 12, color: T.muted, margin: '0 0 10px' }}>
            Who are you trying to reach through WIMC?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AUDIENCE_OPTIONS.map(label => {
              const active = targetAudience.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleAudience(label)}
                  style={{
                    padding: '5px 12px', fontFamily: MONO, fontSize: 10,
                    letterSpacing: '0.08em',
                    border: '1px solid',
                    borderColor: active ? T.amber : T.borderMd,
                    background: active ? T.amberTint : 'transparent',
                    color: active ? T.amber : T.secondary,
                    cursor: 'pointer', borderRadius: 2,
                    transition: 'all 160ms ease',
                  }}
                >
                  {label}
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

    {/* ── Account ──────────────────────────────────────────────────────── */}
    <div style={{ background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: 2, marginTop: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.muted }}>manage_accounts</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '1.4px', textTransform: 'uppercase' }}>
          Account
        </span>
      </div>
      <div style={{ padding: '20px' }}>
        <button
          type="button"
          onClick={() => signOut()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 14px', fontFamily: INTER, fontSize: 14, fontWeight: 500,
            background: 'var(--venue-bg-elevated)', color: T.secondary,
            border: `1px solid ${T.borderMd}`, borderRadius: 2, cursor: 'pointer',
            transition: 'background 160ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--venue-bg-overlay)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--venue-bg-elevated)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.muted }}>logout</span>
          Sign out
        </button>
      </div>
    </div>

    {/* ── Danger zone ──────────────────────────────────────────────────── */}
    <div style={{ background: T.surface, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 2, marginTop: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 20px', borderBottom: `1px solid rgba(239,68,68,0.15)`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.danger }}>warning</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: T.danger, letterSpacing: '1.4px', textTransform: 'uppercase' }}>
          Danger zone
        </span>
      </div>
      <div style={{ padding: '20px' }}>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', fontFamily: INTER, fontSize: 14, fontWeight: 500,
              border: `1px solid rgba(239,68,68,0.35)`, borderRadius: 2, cursor: 'pointer',
              color: T.danger, background: 'transparent',
              transition: 'background 160ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_forever</span>
            Delete account
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontFamily: INTER, fontSize: 13, color: T.secondary, lineHeight: 1.6, margin: 0 }}>
              This permanently deletes your brand profile, all data, and all events. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '10px 0', fontFamily: INTER, fontSize: 14, fontWeight: 500,
                  background: 'var(--venue-bg-elevated)', color: T.secondary,
                  border: `1px solid ${T.borderMd}`, borderRadius: 2, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { startDeleting(async () => { await deleteAccount() }) }}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '10px 0', fontFamily: INTER, fontSize: 14, fontWeight: 700,
                  background: T.danger, color: '#fff',
                  border: 'none', borderRadius: 2,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                  transition: 'opacity 160ms ease',
                }}
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
