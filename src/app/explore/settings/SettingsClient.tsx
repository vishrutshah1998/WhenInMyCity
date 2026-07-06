'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateExplorerProfile } from '@/app/actions/explorer'
import type { ExplorerProfile } from '@/types/database'
import { CITIES, INTEREST_TAGS } from '@/lib/constants/interests'

const CITY_GUIDE_CONSENT_KEY = 'wimc_city_guide_consent_v1'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_OPTIONS = [
  { label: 'Free only',    value: 0 },
  { label: 'Up to ₹200',  value: 20000 },
  { label: 'Up to ₹500',  value: 50000 },
  { label: 'Up to ₹1,000',value: 100000 },
  { label: 'Up to ₹2,000',value: 200000 },
  { label: 'Any price',   value: 999999 },
]

const CATEGORY_LABELS: Record<string, string> = {
  performance: '🎭 Performance',
  arts:        '🎨 Arts',
  education:   '📚 Education',
  lifestyle:   '🌿 Lifestyle',
  tech:        '💡 Tech',
}

const CATEGORIES = ['performance', 'arts', 'education', 'lifestyle', 'tech'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNotifPrefs(raw: unknown): { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    return {
      whatsapp:         typeof obj.whatsapp === 'boolean' ? obj.whatsapp : true,
      digest_frequency: ['daily', 'weekly', 'never'].includes(obj.digest_frequency as string)
        ? (obj.digest_frequency as 'daily' | 'weekly' | 'never')
        : 'weekly',
    }
  }
  return { whatsapp: true, digest_frequency: 'weekly' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsClient({ profile }: { profile: ExplorerProfile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [displayName, setDisplayName]       = useState(profile.display_name)
  const [city, setCity]                     = useState(profile.city)
  const [neighbourhood, setNeighbourhood]   = useState(profile.neighbourhood_preference ?? '')
  const [selectedTags, setSelectedTags]     = useState<string[]>(profile.interest_tags)
  const [priceMax, setPriceMax]             = useState(profile.price_range_max_paise)
  const [notifPrefs, setNotifPrefs]         = useState(() => parseNotifPrefs(profile.notification_preferences))
  const [error, setError]                   = useState<string | null>(null)
  const [saved, setSaved]                   = useState(false)
  const [cityGuideConsent, setCityGuideConsent] = useState(false)

  useEffect(() => {
    setCityGuideConsent(!!localStorage.getItem(CITY_GUIDE_CONSENT_KEY))
  }, [])

  function revokeCityGuideConsent() {
    localStorage.removeItem(CITY_GUIDE_CONSENT_KEY)
    setCityGuideConsent(false)
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length < 5 ? [...prev, id] : prev,
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (selectedTags.length < 3) {
      setError('Pick at least 3 interests.')
      return
    }

    startTransition(async () => {
      const result = await updateExplorerProfile({
        display_name:             displayName,
        city,
        interest_tags:            selectedTags,
        neighbourhood_preference: neighbourhood || null,
        price_range_max_paise:    priceMax,
        preferred_formats:        [],
        notification_preferences: notifPrefs,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        router.refresh()
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
    border: '1px solid var(--wimc-border-subtle)',
    background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)',
    boxSizing: 'border-box', outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--wimc-text-secondary)',
    display: 'block', marginBottom: 6,
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-syne)', fontWeight: 800,
          fontSize: 24, margin: '0 0 4px',
        }}>
          Profile Settings
        </h1>
        <div style={{ fontSize: 13, color: 'var(--wimc-text-muted)' }}>
          Update your city, interests, and notification preferences.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Profile ─────────────────────────────────────────────────── */}
          <Section title="Profile">
            <div>
              <label style={labelStyle}>Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                required
                style={inputStyle}
              />
            </div>
          </Section>

          {/* ── Location ────────────────────────────────────────────────── */}
          <Section title="Location">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>City *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  Neighbourhood
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>
                    — optional
                  </span>
                </label>
                <input
                  type="text"
                  value={neighbourhood}
                  onChange={(e) => setNeighbourhood(e.target.value)}
                  placeholder="e.g. Koregaon Park"
                  maxLength={80}
                  style={inputStyle}
                />
              </div>
            </div>
          </Section>

          {/* ── Interests ───────────────────────────────────────────────── */}
          <Section title="Interests">
            <div style={{
              fontSize: 12, color: 'var(--wimc-text-muted)', marginBottom: 14,
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              {selectedTags.length}/5 selected · pick 3 to 5
            </div>
            {CATEGORIES.map((cat) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 11, color: 'var(--wimc-text-muted)',
                  marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {CATEGORY_LABELS[cat]}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {INTEREST_TAGS.filter((t) => t.category === cat).map((tag) => {
                    const active = selectedTags.includes(tag.id)
                    const disabled = selectedTags.length >= 5 && !active
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        disabled={disabled}
                        style={{
                          padding: '5px 12px', borderRadius: 9999,
                          fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
                          border: active
                            ? '1.5px solid var(--wimc-coral)'
                            : '1.5px solid var(--wimc-border-subtle)',
                          background: active ? 'rgba(232,87,42,0.12)' : 'var(--wimc-bg-base)',
                          color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                          opacity: disabled ? 0.4 : 1,
                          transition: 'all 150ms',
                        }}
                      >
                        {tag.emoji} {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </Section>

          {/* ── Budget ──────────────────────────────────────────────────── */}
          <Section title="Budget">
            <div>
              <label style={labelStyle}>Max ticket price</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRICE_OPTIONS.map((opt) => {
                  const active = priceMax === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriceMax(opt.value)}
                      style={{
                        padding: '7px 16px', borderRadius: 9999,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: active
                          ? '1.5px solid var(--wimc-coral)'
                          : '1.5px solid var(--wimc-border-subtle)',
                        background: active ? 'rgba(232,87,42,0.12)' : 'var(--wimc-bg-raised)',
                        color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                        transition: 'all 150ms',
                        fontFamily: 'var(--font-jetbrains-mono)',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* ── Notifications ───────────────────────────────────────────── */}
          <Section title="Notifications — WhatsApp & Email">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* WhatsApp toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10,
                background: 'var(--wimc-bg-raised)',
                border: '1px solid var(--wimc-border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#25d366' }}>chat</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp alerts</div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)' }}>
                      Booking confirmations and event reminders
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifPrefs((p) => ({ ...p, whatsapp: !p.whatsapp }))}
                  style={{
                    width: 44, height: 24, borderRadius: 9999, border: 'none',
                    background: notifPrefs.whatsapp ? 'var(--wimc-coral)' : 'var(--wimc-bg-overlay)',
                    position: 'relative', cursor: 'pointer', flexShrink: 0,
                    transition: 'background 200ms',
                  }}
                  aria-label={notifPrefs.whatsapp ? 'Disable WhatsApp alerts' : 'Enable WhatsApp alerts'}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: notifPrefs.whatsapp ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 200ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {/* Digest frequency */}
              <div>
                <label style={labelStyle}>Event digest emails</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['daily', 'weekly', 'never'] as const).map((freq) => {
                    const active = notifPrefs.digest_frequency === freq
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setNotifPrefs((p) => ({ ...p, digest_frequency: freq }))}
                        style={{
                          padding: '7px 16px', borderRadius: 9999, cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                          border: active
                            ? '1.5px solid var(--wimc-coral)'
                            : '1.5px solid var(--wimc-border-subtle)',
                          background: active ? 'rgba(232,87,42,0.12)' : 'var(--wimc-bg-raised)',
                          color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                          transition: 'all 150ms',
                        }}
                      >
                        {freq}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Section>

          {/* ── Privacy & Data (DPDP) ───────────────────────────────────── */}
          <Section title="Privacy & Data">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Location consent */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10,
                background: 'var(--wimc-bg-raised)',
                border: '1px solid var(--wimc-border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--wimc-coral)' }}>location_on</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>City Guide location access</div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)' }}>
                      {cityGuideConsent
                        ? 'Consent given — your approximate location centres the map (not stored).'
                        : 'Not given — no location is used until you opt in within City Guide.'}
                    </div>
                  </div>
                </div>
                {cityGuideConsent && (
                  <button
                    type="button"
                    onClick={revokeCityGuideConsent}
                    style={{
                      flexShrink: 0, padding: '5px 12px', borderRadius: 9999,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: '1.5px solid var(--wimc-border-subtle)',
                      background: 'var(--wimc-bg-base)',
                      color: 'var(--wimc-text-secondary)',
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>

              {/* DPDP rights summary */}
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'var(--wimc-bg-raised)',
                border: '1px solid var(--wimc-border-subtle)',
                fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.65,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Your rights under the DPDP Act, 2023</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>Access</strong> — request a summary of data we hold about you.</li>
                  <li><strong>Correction &amp; erasure</strong> — correct inaccurate data or delete your account.</li>
                  <li><strong>Withdraw consent</strong> — revoke location access above at any time.</li>
                  <li><strong>Grievance redressal</strong> — contact our Grievance Officer; 30-day SLA.</li>
                </ul>
              </div>

              {/* Grievance Officer */}
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'var(--wimc-bg-raised)',
                border: '1px solid var(--wimc-border-subtle)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Grievance Officer — City Collective LLP
                </div>
                <div style={{ fontSize: 13, color: 'var(--wimc-text-muted)', lineHeight: 1.6 }}>
                  <div><strong style={{ color: 'var(--wimc-text-primary)' }}>Vishrut Shah</strong> · Founder</div>
                  <div>
                    <a
                      href="mailto:wheninmycity@gmail.com?subject=DPDP%20Grievance"
                      style={{ color: 'var(--wimc-coral)', textDecoration: 'none' }}
                    >
                      wheninmycity@gmail.com
                    </a>
                    {' '}· Response within 30 days
                  </div>
                </div>
              </div>

              {/* Legal links */}
              <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
                <Link
                  href="/legal/privacy"
                  style={{ fontSize: 13, color: 'var(--wimc-coral)', textDecoration: 'none', fontWeight: 500 }}
                >
                  Privacy Notice →
                </Link>
                <Link
                  href="/legal/terms"
                  style={{ fontSize: 13, color: 'var(--wimc-coral)', textDecoration: 'none', fontWeight: 500 }}
                >
                  Terms of Use →
                </Link>
              </div>

            </div>
          </Section>

        </div>

        {/* Save bar */}
        <div style={{
          marginTop: 36, paddingTop: 24,
          borderTop: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <button
            type="submit"
            disabled={isPending || selectedTags.length < 3}
            style={{
              padding: '11px 28px', borderRadius: 10,
              background: 'var(--wimc-coral)', color: '#fff',
              fontWeight: 700, fontSize: 14, border: 'none',
              fontFamily: 'var(--font-syne)',
              cursor: isPending || selectedTags.length < 3 ? 'not-allowed' : 'pointer',
              opacity: isPending || selectedTags.length < 3 ? 0.55 : 1,
              transition: 'opacity 150ms',
            }}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>

          {saved && !isPending && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 13, color: 'var(--wimc-teal)', fontWeight: 600,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              Saved
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: 'var(--wimc-coral)', fontWeight: 500 }}>
              {error}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontFamily: 'var(--font-syne)', fontWeight: 700,
        fontSize: 14, color: 'var(--wimc-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        margin: '0 0 16px', paddingBottom: 10,
        borderBottom: '1px solid var(--wimc-border-subtle)',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
