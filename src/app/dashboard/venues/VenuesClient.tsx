'use client'

import { useState, useTransition } from 'react'
import { searchAddas, getAddaPublicPage, sendProposal } from '@/app/actions/adda'
import { CITIES } from '@/lib/constants/interests'
import type { AddaProfile, MakerAddaProposal } from '@/types/database'
import type { MakerTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProposalWithAdda = MakerAddaProposal & {
  adda: Pick<AddaProfile, 'id' | 'name' | 'slug' | 'city' | 'cover_image_url' | 'pricing_model'> | null
}

interface Props {
  profileId:   string
  defaultCity: string
  makerTier:   MakerTier
  proposals:   ProposalWithAdda[]
}

const ADDA_TYPES = [
  { id: 'cafe', label: 'Café' }, { id: 'coworking', label: 'Coworking' },
  { id: 'gallery', label: 'Gallery' }, { id: 'community_hall', label: 'Community Hall' },
  { id: 'rooftop', label: 'Rooftop' }, { id: 'garden', label: 'Garden' },
  { id: 'studio', label: 'Studio' }, { id: 'library', label: 'Library' },
  { id: 'restaurant', label: 'Restaurant' },
]

const SLOTS = [
  { id: 'morning', label: 'Morning' }, { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' }, { id: 'full_day', label: 'Full Day' },
]

const PROPOSAL_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:        { bg: 'rgba(255,180,60,0.12)',  color: 'var(--wimc-amber)' },
  accepted:       { bg: 'rgba(77,210,177,0.12)',  color: 'var(--wimc-teal)' },
  declined:       { bg: 'rgba(255,255,255,0.06)', color: 'var(--wimc-text-secondary)' },
  counter_offered:{ bg: 'rgba(232,112,90,0.12)',  color: 'var(--wimc-coral)' },
  withdrawn:      { bg: 'rgba(255,255,255,0.06)', color: 'var(--wimc-text-secondary)' },
}

function Pill({ status }: { status: string }) {
  const s = PROPOSAL_STATUS_COLORS[status] ?? PROPOSAL_STATUS_COLORS.pending
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatInr(paise: number) {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

// ---------------------------------------------------------------------------
// Venue card
// ---------------------------------------------------------------------------

function VenueCard({ adda, onSelect }: { adda: AddaProfile; onSelect: (a: AddaProfile) => void }) {
  const pricingLabel: Record<string, string> = {
    fixed_rental: 'Fixed Rental', door_split: 'Door Split',
    hybrid: 'Hybrid', f_and_b_minimum: 'F&B Minimum',
  }

  return (
    <button
      onClick={() => onSelect(adda)}
      style={{
        background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
        borderRadius: 16, overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 200ms, transform 200ms', width: '100%',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--wimc-coral)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--wimc-border-default)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Cover */}
      <div style={{ height: 120, background: adda.cover_image_url ? `url(${adda.cover_image_url}) center/cover` : 'linear-gradient(135deg, rgba(232,112,90,0.2) 0%, rgba(77,210,177,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!adda.cover_image_url && <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-coral)', opacity: 0.5 }}>storefront</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{adda.name}</div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {adda.neighbourhood ? `${adda.neighbourhood}, ` : ''}{adda.city.replace(/_/g, ' ')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {adda.adda_type.slice(0, 2).map((t) => (
            <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-secondary)', textTransform: 'capitalize' }}>
              {t.replace(/_/g, ' ')}
            </span>
          ))}
          {adda.capacity_max && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-secondary)' }}>
              Up to {adda.capacity_max} pax
            </span>
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--wimc-coral)', fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {pricingLabel[adda.pricing_model] ?? adda.pricing_model}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

type AddaPageData = Awaited<ReturnType<typeof getAddaPublicPage>>

function DetailDrawer({
  adda,
  onClose,
  onPropose,
}: {
  adda: AddaProfile
  onClose: () => void
  onPropose: () => void
}) {
  const [pageData, setPageData] = useState<AddaPageData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch detail on mount
  useState(() => {
    getAddaPublicPage(adda.slug).then((d) => { setPageData(d); setLoading(false) })
  })

  const pricingLabel: Record<string, string> = {
    fixed_rental: 'Fixed Rental', door_split: 'Door Split',
    hybrid: 'Hybrid', f_and_b_minimum: 'F&B Minimum',
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 480,
        background: 'var(--wimc-bg-elevated)', borderLeft: '1px solid var(--wimc-border-default)',
        zIndex: 101, overflow: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Cover */}
        <div style={{ height: 180, background: adda.cover_image_url ? `url(${adda.cover_image_url}) center/cover` : 'linear-gradient(135deg, rgba(232,112,90,0.2) 0%, rgba(77,210,177,0.1) 100%)', position: 'relative', flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(10,10,11,0.7)', border: '1px solid var(--wimc-border-default)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--wimc-text-primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
          {adda.is_verified && (
            <span style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--wimc-teal)', background: 'rgba(10,10,11,0.7)', padding: '4px 10px', borderRadius: 9999, fontFamily: 'var(--font-jetbrains-mono)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>Verified
            </span>
          )}
        </div>

        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name + city */}
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{adda.name}</div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {adda.neighbourhood ? `${adda.neighbourhood}, ` : ''}{adda.city.replace(/_/g, ' ')}
            </div>
            {adda.address && (
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 4 }}>{adda.address}</div>
            )}
          </div>

          {/* Description */}
          {adda.description && (
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>{adda.description}</div>
          )}

          {/* Type + capacity */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {adda.adda_type.map((t) => (
              <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', textTransform: 'capitalize' }}>
                {t.replace(/_/g, ' ')}
              </span>
            ))}
            {adda.capacity_max && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, background: 'rgba(77,210,177,0.1)', border: '1px solid rgba(77,210,177,0.2)', color: 'var(--wimc-teal)' }}>
                Up to {adda.capacity_max} pax
              </span>
            )}
          </div>

          {/* Pricing */}
          <div style={{ background: 'var(--wimc-bg-overlay)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Pricing</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-coral)' }}>{pricingLabel[adda.pricing_model]}</div>
          </div>

          {/* Amenities */}
          {adda.amenities.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Amenities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {adda.amenities.map((a) => (
                  <span key={a} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', textTransform: 'capitalize' }}>
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats from page data */}
          {!loading && pageData && !('error' in pageData) && (
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: 'var(--wimc-bg-overlay)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--wimc-coral)' }}>{pageData.stats.total_events}</div>
                <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Events Hosted</div>
              </div>
              {pageData.stats.average_rating > 0 && (
                <div style={{ flex: 1, background: 'var(--wimc-bg-overlay)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22 }}>{pageData.stats.average_rating.toFixed(1)} ★</div>
                  <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Avg Rating</div>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          {(adda.contact_whatsapp || adda.contact_email || adda.instagram_handle) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Contact</div>
              {adda.contact_whatsapp && <div style={{ fontSize: 13 }}>📱 {adda.contact_whatsapp}</div>}
              {adda.contact_email && <div style={{ fontSize: 13 }}>✉️ {adda.contact_email}</div>}
              {adda.instagram_handle && <div style={{ fontSize: 13 }}>📷 @{adda.instagram_handle}</div>}
            </div>
          )}

          {/* CTA */}
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <button
              onClick={onPropose}
              style={{ width: '100%', padding: '14px 24px', background: 'var(--wimc-coral)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
              Propose a Booking
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Proposal form modal
// ---------------------------------------------------------------------------

function ProposalModal({
  adda,
  onClose,
  onSuccess,
}: {
  adda: AddaProfile
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [eventTitle, setEventTitle] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedSlot, setProposedSlot] = useState<'morning' | 'afternoon' | 'evening' | 'full_day'>('full_day')
  const [expectedAttendees, setExpectedAttendees] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit() {
    setError(null)
    if (!eventTitle.trim()) { setError('Event title is required.'); return }
    if (!proposedDate) { setError('Please select a date.'); return }

    startTransition(async () => {
      const result = await sendProposal({
        adda_id:           adda.id,
        proposed_date:     proposedDate,
        proposed_slot:     proposedSlot,
        event_title:       eventTitle.trim(),
        expected_attendees: expectedAttendees ? parseInt(expectedAttendees, 10) : undefined,
        proposed_split_config: {},
        message:           message.trim() || undefined,
      })
      if (result.error) { setError(result.error); return }
      onSuccess()
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, maxHeight: '90vh', overflow: 'auto',
        background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
        borderRadius: 20, zIndex: 201, padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18 }}>Propose a Booking</div>
            <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>{adda.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-secondary)', display: 'grid', placeItems: 'center' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Event name *</label>
            <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Sunday Jazz Evening" maxLength={120}
              style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Date *</label>
              <input type="date" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}
                style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Time slot</label>
              <select value={proposedSlot} onChange={(e) => setProposedSlot(e.target.value as typeof proposedSlot)}
                style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }}>
                {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Expected attendees</label>
            <input type="number" value={expectedAttendees} onChange={(e) => setExpectedAttendees(e.target.value)} placeholder="e.g. 50" min={1}
              style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Message to venue owner</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell them about your event, audience, and what you need…" maxLength={1000} rows={4}
              style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-dm-sans)' }} />
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--wimc-coral)', padding: '8px 12px', background: 'rgba(232,112,90,0.08)', borderRadius: 6 }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{ width: '100%', padding: '14px', background: 'var(--wimc-coral)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}
          >
            {isPending ? 'Sending…' : 'Send Proposal'}
          </button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VenuesClient({ profileId, defaultCity, makerTier, proposals: initialProposals }: Props) {
  const [city, setCity] = useState(defaultCity)
  const [addaType, setAddaType] = useState('')
  const [date, setDate] = useState('')
  const [results, setResults] = useState<AddaProfile[]>([])
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, startSearch] = useTransition()

  const [selectedAdda, setSelectedAdda] = useState<AddaProfile | null>(null)
  const [proposalTarget, setProposalTarget] = useState<AddaProfile | null>(null)
  const [proposals, setProposals] = useState(initialProposals)
  const [proposalSuccess, setProposalSuccess] = useState(false)

  const isGated = makerTier === 'mohalla'

  function handleSearch() {
    if (!city) { setSearchError('Please select a city.'); return }
    setSearchError(null)
    startSearch(async () => {
      const res = await searchAddas({ city, adda_type: addaType as never || undefined, date: date || undefined })
      setSearched(true)
      if (res.error) { setSearchError(res.error); return }
      setResults(res.addas)
    })
  }

  function handleProposeSuccess() {
    setProposalSuccess(true)
    setProposalTarget(null)
    setSelectedAdda(null)
  }

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Find a Venue</div>
        {isGated && (
          <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 9999, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, background: 'var(--wimc-amber-dim)', color: 'var(--wimc-amber)', border: '1px solid rgba(245,168,0,0.3)' }}>
            Nukkad+ required
          </span>
        )}
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>

        {/* Tier gate banner */}
        {isGated && (
          <div style={{ background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.3)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--wimc-amber)', fontSize: 22 }}>lock</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--wimc-amber)', marginBottom: 2 }}>Venue search is a Nukkad+ feature</div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>Host more events to reach Nukkad tier and unlock the Adda marketplace.</div>
            </div>
          </div>
        )}

        {/* Search panel */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Search Venues</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>City *</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} disabled={isGated}
                style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none' }}>
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Type</label>
              <select value={addaType} onChange={(e) => setAddaType(e.target.value)} disabled={isGated}
                style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none' }}>
                <option value="">Any type</option>
                {ADDA_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isGated} min={new Date().toISOString().slice(0, 10)}
                style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none' }} />
            </div>
            <button onClick={handleSearch} disabled={isGated || isSearching}
              style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--wimc-coral)', color: '#fff', border: 'none', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isGated || isSearching ? 0.4 : 1, whiteSpace: 'nowrap' }}>
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchError && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wimc-coral)' }}>{searchError}</div>}
        </div>

        {/* Results */}
        {searched && (
          results.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13, padding: '32px 0' }}>
              No venues found matching your filters. Try a different city or remove the date filter.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {results.map((a) => (
                <VenueCard key={a.id} adda={a} onSelect={setSelectedAdda} />
              ))}
            </div>
          )
        )}

        {/* My proposals */}
        {proposals.length > 0 && (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
              My Booking Proposals
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                    {['Venue', 'Event', 'Date', 'Slot', 'Status', 'Sent'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600, color: 'var(--wimc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < proposals.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{p.adda?.name ?? '—'}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--wimc-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.event_title}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(p.proposed_date)}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, textTransform: 'capitalize' }}>{p.proposed_slot.replace('_', ' ')}</td>
                      <td style={{ padding: '12px 20px' }}><Pill status={p.status} /></td>
                      <td style={{ padding: '12px 20px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-secondary)' }}>{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Proposal success toast */}
        {proposalSuccess && (
          <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--wimc-teal)', color: '#0a0a0b', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, zIndex: 300 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Proposal sent! The venue owner will respond within 72 hours.
            <button onClick={() => setProposalSuccess(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, color: '#0a0a0b', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedAdda && !proposalTarget && (
        <DetailDrawer
          adda={selectedAdda}
          onClose={() => setSelectedAdda(null)}
          onPropose={() => setProposalTarget(selectedAdda)}
        />
      )}

      {/* Proposal modal */}
      {proposalTarget && (
        <ProposalModal
          adda={proposalTarget}
          onClose={() => setProposalTarget(null)}
          onSuccess={handleProposeSuccess}
        />
      )}

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </>
  )
}
