'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, EventStatus } from '@/types/database'
import type { TicketTier } from '@/types/events'
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
  referralUrl?: string | null
  referralStats?: { total: number; redeemed: number }
}

function CopyButton({ text, label = 'Copy', style }: {
  text: string; label?: string; style?: React.CSSProperties
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{
        background: copied ? '#4ADE80' : 'transparent',
        border: '1px solid var(--wimc-border-default)',
        color: copied ? '#07070A' : 'var(--wimc-text-secondary)',
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        padding: '8px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        borderRadius: 0,
        ...style,
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

export default function EventManageClient({ event: initial, rsvpCount, creatorTier, referralUrl, referralStats }: Props) {
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

  // Fan tier state (draft-only, Lantern+)
  const isLanternPlus = creatorTier === 'lantern' || creatorTier === 'beacon'
  const existingTiers = (event.ticket_tiers as TicketTier[] | null) ?? []
  const [fanTiersEnabled, setFanTiersEnabled] = useState(existingTiers.length > 0)
  const [fanTiers, setFanTiers] = useState<TicketTier[]>(
    existingTiers.length > 0
      ? existingTiers.map(t => ({ ...t, benefits: t.benefits ?? [] }))
      : [{ id: crypto.randomUUID(), name: 'General', price_paise: 0, description: 'Standard entry', benefits: [], capacity: null }]
  )

  function addFanTier() {
    if (fanTiers.length >= 5) return
    setFanTiers(prev => [...prev, { id: crypto.randomUUID(), name: '', price_paise: 0, description: '', benefits: [], capacity: null }])
  }
  function removeFanTier(id: string) { setFanTiers(prev => prev.filter(t => t.id !== id)) }
  function updateFanTier(id: string, patch: Partial<TicketTier>) {
    setFanTiers(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const [tierSaveError,   setTierSaveError]   = useState<string | null>(null)
  const [tierSaveSuccess, setTierSaveSuccess] = useState(false)
  const [isPendingTiers,  startTiers]         = useTransition()

  function handleSaveTiers() {
    setTierSaveError(null)
    setTierSaveSuccess(false)
    startTiers(async () => {
      const tiers = fanTiersEnabled ? fanTiers : []
      const { error } = await updateEvent(event.id, {
        ticket_tiers: tiers.length > 0 ? (tiers as unknown as import('@/types/database').Json) : null,
      })
      if (error) { setTierSaveError(error) } else { setTierSaveSuccess(true) }
    })
  }

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
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
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
                You can edit title, description, cover image, and timing. Price and Adda cannot change after publishing — attendees have already booked based on those details.
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
                      <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Adda name</label>
                      <input type="text" value={venueName} onChange={(e) => setVenueName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 6 }}>Adda address</label>
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

        {/* ── Fan Ticket Tiers (draft + Lantern+) ────────────────────────── */}
        {isDraft && isLanternPlus && (
          <Section title="Fan Ticket Tiers" icon="confirmation_number">
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: 14 }}>
              Offer Patreon-style tiers — Free entry, ₹99 Supporter, ₹299 Patron — to segment your audience. Replaces the flat ticket price on your event page.
            </div>

            {/* Enable toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: fanTiersEnabled ? 20 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>Enable fan tiers</span>
              <button
                type="button"
                onClick={() => setFanTiersEnabled(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: fanTiersEnabled ? 'var(--wimc-coral)' : 'var(--wimc-border-default)',
                  position: 'relative', transition: 'background 200ms',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: fanTiersEnabled ? 22 : 2, width: 20, height: 20,
                  borderRadius: '50%', background: '#fff', transition: 'left 200ms',
                }} />
              </button>
            </div>

            {fanTiersEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fanTiers.map((tier, idx) => (
                  <div key={tier.id} style={{ background: 'var(--wimc-bg-base)', border: '1px solid var(--wimc-border-default)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wimc-coral)', width: 20 }}>{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Tier name (e.g. General)"
                        value={tier.name}
                        onChange={e => updateFanTier(tier.id, { name: e.target.value })}
                        style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                      />
                      {fanTiers.length > 1 && (
                        <button type="button" onClick={() => removeFanTier(tier.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, padding: '0 4px' }}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--wimc-bg-base)', border: '1px solid var(--wimc-border-default)', borderRadius: 10, padding: '8px 12px', gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--wimc-coral)' }}>₹</span>
                        <input
                          type="number" min="0" step="1" placeholder="0"
                          value={tier.price_paise === 0 ? '' : tier.price_paise / 100}
                          onChange={e => updateFanTier(tier.id, { price_paise: Math.round(parseFloat(e.target.value || '0') * 100) })}
                          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: 'var(--wimc-text-primary)', width: 72, fontFamily: 'var(--font-dm-sans)' }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', alignSelf: 'center' }}>{tier.price_paise === 0 ? 'Free' : ''}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Tagline (e.g. Standard entry + Q&A access)"
                      value={tier.description}
                      onChange={e => updateFanTier(tier.id, { description: e.target.value })}
                      style={{ ...inputStyle, fontSize: 13 }}
                    />
                    <textarea
                      placeholder={'Benefits (one per line):\nEntry to event\nMeet & greet\nExclusive merch'}
                      value={tier.benefits.join('\n')}
                      onChange={e => updateFanTier(tier.id, { benefits: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                      rows={3}
                      style={{ ...inputStyle, fontSize: 12, resize: 'vertical', lineHeight: 1.6 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>Capacity</span>
                      <input
                        type="number" min="1" placeholder="Unlimited"
                        value={tier.capacity ?? ''}
                        onChange={e => updateFanTier(tier.id, { capacity: e.target.value ? parseInt(e.target.value) : null })}
                        style={{ ...inputStyle, width: 110, fontSize: 13 }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>spots (blank = event cap)</span>
                    </div>
                  </div>
                ))}

                {fanTiers.length < 5 && (
                  <button type="button" onClick={addFanTier}
                    style={{ background: 'none', border: '1px dashed var(--wimc-border-default)', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--wimc-coral)', cursor: 'pointer' }}>
                    + Add tier
                  </button>
                )}
              </div>
            )}

            {tierSaveError && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>{tierSaveError}</div>
            )}
            {tierSaveSuccess && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#22C55E', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>Tiers saved.</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={handleSaveTiers}
                disabled={isPendingTiers}
                style={{
                  background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700,
                  cursor: isPendingTiers ? 'wait' : 'pointer', opacity: isPendingTiers ? 0.7 : 1,
                }}
              >
                {isPendingTiers ? 'Saving…' : 'Save Tiers'}
              </button>
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

        {/* ── Download Poster (Lantern+) ──────────────────────────────────── */}
        {isLanternPlus && (
          <Section title="Event Poster" icon="download">
            <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Download a shareable 1080×1080 poster for this event — ready for Instagram, WhatsApp, and Stories.
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
              displaySize={280}
              onAction={(blob) => {
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${event.slug ?? 'event'}-poster.png`
                a.click()
                URL.revokeObjectURL(url)
              }}
              actionLabel="Download PNG"
            />
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

        {/* ── Referral Link ─────────────────────────────────────────────────── */}
        {isPublished && referralUrl && (
          <div
            style={{
              background: '#131317',
              border: '1px solid #57423e',
              borderLeft: '3px solid #E8705A',
              borderRadius: 18,
              padding: 24,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <span style={{
                  fontFamily: 'var(--font-jetbrains-mono)',
                  fontSize: 9, color: '#E8705A',
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  display: 'block', marginBottom: 4,
                }}>
                  — REFERRAL LINK
                </span>
                <h3 style={{
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontSize: 15, fontWeight: 600, color: '#F0EFF8', margin: 0,
                }}>
                  Share and track conversions
                </h3>
              </div>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 900, color: '#F0EFF8' }}>
                    {referralStats?.redeemed ?? 0}
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: '#9896B0', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Redeemed
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: 24, fontWeight: 900, color: '#F0EFF8' }}>
                    {referralStats?.total ?? 0}
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, color: '#9896B0', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Generated
                  </div>
                </div>
              </div>
            </div>

            {/* URL display */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', marginBottom: 12,
                background: '#07070A', border: '1px solid #57423e',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12,
                color: '#9896B0', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {referralUrl}
              </span>
              <CopyButton text={referralUrl} />
            </div>

            {/* Share buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my event! ${referralUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px',
                  background: '#25D366', color: '#07070A',
                  fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  textDecoration: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                WhatsApp
              </a>
              <CopyButton text={referralUrl} label="Copy link" style={{ flex: 1 }} />
            </div>
          </div>
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
