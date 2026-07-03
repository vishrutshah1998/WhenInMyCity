'use client'

/**
 * TrafficViolationFlow — private report-to-authority flow for traffic violations.
 *
 * Legal constraints (all enforced by this component and the server action):
 *  • No public surface: vehicle number, photo, and reporter identity are NEVER
 *    shown to any user other than the person who submitted the report.
 *  • Reporter identity required: the server action calls requireAuth() —
 *    no anonymous submissions.
 *  • Testify warning: displayed as a dedicated step before the user can submit.
 *  • Framing: "report to the authorities." Never "call out" or "public shaming."
 *  • WIMC role: capture + handoff only. We do not forward to police ourselves —
 *    the user sends the pre-filled message directly from their device.
 *
 * Do NOT add list/feed/browse views for traffic violation data anywhere in the app.
 */

import { useState, useRef, useEffect } from 'react'
import { submitCivicReport }      from '@/app/actions/civicReport'
import { uploadCivicReportPhoto } from '@/app/actions/upload'
import type { ForwardStatus }     from '@/app/actions/civicReport'
import AmcHandoffCard             from './AmcHandoffCard'

// ── Consent key (distinct from civic report consent — different data category) ─
// Traffic violation reports involve third-party vehicle data and may lead to legal
// proceedings — this requires separate, purpose-specific consent under DPDP §6.

const TRAFFIC_CONSENT_KEY = 'wimc_traffic_report_consent_v1'

// ── Violation types ────────────────────────────────────────────────────────────

const VIOLATION_TYPES = [
  { key: 'wrong_parking',  label: 'Wrong parking',         emoji: '🅿️' },
  { key: 'signal_jumping', label: 'Signal jumping',         emoji: '🚦' },
  { key: 'rash_driving',   label: 'Rash / dangerous driving', emoji: '💨' },
  { key: 'wrong_way',      label: 'Wrong-way driving',      emoji: '↩️' },
  { key: 'no_helmet',      label: 'No helmet (two-wheeler)', emoji: '⛑️' },
  { key: 'triple_riding',  label: 'Triple riding',           emoji: '🛵' },
  { key: 'no_seatbelt',    label: 'No seat belt',            emoji: '🚗' },
  { key: 'phone_driving',  label: 'Phone while driving',     emoji: '📱' },
  { key: 'overloading',    label: 'Overloading',             emoji: '🚛' },
  { key: 'drunk_driving',  label: 'Drunk / impaired driving',emoji: '⚠️' },
] as const

type ViolationType = (typeof VIOLATION_TYPES)[number]['key']

// ── Steps ─────────────────────────────────────────────────────────────────────

type Step = 'type' | 'evidence' | 'warning' | 'submitted'

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

export default function TrafficViolationFlow({
  refLat, refLng, usingUserLoc, locLoading, onRequestLocation, onClose,
}: Props) {
  const [step,           setStep]           = useState<Step>('type')
  const [violationType,  setViolationType]  = useState<ViolationType | null>(null)
  const [vehicleNumber,  setVehicleNumber]  = useState('')
  const [description,    setDescription]    = useState('')
  const [photoFile,      setPhotoFile]      = useState<File | null>(null)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [attachLocation, setAttachLocation] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [priorConsent,   setPriorConsent]   = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [submitError,    setSubmitError]    = useState<string | null>(null)
  const [result,         setResult]         = useState<{
    id: string; forward_status: ForwardStatus
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const prior = !!localStorage.getItem(TRAFFIC_CONSENT_KEY)
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

  async function handleSubmit() {
    if (!violationType || !vehicleNumber.trim() || !consentChecked) return
    setUploading(true)
    setSubmitError(null)

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
      category:       'traffic',
      subcategory:    violationType,
      description:    description.trim() || undefined,
      photo_ref:      photoRef ?? undefined,
      lat:            attachLocation ? refLat : undefined,
      lng:            attachLocation ? refLng : undefined,
      vehicle_number: vehicleNumber.trim().toUpperCase(),
    })

    setUploading(false)

    if (!res.success) {
      setSubmitError(res.error)
      return
    }

    localStorage.setItem(TRAFFIC_CONSENT_KEY, '1')
    setResult({ id: res.id, forward_status: res.forward_status })
    setStep('submitted')
  }

  const violationLabel = violationType
    ? VIOLATION_TYPES.find(v => v.key === violationType)?.label ?? violationType
    : ''

  // ── Shared styles ──────────────────────────────────────────────────────────

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)',
    marginBottom: 10,
  }

  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '13px', borderRadius: 10,
    background: disabled ? 'var(--wimc-bg-overlay)' : '#F57C00',  // amber — distinct from coral
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
        background: 'rgba(0,0,0,0.78)',
        zIndex: 200,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--wimc-bg-base)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh', overflowY: 'auto',
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
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '12px 20px 16px',
          borderBottom: '1px solid var(--wimc-border-subtle)',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)' }}>
              {step === 'submitted' ? 'Report submitted' : 'Report a traffic violation'}
            </div>
            {step !== 'submitted' && (
              <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginTop: 3, lineHeight: 1.4 }}>
                Private report to Gujarat Traffic Police only
              </div>
            )}
          </div>
          {step !== 'submitted' && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--wimc-text-muted)', fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Authority-only badge ──────────────────────────────────────── */}
        {step !== 'submitted' && (
          <div style={{
            margin: '12px 20px 0',
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(245,124,0,0.08)',
            border: '1px solid rgba(245,124,0,0.25)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: '#F57C00',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            <span>🔒</span>
            <span>This report goes to the authorities only — it is never shown to other users</span>
          </div>
        )}

        {/* ── Step progress dots ────────────────────────────────────────── */}
        {step !== 'submitted' && (
          <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0', justifyContent: 'center' }}>
            {(['type', 'evidence', 'warning'] as Step[]).map((s, i) => {
              const stepIdx = ['type', 'evidence', 'warning', 'submitted'].indexOf(step)
              const past    = i < stepIdx
              const current = s === step
              return (
                <div
                  key={s}
                  style={{
                    width: current ? 20 : 6, height: 6, borderRadius: 3,
                    background: current
                      ? '#F57C00'
                      : past
                        ? 'rgba(245,124,0,0.35)'
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
              Step 1 — Violation type
          ══════════════════════════════════════════════════════════════ */}
          {step === 'type' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <div style={sectionLabel}>What type of violation?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  {VIOLATION_TYPES.map(v => {
                    const active = violationType === v.key
                    return (
                      <button
                        key={v.key}
                        onClick={() => setViolationType(v.key)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          gap: 5, padding: '12px 12px',
                          borderRadius: 11,
                          border: `1.5px solid ${active ? '#F57C00' : 'var(--wimc-border-default)'}`,
                          background: active ? 'rgba(245,124,0,0.1)' : 'var(--wimc-bg-elevated)',
                          cursor: 'pointer', transition: 'all 150ms', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{v.emoji}</span>
                        <span style={{
                          fontSize: 12, fontWeight: active ? 700 : 500,
                          color: active ? '#F57C00' : 'var(--wimc-text-primary)',
                          fontFamily: 'var(--font-dm-sans)', lineHeight: 1.3,
                        }}>
                          {v.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep('evidence')}
                disabled={!violationType}
                style={primaryBtn(!violationType)}
              >
                Next
              </button>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Step 2 — Evidence: vehicle number + photo + location
          ══════════════════════════════════════════════════════════════ */}
          {step === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Violation summary */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(245,124,0,0.08)',
                border: '1px solid rgba(245,124,0,0.25)',
              }}>
                <span style={{ fontSize: 20 }}>
                  {VIOLATION_TYPES.find(v => v.key === violationType)?.emoji}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F57C00', flex: 1 }}>
                  {violationLabel}
                </span>
                <button
                  onClick={() => setStep('type')}
                  style={{
                    fontSize: 11, color: 'var(--wimc-text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  Change
                </button>
              </div>

              {/* Vehicle registration number — required */}
              <div>
                <div style={{ ...sectionLabel, marginBottom: 6 }}>
                  Vehicle registration number <span style={{ color: '#F57C00' }}>*</span>
                </div>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value.slice(0, 20))}
                  placeholder="e.g. GJ 05 DQ 1234"
                  autoCapitalize="characters"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: `1.5px solid ${vehicleNumber.trim() ? 'rgba(245,124,0,0.5)' : 'var(--wimc-border-subtle)'}`,
                    background: 'var(--wimc-bg-elevated)',
                    color: 'var(--wimc-text-primary)',
                    fontSize: 15, fontWeight: 700, letterSpacing: '0.05em',
                    fontFamily: 'var(--font-jetbrains-mono)',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <div style={{
                  marginTop: 5, fontSize: 10, color: 'var(--wimc-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  As shown on the vehicle plate. Required to file the report.
                </div>
              </div>

              {/* Photo */}
              <div>
                <div style={sectionLabel}>Photo of violation (recommended)</div>
                {photoPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Violation photo preview"
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
                      width: '100%', padding: '18px', borderRadius: 10,
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
                <div style={sectionLabel}>Location of violation (recommended)</div>
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
                          : 'Not attached until you turn this on.'}
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
                        background: attachLocation ? '#F57C00' : 'var(--wimc-bg-overlay)',
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
                  placeholder="Brief description — time, direction, context…"
                  rows={3}
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

              <button
                onClick={() => setStep('warning')}
                disabled={!vehicleNumber.trim()}
                style={primaryBtn(!vehicleNumber.trim())}
              >
                Review &amp; submit
              </button>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Step 3 — Testify warning + consent + submit
          ══════════════════════════════════════════════════════════════ */}
          {step === 'warning' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Report summary */}
              <div style={{
                background: 'var(--wimc-bg-elevated)',
                border: '1px solid var(--wimc-border-default)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(245,124,0,0.1)',
                  borderBottom: '1px solid var(--wimc-border-subtle)',
                  fontSize: 11, fontWeight: 700, color: '#F57C00',
                  fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Report summary
                </div>
                {[
                  ['Violation',   violationLabel],
                  ['Vehicle',     vehicleNumber.trim().toUpperCase()],
                  ['Photo',       photoFile ? `${photoFile.name} (${(photoFile.size / 1024).toFixed(0)} KB)` : 'None'],
                  ['Location',    attachLocation && usingUserLoc ? `${refLat.toFixed(5)}, ${refLng.toFixed(5)}` : 'Not attached'],
                  ['Description', description.trim() || 'None'],
                  ['Forwarded to','Gujarat Traffic Police (via your device)'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', gap: 12, padding: '10px 14px',
                      borderBottom: '1px solid var(--wimc-border-subtle)',
                      fontSize: 13,
                    }}
                  >
                    <span style={{
                      color: 'var(--wimc-text-muted)', minWidth: 100, flexShrink: 0,
                      fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11,
                    }}>
                      {label}
                    </span>
                    <span style={{
                      color: label === 'Vehicle' ? '#F57C00' : 'var(--wimc-text-primary)',
                      fontWeight: label === 'Vehicle' ? 700 : 400,
                      wordBreak: 'break-word',
                      fontFamily: label === 'Vehicle' ? 'var(--font-jetbrains-mono)' : 'inherit',
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Testify warning — mandatory display ─────────────────── */}
              <div style={{
                padding: '16px',
                background: 'rgba(198,40,40,0.06)',
                border: '1.5px solid rgba(198,40,40,0.35)',
                borderRadius: 12,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                  fontSize: 14, fontWeight: 700, color: '#C62828',
                  fontFamily: 'var(--font-syne)',
                }}>
                  <span>⚖️</span>
                  Before you submit — read this
                </div>
                <ul style={{
                  margin: 0, paddingLeft: 16,
                  display: 'flex', flexDirection: 'column', gap: 9,
                  fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.65,
                }}>
                  <li>
                    <strong style={{ color: 'var(--wimc-text-primary)' }}>You may be summoned to testify.</strong>{' '}
                    Submitting evidence of a traffic violation means you are a witness. If the matter
                    proceeds to adjudication under the Motor Vehicles Act, 1988, or applicable state
                    traffic rules, the authorities may summon you to appear in court or before an
                    adjudicating officer.
                  </li>
                  <li>
                    <strong style={{ color: 'var(--wimc-text-primary)' }}>Your identity is attached.</strong>{' '}
                    This report is not anonymous. Your authenticated account is linked to this
                    submission and may be shared with the authorities upon their request.
                  </li>
                  <li>
                    <strong style={{ color: 'var(--wimc-text-primary)' }}>False reports are an offence.</strong>{' '}
                    Filing a knowingly false or fabricated report is an offence under applicable law
                    (BNS §218 / IPC §177 equivalent, and relevant MV Act provisions).
                  </li>
                  <li>
                    <strong style={{ color: 'var(--wimc-text-primary)' }}>WIMC's role is limited.</strong>{' '}
                    When In My City stores this report privately and provides you a pre-filled
                    message to send to the Traffic Police. We do not publish this report, do not
                    share it with other users, and do not act on it ourselves.
                  </li>
                </ul>
              </div>

              {/* DPDP notice (condensed for returning consenters) */}
              {!priorConsent && (
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(155,143,255,0.06)',
                  border: '1px solid rgba(155,143,255,0.2)',
                  borderRadius: 10,
                  fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.65,
                }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--wimc-text-primary)' }}>
                    🔒 Data collected
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>Vehicle number, photo (if added), and location (if attached) are stored privately by WIMC and forwarded to Gujarat Traffic Police via a pre-filled message you send from your device.</li>
                    <li>This data is used solely for the purpose of reporting a traffic violation to the authorities.</li>
                    <li>You can request erasure at any time by emailing{' '}
                      <a href="mailto:grievance@wheninmycity.com?subject=DPDP%20Erasure%20Request" style={{ color: '#9B8FFF' }}>
                        grievance@wheninmycity.com
                      </a>.
                    </li>
                  </ul>
                </div>
              )}

              {/* Consent checkbox */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                cursor: 'pointer', fontSize: 13, color: 'var(--wimc-text-primary)', lineHeight: 1.5,
              }}>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: '#F57C00', width: 16, height: 16 }}
                />
                I have read the above, understand I may be summoned to testify, confirm the
                information is accurate to the best of my knowledge, and consent to WIMC
                storing and forwarding this report to the Gujarat Traffic Police.
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
                  onClick={() => setStep('evidence')}
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
                  {uploading ? 'Submitting…' : 'Submit to authorities'}
                </button>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Step 4 — Submitted confirmation
          ══════════════════════════════════════════════════════════════ */}
          {step === 'submitted' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                <div style={{
                  fontSize: 18, fontWeight: 800, color: 'var(--wimc-text-primary)',
                  fontFamily: 'var(--font-syne)', marginBottom: 8,
                }}>
                  Report saved
                </div>
                <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.65 }}>
                  Your evidence is stored privately. Use the handoff below to send it
                  directly to Gujarat Traffic Police from your device.
                </div>
              </div>

              {/* WIMC reference */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--wimc-bg-elevated)',
                border: '1px solid var(--wimc-border-subtle)',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--wimc-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 6,
                }}>
                  WIMC reference (private)
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--wimc-text-primary)',
                  fontFamily: 'var(--font-jetbrains-mono)', wordBreak: 'break-all',
                }}>
                  {result.id}
                </div>
              </div>

              {/* Handoff card — always shown (no automatic police API) */}
              <AmcHandoffCard
                reportId={result.id}
                forwardTarget="traffic_police"
                category="traffic"
                description={description || undefined}
                lat={attachLocation ? refLat : undefined}
                lng={attachLocation ? refLng : undefined}
                vehicleNumber={vehicleNumber.trim().toUpperCase()}
                violationLabel={violationLabel}
              />

              {/* Privacy + disclaimer footer */}
              <div style={{
                padding: '14px',
                background: 'rgba(155,143,255,0.05)',
                border: '1px solid rgba(155,143,255,0.15)',
                borderRadius: 10,
                fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.65,
              }}>
                <strong style={{ color: 'var(--wimc-text-primary)' }}>Privacy:</strong>{' '}
                This report is visible only to you. WIMC does not publish traffic violation
                reports to other users or any public surface. To request erasure, email{' '}
                <a href="mailto:grievance@wheninmycity.com?subject=DPDP%20Erasure%20Request" style={{ color: '#9B8FFF' }}>
                  grievance@wheninmycity.com
                </a>.
              </div>

              <button onClick={onClose} style={primaryBtn(false)}>
                Done
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
