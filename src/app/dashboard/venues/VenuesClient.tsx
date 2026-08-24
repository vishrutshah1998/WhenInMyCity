'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { searchVenues, sendProposal } from '@/app/actions/venue'
import { CITIES } from '@/lib/constants/interests'
import { resolveDisplayTerms, summarizeListedPricing } from '@/lib/venue/proposalPricing'
import { ProposalPriceBreakdown, VenueTierBadge, formatInr } from '@/components/venue/ProposalShared'
import { TimeRangePicker } from '@/components/venue/TimeRangePicker'
import { defaultTimeRangeForVenue } from '@/lib/venue/timePresets'
import type { VenueProfile } from '@/types/database'
import type { UserTier } from '@/types/database'
import type { PricingConfig } from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  profileId:   string
  defaultCity: string
  makerTier:   UserTier
}

const INFOGRAPHIC_DISMISSED_KEY = 'venues-how-it-works-dismissed'

// profile.city is stored as a display name (e.g. "Gandhinagar", set during
// onboarding) while the <select> below uses CITIES' lowercase slug ids
// (e.g. "gandhinagar") as option values — without this, the dropdown can't
// find a matching option and falls back to the blank "Select city" placeholder
// even though the venue search itself (an .ilike match) works either way.
function normalizeCityToId(raw: string): string {
  if (!raw) return ''
  const lower = raw.toLowerCase()
  const match = CITIES.find((c) => c.id === lower || c.name.toLowerCase() === lower)
  return match ? match.id : raw
}

const VENUE_TYPES = [
  { id: 'cafe', label: 'Café' }, { id: 'coworking', label: 'Coworking' },
  { id: 'gallery', label: 'Gallery' }, { id: 'community_hall', label: 'Community Hall' },
  { id: 'rooftop', label: 'Rooftop' }, { id: 'garden', label: 'Garden' },
  { id: 'studio', label: 'Studio' }, { id: 'library', label: 'Library' },
  { id: 'restaurant', label: 'Restaurant' },
]

// ---------------------------------------------------------------------------
// Venue card
// ---------------------------------------------------------------------------

function VenueCard({ venue, onSelect }: { venue: VenueProfile; onSelect: (a: VenueProfile) => void }) {
  const pricingLabel: Record<string, string> = {
    fixed_rental: 'Fixed Rental', door_split: 'Door Split',
    hybrid: 'Hybrid', f_and_b_minimum: 'F&B Minimum',
  }

  return (
    <button
      onClick={() => onSelect(venue)}
      style={{
        background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)',
        borderRadius: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 200ms, transform 200ms', width: '100%',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--wimc-coral)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(26,39,68,0.14)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Cover */}
      <div style={{ height: 120, background: venue.cover_image_url ? `url(${venue.cover_image_url}) center/cover` : 'linear-gradient(135deg, rgba(232,112,90,0.2) 0%, rgba(77,210,177,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!venue.cover_image_url && <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-coral)', opacity: 0.5 }}>storefront</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--wimc-text-primary)' }}>{venue.name}</div>
        <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 8, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {venue.neighbourhood ? `${venue.neighbourhood}, ` : ''}{venue.city.replace(/_/g, ' ')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {venue.venue_type.slice(0, 2).map((t) => (
            <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-secondary)', textTransform: 'capitalize' }}>
              {t.replace(/_/g, ' ')}
            </span>
          ))}
          {venue.capacity_max && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-secondary)' }}>
              Up to {venue.capacity_max} pax
            </span>
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--wimc-coral)', fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)' }}>
            {pricingLabel[venue.pricing_model] ?? venue.pricing_model}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {venue.trending_until && new Date(venue.trending_until) > new Date() && (
              <span style={{ fontSize: 10, fontWeight: 700 }}>🔥</span>
            )}
            <VenueTierBadge tier={venue.venue_tier} size="sm" />
          </div>
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

function DetailDrawer({
  venue,
  onClose,
  onPropose,
}: {
  venue: VenueProfile
  onClose: () => void
  onPropose: () => void
}) {
  const pricingLabel: Record<string, string> = {
    fixed_rental: 'Fixed Rental', door_split: 'Door Split',
    hybrid: 'Hybrid', f_and_b_minimum: 'F&B Minimum',
  }

  const pricingSummary = summarizeListedPricing((venue.pricing_config as PricingConfig | null) ?? null)

  return createPortal(
    <>
      {/* Backdrop — left inset stops at the sidebar (md:left-[var(--wimc-sidebar-w)])
          so the persistent nav stays fully readable instead of dimmed/blurred under it. */}
      <div onClick={onClose} className="fixed inset-0 md:left-[var(--wimc-sidebar-w)]" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
      {/* Drawer — fixed to the viewport height (top:0/bottom:0) with its own internal
          scroll region, so the CTA footer below stays pinned and visible on any screen
          height instead of requiring a scroll to reach it. Portaled to document.body so
          the dashboard layout's entrance-animation transform on an ancestor (.dash-content,
          globals.css) can never turn this "fixed" positioning into scroll-along-with-the-page
          behavior — a transform on any ancestor establishes a new containing block for
          fixed-position descendants, which is exactly what broke this before. */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 480,
        background: 'var(--wimc-bg-elevated)', borderLeft: '1px solid var(--wimc-border-default)',
        zIndex: 101, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Cover */}
          <div style={{ height: 180, background: venue.cover_image_url ? `url(${venue.cover_image_url}) center/cover` : 'linear-gradient(135deg, rgba(232,112,90,0.2) 0%, rgba(77,210,177,0.1) 100%)', position: 'relative', flexShrink: 0 }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(10,10,11,0.7)', border: '1px solid var(--wimc-border-default)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--wimc-text-primary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
            {venue.is_verified && (
              <span style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--wimc-teal)', background: 'rgba(10,10,11,0.7)', padding: '4px 10px', borderRadius: 9999, fontFamily: 'var(--font-jetbrains-mono)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>Verified
              </span>
            )}
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name + city */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--wimc-text-primary)' }}>{venue.name}</div>
              <VenueTierBadge tier={venue.venue_tier} size="md" />
              {venue.trending_until && new Date(venue.trending_until) > new Date() && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wimc-text-primary)' }}>🔥 Trending</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {venue.neighbourhood ? `${venue.neighbourhood}, ` : ''}{venue.city.replace(/_/g, ' ')}
            </div>
            {venue.address && (
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 4 }}>{venue.address}</div>
            )}
            <a
              href={`/venue/${venue.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-coral)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}
            >
              View venue&apos;s WIMC page
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
            </a>
          </div>

          {/* Description */}
          {venue.description && (
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>{venue.description}</div>
          )}

          {/* Type + capacity */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {venue.venue_type.map((t) => (
              <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-secondary)', textTransform: 'capitalize' }}>
                {t.replace(/_/g, ' ')}
              </span>
            ))}
            {venue.capacity_max && (
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, background: 'rgba(77,210,177,0.1)', border: '1px solid rgba(77,210,177,0.2)', color: 'var(--wimc-teal)' }}>
                Up to {venue.capacity_max} pax
              </span>
            )}
          </div>

          {/* Pricing */}
          <div style={{ background: 'var(--wimc-bg-overlay)', borderRadius: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Pricing</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wimc-coral)' }}>{pricingLabel[venue.pricing_model]}</div>

            {(venue.pricing_model === 'fixed_rental' || venue.pricing_model === 'hybrid') && (
              pricingSummary.rentalRange ? (
                <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>
                  {pricingSummary.rentalRange.minPaise === pricingSummary.rentalRange.maxPaise
                    ? formatInr(pricingSummary.rentalRange.minPaise)
                    : `${formatInr(pricingSummary.rentalRange.minPaise)}–${formatInr(pricingSummary.rentalRange.maxPaise)}`}/hr, varies by day &amp; slot
                </div>
              ) : pricingSummary.flatRentalPaise ? (
                <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>{formatInr(pricingSummary.flatRentalPaise)} flat rate</div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Rate not listed yet — you&apos;ll see it when you propose a date.</div>
              )
            )}

            {(venue.pricing_model === 'door_split' || venue.pricing_model === 'hybrid') && (
              pricingSummary.splitPercentage ? (
                <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>{pricingSummary.splitPercentage}% of ticket revenue</div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Revenue share negotiated per booking.</div>
              )
            )}

            {venue.pricing_model === 'f_and_b_minimum' && (
              pricingSummary.minimumSpendPaise ? (
                <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>{formatInr(pricingSummary.minimumSpendPaise)} minimum F&amp;B spend</div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Minimum spend negotiated per booking.</div>
              )
            )}
          </div>

          {/* Policies */}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 16, fontSize: 12.5, color: 'var(--wimc-text-secondary)' }}>
            <span>{venue.capacity_min != null || venue.capacity_max != null ? `${venue.capacity_min ?? '?'}–${venue.capacity_max ?? '?'} pax capacity` : 'Capacity not listed'}</span>
            <span>{venue.lead_time_weeks ?? 1} week{(venue.lead_time_weeks ?? 1) !== 1 ? 's' : ''} notice required</span>
          </div>
          {venue.available_days.length > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)' }}>
              Usually hosts on: {venue.available_days.join(', ')}
            </div>
          )}

          {/* Amenities */}
          {venue.amenities.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Amenities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {venue.amenities.map((a) => (
                  <span key={a} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-secondary)', textTransform: 'capitalize' }}>
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats — both already on the venue row from the search fetch (total_events_hosted,
              average_maker_rating), so no second network round-trip is needed to show them. */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, background: 'var(--wimc-bg-overlay)', borderRadius: 0, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--wimc-coral)' }}>{venue.total_events_hosted}</div>
              <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Events Hosted</div>
            </div>
            {venue.average_maker_rating > 0 && (
              <div style={{ flex: 1, background: 'var(--wimc-bg-overlay)', borderRadius: 0, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--wimc-text-primary)' }}>{venue.average_maker_rating.toFixed(1)} ★</div>
                <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Avg Rating</div>
              </div>
            )}
          </div>

          {/* Contact */}
          {(venue.contact_whatsapp || venue.contact_email || venue.instagram_handle) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Contact</div>
              {venue.contact_whatsapp && <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>📱 {venue.contact_whatsapp}</div>}
              {venue.contact_email && <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>✉️ {venue.contact_email}</div>}
              {venue.instagram_handle && <div style={{ fontSize: 13, color: 'var(--wimc-text-primary)' }}>📷 @{venue.instagram_handle}</div>}
            </div>
          )}
          </div>
        </div>

        {/* CTA footer — outside the scroll region above, so it stays pinned and
            visible at the bottom of the drawer regardless of content length or
            viewport height. */}
        <div style={{ flexShrink: 0, padding: 24, borderTop: '1px solid var(--wimc-border-subtle)' }}>
          <button
            onClick={onPropose}
            style={{ width: '100%', padding: '14px 24px', background: 'var(--wimc-coral)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            Propose a Booking
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Proposal form modal
// ---------------------------------------------------------------------------

function ProposalModal({
  venue,
  onClose,
  onSuccess,
}: {
  venue: VenueProfile
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [eventTitle, setEventTitle] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const defaultRange = defaultTimeRangeForVenue(venue.preferred_times)
  const [startTime, setStartTime] = useState(defaultRange.start)
  const [endTime, setEndTime] = useState(defaultRange.end)
  const [expectedAttendees, setExpectedAttendees] = useState('')
  const [message, setMessage] = useState('')

  // Pricing: fixed_rental/hybrid rates can vary by weekday (pricing_rules), so
  // only compute them once a real date is picked — otherwise a dummy date
  // could resolve to the wrong weekday's rule and show a confidently wrong
  // number. door_split/f_and_b_minimum terms don't depend on date at all.
  const needsDateForRate = venue.pricing_model === 'fixed_rental' || venue.pricing_model === 'hybrid'
  const displayTerms = (!needsDateForRate || proposedDate)
    ? resolveDisplayTerms(
        null,
        venue.pricing_model,
        (venue.pricing_config as PricingConfig | null) ?? null,
        proposedDate,
        startTime,
        endTime,
      )
    : null

  const leadTimeWeeks = venue.lead_time_weeks ?? 1
  const daysUntilProposed = proposedDate
    ? Math.ceil((new Date(`${proposedDate}T00:00:00Z`).getTime() - Date.now()) / 86_400_000)
    : null
  const leadTimeWarning = daysUntilProposed !== null && daysUntilProposed < leadTimeWeeks * 7

  const attendeesNum = expectedAttendees ? parseInt(expectedAttendees, 10) : null
  const capacityWarning = attendeesNum !== null && venue.capacity_max != null && attendeesNum > venue.capacity_max

  const FULL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const proposedWeekdayFull = proposedDate ? FULL_DAYS[new Date(`${proposedDate}T00:00:00Z`).getUTCDay()] : null
  const dayWarning = !!(
    proposedWeekdayFull &&
    venue.available_days?.length &&
    !venue.available_days.some(d => {
      const n = d.toLowerCase().trim()
      return n === proposedWeekdayFull || proposedWeekdayFull.startsWith(n) || n.startsWith(proposedWeekdayFull.slice(0, 3))
    })
  )

  function handleSubmit() {
    setError(null)
    if (!eventTitle.trim()) { setError('Event title is required.'); return }
    if (!proposedDate) { setError('Please select a date.'); return }
    if (!startTime || !endTime || startTime >= endTime) { setError('Please select a valid start and end time.'); return }

    startTransition(async () => {
      const result = await sendProposal({
        venue_id:           venue.id,
        proposed_date:     proposedDate,
        start_time:        startTime,
        end_time:          endTime,
        event_title:       eventTitle.trim(),
        expected_attendees: expectedAttendees ? parseInt(expectedAttendees, 10) : undefined,
        // The maker doesn't choose a pricing model — it must match what the
        // venue actually offers, so it's copied straight from the venue profile.
        proposed_pricing_model: venue.pricing_model,
        proposed_split_config: {},
        message:           message.trim() || undefined,
      })
      if (result.error) { setError(result.error); return }
      onSuccess()
    })
  }

  return createPortal(
    <>
      {/* Portaled to document.body — see DetailDrawer above: a transform on the
          .dash-content ancestor (entrance animation, globals.css) makes it a
          containing block for position:fixed descendants, which breaks this
          modal's viewport-relative positioning otherwise. */}
      <div onClick={onClose} className="fixed inset-0 md:left-[var(--wimc-sidebar-w)]" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, maxHeight: '90vh', overflow: 'auto',
        background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)',
        borderRadius: 0, zIndex: 201, padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--wimc-text-primary)' }}>Propose a Booking</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>{venue.name}</span>
              {(venue.venue_tier === 'beloved' || venue.venue_tier === 'legendary') && (
                <VenueTierBadge tier={venue.venue_tier} size="sm" />
              )}
            </div>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Start &amp; end time *</label>
            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Expected attendees</label>
            <input type="number" value={expectedAttendees} onChange={(e) => setExpectedAttendees(e.target.value)} placeholder="e.g. 50" min={1}
              style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 14, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Venue pricing &amp; policies</label>

            {needsDateForRate && !proposedDate ? (
              <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Pick a date above to see the exact rate.</div>
            ) : displayTerms ? (
              <ProposalPriceBreakdown terms={displayTerms} />
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--wimc-text-secondary)', fontStyle: 'italic' }}>Pricing details unavailable for this venue.</div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 16, fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
              <span>{venue.capacity_min != null || venue.capacity_max != null ? `${venue.capacity_min ?? '?'}–${venue.capacity_max ?? '?'} pax capacity` : 'Capacity not listed'}</span>
              <span>{leadTimeWeeks} week{leadTimeWeeks !== 1 ? 's' : ''} notice required</span>
            </div>

            {capacityWarning && (
              <div style={{ fontSize: 12, color: 'var(--wimc-coral)' }}>
                ⚠ {attendeesNum} expected attendees exceeds this venue&apos;s max capacity of {venue.capacity_max}.
              </div>
            )}
            {leadTimeWarning && (
              <div style={{ fontSize: 12, color: 'var(--wimc-coral)' }}>
                ⚠ This date is sooner than the venue&apos;s {leadTimeWeeks}-week notice policy — they may not be able to accommodate it.
              </div>
            )}
            {dayWarning && proposedWeekdayFull && (
              <div style={{ fontSize: 12, color: 'var(--wimc-coral)' }}>
                ⚠ This venue doesn&apos;t usually host on {proposedWeekdayFull.charAt(0).toUpperCase() + proposedWeekdayFull.slice(1)}s.
              </div>
            )}
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
    </>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Main page — discovery only. Once a proposal is sent, its whole lifecycle
// (negotiation, messages, accept/decline, cancelling a confirmed booking)
// is tracked from the Events page's "Venue Bookings" tab, not here.
// ---------------------------------------------------------------------------

export default function VenuesClient({ profileId: _profileId, defaultCity, makerTier }: Props) {
  const [city, setCity] = useState(() => normalizeCityToId(defaultCity))
  const [venueType, setVenueType] = useState('')
  const [date, setDate] = useState('')
  const [results, setResults] = useState<VenueProfile[]>([])
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, startSearch] = useTransition()

  const [selectedVenue, setSelectedVenue] = useState<VenueProfile | null>(null)
  const [proposalTarget, setProposalTarget] = useState<VenueProfile | null>(null)
  const [proposalSuccess, setProposalSuccess] = useState(false)
  const [tierFilter, setTierFilter] = useState<string>('')
  const [minCapacity, setMinCapacity] = useState(0)
  const [timeSlotFilter, setTimeSlotFilter] = useState<string>('')

  const [infographicDismissed, setInfographicDismissed] = useState(false)
  const [infographicMounted, setInfographicMounted] = useState(false)

  useEffect(() => {
    setInfographicDismissed(localStorage.getItem(INFOGRAPHIC_DISMISSED_KEY) === '1')
    setInfographicMounted(true)
  }, [])

  function dismissInfographic() {
    setInfographicDismissed(true)
    localStorage.setItem(INFOGRAPHIC_DISMISSED_KEY, '1')
  }

  // Auto-search on load using the maker's own city, so the venue list is
  // filtered to somewhere relevant by default instead of starting empty.
  useEffect(() => {
    if (defaultCity && makerTier !== 'wanderer') {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = Date.now()
  const trendingVenues = results.filter((a) => a.trending_until && new Date(a.trending_until).getTime() > now)
  const filteredResults = results.filter((a) => {
    if (tierFilter && a.venue_tier !== tierFilter) return false
    if (minCapacity > 0 && (a.capacity_max == null || a.capacity_max < minCapacity)) return false
    const pt = (a as VenueProfile & { preferred_times?: string[] }).preferred_times
    if (timeSlotFilter && pt && pt.length > 0 && !pt.includes(timeSlotFilter)) return false
    return true
  })

  const isGated = makerTier === 'wanderer'

  function handleSearch() {
    if (!city) { setSearchError('Please select a city.'); return }
    setSearchError(null)
    startSearch(async () => {
      const res = await searchVenues({ city, venue_type: venueType as never || undefined, date: date || undefined })
      setSearched(true)
      if (res.error) { setSearchError(res.error); return }
      setResults(res.venues)
    })
  }

  function handleProposeSuccess() {
    setProposalSuccess(true)
    setProposalTarget(null)
    setSelectedVenue(null)
  }

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/dashboard?panel=business"
            aria-label="Back to Business"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9999, color: 'var(--wimc-text-primary)', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 2 }}>
              Creator Studio
            </div>
            <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22, lineHeight: 1, color: 'var(--wimc-text-primary)' }}>Find a Venue</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard/events?tab=venue-bookings"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--wimc-text-secondary)', textDecoration: 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>handshake</span>
            Track your bookings in Events
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          </Link>
          {isGated && (
            <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 9999, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, background: 'var(--wimc-amber-dim)', color: 'var(--wimc-amber)', border: '1px solid rgba(245,168,0,0.3)' }}>
              Local+ required
            </span>
          )}
        </div>
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Tier gate banner */}
        {isGated && (
          <div style={{ background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.3)', borderRadius: 0, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--wimc-amber)', fontSize: 22 }}>lock</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--wimc-amber)', marginBottom: 2 }}>Venue search is a Local+ feature</div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>Host more events to reach Local tier and unlock the Venue marketplace.</div>
            </div>
          </div>
        )}

        {/* Search panel */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22, marginBottom: 16, color: 'var(--wimc-text-primary)' }}>Search Venues</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>City *</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} disabled={isGated}
                style={{ padding: '10px 12px', borderRadius: 0, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none' }}>
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Type</label>
              <select value={venueType} onChange={(e) => setVenueType(e.target.value)} disabled={isGated}
                style={{ padding: '10px 12px', borderRadius: 0, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none' }}>
                <option value="">Any type</option>
                {VENUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isGated} min={new Date().toISOString().slice(0, 10)}
                style={{ padding: '10px 12px', borderRadius: 0, background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', fontSize: 13, outline: 'none' }} />
            </div>
            <button onClick={handleSearch} disabled={isGated || isSearching}
              style={{ padding: '10px 24px', borderRadius: 0, background: 'var(--wimc-coral)', color: '#fff', border: 'none', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isGated || isSearching ? 0.4 : 1, whiteSpace: 'nowrap' }}>
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchError && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wimc-coral)' }}>{searchError}</div>}
        </div>

        {/* How it works — stays visible on top even after a search (the maker's
            city auto-searches on load), so it's a persistent reference rather
            than a one-time pre-search hint. Dismissible; the choice is
            remembered per browser via localStorage. */}
        {infographicMounted && !infographicDismissed && (
          <div style={{ position: 'relative', background: 'rgba(59,107,204,0.06)', border: '1px solid rgba(59,107,204,0.22)', borderRadius: 0, padding: '20px 24px' }}>
            <button
              onClick={dismissInfographic}
              aria-label="Hide this guide"
              style={{
                position: 'absolute', top: -14, right: -14, width: 28, height: 28,
                borderRadius: '50%', background: 'var(--wimc-bg-elevated)',
                border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-secondary)',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                boxShadow: '0 1px 4px rgba(26,39,68,0.15)', zIndex: 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { icon: 'search', title: '1. Discover', body: 'Search venues by city, type, and date to find the right fit for your event.' },
                { icon: 'send', title: '2. Propose', body: 'Pick a date and time, review the venue\'s pricing, and send a booking request.' },
                { icon: 'handshake', title: '3. Track in Events', body: 'Negotiate, message the venue, and manage confirmed bookings from your Events page.' },
              ].map((step) => (
                <div key={step.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--wimc-coral)', flexShrink: 0 }}>{step.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, marginBottom: 3, color: 'var(--wimc-text-primary)' }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.5 }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && (
          results.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13, padding: '32px 0' }}>
              No venues found matching your filters. Try a different city or remove the date filter.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

              {/* Filter sidebar */}
              <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 18, background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, padding: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--wimc-text-primary)' }}>Filters</div>
                  <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>
                    {filteredResults.length} of {results.length} venues
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--wimc-border-subtle)' }} />

                {/* Capacity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Pax</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { value: 0,   label: 'Any' },
                      { value: 30,  label: '30+' },
                      { value: 60,  label: '60+' },
                      { value: 100, label: '100+' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setMinCapacity(opt.value)}
                        style={{ padding: '3px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: '1px solid', transition: 'all 150ms', borderColor: minCapacity === opt.value ? 'var(--wimc-coral)' : 'var(--wimc-border-subtle)', background: minCapacity === opt.value ? 'rgba(232,112,90,0.10)' : 'transparent', color: minCapacity === opt.value ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--wimc-border-subtle)' }} />

                {/* Time slot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Time</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { value: '',           label: 'Any' },
                      { value: 'morning',    label: '🌤 Morning' },
                      { value: 'afternoon',  label: '☀️ Afternoon' },
                      { value: 'evening',    label: '🌆 Evening' },
                      { value: 'late_night', label: '🌙 Late' },
                    ].map(opt => (
                      <button key={opt.value || 'any'} onClick={() => setTimeSlotFilter(opt.value)}
                        style={{ padding: '3px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: '1px solid', transition: 'all 150ms', borderColor: timeSlotFilter === opt.value ? 'var(--wimc-teal)' : 'var(--wimc-border-subtle)', background: timeSlotFilter === opt.value ? 'rgba(77,210,177,0.10)' : 'transparent', color: timeSlotFilter === opt.value ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--wimc-border-subtle)' }} />

                {/* Tier */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Tier</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {([
                      { id: '',          label: 'All' },
                      { id: 'verified',  label: 'Verified' },
                      { id: 'beloved',   label: 'Beloved' },
                      { id: 'legendary', label: 'Legendary' },
                    ] as const).map(({ id, label }) => (
                      <button key={id || 'all'} onClick={() => setTierFilter(id)}
                        style={{ padding: '3px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: '1px solid', transition: 'all 150ms', borderColor: tierFilter === id ? 'var(--wimc-amber)' : 'var(--wimc-border-subtle)', background: tierFilter === id ? 'rgba(245,168,0,0.10)' : 'transparent', color: tierFilter === id ? 'var(--wimc-amber)' : 'var(--wimc-text-secondary)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Trending + results */}
              <div style={{ flex: '1 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Trending banner */}
                {trendingVenues.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>🔥</span>
                      <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--wimc-text-primary)' }}>
                        Trending in {city.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                      {trendingVenues.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedVenue(a)}
                          style={{
                            flexShrink: 0, width: 220, background: 'var(--wimc-bg-elevated)',
                            border: '1px solid rgba(232,87,42,0.45)', borderRadius: 0,
                            overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
                          }}
                        >
                          <div style={{ height: 80, background: a.cover_image_url ? `url(${a.cover_image_url}) center/cover` : 'linear-gradient(135deg, rgba(232,112,90,0.3) 0%, rgba(77,210,177,0.15) 100%)' }} />
                          <div style={{ padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, marginBottom: 3, color: 'var(--wimc-text-primary)' }}>{a.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                              {a.neighbourhood ? `${a.neighbourhood}, ` : ''}{a.city.replace(/_/g, ' ')}
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-primary)' }}>🔥 Trending</span>
                              <VenueTierBadge tier={a.venue_tier} size="sm" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results grid — fixed 3 columns, so a single result takes
                    one card's width instead of stretching full-bleed. */}
                {filteredResults.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13, padding: '24px 0' }}>
                    No {tierFilter} venues found. Try a different tier filter.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {filteredResults.map((a) => (
                      <VenueCard key={a.id} venue={a} onSelect={setSelectedVenue} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* Proposal success toast */}
        {proposalSuccess && (
          <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--wimc-teal)', color: '#0a0a0b', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, zIndex: 300 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Proposal sent! Track its status from Events → Venue Bookings.
            <Link href="/dashboard/events?tab=venue-bookings" style={{ color: '#0a0a0b', fontWeight: 700, textDecoration: 'underline', marginLeft: 4 }}>
              View
            </Link>
            <button onClick={() => setProposalSuccess(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, color: '#0a0a0b', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedVenue && !proposalTarget && (
        <DetailDrawer
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onPropose={() => setProposalTarget(selectedVenue)}
        />
      )}

      {/* Proposal modal */}
      {proposalTarget && (
        <ProposalModal
          venue={proposalTarget}
          onClose={() => setProposalTarget(null)}
          onSuccess={handleProposeSuccess}
        />
      )}

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </>
  )
}
