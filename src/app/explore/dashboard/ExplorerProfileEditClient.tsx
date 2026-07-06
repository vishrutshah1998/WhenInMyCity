'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateExplorerProfile } from '@/app/actions/explorer'
import { INTEREST_TAGS, CITIES } from '@/lib/constants/interests'

const LAVENDER = '#9B8FFF'
const FORMAT_OPTIONS = [
  { id: 'small_group',  label: 'Small Groups' },
  { id: 'workshop',     label: 'Workshops' },
  { id: 'performance',  label: 'Performances' },
  { id: 'networking',   label: 'Networking' },
  { id: 'outdoor',      label: 'Outdoor' },
  { id: 'dining',       label: 'Dining' },
]

interface Props {
  explorerProfile: {
    display_name: string
    avatar_url: string | null
    city: string
    interest_tags: string[]
    preferred_formats: string[]
    neighbourhood_preference: string | null
    price_range_max_paise: number
    notification_preferences: { whatsapp: boolean; digest_frequency: 'daily' | 'weekly' | 'never' }
  }
  username: string
  city: string
}

export default function ExplorerProfileEditClient({ explorerProfile, username, city }: Props) {
  const [displayName, setDisplayName]     = useState(explorerProfile.display_name)
  const [selectedCity, setSelectedCity]   = useState(explorerProfile.city ?? city)
  const [tags, setTags]                   = useState<string[]>(explorerProfile.interest_tags ?? [])
  const [formats, setFormats]             = useState<string[]>(explorerProfile.preferred_formats ?? [])
  const [neighbourhood, setNeighbourhood] = useState(explorerProfile.neighbourhood_preference ?? '')
  const [priceMax, setPriceMax]           = useState(Math.round(explorerProfile.price_range_max_paise / 100))
  const [notifWa, setNotifWa]             = useState(explorerProfile.notification_preferences?.whatsapp ?? true)
  const [digestFreq, setDigestFreq]       = useState(explorerProfile.notification_preferences?.digest_frequency ?? 'weekly')
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  function toggleTag(id: string) {
    setTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id].slice(0, 5)
    )
  }

  function toggleFormat(id: string) {
    setFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateExplorerProfile({
        display_name:             displayName.trim(),
        city:                     selectedCity,
        interest_tags:            tags,
        neighbourhood_preference: neighbourhood || null,
        price_range_max_paise:    priceMax * 100,
        preferred_formats:        [],
        notification_preferences: {
          whatsapp:         notifWa,
          digest_frequency: digestFreq as 'daily' | 'weekly' | 'never',
        },
      })
      if (result.error) setError(result.error)
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

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-outfit)',
          fontSize: 26, fontWeight: 900,
          color: '#F0EFF8', margin: '0 0 6px',
        }}>
          My Profile
        </h1>
        <p style={{ fontSize: 13, color: '#9896B0', margin: 0 }}>
          How your public explorer profile looks to others.{' '}
          {username && (
            <Link
              href={`/explore/dashboard`}
              style={{ color: LAVENDER, textDecoration: 'none' }}
            >
              View public profile →
            </Link>
          )}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Display name */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)' }}>
            Display Name
          </label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            style={inputStyle}
          />
        </div>

        {/* City */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)' }}>
            City
          </label>
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

        {/* Neighbourhood */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)' }}>
            Neighbourhood (optional)
          </label>
          <input
            value={neighbourhood}
            onChange={e => setNeighbourhood(e.target.value)}
            placeholder="e.g. Satellite, Navrangpura"
            style={inputStyle}
          />
        </div>

        {/* Interest tags */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--font-jetbrains-mono)' }}>
            Interests <span style={{ color: '#9896B0', fontSize: 10 }}>({tags.length}/5)</span>
          </label>
          <p style={{ fontSize: 12, color: '#9896B0', margin: '0 0 12px' }}>Pick 3–5 themes you explore.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INTEREST_TAGS.map(tag => {
              const sel = tags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  disabled={!sel && tags.length >= 5}
                  style={{
                    padding: '5px 12px', borderRadius: 9999,
                    border: `1px solid ${sel ? LAVENDER : 'rgba(155,143,255,0.2)'}`,
                    background: sel ? 'rgba(155,143,255,0.15)' : 'transparent',
                    color: sel ? LAVENDER : '#9896B0',
                    fontSize: 12, cursor: 'pointer',
                    fontFamily: 'var(--font-dm-sans)',
                    opacity: !sel && tags.length >= 5 ? 0.4 : 1,
                    transition: 'all 150ms',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Formats */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-jetbrains-mono)' }}>
            Preferred Formats
          </label>
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

        {/* Max ticket price */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)' }}>
            Max Ticket Price: ₹{priceMax}
          </label>
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

        {/* Notifications */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-jetbrains-mono)' }}>
            Notifications
          </label>
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

        {/* Save button */}
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
              opacity: isPending ? 0.7 : 1,
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
          {error && (
            <span style={{ fontSize: 12, color: '#F472B6' }}>{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}
