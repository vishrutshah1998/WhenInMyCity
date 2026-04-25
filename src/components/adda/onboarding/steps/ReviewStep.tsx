'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'
import type { OnboardingStep } from '@/lib/adda/onboarding/machine'

const PRICING_LABELS: Record<string, string> = {
  hourly:          'per hour',
  daily:           'per day',
  hourly_minimum:  'per hour',
}

function formatPrice(model: string | undefined, config: Record<string, number> | undefined): string {
  if (!model || !config) return '—'
  if (model === 'hourly') {
    return config.hourlyRate ? `₹${config.hourlyRate.toLocaleString('en-IN')} / hr` : '—'
  }
  if (model === 'daily') {
    return config.fullDayRate ? `₹${config.fullDayRate.toLocaleString('en-IN')} / day` : '—'
  }
  if (model === 'hourly_minimum') {
    const rate = config.hourlyRate ? `₹${config.hourlyRate.toLocaleString('en-IN')} / hr` : '—'
    return config.minimumHours ? `${rate} · Min ${config.minimumHours}h` : rate
  }
  return '—'
}

function formatHours(hours: Record<string, { open: string; close: string; closed: boolean }> | undefined): string {
  if (!hours) return '—'
  const openDays = Object.entries(hours).filter(([, v]) => !v.closed)
  if (openDays.length === 0) return 'By appointment'
  if (openDays.length === 7) {
    const [, first] = openDays[0]
    return `Daily ${first.open} – ${first.close}`
  }
  const [firstKey, firstVal] = openDays[0]
  const [lastKey] = openDays[openDays.length - 1]
  const dayLabel = (k: string) => k.charAt(0).toUpperCase() + k.slice(1, 3)
  return `${dayLabel(firstKey)}–${dayLabel(lastKey)} ${firstVal.open} – ${firstVal.close}`
}

type EditTarget = Extract<OnboardingStep,
  'venueName' | 'address' | 'capacity' | 'pricingModel' | 'openingHours' | 'amenities' | 'photos'>

function EditLink({ target, label, onEdit }: { target: EditTarget; label?: string; onEdit: (t: EditTarget) => void }) {
  return (
    <button
      onClick={() => onEdit(target)}
      style={{
        padding: 0,
        background: 'transparent',
        border: 'none',
        color: 'var(--adda-amber)',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {label ?? 'Edit'}
    </button>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

export default function ReviewStep() {
  const { snapshot, send } = useOnboarding()
  const router = useRouter()
  const answers = snapshot.context.answers

  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [whatNextOpen, setWhatNextOpen] = useState(false)

  const amenityCount = answers.amenities?.length ?? 0
  const topAmenities = answers.amenities?.slice(0, 8) ?? []
  const overflowCount = Math.max(0, amenityCount - 8)
  const photos = (answers.photos as string[] | undefined) ?? []
  const coverPhoto = photos[0]

  const venueTypeLabel: Record<string, string> = {
    studio_gallery:   'Studio / Gallery',
    cafe:             'Café',
    rooftop_terrace:  'Rooftop',
    coworking_office: 'Co-working',
    event_hall:       'Event Hall',
    other:            'Space',
  }

  function handleEdit(target: EditTarget) {
    send({ type: 'BACK_TO', target })
  }

  async function handleGoLive() {
    setPublishing(true)
    setPublishError(null)

    try {
      const res = await fetch('/api/adda/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      // Advance machine to complete
      send({ type: 'NEXT', questionId: 'venueName', value: answers.venueName, displayText: 'Listing published!' })
      router.push('/adda/dashboard?published=1')
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPublishing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Listing preview card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          borderRadius: 14,
          border: '1px solid var(--adda-border-default)',
          background: 'var(--adda-bg-elevated)',
          overflow: 'hidden',
          maxWidth: 520,
        }}
      >
        {/* Cover photo */}
        <div style={{ position: 'relative', aspectRatio: '16 / 7', background: 'var(--adda-bg-overlay)' }}>
          {coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhoto} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 12,
            }}>
              No cover photo
            </div>
          )}
          {coverPhoto && (
            <span style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '2px 8px',
              borderRadius: 100,
              background: 'var(--adda-amber)',
              color: '#000',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              Cover
            </span>
          )}
          <EditLink target="photos" label="Change photos" onEdit={handleEdit} />
        </div>

        {/* Details */}
        <div style={{ padding: '16px 16px 20px' }}>

          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.2,
            }}>
              {answers.venueName ?? 'Unnamed Venue'}
            </h2>
            <EditLink target="venueName" onEdit={handleEdit} />
          </div>

          {/* Location · Type */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{
              fontSize: 13,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}>
              {[answers.city, venueTypeLabel[answers.venueType ?? ''] ?? answers.venueType].filter(Boolean).join(' · ')}
            </span>
            <EditLink target="address" onEdit={handleEdit} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Capacity */}
            <ReviewRow
              label="Capacity"
              value={answers.capacityMin && answers.capacityMax
                ? `Fits ${answers.capacityMin}–${answers.capacityMax} people`
                : '—'}
              editTarget="capacity"
              onEdit={handleEdit}
            />

            {/* Pricing */}
            <ReviewRow
              label="Pricing"
              value={formatPrice(answers.pricingModel, answers.pricingConfig as Record<string, number> | undefined)}
              editTarget="pricingModel"
              onEdit={handleEdit}
            />

            {/* Hours */}
            <ReviewRow
              label="Hours"
              value={formatHours(answers.openingHours)}
              editTarget="openingHours"
              onEdit={handleEdit}
            />

            {/* Amenities */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--adda-text-muted)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  marginBottom: 6,
                }}>
                  Amenities
                </span>
                {amenityCount === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>None added</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {topAmenities.map(slug => (
                      <span key={slug} style={{
                        padding: '3px 9px',
                        borderRadius: 100,
                        background: 'var(--adda-bg-overlay)',
                        border: '1px solid var(--adda-border-subtle)',
                        fontSize: 11,
                        color: 'var(--adda-text-secondary)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      }}>
                        {slug.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {overflowCount > 0 && (
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: 100,
                        background: 'var(--adda-amber-tint)',
                        border: '1px solid var(--adda-amber-border)',
                        fontSize: 11,
                        color: 'var(--adda-amber)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontWeight: 600,
                      }}>
                        +{overflowCount} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <EditLink target="amenities" onEdit={handleEdit} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {publishError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: 13,
              color: '#f87171',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              lineHeight: 1.5,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(248,113,113,0.25)',
              background: 'rgba(248,113,113,0.08)',
            }}
          >
            {publishError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Go live button */}
      <button
        onClick={handleGoLive}
        disabled={publishing}
        style={{
          width: '100%',
          maxWidth: 520,
          padding: '14px 24px',
          borderRadius: 10,
          background: publishing ? 'var(--adda-bg-overlay)' : 'var(--adda-amber)',
          color: publishing ? 'var(--adda-text-muted)' : '#000',
          fontWeight: 700,
          fontSize: 16,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          border: 'none',
          cursor: publishing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 150ms ease, color 150ms ease',
        }}
      >
        {publishing ? (
          <>
            <Spinner />
            Publishing…
          </>
        ) : (
          'Go Live →'
        )}
      </button>

      {/* Save draft link */}
      <button
        style={{
          alignSelf: 'center',
          padding: '4px 0',
          background: 'transparent',
          border: 'none',
          color: 'var(--adda-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: 12,
          cursor: 'pointer',
        }}
        onClick={() => router.push('/adda/dashboard?draft=1')}
      >
        Save draft and publish later
      </button>

      {/* What happens next */}
      <div style={{ maxWidth: 520 }}>
        <button
          onClick={() => setWhatNextOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <ChevronIcon open={whatNextOpen} />
          What happens next?
        </button>

        <AnimatePresence>
          {whatNextOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--adda-bg-elevated)',
                border: '1px solid var(--adda-border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {[
                  { step: '1', text: 'Your listing goes live immediately and is searchable by creators on WIMC.' },
                  { step: '2', text: 'Creators can send you a booking request — you\'ll get a notification within 24h.' },
                  { step: '3', text: 'Most venues on WIMC receive their first booking request within 3–5 days of going live.' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--adda-amber)',
                      color: '#000',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      display: 'grid',
                      placeItems: 'center',
                    }}>
                      {item.step}
                    </span>
                    <span style={{
                      fontSize: 13,
                      color: 'var(--adda-text-secondary)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      lineHeight: 1.5,
                    }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  editTarget,
  onEdit,
}: {
  label: string
  value: string
  editTarget: EditTarget
  onEdit: (t: EditTarget) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ flex: 1 }}>
        <span style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--adda-text-muted)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          marginBottom: 2,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 14,
          color: 'var(--adda-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          lineHeight: 1.4,
        }}>
          {value}
        </span>
      </div>
      <EditLink target={editTarget} onEdit={onEdit} />
    </div>
  )
}
