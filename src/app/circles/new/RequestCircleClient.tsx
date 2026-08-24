'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestCommunity, previewCommunityName } from '@/app/actions/communities'
import { uploadPostImage } from '@/app/actions/posts'
import { CITIES } from '@/lib/constants/interests'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'

export default function RequestCircleClient() {
  const router = useRouter()

  const [activity, setActivity] = useState('')
  const [preview, setPreview] = useState<{ name: string; slug: string } | null>(null)
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [city, setCity] = useState<string | undefined>(undefined)
  const [category, setCategory] = useState<string | undefined>(undefined)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ name: string; slug: string } | null>(null)

  // Debounced live preview — fetches the REAL name/slug the server would
  // produce (previewCommunityName calls the exact same normalization + slug
  // generation requestCommunity() uses), so this can't drift.
  useEffect(() => {
    if (!activity.trim()) { setPreview(null); return }
    const t = setTimeout(async () => {
      const result = await previewCommunityName(activity)
      setPreview(result)
    }, 300)
    return () => clearTimeout(t)
  }, [activity])

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!activity.trim()) {
      setError('Tell us what this circle is about.')
      return
    }
    setSubmitting(true)
    setError(null)

    let coverUrl: string | undefined
    if (coverFile) {
      const fd = new FormData()
      fd.append('file', coverFile)
      const uploadResult = await uploadPostImage(fd)
      coverUrl = uploadResult.url ?? undefined
    }

    const result = await requestCommunity({
      name: activity,
      description: description.trim() || undefined,
      cover_image_url: coverUrl,
      city,
      category,
    })

    setSubmitting(false)

    if (result.error || !result.community) {
      setError(result.error ?? 'Failed to submit your request.')
      return
    }

    setSubmitted({ name: result.community.name, slug: result.community.slug })
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--wimc-bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 999, background: 'color-mix(in srgb, var(--wimc-amber) 12%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--wimc-amber)' }}>schedule</span>
        </div>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fontWeight: 700, color: 'var(--wimc-amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          Pending review
        </div>
        <div style={{ fontFamily: 'var(--font-abril)', fontSize: 26, color: 'var(--wimc-text-primary)', marginBottom: 8, lineHeight: 1.15 }}>
          {submitted.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 22 }}>
          wimc.app/circles/{submitted.slug}
        </div>
        <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)', lineHeight: 1.6, maxWidth: 280, marginBottom: 28 }}>
          We&apos;ll review this within 1–2 days and let you know either way. No need to keep checking back.
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 22px', borderRadius: 999, border: '1.5px solid var(--wimc-border-default)', background: 'var(--wimc-bg-elevated)',
            color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      <div style={{ padding: '18px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--font-abril)', fontSize: 21, color: 'var(--wimc-text-primary)' }}>Start a Circle</div>
        <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)', marginTop: 1 }}>
          A short request — we&apos;ll take it from there.
        </div>
      </div>

      {/* Mad-lib name block */}
      <div style={{ margin: '18px 20px', padding: '24px 20px', background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', boxShadow: '2px 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-coral)', marginBottom: 12, textTransform: 'uppercase' }}>
          Your circle&apos;s name
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
          <input
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="Garba"
            maxLength={80}
            style={{
              fontFamily: 'var(--font-abril)', fontSize: 30, color: 'var(--wimc-text-primary)', background: 'transparent',
              border: 'none', borderBottom: '2px dashed var(--wimc-coral)', outline: 'none', padding: '0 2px 4px', minWidth: 90,
            }}
          />
          <span style={{ fontFamily: 'var(--font-abril)', fontSize: 30, color: 'var(--wimc-text-primary)' }}>In My City</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--wimc-text-muted)' }}>link</span>
          <span style={{ fontSize: 12, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            wimc.app/circles/{preview?.slug ?? '…'}
          </span>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            What&apos;s it about? · optional
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A few sentences for people deciding whether to join…"
            maxLength={1000}
            style={{
              width: '100%', minHeight: 64, fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--wimc-text-primary)',
              background: 'transparent', border: 'none', borderBottom: '1px solid var(--wimc-border-default)', outline: 'none', resize: 'none', padding: '8px 2px',
            }}
          />
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
            Cover image · optional
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', border: '2px dashed var(--wimc-border-default)', background: 'var(--wimc-bg-raised)', padding: 20,
              display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left',
            }}
          >
            {coverPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreviewUrl} alt="" style={{ width: 38, height: 38, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(26,39,68,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--wimc-text-muted)' }}>add_photo_alternate</span>
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)', fontWeight: 600, fontFamily: 'var(--font-dm-sans)' }}>
                {coverPreviewUrl ? 'Change cover image' : 'Add a cover image'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-dm-sans)', marginTop: 1 }}>Square works best</div>
            </div>
          </button>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>City</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CITIES.map((c) => (
              <Chip key={c.id} active={city === c.id} onClick={() => setCity(city === c.id ? undefined : c.id)} label={c.name} />
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Category</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CREATOR_CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(category === c.id ? undefined : c.id)} label={c.label} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 40px' }}>
        {error && <div style={{ fontSize: 12, color: 'var(--wimc-coral)', marginBottom: 10 }}>{error}</div>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', border: 'none', cursor: 'pointer', padding: '15px 0', borderRadius: 999, background: 'var(--wimc-coral)',
            color: '#FEFCF8', fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 14.5, opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-dm-sans)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Circles are reviewed within 1–2 days before going live.<br />You&apos;ll be notified either way.
        </div>
      </div>
    </div>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-dm-sans)', fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
        background: active ? 'var(--wimc-coral)' : 'transparent',
        color: active ? '#FEFCF8' : 'var(--wimc-text-secondary)',
        border: active ? 'none' : '1px solid var(--wimc-border-default)',
      }}
    >
      {label}
    </button>
  )
}
