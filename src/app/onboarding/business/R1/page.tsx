'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { uploadOnboardingAvatar } from '@/app/actions/onboarding'
import { BrandNoticeAd } from '@/components/onboarding/BoardingPassArtifact'

const ACCENT = '#F5A800'
const NAVY   = '#1A2744'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"

// Brand path: 6 global steps (B2, B3, R1, R3, R4, R5)
function BrandStepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const done    = i < current - 1
        const active  = i === current - 1
        return (
          <div key={i} style={{
            width:      22, height: 8, borderRadius: 4,
            background: done || active ? ACCENT : 'rgba(255,255,255,0.10)',
            boxShadow:  active ? `0 0 10px rgba(245,168,0,0.5)` : 'none',
            transition: 'all 200ms',
          }} />
        )
      })}
      <span style={{ fontFamily: MONO, fontSize: 10, color: `${ACCENT}99`, letterSpacing: '0.10em', marginLeft: 6 }}>
        0{current} / 06
      </span>
    </div>
  )
}

export default function R1Page() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [bName,        setBName]        = useState('')
  const [bCity,        setBCity]        = useState('')
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null)
  const [logoName,     setLogoName]     = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const [nameFocused,  setNameFocused]  = useState(false)
  const [dragOver,     setDragOver]     = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'brand') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    const savedLogo = sessionStorage.getItem(SK.b_logo_url)
    if (savedLogo) setLogoPreview(savedLogo)
  }, [router])

  async function uploadFile(file: File) {
    setLogoName(file.name)
    setLogoPreview(URL.createObjectURL(file))
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadOnboardingAvatar(fd)
    setUploading(false)
    if (result.error) { setUploadError(result.error); return }
    if (result.url) {
      try { sessionStorage.setItem(SK.b_logo_url, result.url) } catch {}
      setLogoPreview(result.url)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) await uploadFile(file)
  }

  function handleNameChange(val: string) {
    setBName(val)
    try { sessionStorage.setItem(SK.b_name, val) } catch {}
  }

  function handleNext() {
    if (bName.trim().length < 2) return
    router.push('/onboarding/business/R3')
  }

  const canProceed = bName.trim().length >= 2

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <BrandNoticeAd
          name={bName || undefined}
          city={bCity || undefined}
          accent={ACCENT}
        />

        <BrandStepDots current={3} />

        <p style={{ fontFamily: MONO, fontSize: 9, color: `${ACCENT}99`, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          — BRAND IDENTITY
        </p>
        <h1 style={{
          fontFamily: ABRIL,
          fontSize:   'clamp(32px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 32px',
        }}>
          What&apos;s the brand called?
        </h1>

        {/* Brand name */}
        <div style={{ marginBottom: 36 }}>
          <label style={{
            fontFamily:    MONO, fontSize: 10, color: '#F0EFF8',
            textTransform: 'uppercase', letterSpacing: '0.20em',
            display: 'block', marginBottom: 8,
          }}>BRAND NAME</label>
          <input
            type="text"
            value={bName}
            onChange={e => handleNameChange(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            placeholder="Brand Name..."
            autoComplete="off"
            autoFocus
            style={{
              width:         '100%',
              background:    'transparent',
              border:        'none',
              borderBottom:  `2px solid ${nameFocused || bName ? ACCENT : 'rgba(255,255,255,0.15)'}`,
              fontFamily:    "'Outfit', sans-serif",
              fontWeight:    900,
              fontSize:      28,
              color:         '#F0EFF8',
              outline:       'none',
              paddingBottom: 8,
              caretColor:    ACCENT,
              transition:    'border-color 200ms',
              textTransform: 'uppercase',
            }}
          />
        </div>

        {/* Logo upload */}
        <div>
          <label style={{
            fontFamily:    MONO, fontSize: 10, color: '#F0EFF8',
            textTransform: 'uppercase', letterSpacing: '0.20em',
            display: 'block', marginBottom: 8,
          }}>LOGO ASSET <span style={{ color: '#5C5A72', letterSpacing: 0, textTransform: 'none' }}>(optional)</span></label>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            style={{ display: 'none' }}
          />

          {logoPreview ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        14,
                background: `${ACCENT}0A`,
                border:     `1px solid ${ACCENT}50`,
                padding:    '14px 16px',
                cursor:     'pointer',
                width:      '100%',
                textAlign:  'left',
                transition: 'all 150ms',
              }}
            >
              <img
                src={logoPreview}
                alt=""
                style={{
                  width: 44, height: 44, objectFit: 'contain',
                  borderRadius: 4, border: `1px solid ${ACCENT}30`, flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600, fontSize: 13, color: ACCENT, marginBottom: 2,
                }}>{logoName ?? 'Logo uploaded'}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#5C5A72' }}>
                  Click to replace
                </div>
              </div>
              <span style={{ fontSize: 18, color: `${ACCENT}80` }}>✓</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={uploading}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            10,
                background:     dragOver ? `${ACCENT}10` : 'transparent',
                border:         `1px dashed ${dragOver ? ACCENT : ACCENT + '40'}`,
                padding:        36,
                cursor:         uploading ? 'wait' : 'pointer',
                width:          '100%',
                transition:     'all 200ms',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: ACCENT, opacity: uploading ? 0.5 : 1 }}>
                {uploading ? 'hourglass_empty' : 'upload_file'}
              </span>
              <span style={{
                fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
                fontWeight:    600, fontSize: 11,
                color:         uploading ? 'rgba(255,255,255,0.30)' : ACCENT,
                letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                {uploading ? 'Uploading...' : 'Upload Brand Logo'}
              </span>
              {!uploading && (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#5C5A72' }}>
                  SVG, PNG or WebP · max 5 MB · or drag & drop
                </span>
              )}
              {uploadError && (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B' }}>
                  {uploadError}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, height: 72,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: `linear-gradient(to top, ${NAVY} 60%, transparent 100%)`,
      }}>
        <button type="button" onClick={() => router.push('/onboarding/business/B2')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              NODE_ID: R001-BRAND
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: canProceed ? ACCENT : 'rgba(255,255,255,0.20)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              STATUS: {canProceed ? 'NAME_CONFIRMED' : 'AWAITING_NAME'}
            </span>
          </div>
          <button type="button" onClick={handleNext} disabled={!canProceed}
            style={{
              background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
              color:         canProceed ? NAVY : 'rgba(255,255,255,0.22)',
              fontFamily:    ABRIL, fontSize: 15, textTransform: 'uppercase',
              padding:       '12px 28px', border: 'none',
              boxShadow:     canProceed ? '8px 8px 0px 0px rgba(0,0,0,0.9)' : 'none',
              cursor:        canProceed ? 'pointer' : 'not-allowed',
              transition:    'all 150ms',
            }}>
            NEXT STEP →
          </button>
        </div>
      </footer>
    </>
  )
}
