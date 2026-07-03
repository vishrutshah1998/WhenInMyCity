'use client'

import { useState, useRef, useEffect } from 'react'
import { submitCivicReport }       from '@/app/actions/civicReport'
import { uploadCivicReportPhoto }  from '@/app/actions/upload'
import type { CivicCategory, ForwardTarget, ForwardStatus } from '@/app/actions/civicReport'
import AmcHandoffCard from './AmcHandoffCard'

// ── Consent localStorage key (purpose-specific; separate from City Guide key) ─

const REPORT_CONSENT_KEY = 'wimc_civic_report_consent_v1'

// ── Category taxonomy (UI copy mirrors server FORWARD_TARGET map) ──────────────

const CATEGORY_CONFIG: {
  key:    CivicCategory
  label:  string
  emoji:  string
  color:  string
  target: ForwardTarget
  targetLabel: string
}[] = [
  { key: 'garbage',         label: 'Garbage',       emoji: '🗑',  color: '#4CAF50', target: 'swachhata',     targetLabel: 'Swachhata Platform' },
  { key: 'open_defecation', label: 'Sanitation',     emoji: '🚻',  color: '#009688', target: 'swachhata',     targetLabel: 'Swachhata Platform' },
  { key: 'pothole',         label: 'Pothole',        emoji: '🕳',  color: '#FF7043', target: 'amc_channel',   targetLabel: 'AMC Grievance Portal' },
  { key: 'streetlight',     label: 'Streetlight',    emoji: '💡',  color: '#FFC107', target: 'amc_channel',   targetLabel: 'AMC Grievance Portal' },
  { key: 'waterlogging',    label: 'Waterlogging',   emoji: '🌊',  color: '#2196F3', target: 'amc_channel',   targetLabel: 'AMC Grievance Portal' },
  { key: 'water_supply',    label: 'Water Supply',   emoji: '💧',  color: '#03A9F4', target: 'amc_channel',   targetLabel: 'AMC Grievance Portal' },
  { key: 'tree',            label: 'Tree / Debris',  emoji: '🌳',  color: '#795548', target: 'amc_channel',   targetLabel: 'AMC Grievance Portal' },
  { key: 'traffic',         label: 'Traffic Issue',  emoji: '🚦',  color: '#F44336', target: 'traffic_police', targetLabel: 'Traffic Police' },
]

const SUBCATEGORIES: Record<CivicCategory, { key: string; label: string }[]> = {
  garbage:         [{ key: 'not_collected',   label: 'Not collected'      }, { key: 'overflowing_bin', label: 'Overflowing bin'   }, { key: 'illegal_dumping', label: 'Illegal dumping'  }],
  open_defecation: [{ key: 'open_defecation', label: 'Open defecation'    }, { key: 'no_toilet',       label: 'No public toilet'  }],
  pothole:         [{ key: 'pothole',         label: 'Road pothole'       }, { key: 'road_damage',     label: 'Road damage'       }, { key: 'missing_manhole', label: 'Missing manhole'  }],
  streetlight:     [{ key: 'light_out',       label: 'Light not working'  }, { key: 'flickering',      label: 'Flickering light'  }, { key: 'damaged_pole',    label: 'Damaged pole'     }],
  waterlogging:    [{ key: 'waterlogging',    label: 'Waterlogging'       }, { key: 'blocked_drain',   label: 'Blocked drain'     }],
  water_supply:    [{ key: 'no_supply',       label: 'No water supply'    }, { key: 'leaking_pipe',    label: 'Leaking pipe'      }, { key: 'contamination',   label: 'Contamination'    }],
  tree:            [{ key: 'fallen_tree',     label: 'Fallen tree'        }, { key: 'dangerous_branch',label: 'Dangerous branch'  }],
  traffic:         [{ key: 'signal_fault',    label: 'Signal fault'       }, { key: 'wrong_parking',   label: 'Wrong parking'     }, { key: 'road_blockage',   label: 'Road blockage'    }],
}

// ── Steps ─────────────────────────────────────────────────────────────────────

type Step = 'category' | 'details' | 'consent' | 'submitted'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  refLat:            number
  refLng:            number
  usingUserLoc:      boolean
  locLoading:        boolean
  onRequestLocation: () => void
  onClose:           () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CivicReportFlow({
  refLat, refLng, usingUserLoc, locLoading, onRequestLocation, onClose,
}: Props) {
  const [step,           setStep]           = useState<Step>('category')
  const [category,       setCategory]       = useState<CivicCategory | null>(null)
  const [subcategory,    setSubcategory]    = useState<string | null>(null)
  const [description,    setDescription]    = useState('')
  const [photoFile,      setPhotoFile]      = useState<File | null>(null)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [attachLocation, setAttachLocation] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [priorConsent,   setPriorConsent]   = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [submitError,    setSubmitError]    = useState<string | null>(null)
  const [result,         setResult]         = useState<{
    id: string; forward_target: ForwardTarget; forward_status: ForwardStatus; external_reference: string | null
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const prior = !!localStorage.getItem(REPORT_CONSENT_KEY)
    setPriorConsent(prior)
    if (prior) setConsentChecked(true)
  }, [])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function selectCategory(key: CivicCategory) {
    setCategory(key)
    setSubcategory(null)
  }

  async function handleSubmit() {
    if (!category || !consentChecked) return
    setUploading(true)
    setSubmitError(null)

    // Upload photo before calling the report action so we can surface upload
    // errors at the consent step rather than silently losing the image.
    let photoRef: string | null = null
    if (photoFile) {
      const fd = new FormData()
      fd.append('file', photoFile)
      const up = await uploadCivicReportPhoto(fd)
      if (up.error || !up.path) {
        setSubmitError(up.error ?? 'Photo upload failed. Please try again.')
        setUploading(false)
        return
      }
      photoRef = up.path
    }

    const res = await submitCivicReport({
      category,
      subcategory:  subcategory  ?? undefined,
      description:  description.trim() || undefined,
      photo_ref:    photoRef     ?? undefined,
      lat:          attachLocation ? refLat : undefined,
      lng:          attachLocation ? refLng : undefined,
    })

    setUploading(false)

    if (!res.success) {
      setSubmitError(res.error)
      return
    }

    localStorage.setItem(REPORT_CONSENT_KEY, '1')
    setResult({ id: res.id, forward_target: res.forward_target, forward_status: res.forward_status, external_reference: res.external_reference })
    setStep('submitted')
  }

  const catConfig   = category ? CATEGORY_CONFIG.find(c => c.key === category) : null
  const subcatList  = category ? SUBCATEGORIES[category] : []

  // ── Shared styles ──────────────────────────────────────────────────────────

  const chip = (active: boolean, color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '6px 13px', borderRadius: 9999,
    fontSize: 12, fontWeight: active ? 600 : 400,
    border: `1.5px solid ${active ? color : 'var(--wimc-border-default)'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : 'var(--wimc-text-secondary)',
    cursor: 'pointer', transition: 'all 150ms',
    fontFamily: 'var(--font-dm-sans)',
  })

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)',
    marginBottom: 10,
  }

  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '13px', borderRadius: 10,
    background: disabled ? 'var(--wimc-bg-overlay)' : 'var(--wimc-coral)',
    color: disabled ? 'var(--wimc-text-muted)' : '#fff',
    fontSize: 14, fontWeight: 700, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-syne)', transition: 'background 150ms',
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 200,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--wimc-bg-base)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '92vh', overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Handle bar ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--wimc-border-default)' }} />
        </div>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 16px',
          borderBottom: '1px solid var(--wimc-border-subtle)',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)' }}>
              {step === 'submitted' ? 'Report submitted' : 'Report an issue'}
            </div>
            {step !== 'submitted' && (
              <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginTop: 2 }}>
                WIMC forwards your report — we do not resolve it
              </div>
            )}
          </div>
          {step !== 'submitted' && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--wimc-text-muted)', fontSize: 20, lineHeight: 1, padding: 4,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Step progress dots ────────────────────────────────────────── */}
        {step !== 'submitted' && (
          <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0', justifyContent: 'center' }}>
            {(['category', 'details', 'consent'] as Step[]).map((s, i) => {
              const stepIdx = ['category', 'details', 'consent', 'submitted'].indexOf(step)
              const past    = i < stepIdx
              const current = s === step
              return (
                <div
                  key={s}
                  style={{
                    width: current ? 20 : 6, height: 6, borderRadius: 3,
                    background: current
                      ? 'var(--wimc-coral)'
                      : past
                        ? 'rgba(232,87,42,0.4)'
                        : 'var(--wimc-border-default)',
                    transition: 'all 250ms',
                  }}
                />
              )
            })}
          </div>
        )}

        <div style={{ padding: '20px 20px 24px' }}>

          {/* ══════════════════════════════════════════════════════════════
              Step 1 — Category
          ══════════════════════════════════════════════════════════════ */}
          {step === 'category' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <div style={sectionLabel}>What type of issue?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {CATEGORY_CONFIG.map(c => {
                    const active = category === c.key
                    return (
                      <button
                        key={c.key}
                        onClick={() => selectCategory(c.key)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          gap: 6, padding: '14px 14px',
                          borderRadius: 12,
                          border: `1.5px solid ${active ? c.color : 'var(--wimc-border-default)'}`,
                          background: active ? `${c.color}18` : 'var(--wimc-bg-elevated)',
                          cursor: 'pointer', transition: 'all 150ms', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{c.emoji}</span>
                        <span style={{
                          fontSize: 13, fontWeight: active ? 700 : 500,
                          color: active ? c.color : 'var(--wimc-text-primary)',
                          fontFamily: 'var(--font-dm-sans)', lineHeight: 1.2,
                        }}>
                          {c.label}
                        </span>
                        <span style={{
                          fontSize: 10, color: 'var(--wimc-text-muted)',
                          fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.04em',
                        }}>
                          → {c.targetLabel}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Subcategory chips — appear once a category is selected */}
              {category && subcatList.length > 0 && (
                <div>
                  <div style={sectionLabel}>More specifically</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {subcatList.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setSubcategory(subcategory === s.key ? null : s.key)}
                        style={chip(subcategory === s.key, catConfig?.color ?? '#9B8FFF')}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('details')}
                disabled={!category}
                style={primaryBtn(!category)}
              >
                Next
              </button>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Step 2 — Photo + geo + description
          ══════════════════════════════════════════════════════════════ */}
          {step === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Category summary */}
              {catConfig && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: `${catConfig.color}12`,
                  border: `1px solid ${catConfig.color}33`,
                }}>
                  <span style={{ fontSize: 20 }}>{catConfig.emoji}</span>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: catConfig.color }}>
                      {catConfig.label}
                    </span>
                    {subcategory && (
                      <span style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginLeft: 8 }}>
                        {subcatList.find(s => s.key === subcategory)?.label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setStep('category')}
                    style={{
                      marginLeft: 'auto', fontSize: 11, color: 'var(--wimc-text-muted)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Photo */}
              <div>
                <div style={sectionLabel}>Photo (optional)</div>
                {photoPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Report photo preview"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      onClick={clearPhoto}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: 28, height: 28, fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '20px', borderRadius: 10,
                      border: '1.5px dashed var(--wimc-border-default)',
                      background: 'var(--wimc-bg-elevated)',
                      color: 'var(--wimc-text-secondary)',
                      fontSize: 13, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>📷</span>
                    <span>Tap to add a photo</span>
                    <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)' }}>
                      JPEG / PNG / WebP · max 10 MB
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Location */}
              <div>
                <div style={sectionLabel}>Location (optional)</div>
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--wimc-bg-elevated)',
                  border: '1px solid var(--wimc-border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--wimc-text-primary)' }}>
                        Attach my location
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 2, lineHeight: 1.5 }}>
                        {attachLocation
                          ? 'Your coordinates will be stored and forwarded with this report.'
                          : 'Your coordinates are not attached or stored until you turn this on.'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!attachLocation && !usingUserLoc) onRequestLocation()
                        setAttachLocation(a => !a)
                      }}
                      style={{
                        flexShrink: 0, marginLeft: 14,
                        width: 44, height: 24, borderRadius: 9999, border: 'none',
                        background: attachLocation ? 'var(--wimc-coral)' : 'var(--wimc-bg-overlay)',
                        position: 'relative', cursor: 'pointer', transition: 'background 200ms',
                      }}
                      aria-label={attachLocation ? 'Remove location' : 'Attach location'}
                    >
                      <div style={{
                        position: 'absolute', top: 3,
                        left: attachLocation ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#fff', transition: 'left 200ms',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }} />
                    </button>
                  </div>

                  {attachLocation && !usingUserLoc && (
                    <button
                      onClick={onRequestLocation}
                      disabled={locLoading}
                      style={{
                        marginTop: 10, padding: '6px 14px', borderRadius: 7,
                        border: '1px solid var(--wimc-border-default)',
                        background: 'var(--wimc-bg-base)',
                        color: 'var(--wimc-text-primary)',
                        fontSize: 12, fontWeight: 500, cursor: locLoading ? 'default' : 'pointer',
                        opacity: locLoading ? 0.6 : 1, fontFamily: 'var(--font-dm-sans)',
                      }}
                    >
                      {locLoading ? 'Getting location…' : '📍 Use my current location'}
                    </button>
                  )}

                  {attachLocation && usingUserLoc && (
                    <div style={{
                      marginTop: 10, fontSize: 11, color: 'var(--wimc-teal)',
                      fontFamily: 'var(--font-jetbrains-mono)',
                    }}>
                      ✓ Location captured ({refLat.toFixed(4)}, {refLng.toFixed(4)})
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={sectionLabel}>Description (optional)</span>
                  <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Brief description of the issue…"
                  rows={4}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--wimc-border-subtle)',
                    background: 'var(--wimc-bg-elevated)',
                    color: 'var(--wimc-text-primary)',
                    fontSize: 14, lineHeight: 1.6, resize: 'vertical',
                    fontFamily: 'var(--font-dm-sans)',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <button onClick={() => setStep('consent')} style={primaryBtn(false)}>
                Review &amp; submit
              </button>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Step 3 — Consent confirmation
          ══════════════════════════════════════════════════════════════ */}
          {step === 'consent' && catConfig && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Report summary */}
              <div style={{
                background: 'var(--wimc-bg-elevated)',
                border: '1px solid var(--wimc-border-default)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px',
                  background: `${catConfig.color}12`,
                  borderBottom: '1px solid var(--wimc-border-subtle)',
                  fontSize: 11, fontWeight: 700, color: catConfig.color,
                  fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Report summary
                </div>
                {[
                  ['Issue', `${catConfig.emoji} ${catConfig.label}${subcategory ? ` — ${subcatList.find(s => s.key === subcategory)?.label}` : ''}`],
                  ['Photo',       photoFile      ? `${photoFile.name} (${(photoFile.size / 1024).toFixed(0)} KB)` : 'None'],
                  ['Location',    attachLocation && usingUserLoc ? `${refLat.toFixed(5)}, ${refLng.toFixed(5)}` : 'Not attached'],
                  ['Description', description.trim() || 'None'],
                  ['Forwarded to', catConfig.targetLabel],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', gap: 12, padding: '10px 14px',
                      borderBottom: '1px solid var(--wimc-border-subtle)',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--wimc-text-muted)', minWidth: 100, flexShrink: 0, fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>
                      {label}
                    </span>
                    <span style={{ color: 'var(--wimc-text-primary)', wordBreak: 'break-word' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* DPDP consent notice */}
              <div style={{
                padding: '14px',
                background: 'rgba(155,143,255,0.06)',
                border: '1px solid rgba(155,143,255,0.2)',
                borderRadius: 10,
                fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.65,
              }}>
                {priorConsent ? (
                  <p style={{ margin: 0 }}>
                    Your report details above will be forwarded to <strong style={{ color: 'var(--wimc-text-primary)' }}>{catConfig.targetLabel}</strong> by WIMC.
                    Your location (if attached) is stored solely to identify the site of the issue.
                    WIMC does not track resolution — contact the channel directly for follow-up.
                    See our <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#9B8FFF' }}>Privacy Notice §2</a> for retention details.
                  </p>
                ) : (
                  <>
                    <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--wimc-text-primary)' }}>
                      🔒 Before you submit
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <li>Your report (category, description, photo if added, location if attached) will be stored by WIMC and forwarded to <strong>{catConfig.targetLabel}</strong>.</li>
                      <li>Location coordinates you attach are stored to identify the site and forwarded with the report. They are not used for any other purpose.</li>
                      <li>WIMC is a <strong>capture-and-forward service only</strong>. We do not investigate, resolve, or track the status of your report after it is forwarded.</li>
                      <li>You can request erasure of your report data at any time by emailing <a href="mailto:grievance@wheninmycity.com?subject=DPDP%20Erasure%20Request" style={{ color: '#9B8FFF' }}>grievance@wheninmycity.com</a>.</li>
                    </ul>
                  </>
                )}
              </div>

              {/* Consent checkbox */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                cursor: 'pointer', fontSize: 13, color: 'var(--wimc-text-primary)', lineHeight: 1.5,
              }}>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--wimc-coral)', width: 16, height: 16 }}
                />
                I understand that WIMC will forward this report to {catConfig.targetLabel} and does not own or track its resolution.
              </label>

              {submitError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(198,40,40,0.08)',
                  border: '1px solid rgba(198,40,40,0.25)',
                  fontSize: 13, color: '#EF5350',
                }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep('details')}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 10,
                    border: '1px solid var(--wimc-border-default)',
                    background: 'transparent', color: 'var(--wimc-text-secondary)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!consentChecked || uploading}
                  style={{ ...primaryBtn(!consentChecked || uploading), flex: 2 }}
                >
                  {uploading ? 'Submitting…' : 'Submit report'}
                </button>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Step 4 — Submitted confirmation
          ══════════════════════════════════════════════════════════════ */}
          {step === 'submitted' && result && (() => {
            const targetLabel = CATEGORY_CONFIG.find(c => c.key === category)?.targetLabel ?? 'the government channel'
            const forwarded   = result.forward_status === 'forwarded'
            const failed      = result.forward_status === 'failed'
            // pending = Swachhata not yet configured OR non-Swachhata category queued
            // In all non-forwarded cases, Prompt 4's AmcHandoffCard renders below.
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Header — varies by outcome */}
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>
                    {forwarded ? '✅' : failed ? '⚠️' : '📋'}
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 800, color: 'var(--wimc-text-primary)',
                    fontFamily: 'var(--font-syne)', marginBottom: 8,
                  }}>
                    {forwarded ? 'Report forwarded' : failed ? 'Report saved' : 'Report received'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.65 }}>
                    {forwarded
                      ? <>Successfully submitted to <strong style={{ color: 'var(--wimc-text-primary)' }}>{targetLabel}</strong>.</>
                      : failed
                        ? <>Your report was saved but automatic forwarding failed. Use the option below to submit manually.</>
                        : <>Your report is saved and queued. The direct channel to {targetLabel} is below.</>
                    }
                  </div>
                </div>

                {/* Reference block */}
                <div style={{
                  padding: '14px', borderRadius: 10,
                  background: 'var(--wimc-bg-elevated)',
                  border: '1px solid var(--wimc-border-subtle)',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)',
                    fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    WIMC reference
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--wimc-text-primary)',
                    fontFamily: 'var(--font-jetbrains-mono)', wordBreak: 'break-all',
                  }}>
                    {result.id}
                  </div>
                  {/* Channel reference — only present when Swachhata API is live and accepted the complaint */}
                  {result.external_reference && (
                    <>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)',
                        fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginTop: 10, marginBottom: 4,
                      }}>
                        Swachhata complaint ID
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--wimc-teal)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {result.external_reference}
                      </div>
                    </>
                  )}
                </div>

                {/* AMC / Traffic Police handoff — shown when WIMC could not forward
                    automatically (Swachhata not configured, or non-Swachhata category).
                    Card marks forward_status = 'handoff_shown' on mount. */}
                {result.forward_status !== 'forwarded' && (
                  <AmcHandoffCard
                    reportId={result.id}
                    forwardTarget={result.forward_target}
                    category={category!}
                    description={description || undefined}
                    lat={attachLocation ? refLat : undefined}
                    lng={attachLocation ? refLng : undefined}
                  />
                )}

                {/* Disclaimer */}
                <div style={{
                  padding: '14px',
                  background: 'rgba(155,143,255,0.06)',
                  border: '1px solid rgba(155,143,255,0.15)',
                  borderRadius: 10,
                  fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.65,
                }}>
                  <strong style={{ color: 'var(--wimc-text-primary)' }}>WIMC does not track resolution.</strong>{' '}
                  {forwarded
                    ? `Your report has been submitted to ${targetLabel}. For status updates, contact them directly using the complaint ID above.`
                    : `Contact ${targetLabel} directly using the details above to follow up on this issue.`
                  }{' '}
                  To request erasure of your report data, email{' '}
                  <a href="mailto:grievance@wheninmycity.com?subject=DPDP%20Erasure%20Request" style={{ color: '#9B8FFF' }}>
                    grievance@wheninmycity.com
                  </a>.
                </div>

                <button onClick={onClose} style={primaryBtn(false)}>
                  Done
                </button>

              </div>
            )
          })()}

        </div>
      </div>
    </div>
  )
}
