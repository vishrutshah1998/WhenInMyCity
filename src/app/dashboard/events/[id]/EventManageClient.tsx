'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, EventStatus } from '@/types/database'
import { updateEvent, cancelEvent, extendCapacity, duplicateEvent } from '@/app/actions/events'
import { generateReferralCode } from '@/app/actions/referral'
import EventCanvasRenderer from '@/components/events/EventCanvasRenderer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function toDatetimeLocal(iso: string) {
  // Converts ISO string to value for <input type="datetime-local">
  return iso.slice(0, 16)
}

const STATUS_BADGE: Record<EventStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'var(--wimc-text-muted)',  bg: 'var(--wimc-bg-overlay)' },
  published: { label: '✦ Live',   color: '#4ADE80',                 bg: 'rgba(74,222,128,0.12)' },
  cancelled: { label: 'Cancelled', color: '#EF4444',                 bg: 'rgba(239,68,68,0.12)' },
  completed: { label: 'Completed', color: '#3B82F6',                 bg: 'rgba(59,130,246,0.12)' },
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

interface SectionProps { title: string; icon: string; children: React.ReactNode }

function Section({ title, icon, children }: SectionProps) {
  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
      borderRadius: 18, padding: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--wimc-coral)' }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  event: Event
  rsvpCount: number
  creatorTier: string
}

export default function EventManageClient({ event: initial, rsvpCount, creatorTier }: Props) {
  const router = useRouter()
  const [event, setEvent] = useState(initial)

  // Edit form state
  const isPublished = event.status === 'published'
  const isDraft     = event.status === 'draft'
  const isEditable  = isPublished || isDraft

  const [title, setTitle]       = useState(event.title)
  const [desc, setDesc]         = useState(event.description ?? '')
  const [cover, setCover]       = useState(event.cover_image_url ?? '')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(event.starts_at))
  const [endsAt, setEndsAt]     = useState(event.ends_at ? toDatetimeLocal(event.ends_at) : '')
  // Draft-only fields
  const [venueName, setVenueName]       = useState(event.venue_name)
  const [venueAddress, setVenueAddress] = useState(event.venue_address)
  const [whatsapp, setWhatsapp]         = useState(event.whatsapp_group_url ?? '')

  const [editError, setEditError]     = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)
  const [isPendingEdit, startEdit]    = useTransition()

  // Extend capacity state
  const [extraSpots, setExtraSpots]       = useState(10)
  const [extendError, setExtendError]     = useState<string | null>(null)
  const [extendSuccess, setExtendSuccess] = useState<string | null>(null)
  const [isPendingExtend, startExtend]    = useTransition()

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelError, setCancelError]             = useState<string | null>(null)
  const [isPendingCancel, startCancel]            = useTransition()

  // Duplicate state
  const [dupError, setDupError]       = useState<string | null>(null)
  const [isPendingDup, startDuplicate] = useTransition()

  // Bring-a-Wanderer referral state
  const isLocalPlus = creatorTier === 'local' || creatorTier === 'lantern' || creatorTier === 'beacon'
  const [refCode, setRefCode]         = useState<string | null>(null)
  const [refError, setRefError]       = useState<string | null>(null)
  const [refCopied, setRefCopied]     = useState(false)
  const [isPendingRef, startRef]      = useTransition()

  function handleGenerateCode() {
    setRefError(null)
    startRef(async () => {
      const res = await generateReferralCode(event.id)
      if (res.success && res.code) {
        setRefCode(res.code)
      } else {
        setRefError(res.error ?? 'Failed to generate code.')
      }
    })
  }

  function handleCopyCode() {
    if (!refCode) return
    navigator.clipboard.writeText(refCode).catch(() => {})
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  // ── handlers ──────────────────────────────────────────────────────────────

  function handleSaveEdit() {
    setEditError(null)
    setEditSuccess(false)
    startEdit(async () => {
      const patch: Parameters<typeof updateEvent>[1] = {
        title,
        description: desc || null,
        cover_image_url: cover || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }
      if (isDraft) {
        patch.venue_name    = venueName
        patch.venue_address = venueAddress
        patch.whatsapp_group_url = whatsapp || null
      }
      const { event: updated, error } = await updateEvent(event.id, patch)
      if (error || !updated) {
        setEditError(error ?? 'Update failed')
      } else {
        setEvent(updated)
        setEditSuccess(true)
      }
    })
  }

  function handleExtend() {
    setExtendError(null)
    setExtendSuccess(null)
    startExtend(async () => {
      const { newCapacity, error } = await extendCapacity(event.id, extraSpots)
      if (error || newCapacity === null) {
        setExtendError(error ?? 'Failed to extend capacity')
      } else {
        setEvent((prev) => ({ ...prev, capacity: newCapacity }))
        setExtendSuccess(`Capacity updated to ${newCapacity} spots`)
      }
    })
  }

  function handleCancel() {
    setCancelError(null)
    startCancel(async () => {
      const { error } = await cancelEvent(event.id)
      if (error) {
        setCancelError(error)
        setShowCancelConfirm(false)
      } else {
        setEvent((prev) => ({ ...prev, status: 'cancelled' }))
        setShowCancelConfirm(false)
      }
    })
  }

  function handleDuplicate() {
    setDupError(null)
    startDuplicate(async () => {
      const { event: dup, error } = await duplicateEvent(event.id)
      if (error || !dup) {
        setDupError(error ?? 'Failed to duplicate')
      } else {
        router.push(`/dashboard/events/${dup.id}`)
      }
    })
  }

  // ── styles ────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--wimc-bg-base)', border: '1px solid var(--wimc-border-default)',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--wimc-text-primary)',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-dm-sans)',
  }

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  const badge = STATUS_BADGE[event.status]

  return (
    <>
      <header style={topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/dashboard/events')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-secondary)', display: 'grid', placeItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
            {event.title}
          </div>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999, fontWeight: 600, background: badge.bg, color: badge.color, flexShrink: 0 }}>
            {badge.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>confirmation_number</span>
            {rsvpCount} confirmed
          </div>
          {isPublished && (
            <button
              onClick={() => router.push(`/dashboard/events/${event.id}/checkin`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_scanner</span>
              Check-in
            </button>
          )}
        </div>
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>

        {/* ── Edit details ────────────────────────────────────────────────── */}
        {isEditable && (
          <Section title={isPublished ? 'Edit Event Details' : 'Edit Draft'} icon="edit">
            {isPublished && (
              <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                You can edit title, description, cover image, and timing. Price and venue cannot change after publishing — attendees have already booked based on those details.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Cover image URL</label>
                <input type="url" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Start date & time</label>
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>End date & time (optional)</label>
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inputStyle} />
                </div>
              </div>
              {isDraft && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Venue name</label>
                      <input type="text" value={venueName} onChange={(e) => setVenueName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Venue address</label>
                      <input type="text" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>WhatsApp group link (optional)</label>
                    <input type="url" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://chat.whatsapp.com/..." style={inputStyle} />
                  </div>
                </>
              )}
              {editError && (
                <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>{editError}</div>
              )}
              {editSuccess && (
                <div style={{ fontSize: 13, color: '#22C55E', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>Changes saved successfully.</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={isPendingEdit}
                  style={{
                    background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700,
                    cursor: isPendingEdit ? 'wait' : 'pointer', opacity: isPendingEdit ? 0.7 : 1,
                  }}
                >
                  {isPendingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Extend capacity ─────────────────────────────────────────────── */}
        {isPublished && (
          <Section title="Extend Capacity" icon="group_add">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 6 }}>
                  Current capacity: <strong style={{ color: 'var(--wimc-text-primary)' }}>{event.capacity ?? '∞'}</strong>
                  {event.capacity && <span style={{ marginLeft: 8 }}>({Math.max(0, event.capacity - rsvpCount)} spots remaining)</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', whiteSpace: 'nowrap' }}>Add spots:</label>
                  <input
                    type="number"
                    min={1}
                    value={extraSpots}
                    onChange={(e) => setExtraSpots(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ ...inputStyle, width: 100 }}
                  />
                </div>
              </div>
              <button
                onClick={handleExtend}
                disabled={isPendingExtend}
                style={{
                  background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700,
                  cursor: isPendingExtend ? 'wait' : 'pointer', opacity: isPendingExtend ? 0.7 : 1,
                  flexShrink: 0,
                }}
              >
                {isPendingExtend ? 'Updating…' : 'Add Spots'}
              </button>
            </div>
            {extendError && (
              <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>{extendError}</div>
            )}
            {extendSuccess && (
              <div style={{ fontSize: 13, color: '#22C55E', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>{extendSuccess}</div>
            )}
          </Section>
        )}

        {/* ── Duplicate ────────────────────────────────────────────────────── */}
        <Section title="Duplicate Event" icon="content_copy">
          <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
            Creates a draft copy of this event so you can reschedule or run it again. All details are copied — update the date before publishing.
          </div>
          {dupError && (
            <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{dupError}</div>
          )}
          <button
            onClick={handleDuplicate}
            disabled={isPendingDup}
            style={{
              background: 'transparent', border: '1px solid var(--wimc-border-default)',
              color: 'var(--wimc-text-primary)', borderRadius: 10, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: isPendingDup ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, opacity: isPendingDup ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
            {isPendingDup ? 'Duplicating…' : 'Duplicate this Event'}
          </button>
        </Section>

        {/* ── Cancel event ────────────────────────────────────────────────── */}
        {(isPublished || isDraft) && event.status !== 'cancelled' && (
          <div style={{
            background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 18, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 15, fontWeight: 700, color: '#EF4444' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
              Danger Zone
            </div>
            <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              {rsvpCount > 0
                ? `Cancelling will trigger full Razorpay refunds for all ${rsvpCount} confirmed attendee${rsvpCount !== 1 ? 's' : ''}. This cannot be undone.`
                : 'Cancelling this event cannot be undone.'}
            </div>
            {cancelError && (
              <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{cancelError}</div>
            )}
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                style={{
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.5)',
                  color: '#EF4444', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                Cancel Event{rsvpCount > 0 ? ` & Refund ${rsvpCount} Ticket${rsvpCount !== 1 ? 's' : ''}` : ''}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#EF4444' }}>Are you sure?</span>
                <button
                  onClick={handleCancel}
                  disabled={isPendingCancel}
                  style={{
                    background: '#EF4444', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '8px 18px', fontSize: 14, fontWeight: 700,
                    cursor: isPendingCancel ? 'wait' : 'pointer', opacity: isPendingCancel ? 0.7 : 1,
                  }}
                >
                  {isPendingCancel ? 'Cancelling…' : 'Yes, cancel it'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isPendingCancel}
                  style={{
                    background: 'transparent', border: '1px solid var(--wimc-border-default)',
                    color: 'var(--wimc-text-secondary)', borderRadius: 10, padding: '8px 16px',
                    fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Go back
                </button>
              </div>
            )}
          </div>
        )}

        {event.status === 'cancelled' && (
          <div style={{
            background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 18, padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>This event has been cancelled</div>
            <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)' }}>All refunds have been initiated. Use Duplicate to create a new event.</div>
          </div>
        )}

        {/* ── Event Poster ──────────────────────────────────────────────────── */}
        {isPublished && (
          <Section title="Share Poster" icon="share">
            <div style={{ fontSize: 13.5, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
              Download a ready-to-share 1080×1080 poster for Instagram, WhatsApp Stories, and more.
            </div>
            <EventCanvasRenderer
              data={{
                title:       event.title,
                startsAt:    new Date(event.starts_at),
                venueName:   event.venue_name,
                ticketPrice: event.ticket_price,
                creatorTier: creatorTier,
              }}
              size={1080}
              displaySize={260}
              onAction={(blob) => {
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${event.title.replace(/\s+/g, '-').toLowerCase()}-poster.jpg`
                a.click()
                URL.revokeObjectURL(url)
              }}
              actionLabel="Download Poster"
            />
          </Section>
        )}

        {/* ── Bring a Wanderer ──────────────────────────────────────────────── */}
        {isPublished && isLocalPlus && (
          <Section title="Bring a Wanderer" icon="person_add">
            <div style={{ fontSize: 13.5, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
              Invite one Wanderer-tier guest with a free ticket — your way of growing the community. One code per quarter, shareable directly.
            </div>

            {refCode ? (
              <div>
                <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 8 }}>
                  Your referral code
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    fontFamily: 'var(--font-jetbrains-mono)', fontSize: 26, fontWeight: 700,
                    letterSpacing: '0.15em', color: 'var(--wimc-text-primary)',
                    background: 'var(--wimc-bg-base)', border: '1.5px dashed var(--wimc-border-strong)',
                    borderRadius: 12, padding: '12px 20px', flex: 1, textAlign: 'center',
                  }}>
                    {refCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: refCopied ? 'rgba(77,210,177,0.12)' : 'var(--wimc-bg-overlay)',
                      border: `1px solid ${refCopied ? 'rgba(77,210,177,0.4)' : 'var(--wimc-border-default)'}`,
                      borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                      color: refCopied ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {refCopied ? 'check' : 'content_copy'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-dm-sans)' }}>
                      {refCopied ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', marginTop: 10 }}>
                  Share this code with your guest — they enter it in the RSVP flow to claim their free ticket. Expires at quarter end.
                </div>
              </div>
            ) : (
              <div>
                {refError && (
                  <div style={{ fontSize: 13, color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {refError}
                  </div>
                )}
                <button
                  onClick={handleGenerateCode}
                  disabled={isPendingRef}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(77,210,177,0.1)', border: '1px solid rgba(77,210,177,0.3)',
                    color: 'var(--wimc-teal)', borderRadius: 10, padding: '10px 20px',
                    fontSize: 14, fontWeight: 600, cursor: isPendingRef ? 'wait' : 'pointer',
                    opacity: isPendingRef ? 0.6 : 1, fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>card_giftcard</span>
                  {isPendingRef ? 'Generating…' : 'Generate referral code'}
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Locked state for Wanderer/Local */}
        {isPublished && !isLocalPlus && (
          <Section title="Bring a Wanderer" icon="person_add">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--wimc-text-muted)' }}>lock</span>
              <span style={{ fontSize: 13.5, color: 'var(--wimc-text-muted)' }}>
                Reach Local tier to unlock one free referral code per quarter for this event.
              </span>
            </div>
          </Section>
        )}

      </div>
    </>
  )
}
