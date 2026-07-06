'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { updateExplorerProfile } from '@/app/actions/explorer'
import { INTEREST_TAGS, CITIES } from '@/lib/constants/interests'

const LAVENDER = '#9B8FFF'
const CITY_GUIDE_CONSENT_KEY = 'wimc_city_guide_consent_v1'

const FORMAT_OPTIONS = [
  { id: 'small_group',  label: 'Small Groups' },
  { id: 'workshop',     label: 'Workshops' },
  { id: 'performance',  label: 'Performances' },
  { id: 'networking',   label: 'Networking' },
  { id: 'outdoor',      label: 'Outdoor' },
  { id: 'dining',       label: 'Dining' },
]

const SCENES = [
  { id: 'music',       label: 'Music Fan'      },
  { id: 'theatre',     label: 'Theatre Goer'   },
  { id: 'art',         label: 'Art Explorer'   },
  { id: 'film',        label: 'Film Buff'       },
  { id: 'books',       label: 'Book Lover'      },
  { id: 'comedy',      label: 'Comedy Fan'      },
  { id: 'podcast',     label: 'Podcast Fan'     },
  { id: 'photography', label: 'Photography'     },
  { id: 'events',      label: 'Event Hunter'    },
  { id: 'dance',       label: 'Dance'           },
  { id: 'poetry',      label: 'Poetry Fan'      },
  { id: 'food',        label: 'Food Explorer'   },
]

const INTENT_OPTIONS = [
  { id: 'host',     label: 'Maybe host an open mic or event'               },
  { id: 'share',    label: 'Share my work online someday'                   },
  { id: 'already',  label: "I already create — just haven't set up a page"  },
  { id: 'discover', label: "Nah, I'm purely here to discover"               },
]

const CATEGORY_ORDER = ['performance', 'arts', 'education', 'lifestyle', 'tech', 'food_culture', 'outdoors']
const CATEGORY_LABELS: Record<string, string> = {
  performance:  'Performance',
  arts:         'Arts & Craft',
  education:    'Education',
  lifestyle:    'Lifestyle',
  tech:         'Tech & Business',
  food_culture: 'Food & Culture',
  outdoors:     'Outdoors',
}

interface Props {
  profile: {
    display_name: string
    avatar_url: string | null
    city: string
    interest_tags: string[]
    preferred_formats: string[]
    neighbourhood_preference: string | null
    price_range_max_paise: number
    notification_preferences: { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  }
  explorerScene: string
  explorerCreatorIntent: string
  username: string
  authEmail: string
}

export default function ExplorerSettingsClient({ profile, explorerScene, explorerCreatorIntent, username, authEmail }: Props) {
  // ── Profile edit state ────────────────────────────────────────────────────
  const [displayName, setDisplayName]     = useState(profile.display_name)
  const [selectedCity, setSelectedCity]   = useState(profile.city)
  const validTagIds = useMemo(() => new Set(INTEREST_TAGS.map(t => t.id)), [])
  const [tags, setTags]                   = useState<string[]>((profile.interest_tags ?? []).filter(t => validTagIds.has(t)))
  const [formats, setFormats]             = useState<string[]>(profile.preferred_formats ?? [])
  const [neighbourhood, setNeighbourhood] = useState(profile.neighbourhood_preference ?? '')
  const [priceMax, setPriceMax]           = useState(Math.round(profile.price_range_max_paise / 100))
  const [notifWa, setNotifWa]             = useState(profile.notification_preferences?.whatsapp ?? true)
  const [digestFreq, setDigestFreq]       = useState(profile.notification_preferences?.digest_frequency ?? 'weekly')
  const [scene, setScene]                 = useState(explorerScene ?? '')
  const [intent, setIntent]               = useState(explorerCreatorIntent ?? '')
  const [saved, setSaved]                 = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  const groupedTags = useMemo(() =>
    INTEREST_TAGS.reduce<Record<string, typeof INTEREST_TAGS>>((acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = []
      acc[tag.category].push(tag)
      return acc
    }, {})
  , [])

  // ── DPDP consent state ────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [cityGuideConsent,  setCityGuideConsent]  = useState(false)

  useEffect(() => {
    setCityGuideConsent(!!localStorage.getItem(CITY_GUIDE_CONSENT_KEY))
  }, [])

  function revokeCityGuideConsent() {
    localStorage.removeItem(CITY_GUIDE_CONSENT_KEY)
    setCityGuideConsent(false)
  }

  function toggleTag(id: string) {
    setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id].slice(0, 5))
  }

  function toggleFormat(id: string) {
    setFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  function handleSave() {
    setSaveError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateExplorerProfile({
        display_name:             displayName.trim(),
        city:                     selectedCity,
        interest_tags:            tags,
        neighbourhood_preference: neighbourhood || null,
        price_range_max_paise:    priceMax * 100,
        preferred_formats:        formats,
        notification_preferences: {
          whatsapp:         notifWa,
          digest_frequency: digestFreq as 'daily' | 'weekly' | 'never',
        },
        explorer_scene:           scene || undefined,
        explorer_creator_intent:  intent ? [intent] : [],
      })
      if (result.error) setSaveError(result.error)
      else setSaved(true)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#1E2A45', border: '1px solid rgba(155,143,255,0.2)',
    color: '#F0EFF8', borderRadius: 6, fontSize: 14,
    fontFamily: 'var(--font-dm-sans)',
    outline: 'none', boxSizing: 'border-box',
  }

  const sectionStyle: React.CSSProperties = {
    background: '#131317', border: '1px solid rgba(155,143,255,0.15)',
    padding: '0 20px', marginBottom: 24,
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: LAVENDER,
    letterSpacing: '0.2em', textTransform: 'uppercase',
    fontFamily: 'var(--font-jetbrains-mono)',
    padding: '14px 0 10px',
    borderBottom: '1px solid rgba(155,143,255,0.1)',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid rgba(155,143,255,0.10)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: '#9896B0',
    fontFamily: 'var(--font-jetbrains-mono)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 14, color: '#F0EFF8',
    fontFamily: 'var(--font-dm-sans)',
  }

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#9896B0', letterSpacing: '0.15em',
    textTransform: 'uppercase', marginBottom: 8,
    fontFamily: 'var(--font-jetbrains-mono)',
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 24, fontWeight: 900, color: '#F0EFF8', marginBottom: 4 }}>
        Profile & Settings
      </h1>
      <p style={{ fontSize: 13, color: '#9896B0', marginBottom: 32 }}>
        Edit your profile and account settings.
      </p>

      {/* ── Edit Profile ──────────────────────────────────────────────────── */}
      <div style={{ ...sectionStyle, padding: '20px' }}>
        <div style={{ ...sectionHeaderStyle, padding: '0 0 14px', marginBottom: 20 }}>
          Profile
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={fieldLabelStyle}>Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>City</label>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {CITIES.map(c => (
                <option key={c.id} value={c.name}>{c.name}, {c.state}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Neighbourhood (optional)</label>
            <input
              value={neighbourhood}
              onChange={e => setNeighbourhood(e.target.value)}
              placeholder="e.g. Satellite, Navrangpura"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ ...fieldLabelStyle, marginBottom: 4 }}>
              Interests <span style={{ color: '#9896B0', fontSize: 10 }}>({tags.length}/5)</span>
            </label>
            <p style={{ fontSize: 12, color: '#9896B0', margin: '0 0 16px' }}>
              Pick 3–5 themes you explore.{tags.length >= 5 ? ' Limit reached.' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {CATEGORY_ORDER.filter(cat => groupedTags[cat]).map(cat => (
                <div key={cat}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: LAVENDER, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 8 }}>
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {groupedTags[cat].map(tag => {
                      const sel        = tags.includes(tag.id)
                      const isDisabled = !sel && tags.length >= 5
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          disabled={isDisabled}
                          style={{
                            padding: '5px 11px', borderRadius: 9999,
                            border: `1px solid ${sel ? LAVENDER : 'rgba(155,143,255,0.2)'}`,
                            background: sel ? 'rgba(155,143,255,0.15)' : 'transparent',
                            color: sel ? LAVENDER : isDisabled ? 'rgba(152,150,176,0.35)' : '#9896B0',
                            fontSize: 12, cursor: isDisabled ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-dm-sans)',
                            transition: 'all 150ms',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 11 }}>{tag.emoji}</span>
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle}>Preferred Formats</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FORMAT_OPTIONS.map(fmt => {
                const sel = formats.includes(fmt.id)
                return (
                  <button
                    key={fmt.id}
                    onClick={() => toggleFormat(fmt.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 9999,
                      border: `1px solid ${sel ? '#5DD9D0' : 'rgba(93,217,208,0.2)'}`,
                      background: sel ? 'rgba(93,217,208,0.12)' : 'transparent',
                      color: sel ? '#5DD9D0' : '#9896B0',
                      fontSize: 12, cursor: 'pointer',
                      fontFamily: 'var(--font-dm-sans)',
                      transition: 'all 150ms',
                    }}
                  >
                    {fmt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle}>Max Ticket Price: ₹{priceMax}</label>
            <input
              type="range"
              min={0} max={2000} step={50}
              value={priceMax}
              onChange={e => setPriceMax(Number(e.target.value))}
              style={{ width: '100%', accentColor: LAVENDER }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9896B0', marginTop: 4 }}>
              <span>₹0 (Free only)</span><span>₹2000</span>
            </div>
          </div>

          <div>
            <label style={{ ...fieldLabelStyle, marginBottom: 12 }}>Notifications</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifWa}
                  onChange={e => setNotifWa(e.target.checked)}
                  style={{ accentColor: LAVENDER, width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, color: '#F0EFF8' }}>WhatsApp updates</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#9896B0' }}>Digest frequency:</span>
                {(['daily', 'weekly', 'never'] as const).map(f => (
                  <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="digest"
                      value={f}
                      checked={digestFreq === f}
                      onChange={() => setDigestFreq(f)}
                      style={{ accentColor: LAVENDER }}
                    />
                    <span style={{ fontSize: 13, color: '#F0EFF8', textTransform: 'capitalize' }}>{f}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle}>Primary Scene</label>
            <select
              value={scene}
              onChange={e => setScene(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— Not set —</option>
              {SCENES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ ...fieldLabelStyle, marginBottom: 8 }}>Creator Ambition</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {INTENT_OPTIONS.map(opt => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="intent"
                    value={opt.id}
                    checked={intent === opt.id}
                    onChange={() => setIntent(opt.id)}
                    style={{ accentColor: LAVENDER, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: '#F0EFF8', fontFamily: 'var(--font-dm-sans)' }}>{opt.label}</span>
                </label>
              ))}
              {intent && (
                <button
                  onClick={() => setIntent('')}
                  style={{ background: 'none', border: 'none', color: '#9896B0', fontSize: 11, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'var(--font-dm-sans)', textDecoration: 'underline', textDecorationStyle: 'dashed' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={isPending || displayName.trim().length === 0 || tags.length < 3}
              style={{
                padding: '12px 28px',
                background: LAVENDER,
                color: '#07070A',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                border: 'none', cursor: 'pointer',
                opacity: isPending || displayName.trim().length === 0 || tags.length < 3 ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && (
              <span style={{ fontSize: 12, color: '#22C55E', fontFamily: 'var(--font-jetbrains-mono)' }}>
                ✓ Saved
              </span>
            )}
            {saveError && (
              <span style={{ fontSize: 12, color: '#F472B6' }}>{saveError}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Account (read-only) ──────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Account</div>
        <div style={rowStyle}>
          <span style={labelStyle}>Username</span>
          <span style={valueStyle}>@{username}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Email</span>
          <span style={valueStyle}>{authEmail || '—'}</span>
        </div>
      </div>

      {/* ── Privacy & Data (DPDP) ──────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Privacy & Data · DPDP Act 2023</div>
        <div style={{ ...rowStyle }}>
          <span style={labelStyle}>City Guide Location</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: cityGuideConsent ? '#4CAF50' : '#9896B0' }}>
              {cityGuideConsent ? 'Consent given' : 'Not given'}
            </span>
            {cityGuideConsent && (
              <button
                onClick={revokeCityGuideConsent}
                style={{
                  background: 'transparent', border: '1px solid rgba(244,114,182,0.4)',
                  color: '#F472B6', cursor: 'pointer', padding: '3px 10px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
                  letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 4,
                }}
              >
                Revoke
              </button>
            )}
          </div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>What we collect</span>
            <p style={{ fontSize: 11, color: '#9896B0', lineHeight: 1.6, margin: 0, maxWidth: 440 }}>
              When you use the City Guide utility layers, your browser may request approximate location
              to centre the map. This is not transmitted to WIMC&apos;s servers. Civic POI data is fetched
              from OpenStreetMap (ODbL licence) via the Overpass API — no personal data is shared with
              OSM. No personal data is shared with third-party advertisers. You have the right to access,
              correct, and erase your data under the DPDP Act, 2023 — contact our Grievance Officer
              below or read the full{' '}
              <Link href="/legal/privacy" style={{ color: LAVENDER }}>Privacy Notice</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Grievance Officer ───────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Grievance Officer</div>
        <div style={rowStyle}>
          <span style={labelStyle}>Named Officer</span>
          <span style={valueStyle}>Vishrut Shah (Founder)</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Data Fiduciary</span>
          <span style={valueStyle}>City Collective LLP</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Email</span>
          <a
            href="mailto:wheninmycity@gmail.com?subject=DPDP%20Grievance"
            style={{ ...valueStyle, color: LAVENDER, textDecoration: 'none' }}
          >
            wheninmycity@gmail.com
          </a>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Response SLA</span>
          <span style={valueStyle}>Within 30 days</span>
        </div>
      </div>

      {/* Legal links */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
        <Link href="/legal/privacy" style={{ fontSize: 12, color: LAVENDER, textDecoration: 'none' }}>
          Privacy Notice
        </Link>
        <Link href="/legal/terms" style={{ fontSize: 12, color: LAVENDER, textDecoration: 'none' }}>
          Terms of Use
        </Link>
      </div>

      {/* Danger zone */}
      <div style={{
        background: '#131317',
        border: '1px solid rgba(244,114,182,0.2)',
        borderLeft: '3px solid rgba(244,114,182,0.5)',
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#F472B6', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 10 }}>
          Danger Zone
        </div>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent', border: '1px solid rgba(244,114,182,0.4)',
              color: '#F472B6', cursor: 'pointer', padding: '8px 16px',
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#F0EFF8', marginBottom: 12 }}>
              Are you sure? This cannot be undone. Contact support to proceed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(155,143,255,0.3)',
                  color: '#9896B0', cursor: 'pointer', padding: '6px 14px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}
              >
                Cancel
              </button>
              <a
                href="mailto:support@wheninmycity.com?subject=Delete%20my%20account"
                style={{
                  display: 'inline-block',
                  background: 'rgba(244,114,182,0.15)',
                  border: '1px solid rgba(244,114,182,0.5)',
                  color: '#F472B6', padding: '6px 14px',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  textDecoration: 'none',
                }}
              >
                Contact Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
