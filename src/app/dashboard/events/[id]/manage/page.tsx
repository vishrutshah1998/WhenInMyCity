'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/types/database'

// ── Types ────────────────────────────────────────────────────────────────────

interface VenueInfo {
  name: string
  city: string
  venue_type: string[]
  slug: string
}

interface CreatorInfo {
  display_name: string
  username: string
  city: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const GRAIN_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function formatEventTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase()
}

// ── Dimmed form (read-only left panel) ───────────────────────────────────────

function ReadOnlyForm({ event, venue }: { event: Event; venue: VenueInfo | null }) {
  const MONTH_NAMES_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const d = new Date(event.starts_at)
  const dateStr = `${String(d.getDate()).padStart(2,'0')} / ${MONTH_NAMES_SHORT[d.getMonth()]} / ${d.getFullYear()}`
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).toUpperCase() + ' HRS'

  const SectionLabel = ({ n, label }: { n: string; label: string }) => (
    <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
         className="text-[#E8705A]/60 text-[10px] uppercase tracking-[0.2em] mb-4">
      {n}. {label}
    </div>
  )

  const Field = ({ value, large }: { value: string; large?: boolean }) => (
    <div style={{ fontFamily: large ? 'var(--font-abril)' : 'var(--font-jetbrains-mono)', fontSize: large ? 28 : 14 }}
         className="text-white/50 py-2 border-b border-white/10">
      {value}
    </div>
  )

  return (
    <div className="p-8 space-y-10">
      {/* Submitted banner */}
      <div className="bg-white/5 border border-dashed border-white/20 px-4 py-3 text-center">
        <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              className="text-white/40 text-[10px] uppercase tracking-widest">
          EVENT SUBMITTED — EDITING AVAILABLE BELOW
        </span>
      </div>

      <div>
        <SectionLabel n="01" label="POSTER STYLE" />
        <Field value="DARK UNDERGROUND" />
      </div>

      <div>
        <SectionLabel n="02" label="EVENT IDENTITY" />
        <Field value={event.title} large />
      </div>

      <div>
        <SectionLabel n="03" label="CHRONOLOGY" />
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#201f23]/40 p-4 border border-[#57423e]/50">
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                 className="text-white/20 text-[9px] uppercase mb-2">DATE</div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                 className="text-white/40 text-[16px]">{dateStr}</div>
          </div>
          <div className="bg-[#201f23]/40 p-4 border border-[#57423e]/50">
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                 className="text-white/20 text-[9px] uppercase mb-2">TIME</div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                 className="text-white/40 text-[16px]">{timeStr}</div>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel n="04" label="GEOGRAPHY" />
        <Field value={venue?.name || event.venue_name} />
        <Field value={event.venue_address} />
      </div>

      <div>
        <SectionLabel n="05" label="ADMISSION LOGIC" />
        <Field value={event.ticket_price === 0 ? 'FREE EVENT' : `₹${(event.ticket_price / 100).toFixed(0)}`} />
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ManageEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params?.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [venue, setVenue] = useState<VenueInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notOwner, setNotOwner] = useState(false)
  const [copyLabel, setCopyLabel] = useState('COPY LINK')
  const [stripPulse, setStripPulse] = useState(true)

  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/signin'); return }

      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()

      if (!ev) { setLoading(false); return }

      if (ev.creator_id !== session.user.id) {
        setNotOwner(true)
        router.push(`/events/${eventId}`)
        return
      }

      setEvent(ev as Event)

      if (ev.venue_id) {
        const { data: v } = await supabase
          .from('venue_profiles')
          .select('name, city, venue_type, slug')
          .eq('id', ev.venue_id)
          .maybeSingle()
        if (v) setVenue(v as VenueInfo)
      }

      setLoading(false)
    }
    if (eventId) load()
  }, [eventId, router])

  // Stop strip pulse after 3s
  useEffect(() => {
    const t = setTimeout(() => setStripPulse(false), 3000)
    return () => clearTimeout(t)
  }, [])

  async function handleCopyLink() {
    if (!event) return
    const url = `${window.location.origin}/events/${event.slug}`
    await navigator.clipboard.writeText(url)
    setCopyLabel('COPIED!')
    setTimeout(() => setCopyLabel('COPY LINK'), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070A] flex items-center justify-center">
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
             className="text-white/40 text-[11px] uppercase tracking-widest animate-pulse">
          LOADING EVENT...
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#07070A] flex items-center justify-center">
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
             className="text-white/40 text-[11px] uppercase tracking-widest">
          EVENT NOT FOUND
        </div>
      </div>
    )
  }

  const eventDateStr = formatEventDate(event.starts_at)
  const eventTimeStr = formatEventTime(event.starts_at)
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.slug}`

  return (
    <>
      {/* Global grain overlay */}
      <div className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.028]"
           style={GRAIN_STYLE} />

      <div className="bg-[#07070A] min-h-screen flex flex-col">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-50 h-16 bg-[#07070A]/95 backdrop-blur
                           border-b-2 border-dashed border-[#57423e]
                           flex items-center justify-between px-8">
          <button onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  className="text-[11px] uppercase tracking-widest">
              ALL EVENTS
            </span>
          </button>

          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, letterSpacing: '-0.02em' }}
                  className="text-[#E8705A] text-[18px] uppercase">
              EVENT MANAGEMENT
            </span>
          </div>

          <button onClick={() => router.push(`/events/${event.slug}`)}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  className="text-[11px] uppercase tracking-widest">
              PUBLIC PAGE
            </span>
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
        </header>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

          {/* ── LEFT: DIMMED FORM (read-only) ── */}
          <div className="w-[40%] bg-[#131317] border-r-2 border-dashed border-[#57423e]
                          opacity-40 grayscale-[0.3] pointer-events-none overflow-y-auto">
            <ReadOnlyForm event={event} venue={venue} />
          </div>

          {/* ── RIGHT: MANAGEMENT PANEL ── */}
          <div className="w-[60%] bg-[#07070A] overflow-y-auto flex flex-col">

            {/* Published confirmation strip */}
            <div ref={stripRef}
                 className={[
                   'sticky top-0 z-20 bg-[#1A2744] p-8 border-b-2 border-dashed border-[#57423e]',
                   'flex items-center justify-between',
                   stripPulse ? 'animate-pulse' : '',
                 ].join(' ')}>
              <div className="flex items-center gap-6">
                {/* LIVE badge */}
                <div className="bg-[#E8705A] text-white px-3 py-1 flex items-center gap-1 rounded-full"
                     style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 700 }}>
                  <span className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                    flash_on
                  </span>
                  LIVE
                </div>

                <div>
                  <div style={{ fontFamily: 'var(--font-abril)', fontSize: 32, lineHeight: 1 }}
                       className="text-white tracking-tight">
                    {event.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                       className="text-white/50 text-[11px] uppercase mt-1">
                    {eventDateStr} · {eventTimeStr} · {venue?.city || event.venue_address}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleCopyLink}
                        className="bg-[#E8705A] text-white px-6 py-3 flex items-center gap-2
                                   hover:brightness-110 transition-all"
                        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fontWeight: 700 }}>
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  {copyLabel}
                </button>
                <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: event.title, url: publicUrl })
                  }
                }}
                        className="border-2 border-dashed border-[#E8705A]/40 text-[#E8705A] px-6 py-3
                                   flex items-center gap-2 hover:border-[#E8705A] transition-colors"
                        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  SHARE
                </button>
              </div>
            </div>

            {/* Management grid — 2×2 cards */}
            <div className="p-10 grid grid-cols-2 gap-6">
              {[
                {
                  icon: 'confirmation_number',
                  title: 'SET UP TICKETS',
                  desc: 'Configure pricing tiers & capacity',
                  onClick: () => {},
                },
                {
                  icon: 'person_add',
                  title: 'INVITE GUESTS',
                  desc: 'Blast invites or upload CSV',
                  onClick: () => {},
                },
                {
                  icon: 'edit_note',
                  title: 'ADD DESCRIPTION',
                  desc: 'Write the lineup, story, venue rules',
                  onClick: () => {},
                },
                {
                  icon: 'open_in_new',
                  title: 'VIEW PUBLIC PAGE',
                  desc: 'See how the city views your event',
                  onClick: () => router.push(`/events/${event.slug}`),
                },
              ].map((card, i) => (
                <button key={i}
                        onClick={card.onClick}
                        className="bg-[#1A2744] border border-white/10 p-6 cursor-pointer
                                   hover:border-[#E8705A]/30 transition-colors group relative
                                   overflow-hidden text-left">
                  {/* Icon watermark */}
                  <span className="material-symbols-outlined absolute -right-4 -top-4
                                   text-[120px] text-white opacity-5 group-hover:opacity-10
                                   transition-opacity pointer-events-none select-none"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                    {card.icon}
                  </span>

                  <span className="material-symbols-outlined text-[#E8705A] text-[28px] mb-4 block"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                    {card.icon}
                  </span>
                  <div style={{ fontFamily: 'var(--font-dm-sans)' }}
                       className="text-white text-[20px] font-bold">
                    {card.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-dm-sans)' }}
                       className="text-white/40 text-[13px] mt-1">
                    {card.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Ticket inventory widget */}
            <div className="px-10 pb-10">
              <div className="bg-[#1A2744] border border-white/10">

                {/* Widget header */}
                <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
                  <span style={{ fontFamily: 'var(--font-dm-sans)' }}
                        className="text-white font-bold uppercase tracking-wider">
                    TICKET INVENTORY
                  </span>
                  <div className="text-right">
                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                         className="text-white/40 text-[10px] uppercase">
                      TOTAL REVENUE
                    </div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 28 }}
                         className="text-[#E8705A]">
                      ₹ 0
                    </div>
                  </div>
                </div>

                {/* Empty state / tier rows */}
                {!event.ticket_tiers ? (
                  <div className="mx-8 my-8 py-12 flex flex-col items-center
                                  border-2 border-dashed border-white/5 bg-black/20">
                    <div style={{ fontFamily: 'var(--font-dm-sans)' }}
                         className="text-white/40 mb-4">
                      This event is currently free
                    </div>
                    <button className="border border-dashed border-[#E8705A] text-[#E8705A]
                                       px-8 py-3 hover:bg-[#E8705A]/10 transition-colors"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>
                      ADD TICKET TIER +
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {/* Placeholder tier row (shown when tiers are defined) */}
                    <div className="relative bg-[#07070A] border border-white/10 flex h-[100px]
                                    group hover:border-[#E8705A]/50 transition-colors">
                      <div className="w-[3px] h-full bg-[#E8705A]" />
                      <div className="flex-1 px-6 flex items-center justify-between">
                        <div>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                               className="text-[#E8705A] text-[10px] uppercase tracking-wide">
                            GENERAL ADMISSION
                          </div>
                          <div style={{ fontFamily: 'var(--font-dm-sans)' }}
                               className="text-white text-[22px]">
                            General
                          </div>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                               className="text-white/40 text-[12px]">
                            INV-{event.id.slice(0, 4).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex items-center gap-12">
                          <div className="text-center">
                            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                                 className="text-white/40 text-[9px] uppercase mb-1">SOLD</div>
                            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 24 }}
                                 className="text-white">
                              0/{event.capacity ?? '∞'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                                 className="text-white/40 text-[9px] uppercase mb-1">PRICE</div>
                            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 24 }}
                                 className="text-white">
                              {event.ticket_price === 0 ? 'FREE' : `₹${event.ticket_price / 100}`}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-white/40">more_vert</span>
                        </div>
                      </div>
                      {/* Perforated line */}
                      <div className="w-[1px] my-4"
                           style={{
                             background: 'repeating-linear-gradient(to bottom, transparent 0, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 100%)',
                             backgroundSize: '1px 12px',
                           }} />
                      {/* Stub */}
                      <div className="w-24 flex items-center justify-center bg-white/5">
                        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                              className="text-white/40 text-[10px] uppercase tracking-[0.3em]">
                          ADMIT ONE
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity log */}
            <div className="px-10 pb-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-white/40 text-[16px]">terminal</span>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                      className="text-white/40 text-[10px] uppercase tracking-widest">
                  SYSTEM ACTIVITY LOG
                </span>
                <div className="flex-1 h-[1px] bg-white/5" />
              </div>

              <div className="bg-[#0e0e11] border border-white/5 p-6 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        className="text-green-400/80 text-[13px]">
                    [just now] Event published successfully to {venue?.city || event.venue_address} feed
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 flex-shrink-0 bg-white/10" />
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        className="text-white/30 text-[13px]">
                    [—] No ticket sales yet
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 flex-shrink-0 bg-white/10" />
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                        className="text-white/30 text-[13px]">
                    [—] 0 guests invited
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
