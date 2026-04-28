'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createEvent, publishEvent } from '@/app/actions/events'
import type { CreateEventInput, TicketTier } from '@/types/events'
import type { UserTier } from '@/types/database'
import { CoverImagePanel } from '@/components/events/CoverImagePanel'
import { ThemePicker } from '@/components/events/ThemePicker'
import { DateTimePicker } from '@/components/events/DateTimePicker'
import { InlineExpandRow, StaticRow, PillToggle, ToggleSwitch } from '@/components/events/InlineExpandRow'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  display_name: string | null
  avatar_url: string | null
  user_tier?: UserTier | null
}

interface VenueRow {
  id: string
  name: string
  address: string
  city: string
  lat: number | null
  lng: number | null
  photos: string[] | null
  category: string | null
  capacity_max: number | null
  google_maps_url: string | null
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function formatDateDisplay(date: Date | null): string {
  if (!date) return 'Date'
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTimeDisplay(date: Date | null): string {
  if (!date) return 'Time'
  return date
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DateRowProps {
  label: string
  date: Date | null
  dotFilled: boolean
  onDateClick: () => void
  onTimeClick: () => void
}

function DateRow({ label, date, dotFilled, onDateClick, onTimeClick }: DateRowProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="w-4 flex items-center justify-center shrink-0">
        <div className={`w-2 h-2 rounded-full ${dotFilled ? 'bg-primary' : 'border-2 border-outline-variant'}`} />
      </div>
      <span className="text-xs text-on-surface-variant w-9 shrink-0 font-medium">{label}</span>
      <button
        type="button"
        onClick={onDateClick}
        className="text-sm text-on-surface px-2.5 py-1 rounded-lg hover:bg-surface-container-high transition-colors font-medium"
      >
        {formatDateDisplay(date)}
      </button>
      <button
        type="button"
        onClick={onTimeClick}
        className={`text-sm px-2.5 py-1 rounded-lg hover:bg-surface-container-high transition-colors font-medium ${
          date ? 'text-on-surface' : 'text-on-surface-variant/40'
        }`}
      >
        {formatTimeDisplay(date)}
      </button>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

const inputCls = 'w-full bg-surface-container-low text-on-surface placeholder:text-outline-variant rounded-lg px-3 py-2.5 text-sm border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40'
const sectionLabel = 'text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3'

// ─── Main form ────────────────────────────────────────────────────────────────

export default function CreateEventForm({
  venues,
  profile,
}: {
  venues: VenueRow[]
  profile: ProfileData | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Cover
  const [themeId, setThemeId] = useState('minimal')
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null)

  // Visibility
  const [isPrivate, setIsPrivate] = useState(false)

  // Title
  const [title, setTitle] = useState('')

  // Dates
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null)

  // Location
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [venueLat, setVenueLat] = useState<number | null>(null)
  const [venueLng, setVenueLng] = useState<number | null>(null)
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [hideAddress, setHideAddress] = useState(false)

  // Description
  const [description, setDescription] = useState('')

  // Pricing
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('free')
  const [priceRupees, setPriceRupees] = useState('')

  // Require Approval
  const [requireApproval, setRequireApproval] = useState(false)

  // Capacity
  const [capacityType, setCapacityType] = useState<'unlimited' | 'limited'>('unlimited')
  const [capacityValue, setCapacityValue] = useState('')

  // Early access
  const [earlyAccessAt, setEarlyAccessAt] = useState('')

  // Fan tiers (Lantern+)
  const isLanternPlus = profile?.user_tier === 'lantern' || profile?.user_tier === 'beacon'
  const [fanTiersEnabled, setFanTiersEnabled] = useState(false)
  const [fanTiers, setFanTiers] = useState<TicketTier[]>([
    { id: crypto.randomUUID(), name: 'General', price_paise: 0, description: 'Standard entry', capacity: null },
  ])

  function addFanTier() {
    if (fanTiers.length >= 5) return
    setFanTiers((prev) => [...prev, { id: crypto.randomUUID(), name: '', price_paise: 0, description: '', capacity: null }])
  }

  function removeFanTier(id: string) {
    setFanTiers((prev) => prev.filter((t) => t.id !== id))
  }

  function updateFanTier(id: string, patch: Partial<TicketTier>) {
    setFanTiers((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t))
  }

  // Error
  const [error, setError] = useState<string | null>(null)

  // ── Date picker logic ─────────────────────────────────────────────────────

  function handleDateChange(date: Date) {
    if (pickerTarget === 'start') {
      setStartDate(date)
      if (!endDate) setEndDate(new Date(date.getTime() + 60 * 60 * 1000))
    } else {
      setEndDate(date)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    setError(null)

    if (!title.trim()) { setError('Please enter an event name.'); return }
    if (title.trim().length < 3) { setError('Event name must be at least 3 characters.'); return }
    if (!startDate) { setError('Please select a start date and time.'); return }
    if (startDate <= new Date()) { setError('Start time must be in the future.'); return }
    if (!venueName.trim()) { setError('Please add a venue name.'); return }
    if (!venueAddress.trim() || venueAddress.trim().length < 5) {
      setError('Please add a full venue address (at least 5 characters).')
      return
    }

    let ticketPricePaise = 0
    if (fanTiersEnabled && isLanternPlus) {
      // Validate fan tiers — at least one must have a name
      if (fanTiers.some((t) => !t.name.trim())) {
        setError('Each ticket tier needs a name.'); return
      }
      // Flat ticket_price = min paid tier price (0 if all free)
      const paidPrices = fanTiers.filter((t) => t.price_paise > 0).map((t) => t.price_paise)
      ticketPricePaise = paidPrices.length ? Math.min(...paidPrices) : 0
    } else {
      ticketPricePaise = pricingType === 'free' ? 0 : Math.round(parseFloat(priceRupees || '0') * 100)
      if (pricingType === 'paid' && ticketPricePaise <= 0) {
        setError('Please enter a ticket price greater than ₹0.')
        return
      }
    }

    const input: CreateEventInput = {
      title:           title.trim(),
      description:     description.trim() || undefined,
      cover_image_url: customCoverUrl || undefined,
      venue_name:      venueName.trim(),
      venue_address:   venueAddress.trim(),
      venue_lat:       venueLat ?? undefined,
      venue_lng:       venueLng ?? undefined,
      google_maps_url: googleMapsUrl.trim() || undefined,
      starts_at:       startDate.toISOString(),
      ends_at:         endDate?.toISOString(),
      ticket_price:    ticketPricePaise,
      capacity:
        capacityType === 'limited' && capacityValue
          ? parseInt(capacityValue, 10)
          : undefined,
      early_access_at: earlyAccessAt ? new Date(earlyAccessAt).toISOString() : undefined,
      ticket_tiers:    fanTiersEnabled && isLanternPlus ? fanTiers : undefined,
    }

    startTransition(async () => {
      const result = await createEvent(input)
      if (result.error || !result.event) {
        setError(result.error ?? 'Failed to create event.')
        return
      }
      const pubResult = await publishEvent(result.event.id)
      if (pubResult.error) {
        setError(pubResult.error)
        return
      }
      router.push(`/dashboard/events/${result.event.id}/published`)
    })
  }

  // ── GST note ─────────────────────────────────────────────────────────────

  const priceNum = parseFloat(priceRupees || '0')
  const gstNote =
    pricingType === 'paid' && priceRupees
      ? priceNum < 500
        ? <span className="text-green-400 text-xs">✓ No GST below ₹500</span>
        : <span className="text-amber-400 text-xs">18% GST applies above ₹500</span>
      : null

  const pickerMinDate = pickerTarget === 'end' ? (startDate ?? new Date()) : new Date()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-surface border-b border-outline-variant/30 shadow-sm flex items-center justify-between px-4 h-16 gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-base text-on-surface">Create Event</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-semibold hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-base">{isPrivate ? 'lock' : 'public'}</span>
            {isPrivate ? 'Private' : 'Public'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPending ? <Spinner /> : <span className="material-symbols-outlined text-base">rocket_launch</span>}
            {isPending ? 'Creating…' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 md:grid md:grid-cols-[380px_1fr] md:gap-10 md:items-start">

        {/* ── LEFT: Cover + Theme ── */}
        <div className="mb-8 md:mb-0 md:sticky md:top-24">
          <p className={sectionLabel}>Cover</p>
          <CoverImagePanel
            themeId={themeId}
            customUrl={customCoverUrl}
            onThemeChange={setThemeId}
            onUpload={setCustomCoverUrl}
            onClearCustom={() => setCustomCoverUrl(null)}
            eventData={{
              title,
              startsAt: startDate,
              venueName,
              ticketPrice: pricingType === 'free' ? 0 : (parseFloat(priceRupees) || 0) * 100,
              creatorTier: profile?.user_tier ?? null,
            }}
          />
          <div className="mt-3">
            <ThemePicker
              activeThemeId={themeId}
              onThemeChange={setThemeId}
              disabled={!!customCoverUrl}
            />
          </div>

          {/* Creator pill */}
          {profile && (
            <div className="mt-4 flex items-center gap-2.5 px-3 py-2.5 bg-surface-container-lowest rounded-xl border border-white/5">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.display_name ?? ''} width={28} height={28} className="object-cover" unoptimized />
                ) : (
                  <span className="text-primary text-xs font-bold">{(profile.display_name ?? 'C').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-sm text-on-surface font-medium">{profile.display_name ?? 'Creator'}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Event details ── */}
        <div className="flex flex-col gap-5">

          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event Name"
              maxLength={75}
              className="w-full bg-transparent border-none outline-none text-3xl font-headline font-bold text-on-surface placeholder:text-on-surface-variant/30 leading-tight"
            />
            {title.length >= 60 && (
              <p className="text-on-surface-variant/50 text-xs mt-1">{75 - title.length} characters left</p>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <p className={sectionLabel}>Date & Time</p>
            <div className="flex gap-3">
              <div className="flex-1 bg-surface-container-lowest rounded-xl border border-white/5 py-1 overflow-hidden">
                <DateRow
                  label="Start"
                  date={startDate}
                  dotFilled
                  onDateClick={() => setPickerTarget('start')}
                  onTimeClick={() => setPickerTarget('start')}
                />
                <div className="h-px bg-outline-variant/20 mx-4" />
                <DateRow
                  label="End"
                  date={endDate}
                  dotFilled={false}
                  onDateClick={() => setPickerTarget('end')}
                  onTimeClick={() => setPickerTarget('end')}
                />
              </div>
              {/* Timezone */}
              <div className="flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl bg-surface-container-lowest border border-white/5 shrink-0 min-w-[90px]">
                <span className="material-symbols-outlined text-base text-on-surface-variant">language</span>
                <span className="text-xs text-on-surface font-semibold">GMT+05:30</span>
                <span className="text-[10px] text-on-surface-variant">Calcutta</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className={sectionLabel}>Location</p>
            <InlineExpandRow
              icon="location_on"
              label={venueName || 'Add Event Location'}
              subtitle={venueName ? venueAddress || 'Add full address' : 'Offline location or virtual link'}
            >
              {(collapse) => (
                <div className="px-4 pb-4 pt-4 space-y-3">

                  {/* Partner venues */}
                  {venues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Partner Venues</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {venues.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              if (selectedVenueId === v.id) {
                                setSelectedVenueId(null)
                                setVenueName('')
                                setVenueAddress('')
                                setGoogleMapsUrl('')
                                setVenueLat(null)
                                setVenueLng(null)
                              } else {
                                setSelectedVenueId(v.id)
                                setVenueName(v.name)
                                setVenueAddress(v.address)
                                setGoogleMapsUrl(v.google_maps_url ?? '')
                                setVenueLat(v.lat)
                                setVenueLng(v.lng)
                              }
                            }}
                            className={`shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-colors ${
                              selectedVenueId === v.id
                                ? 'bg-primary/10 border-primary/50 text-on-surface'
                                : 'bg-surface-container-low border-white/10 text-on-surface-variant hover:border-white/25'
                            }`}
                          >
                            <span className="text-xs font-semibold whitespace-nowrap">{v.name}</span>
                            <span className="text-[10px] text-on-surface-variant whitespace-nowrap">{v.city}{v.category ? ` · ${v.category}` : ''}</span>
                          </button>
                        ))}
                      </div>
                      <div className="h-px bg-outline-variant/20" />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Venue name"
                    value={venueName}
                    onChange={(e) => { setVenueName(e.target.value); setSelectedVenueId(null) }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Full address"
                    value={venueAddress}
                    onChange={(e) => { setVenueAddress(e.target.value); setSelectedVenueId(null) }}
                    className={inputCls}
                  />

                  {/* Google Maps link */}
                  <div className="flex items-center gap-2 bg-surface-container-low border border-white/5 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/40">
                    <span className="material-symbols-outlined text-base text-on-surface-variant shrink-0">map</span>
                    <input
                      type="url"
                      placeholder="Google Maps link (optional)"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline-variant border-none outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-on-surface-variant">Hide address until RSVP</span>
                    <ToggleSwitch checked={hideAddress} onChange={() => setHideAddress((v) => !v)} />
                  </div>

                  <button type="button" onClick={collapse} className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                    Done ✓
                  </button>
                </div>
              )}
            </InlineExpandRow>
          </div>

          {/* Description */}
          <div>
            <p className={sectionLabel}>Description</p>
            <InlineExpandRow
              icon="notes"
              label="Add Description"
              subtitle={description ? description.slice(0, 60) + (description.length > 60 ? '…' : '') : undefined}
            >
              {(collapse) => (
                <div className="px-4 pb-4 pt-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    placeholder="Describe your event…"
                    rows={5}
                    className={`${inputCls} resize-none leading-relaxed`}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button type="button" onClick={collapse} className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                      Done ✓
                    </button>
                    <span className="text-xs text-on-surface-variant">{description.length} / 2000</span>
                  </div>
                </div>
              )}
            </InlineExpandRow>
          </div>

          {/* Event Options */}
          <div>
            <p className={sectionLabel}>Event Options</p>
            <div className="rounded-xl overflow-hidden border border-white/5 divide-y divide-outline-variant/20">

              {/* Ticket Price */}
              <InlineExpandRow
                grouped
                icon="confirmation_number"
                label="Ticket Price"
                rightContent={
                  <span className="text-sm text-on-surface-variant">
                    {pricingType === 'free' ? 'Free' : priceRupees ? `₹${priceRupees}` : 'Paid'}
                  </span>
                }
              >
                {(collapse) => (
                  <div className="px-4 pb-4 pt-4 space-y-3">
                    <PillToggle
                      options={[{ value: 'free', label: 'Free' }, { value: 'paid', label: 'Paid' }]}
                      value={pricingType}
                      onChange={(v) => setPricingType(v as 'free' | 'paid')}
                    />
                    {pricingType === 'paid' && (
                      <div className="space-y-2">
                        <div className="flex items-center bg-surface-container-low border border-white/5 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/40">
                          <span className="text-lg font-bold text-primary mr-2">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={priceRupees}
                            onChange={(e) => setPriceRupees(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-on-surface placeholder:text-outline-variant"
                          />
                        </div>
                        {gstNote && <div>{gstNote}</div>}
                      </div>
                    )}
                    <button type="button" onClick={collapse} className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                      Done ✓
                    </button>
                  </div>
                )}
              </InlineExpandRow>

              {/* Fan Ticket Tiers — Lantern+ only */}
              {isLanternPlus && (
                <StaticRow
                  grouped
                  icon="local_activity"
                  label="Fan Tiers"
                  rightContent={
                    <ToggleSwitch checked={fanTiersEnabled} onChange={() => setFanTiersEnabled((v) => !v)} />
                  }
                  note={
                    fanTiersEnabled ? (
                      <div className="px-4 pb-4 space-y-3">
                        <p className="text-xs text-on-surface-variant">
                          Up to 5 tiers — e.g. Free entry, ₹99 Supporter, ₹299 Patron.
                          Replaces the flat ticket price above.
                        </p>
                        {fanTiers.map((tier, idx) => (
                          <div key={tier.id} className="rounded-lg border border-white/8 bg-surface-container-low p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary w-5">{idx + 1}</span>
                              <input
                                type="text"
                                placeholder="Tier name (e.g. General)"
                                value={tier.name}
                                onChange={(e) => updateFanTier(tier.id, { name: e.target.value })}
                                className={`${inputCls} flex-1 text-sm`}
                              />
                              {fanTiers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFanTier(tier.id)}
                                  className="text-error/60 hover:text-error transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-surface-container border border-white/5 rounded-lg px-2 py-1.5 flex-1">
                                <span className="text-sm font-bold text-primary mr-1.5">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={tier.price_paise === 0 ? '' : String(tier.price_paise / 100)}
                                  onChange={(e) => updateFanTier(tier.id, { price_paise: Math.round(parseFloat(e.target.value || '0') * 100) })}
                                  className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-on-surface placeholder:text-outline-variant w-20"
                                />
                              </div>
                              <span className="text-xs text-on-surface-variant">{tier.price_paise === 0 ? 'Free' : ''}</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Perks / description (optional)"
                              value={tier.description}
                              onChange={(e) => updateFanTier(tier.id, { description: e.target.value })}
                              className={`${inputCls} text-xs`}
                            />
                          </div>
                        ))}
                        {fanTiers.length < 5 && (
                          <button
                            type="button"
                            onClick={addFanTier}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            Add tier
                          </button>
                        )}
                      </div>
                    ) : null
                  }
                />
              )}

              {/* Require Approval */}
              <StaticRow
                grouped
                icon="how_to_reg"
                label="Require Approval"
                rightContent={
                  <ToggleSwitch checked={requireApproval} onChange={() => setRequireApproval((v) => !v)} />
                }
                note={
                  requireApproval ? (
                    <p className="px-4 pb-3 text-xs text-amber-400">
                      Attendees must be approved before their spot is confirmed.
                    </p>
                  ) : null
                }
              />

              {/* Capacity */}
              <InlineExpandRow
                grouped
                icon="group"
                label="Capacity"
                rightContent={
                  <span className="text-sm text-on-surface-variant">
                    {capacityType === 'unlimited' ? 'Unlimited' : (capacityValue || 'Set limit')}
                  </span>
                }
              >
                {(collapse) => (
                  <div className="px-4 pb-4 pt-4 space-y-3">
                    <PillToggle
                      options={[{ value: 'unlimited', label: 'Unlimited' }, { value: 'limited', label: 'Limited' }]}
                      value={capacityType}
                      onChange={(v) => setCapacityType(v as 'unlimited' | 'limited')}
                    />
                    {capacityType === 'limited' && (
                      <>
                        <input
                          type="number"
                          min="1"
                          placeholder="Max attendees"
                          value={capacityValue}
                          onChange={(e) => setCapacityValue(e.target.value)}
                          className={inputCls}
                        />
                        <p className="text-xs text-on-surface-variant">Current RSVPs will count toward this limit.</p>
                      </>
                    )}
                    <button type="button" onClick={collapse} className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                      Done ✓
                    </button>
                  </div>
                )}
              </InlineExpandRow>
            </div>
          </div>

              {/* Early Access (Local+ only) */}
              {profile?.user_tier && profile.user_tier !== 'wanderer' && (
                <InlineExpandRow
                  grouped={false}
                  icon="lock_open"
                  label="Early Access"
                  rightContent={
                    <span className="text-sm text-on-surface-variant">
                      {earlyAccessAt
                        ? new Date(earlyAccessAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                        : 'Optional'}
                    </span>
                  }
                >
                  {(collapse) => (
                    <div className="px-4 pb-4 pt-4 space-y-3">
                      <p className="text-xs text-on-surface-variant">
                        Set a window during which only <strong>Local+</strong> explorers can RSVP. Wanderers get access after this time passes.
                      </p>
                      <input
                        type="datetime-local"
                        value={earlyAccessAt}
                        onChange={(e) => setEarlyAccessAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        max={startDate ? startDate.toISOString().slice(0, 16) : undefined}
                        className={inputCls}
                      />
                      {earlyAccessAt && (
                        <button
                          type="button"
                          onClick={() => setEarlyAccessAt('')}
                          className="text-xs text-error/70 hover:text-error transition-colors"
                        >
                          Remove early access window
                        </button>
                      )}
                      <button type="button" onClick={collapse} className="text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                        Done ✓
                      </button>
                    </div>
                  )}
                </InlineExpandRow>
              )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-error/10 border border-error/20 rounded-xl">
              <span className="material-symbols-outlined text-error text-base mt-0.5 shrink-0">error</span>
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* Bottom padding so last card isn't flush on mobile */}
          <div className="h-8" />
        </div>
      </div>

      {/* DateTimePicker modal */}
      <DateTimePicker
        value={pickerTarget === 'start' ? startDate : endDate}
        onChange={handleDateChange}
        minDate={pickerMinDate}
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
      />

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
