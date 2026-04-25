'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExplorerProfile } from '@/app/actions/explorer'
import { CITIES, INTEREST_TAGS } from '@/lib/constants/interests'

interface Props {
  defaultDisplayName: string
  defaultCity: string
}

export default function ExplorerOnboardingClient({ defaultDisplayName, defaultCity }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [displayName, setDisplayName] = useState(defaultDisplayName)
  const [city, setCity] = useState(defaultCity)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length < 5 ? [...prev, id] : prev
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (selectedTags.length < 3) {
      setError('Pick at least 3 interests to continue.')
      return
    }
    if (!city) {
      setError('Please select your city.')
      return
    }

    startTransition(async () => {
      const result = await createExplorerProfile({
        display_name: displayName || 'Explorer',
        city,
        interest_tags: selectedTags,
        preferred_formats: [],
        price_range_max_paise: 50000,
        notification_preferences: { whatsapp: true, digest_frequency: 'weekly' },
      })

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/explore')
      }
    })
  }

  const categories = ['performance', 'arts', 'education', 'lifestyle', 'tech'] as const
  const categoryLabels: Record<string, string> = {
    performance: '🎭 Performance',
    arts:        '🎨 Arts',
    education:   '📚 Education',
    lifestyle:   '🌿 Lifestyle',
    tech:        '💡 Tech',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--wimc-bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--wimc-bg-raised)',
        borderRadius: 16,
        border: '1px solid var(--wimc-border-subtle)',
        padding: '32px 28px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, background: 'var(--wimc-coral)',
            borderRadius: 12, display: 'grid', placeItems: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-syne)' }}>W</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, marginBottom: 6 }}>
            Set up your Explorer profile
          </h1>
          <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
            Discover events tailored to your interests
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Display name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>
              Your name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              maxLength={80}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
                border: '1px solid var(--wimc-border-subtle)',
                background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* City */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>
              Your city *
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
                border: '1px solid var(--wimc-border-subtle)',
                background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)',
                boxSizing: 'border-box', cursor: 'pointer',
              }}
            >
              <option value="">Select your city</option>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Interests */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 4 }}>
              Interests * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--wimc-text-muted)' }}>— pick 3 to 5</span>
            </label>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginBottom: 12 }}>
              {selectedTags.length}/5 selected
            </div>

            {categories.map((cat) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, color: 'var(--wimc-text-muted)', marginBottom: 7,
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {categoryLabels[cat]}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {INTEREST_TAGS.filter((t) => t.category === cat).map((tag) => {
                    const active = selectedTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
                          cursor: selectedTags.length >= 5 && !active ? 'not-allowed' : 'pointer',
                          border: active ? '1.5px solid var(--wimc-coral)' : '1.5px solid var(--wimc-border-subtle)',
                          background: active ? 'var(--wimc-coral-dim)' : 'var(--wimc-bg-base)',
                          color: active ? 'var(--wimc-coral-light)' : 'var(--wimc-text-secondary)',
                          opacity: selectedTags.length >= 5 && !active ? 0.45 : 1,
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
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--wimc-coral)', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending || selectedTags.length < 3 || !city}
            style={{
              padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 700,
              background: 'var(--wimc-coral)', color: '#fff', border: 'none',
              cursor: isPending || selectedTags.length < 3 || !city ? 'not-allowed' : 'pointer',
              opacity: isPending || selectedTags.length < 3 || !city ? 0.55 : 1,
              fontFamily: 'var(--font-syne)',
              transition: 'opacity 200ms',
            }}
          >
            {isPending ? 'Setting up…' : 'Start exploring →'}
          </button>
        </form>
      </div>
    </div>
  )
}
