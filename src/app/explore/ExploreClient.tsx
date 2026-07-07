'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Pushpin from '@/components/ui/Pushpin'
import RubberStamp from '@/components/ui/RubberStamp'
import { createClient } from '@/lib/supabase/client'
import { profileUrl } from '@/lib/profile-url'

// ─── Exported data types ──────────────────────────────────────────────────────

export interface ExploreEvent {
  id: string
  title: string
  starts_at: string
  ticket_price: number  // paise
  capacity: number | null
  slug: string
  venue_name: string
  creator: { display_name: string; username: string; creator_type: string; city: string } | null
}

export interface ExploreCreator {
  id: string
  display_name: string
  username: string
  creator_type: string
  sub_types: string[]
  city: string
}

export interface ExploreVenue {
  id: string
  name: string
  slug: string
  neighbourhood: string | null
  city: string
  venue_type: string[]
  capacity_max: number | null
  is_verified: boolean
  events_count?: number | null
}

export interface SubscribedPost {
  id:         string
  post_type:  'text' | 'photo' | 'link'
  content:    string | null
  image_url:  string | null
  link_url:   string | null
  link_title: string | null
  created_at: string
  creator: {
    display_name: string
    username:     string
    creator_type: string
    city:         string
  } | null
}

interface Props {
  tab:                string
  city:               string
  events:             ExploreEvent[]
  creators:           ExploreCreator[]
  venues:             ExploreVenue[]
  subscribedPosts?:   SubscribedPost[]
  followedCreatorIds?: string[]
  viewerUserId?:      string | null
  inDashboard?:       boolean
  basePath?:          string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    day:   DAYS[d.getDay()],
    date:  d.getDate(),
    month: MONTHS[d.getMonth()],
    badge: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
  }
}

function priceFmt(paise: number) {
  return paise === 0 ? 'FREE' : `₹${Math.round(paise / 100)}`
}

function initial(name: string) {
  return (name?.[0] ?? '?').toUpperCase()
}

// ─── Crosshatch page background ───────────────────────────────────────────────

function makePageBg(baseColor: string): React.CSSProperties {
  return {
    backgroundColor: baseColor,
    backgroundImage: 'radial-gradient(#1A2744 0.5px, transparent 0.5px)',
    backgroundSize: '16px 16px',
  }
}

// ─── Grain overlay ────────────────────────────────────────────────────────────

function Grain() {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.028]" aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="explore-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#explore-grain)" />
      </svg>
    </div>
  )
}

// ─── Barcode decoration ───────────────────────────────────────────────────────

function Barcode({ light = false }: { light?: boolean }) {
  const color = light ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.3)'
  return (
    <div style={{
      height: 16, width: 64, flexShrink: 0,
      background: `repeating-linear-gradient(90deg, ${color}, ${color} 1px, transparent 1px, transparent 4px)`,
    }} />
  )
}

// ─── Image placeholder ────────────────────────────────────────────────────────

function ImgPlaceholder({ className, dotColor = '#9B8FFF', opacity = 0.1 }: {
  className?: string
  dotColor?: string
  opacity?: number
}) {
  return (
    <div className={`relative overflow-hidden bg-[#0d1b37] ${className ?? ''}`}>
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(${dotColor} 0.5px, transparent 0.5px)`,
        backgroundSize: '8px 8px',
        opacity,
      }} />
    </div>
  )
}

// ─── Event Ticket Card (dark navy) ────────────────────────────────────────────

function EventTicketCard({ event, index = 0 }: { event: ExploreEvent; index?: number }) {
  const d = fmtDate(event.starts_at)
  return (
    <Link href={`/events/${event.slug}?src=platform_discovery`} className="block">
    <div
      className="group bg-[#1A2744] text-white relative flex flex-col overflow-hidden cursor-pointer border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[10px_10px_0px_0px_rgba(232,112,90,1)] transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id={`card-grain-${event.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#card-grain-${event.id})`} />
        </svg>
      </div>
      {/* Coral accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8705A]" />

      {/* Content */}
      <div className="p-4 pl-6 flex flex-col flex-grow gap-1">
        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <span className="font-mono text-[10px] text-[#E8705A]">
            #WIMC-{event.id.slice(0, 5).toUpperCase()}
          </span>
          <span className="bg-[#E8705A] text-[#1A2744] px-2 py-[2px] font-mono text-[10px] font-bold">
            {d.badge}
          </span>
        </div>

        {/* Image */}
        <ImgPlaceholder className="w-full aspect-[16/9] mb-3 group-hover:scale-[1.02] transition-transform duration-500 border border-white/10" dotColor="#9B8FFF" opacity={0.1} />

        {/* Title */}
        <h3 className="font-display font-black text-[22px] text-white uppercase leading-none mb-1">
          {event.title}
        </h3>

        {/* Creator */}
        {event.creator && (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 bg-[#9B8FFF] flex items-center justify-center font-display font-black text-[10px] text-white flex-shrink-0">
              {initial(event.creator.display_name)}
            </div>
            <span className="font-mono text-[10px] text-white/40 uppercase">
              @{event.creator.username}
            </span>
          </div>
        )}

        {/* Venue */}
        <span className="font-mono text-[10px] text-[#E8705A] mt-1 uppercase truncate">
          {event.venue_name}
        </span>

        {/* Price */}
        <div className="mt-auto pt-3 font-display font-black text-[28px] text-[#E8705A]">
          {priceFmt(event.ticket_price)}
        </div>
      </div>

      {/* Stub */}
      <div className="h-[34px] bg-white/5 border-t-2 border-dashed border-white/20 relative flex items-center justify-between px-4 pl-6 overflow-hidden">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#F5ECD7]" />
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#F5ECD7]" />
        <span className="font-mono text-[11px] font-black text-white/70 uppercase">
          ADMIT ONE · {priceFmt(event.ticket_price)}
        </span>
        <Barcode light />
      </div>
    </div>
    </Link>
  )
}

// ─── Event Card for Events Tab (denser) ───────────────────────────────────────

function EventsTabCard({ event, featured = false }: { event: ExploreEvent; featured?: boolean }) {
  const d = fmtDate(event.starts_at)
  return (
    <Link href={`/events/${event.slug}?src=platform_discovery`} className="block">
    <div className="group bg-[#1A2744] border-2 border-black relative flex flex-col overflow-hidden cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(232,112,90,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-300">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id={`etab-grain-${event.id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#etab-grain-${event.id})`} />
        </svg>
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8705A]" />

      {featured && (
        <RubberStamp
          text={"FEATURED\nEXPERIENCE"}
          color="#E8705A"
          size={52}
          rotate={8}
          opacity={0.6}
          className="absolute top-3 right-3 z-10"
        />
      )}

      {/* Ticket header row */}
      <div className="flex justify-between items-center p-4 pl-6 border-b border-dashed border-white/20">
        <span className="font-mono text-[10px] text-white/40">
          #WIMC-{event.id.slice(0, 8).toUpperCase()}
        </span>
        {featured && (
          <span className="bg-[#F5A800] text-[#1A2744] font-mono text-[9px] px-2 py-[2px]">
            FEATURED
          </span>
        )}
      </div>

      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <ImgPlaceholder className="absolute inset-0 group-hover:scale-[1.03] transition-transform duration-500" dotColor="#E8705A" opacity={0.06} />
        {/* Date badge over image */}
        <div className="absolute bottom-4 left-4 bg-white text-[#1A2744] p-2 flex flex-col items-center font-mono z-10">
          <span className="font-bold text-xl leading-none">{d.date}</span>
          <span className="text-[10px] uppercase">{d.month}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pl-8 flex-1 flex flex-col gap-3">
        <h3 className="font-display font-black text-[26px] text-white uppercase leading-none group-hover:text-[#E8705A] transition-colors">
          {event.title}
        </h3>

        {event.creator && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#9B8FFF] flex items-center justify-center font-display font-black text-[10px] text-white flex-shrink-0">
              {initial(event.creator.display_name)}
            </div>
            <span className="font-sans text-[13px] text-white/60 uppercase">
              BY {event.creator.display_name}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-white/80">
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          <span className="font-sans text-[14px] uppercase">{event.venue_name}</span>
        </div>

        {/* Price */}
        <div className="mt-auto pt-4 border-t border-dashed border-white/10 font-display font-black text-[28px] text-[#E8705A]">
          {priceFmt(event.ticket_price)}
        </div>
      </div>

      {/* Stub */}
      <div className="h-[34px] bg-black/40 border-t-2 border-dashed border-white/20 relative flex items-center justify-between px-6 pl-8 overflow-hidden">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#F5ECD7]" />
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#F5ECD7]" />
        <span className="font-mono text-[10px] text-[#E8705A] uppercase">
          {event.capacity ? `${event.capacity} SEATS LEFT` : 'OPEN ENTRY'}
        </span>
        <Barcode light />
      </div>
    </div>
    </Link>
  )
}

// ─── Creator Pass Card (horizontal, for ALL tab) ──────────────────────────────

function CreatorPassCard({ creator }: { creator: ExploreCreator }) {
  return (
    <Link
      href={profileUrl(creator.city, creator.username)}
      className="min-w-[260px] bg-[#FAF7F0] border-2 border-[#1A2744] flex flex-col relative cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(155,143,255,0.4)] transition-all shrink-0 overflow-hidden"
    >
      {/* Culture stamp */}
      <div className="absolute -top-3 -right-3 rotate-12 opacity-40 w-12 h-12 border-2 border-[#9B8FFF] rounded-full flex items-center justify-center pointer-events-none">
        <span className="font-mono text-[7px] text-[#9B8FFF] text-center leading-none uppercase">CULTURE<br/>STAMP</span>
      </div>

      <div className="p-4 flex items-center gap-4">
        {/* Initial square */}
        <div className="w-12 h-12 bg-[#9B8FFF] text-white flex items-center justify-center font-display font-black text-[22px] flex-shrink-0">
          {initial(creator.display_name)}
        </div>
        <div>
          <div className="font-black text-[20px] text-[#1A2744] uppercase leading-tight" style={{ fontFamily: 'var(--font-barlow)' }}>
            {creator.display_name}
          </div>
          <div className="font-mono text-[10px] text-[#1A2744]/50 uppercase">
            {creator.creator_type.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Sub-types strip */}
      <div className="bg-[#1A2744]/5 px-4 py-2 border-y-2 border-dashed border-[#1A2744]/10">
        <span className="font-sans text-[11px] font-medium uppercase tracking-tight text-[#1A2744]">
          {creator.sub_types?.slice(0, 2).join(', ') || 'CREATOR'}
        </span>
      </div>

      {/* Stub */}
      <div className="h-8 flex items-center justify-between px-4 bg-[#9B8FFF]/10">
        <span className="font-mono text-[10px] font-bold text-[#1A2744] uppercase">CREATOR PASS</span>
        <Barcode />
      </div>
    </Link>
  )
}

// ─── Venue Pass Card ──────────────────────────────────────────────────────────

function VenuePassCard({ venue }: { venue: ExploreVenue }) {
  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="bg-[#FAF7F0] border-2 border-[#1A2744] flex relative overflow-hidden cursor-pointer shadow-[12px_12px_0px_0px_#5DD9D0] hover:shadow-[16px_16px_0px_0px_#5DD9D0] transition-all group"
    >
      {/* Left punch strip */}
      <div className="w-12 border-r-2 border-dashed border-[#1A2744] flex flex-col justify-center items-center gap-6 relative bg-[#5DD9D0]/5 flex-shrink-0">
        <div className="absolute -left-2 top-1/4 w-4 h-4 bg-[#F5ECD7] rounded-full border border-[#1A2744]" />
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F5ECD7] rounded-full border border-[#1A2744]" />
        <div className="absolute -left-2 bottom-1/4 w-4 h-4 bg-[#F5ECD7] rounded-full border border-[#1A2744]" />
        <span className="material-symbols-outlined text-[#5DD9D0] text-[20px]">location_on</span>
      </div>

      {/* Main content */}
      <div className="p-4 flex-grow space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-black text-[22px] text-[#1A2744] uppercase leading-none" style={{ fontFamily: 'var(--font-barlow)' }}>
              {venue.name}
            </div>
            <div className="font-mono text-[11px] text-[#1A2744]/60 uppercase mt-0.5">
              {venue.neighbourhood ?? venue.city}
            </div>
          </div>
          <span className="bg-[#5DD9D0] text-[#1A2744] font-bold px-2 py-[2px] font-mono text-[10px]">
            {venue.is_verified ? 'VERIFIED' : 'OPEN'}
          </span>
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 bg-[#1A2744]/10 border border-[#57423e]/20" />
          <div className="h-16 bg-[#1A2744]/10 border border-[#57423e]/20" />
          <div className="h-16 border-2 border-dashed border-[#1A2744]/10 flex items-center justify-center font-mono text-[10px] text-[#1A2744]/40">
            {venue.venue_type?.[0]?.toUpperCase().slice(0, 6) ?? 'VENUE'}
          </div>
        </div>
      </div>

      {/* Right stub */}
      <div className="w-16 bg-[#5DD9D0]/10 flex flex-col items-center justify-center border-l-2 border-dashed border-[#1A2744]/10 flex-shrink-0">
        <div className="-rotate-90 whitespace-nowrap font-mono text-[9px] text-[#1A2744]/50 uppercase tracking-widest">
          CAPACITY
        </div>
        <div className="font-display font-black text-[22px] text-[#1A2744] mt-1">
          {venue.capacity_max ?? '—'}
        </div>
      </div>
    </Link>
  )
}

// ─── Featured Event Poster (full-width) ───────────────────────────────────────

function FeaturedEventCard({ event }: { event?: ExploreEvent }) {
  return (
    <div className="group cursor-pointer">
      <Link href={event ? `/events/${event.slug}?src=platform_discovery` : '#'}>
        <div className="bg-[#1A2744] text-white overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(232,112,90,1)] transition-all duration-300">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <filter id="feat-grain">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              </filter>
              <rect width="100%" height="100%" filter="url(#feat-grain)" />
            </svg>
          </div>
          <div className="grid grid-cols-2 h-[380px]">
            {/* Left text panel */}
            <div className="p-10 flex flex-col justify-between relative z-10">
              <div>
                <span className="inline-block bg-[#E8705A] text-[#1A2744] font-mono text-[12px] px-4 py-1 mb-6">
                  FEATURED EXPERIENCE
                </span>
                <h2 className="font-display font-black text-white uppercase leading-[0.9]" style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}>
                  {event?.title ?? 'INDUSTRIAL ECHOES'}
                </h2>
                <p className="font-sans text-[18px] text-white/70 mt-4 max-w-sm">
                  An immersive journey through sound and space.
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[14px] text-[#E8705A]">
                    TICKETS FROM {event ? priceFmt(event.ticket_price) : '₹299'}
                  </div>
                  <button className="mt-3 bg-white text-[#1A2744] px-10 py-4 font-display font-black text-[18px] hover:bg-[#E8705A] hover:text-white transition-colors">
                    SECURE THE SPOT
                  </button>
                </div>
                <div className="font-mono text-[12px] text-white/40 text-right">
                  {event ? fmtDate(event.starts_at).badge : 'SAT 24 OCT'}<br />
                  AHMEDABAD
                </div>
              </div>
            </div>
            {/* Right image panel */}
            <div className="relative overflow-hidden">
              <ImgPlaceholder className="absolute inset-0" dotColor="#E8705A" opacity={0.06} />
              {/* Postmark */}
              <div className="absolute top-10 right-10 -rotate-12 w-32 h-32 border-4 border-[#E8705A] rounded-full flex items-center justify-center opacity-80 group-hover:rotate-0 transition-transform duration-500">
                <div className="font-display font-black text-[#E8705A] text-[14px] text-center leading-tight uppercase">
                  CULTURE<br />VALIDATED<br />AHM-IND
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  label, color, linkLabel, linkHref,
}: {
  label: string; color: string; linkLabel?: string; linkHref?: string
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-[2px] flex-grow" style={{ backgroundColor: `${color}33` }} />
      <h2 className="font-display font-black italic text-[20px] uppercase whitespace-nowrap" style={{ color }}>
        {label}
      </h2>
      <div className="h-[2px] w-24" style={{ backgroundColor: color }} />
      {linkLabel && linkHref && (
        <Link href={linkHref} className="font-mono text-[10px] uppercase ml-auto whitespace-nowrap hover:underline" style={{ color, opacity: 0.7 }}>
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

// ─── Desktop Filter Rail ──────────────────────────────────────────────────────

function FilterRail() {
  return (
    <aside className="hidden lg:flex flex-col gap-8 sticky top-32">
      {/* What's On */}
      <div>
        <div className="font-mono text-[10px] text-[#1A2744]/40 uppercase tracking-widest mb-2 pb-1 border-b border-dashed border-[#57423e]">
          WHAT&apos;S ON
        </div>
        <div className="space-y-0.5">
          {[
            { label: 'TONIGHT', count: 4 },
            { label: 'WEEKEND', count: 12 },
            { label: 'THIS WEEK', count: 28, active: true },
            { label: 'ALL UPCOMING', count: 42 },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center cursor-pointer group py-2">
              <span className={`font-sans text-[13px] font-semibold group-hover:text-[#E8705A] transition-colors ${item.active ? 'text-[#E8705A] font-bold' : 'text-[#1A2744]'}`}>
                {item.label}
              </span>
              <span className="font-mono text-[11px] bg-[#57423e]/10 px-1 text-[#1A2744]/60">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <div className="font-mono text-[10px] text-[#1A2744]/40 uppercase tracking-widest mb-2 pb-1 border-b border-dashed border-[#57423e]">
          CATEGORY
        </div>
        <div className="space-y-0.5">
          {[
            { label: 'MUSIC', active: true, color: '#5DD9D0' },
            { label: 'ART',   color: '#E8705A' },
            { label: 'TECH',  color: '#9B8FFF' },
            { label: 'FOOD',  color: '#F5A800' },
          ].map(cat => (
            <div key={cat.label} className="flex items-center gap-2 cursor-pointer group py-2">
              <div className={`w-3 h-3 border flex-shrink-0 transition-all ${cat.active ? 'border-solid border-[#E8705A] bg-[#E8705A]' : 'border border-dashed border-[#1A2744] group-hover:border-solid'}`} />
              <span className="font-sans text-[13px] font-semibold text-[#1A2744] group-hover:text-[#E8705A] transition-colors">
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <div className="font-mono text-[10px] text-[#1A2744]/40 uppercase tracking-widest mb-2 pb-1 border-b border-dashed border-[#57423e]">
          SORT BY
        </div>
        <div className="flex flex-col gap-1">
          <button className="bg-[#1A2744] text-white px-3 py-2 font-mono text-[10px] uppercase text-left">
            NEWEST
          </button>
          <button className="border-2 border-dashed border-[#1A2744]/20 text-[#1A2744]/50 px-3 py-2 font-mono text-[10px] uppercase text-left hover:border-solid hover:text-[#1A2744] transition-all">
            TRENDING
          </button>
        </div>
      </div>

      {/* Partner promo */}
      <div className="border-2 border-dashed border-[#E8705A]/30 p-4 space-y-2">
        <div className="font-mono text-[9px] text-[#1A2744]/50 uppercase">WIMC PARTNER PROGRAM</div>
        <div className="font-sans text-[13px] italic text-[#1A2744]">
          &ldquo;Host your own venue. Get the community stamp.&rdquo;
        </div>
        <button className="w-full bg-[#E8705A] text-white font-mono text-[10px] py-1 uppercase hover:opacity-90 transition-opacity">
          APPLY NOW
        </button>
      </div>
    </aside>
  )
}

// ─── Subscribed posts section ─────────────────────────────────────────────────

function SubscribedPostsSection({ posts }: { posts: SubscribedPost[] }) {
  if (posts.length === 0) return null

  function fmtRelative(iso: string) {
    const diff  = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (hours < 1)  return 'just now'
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9B8FFF] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9B8FFF]" />
        </div>
        <span className="font-mono text-[10px] text-[#9B8FFF] tracking-[0.3em] uppercase">
          FROM CREATORS YOU FOLLOW
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <Link key={post.id} href={post.creator ? profileUrl(post.creator.city, post.creator.username) : '#'} className="block">
            <div
              className="bg-white border border-[#1A2744]/08 p-4 hover:border-[#9B8FFF]/40 transition-colors"
              style={{ boxShadow: '2px 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: '#9B8FFF' }}
                >
                  {(post.creator?.display_name?.[0] ?? '?').toUpperCase()}
                </div>
                <span
                  className="text-[12px] font-semibold text-[#1A2744]"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  @{post.creator?.username ?? '—'}
                </span>
                <span
                  className="text-[11px] text-[#1A2744]/30 ml-auto"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                  suppressHydrationWarning
                >
                  {fmtRelative(post.created_at)}
                </span>
              </div>
              {post.post_type === 'text' && post.content && (
                <p
                  className="text-[14px] text-[#1A2744] leading-relaxed line-clamp-3"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {post.content}
                </p>
              )}
              {post.post_type === 'photo' && (
                <div className="flex gap-3 items-start">
                  {post.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image_url} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                  )}
                  {post.content && (
                    <p
                      className="text-[14px] text-[#1A2744]/70 leading-relaxed line-clamp-2"
                      style={{ fontFamily: 'var(--font-dm-sans)' }}
                    >
                      {post.content}
                    </p>
                  )}
                </div>
              )}
              {post.post_type === 'link' && (
                <div>
                  <p
                    className="text-[13px] font-semibold text-[#1A2744] truncate"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    🔗 {post.link_title ?? post.link_url}
                  </p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── ALL tab content ──────────────────────────────────────────────────────────

function AllTabContent({
  events, creators, venues, subscribedPosts = [], city = '',
}: {
  events:          ExploreEvent[]
  creators:        ExploreCreator[]
  venues:          ExploreVenue[]
  subscribedPosts: SubscribedPost[]
  city?:           string
}) {
  const featuredEvent = events[0]

  return (
    <>
      {/* ── Discovery cards — visible on all screen sizes ─────────── */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 pt-6 pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 lg:ml-[calc((2/12*100%)_+_1.5rem)]">
          <Link
            href="/hall-of-lights"
            className="flex items-center gap-3 p-4 transition-colors hover:brightness-110"
            style={{
              background: '#1A2744',
              border: '1px solid rgba(245,168,0,0.22)',
              borderLeft: '3px solid #F5A800',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#F5A800', flexShrink: 0 }}>
              auto_awesome
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#F0EFF8' }}>
                Hall of Lights
              </div>
              <div style={{ fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>
                See the city&apos;s top creators
              </div>
            </div>
          </Link>

          <Link
            href="/map-of-legends"
            className="flex items-center gap-3 p-4 transition-colors hover:brightness-110"
            style={{
              background: '#1A2744',
              border: '1px solid rgba(93,217,208,0.22)',
              borderLeft: '3px solid #5DD9D0',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#5DD9D0', flexShrink: 0 }}>
              location_city
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#F0EFF8' }}>
                Map of Legends
              </div>
              <div style={{ fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>
                The Venues that made it
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 max-w-[1440px] mx-auto p-6">
        {/* Filter rail */}
        <div className="col-span-2">
          <FilterRail />
        </div>

        {/* Feed */}
        <div className="col-span-10 space-y-10">
          {/* Subscribed posts — only if user follows creators */}
          {subscribedPosts.length > 0 && (
            <SubscribedPostsSection posts={subscribedPosts} />
          )}

          {/* Happening Soon */}
          <section>
            <SectionHeader
              label="HAPPENING SOON"
              color="#E8705A"
              linkLabel="VIEW ALL EVENTS"
              linkHref="/explore?tab=events"
            />
            <div className="grid grid-cols-3 gap-6">
              {events.slice(0, 3).map((ev, i) => (
                <EventTicketCard key={ev.id} event={ev} index={i} />
              ))}
              {events.length === 0 && (
                <div className="col-span-3 border-2 border-dashed border-[#E8705A]/30 p-10 text-center font-mono text-[12px] text-[#1A2744]/40 uppercase tracking-widest">
                  NO UPCOMING EVENTS IN {(city || 'YOUR CITY').toUpperCase()} — CHECK BACK SOON
                </div>
              )}
            </div>
          </section>

          {/* Featured Creators */}
          <section>
            <SectionHeader label="FEATURED CREATORS" color="#9B8FFF" />
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {creators.slice(0, 5).map(c => (
                <CreatorPassCard key={c.id} creator={c} />
              ))}
              {creators.length === 0 && (
                <div className="border-2 border-dashed border-[#9B8FFF]/30 p-10 font-mono text-[12px] text-[#1A2744]/40 uppercase tracking-widest">
                  NO CREATORS FOUND
                </div>
              )}
            </div>
          </section>

          {/* Featured Event Poster */}
          <section>
            <FeaturedEventCard event={featuredEvent} />
          </section>

          {/* The Venues */}
          <section>
            <SectionHeader
              label="THE VENUES"
              color="#5DD9D0"
              linkLabel="ALL VENUES"
              linkHref="/explore?tab=venues"
            />
            <div className="grid grid-cols-2 gap-6">
              {venues.slice(0, 2).map(v => (
                <VenuePassCard key={v.id} venue={v} />
              ))}
              {venues.length === 0 && (
                <div className="col-span-2 border-2 border-dashed border-[#5DD9D0]/30 p-10 text-center font-mono text-[12px] text-[#1A2744]/40 uppercase tracking-widest">
                  NO VENUES FOUND IN THIS CITY
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── MOBILE ──────────────────────────────────────────────────── */}
      <div className="lg:hidden pt-2 pb-4 px-4 flex flex-col gap-10">
        {/* Subscribed posts — mobile */}
        {subscribedPosts.length > 0 && (
          <SubscribedPostsSection posts={subscribedPosts} />
        )}

        {/* Events section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 bg-[#E8705A] rounded-full animate-pulse flex-shrink-0" />
            <span className="font-mono text-[10px] text-[#E8705A] tracking-[0.3em] uppercase">
              HAPPENING SOON
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {events.slice(0, 3).map((ev, i) => (
              <MobileEventCard key={ev.id} event={ev} index={i} />
            ))}
            {events.length === 0 && (
              <div className="border-2 border-dashed border-[#E8705A]/40 p-6 text-center font-mono text-[11px] text-[#1A2744]/40 uppercase tracking-widest">
                NO UPCOMING EVENTS IN {(city || 'YOUR CITY').toUpperCase()} — CHECK BACK SOON
              </div>
            )}
          </div>
          <Link href="/explore?tab=events" className="block text-right mt-3 font-mono text-[10px] text-[#E8705A] uppercase tracking-widest font-bold">
            SEE ALL EVENTS →
          </Link>
        </section>

        {/* Creators section */}
        <section>
          <div className="font-mono text-[10px] text-[#9B8FFF] uppercase tracking-[0.3em] mb-4">
            CREATORS IN YOUR CITY
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {creators.slice(0, 5).map(c => (
              <MobileCreatorCard key={c.id} creator={c} />
            ))}
          </div>
        </section>

        {/* Venues section */}
        <section>
          <div className="font-mono text-[10px] text-[#5DD9D0] uppercase tracking-[0.3em] mb-4">
            VENUES IN YOUR CITY
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {venues.slice(0, 3).map(v => (
              <MobileVenueCard key={v.id} venue={v} />
            ))}
          </div>
        </section>

        {/* Featured card */}
        {events[0] && <MobileFeaturedCard event={events[0]} />}
      </div>
    </>
  )
}

// ─── Mobile Event Card ────────────────────────────────────────────────────────

function MobileEventCard({ event, index = 0 }: { event: ExploreEvent; index?: number }) {
  const d = fmtDate(event.starts_at)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const timer = setTimeout(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, index * 100 + 80)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <Link href={`/events/${event.slug}?src=platform_discovery`} className="block">
    <div
      ref={ref}
      className="relative bg-[#1A2744] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
      style={{ opacity: 0, transform: 'translateY(40px)', transition: 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8705A]" />
      <div className="p-4 pl-6 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <span className="bg-[#E8705A]/20 text-[#E8705A] px-2 py-[2px] font-mono text-[11px] border border-[#E8705A]/30">
            {d.date} {d.month}
          </span>
          <span className="font-display font-black text-[#E8705A] text-lg">
            {priceFmt(event.ticket_price)}
          </span>
        </div>
        <h3 className="font-display font-black text-[22px] text-white uppercase leading-tight mt-2">
          {event.title}
        </h3>
        {event.creator && (
          <span className="font-mono text-[12px] text-white/50 uppercase">
            BY {event.creator.display_name}
          </span>
        )}
        <span className="font-mono text-[11px] text-[#5DD9D0] uppercase mt-1">
          @ {event.venue_name}
        </span>
      </div>
      <div className="h-[34px] bg-black/40 border-t border-dashed border-white/10 flex items-center justify-between px-4 pl-6">
        <span className="font-mono text-[9px] text-[#E8705A]/80 uppercase">
          {event.capacity ? `${event.capacity} SEATS LEFT` : 'OPEN ENTRY'}
        </span>
        <Barcode light />
      </div>
    </div>
    </Link>
  )
}

// ─── Mobile Creator Card ──────────────────────────────────────────────────────

function MobileCreatorCard({ creator }: { creator: ExploreCreator }) {
  return (
    <Link
      href={profileUrl(creator.city, creator.username)}
      className="min-w-[180px] bg-[#FAF7F0] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden shrink-0 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#9B8FFF]" />
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#9B8FFF] text-white flex items-center justify-center font-display font-black text-[12px] flex-shrink-0">
          {initial(creator.display_name)}
        </div>
        <div className="font-black text-lg text-[#1A2744] uppercase leading-none" style={{ fontFamily: 'var(--font-barlow)' }}>
          {creator.display_name}
        </div>
      </div>
      <div className="h-7 border-t border-dashed border-black/10 px-4 flex items-center">
        <span className="font-mono text-[8px] text-black/40 tracking-widest uppercase">CREATOR</span>
      </div>
    </Link>
  )
}

// ─── Mobile Venue Card ────────────────────────────────────────────────────────

function MobileVenueCard({ venue }: { venue: ExploreVenue }) {
  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="min-w-[220px] bg-[#FAF7F0] flex flex-col border-l-[6px] border-[#5DD9D0] border-2 border-black shadow-[4px_4px_0px_0px_rgba(93,217,208,0.4)] shrink-0"
    >
      <div className="p-4 flex flex-col gap-1">
        <span className="font-mono text-[8px] text-[#1A2744]/40 uppercase">VENUE PASS</span>
        <div className="font-black text-xl uppercase text-[#1A2744]" style={{ fontFamily: 'var(--font-barlow)' }}>
          {venue.name}
        </div>
        <div className="font-mono text-[11px] text-[#1A2744]/60 uppercase">
          {venue.neighbourhood ?? venue.city}
        </div>
        {venue.venue_type[0] && (
          <span className="inline-block bg-[#5DD9D0]/20 text-[#5DD9D0] font-mono text-[9px] px-2 py-[2px] border border-[#5DD9D0]/30 uppercase mt-1">
            {venue.venue_type[0].replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className="h-7 border-t border-dashed border-black/10 flex items-center justify-between px-4">
        <span className="font-mono text-[8px] text-[#1A2744]/40 uppercase">
          CAP: {venue.capacity_max ?? '—'}
        </span>
        <Barcode />
      </div>
    </Link>
  )
}

// ─── Mobile Featured Card ─────────────────────────────────────────────────────

function MobileFeaturedCard({ event }: { event: ExploreEvent }) {
  return (
    <Link href={`/events/${event.slug}?src=platform_discovery`} className="block bg-[#FAF7F0] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative group">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8705A]" />
      <div className="p-6 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] border border-[#1A2744] text-[#1A2744] px-2 py-1 uppercase">
            FEATURED SELECTION
          </span>
          <span className="font-display font-black text-[#E8705A] text-xl">
            {priceFmt(event.ticket_price)}
          </span>
        </div>
        <h3 className="font-display font-black text-[#1A2744] text-[28px] uppercase leading-[1.1] mt-2">
          {event.title}
        </h3>
        <span className="font-mono text-[13px] text-[#1A2744]/60 uppercase">
          {fmtDate(event.starts_at).badge} · {event.venue_name}
        </span>
      </div>
      <ImgPlaceholder className="w-full h-40 border-2 border-black mt-1" dotColor="#E8705A" opacity={0.06} />
      <div className="h-12 bg-black text-[#E8705A] border-t-2 border-black px-6 flex items-center justify-between w-full group-hover:bg-[#E8705A] group-hover:text-black transition-colors">
        <span className="font-display font-black uppercase tracking-widest text-sm">GET TICKETS</span>
        <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </div>
    </Link>
  )
}

// ─── EVENTS tab ───────────────────────────────────────────────────────────────

const DATE_FILTERS  = ['TONIGHT', 'THIS WEEKEND', 'THIS WEEK', 'ALL'] as const
const CAT_FILTERS   = ['MUSIC', 'ART & CULTURE', 'FOOD & BEV', 'TECH', 'WELLNESS'] as const

function EventsTabContent({ events }: { events: ExploreEvent[] }) {
  return (
    <div className="max-w-[1440px] mx-auto p-6">
      {/* Filter row */}
      <div className="flex flex-col gap-4 mb-10 border-b-2 border-dashed border-[#1A2744]/10 pb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] text-[#1A2744]/50 uppercase mr-2">Timeframe /</span>
          {DATE_FILTERS.map((f, i) => (
            <button
              key={f}
              className={`px-4 py-2 border-2 font-mono text-[10px] uppercase font-bold transition-all ${i === 3 ? 'bg-[#E8705A] text-white border-[#E8705A]' : 'border-dashed border-[#1A2744]/20 text-[#1A2744]/50 hover:bg-[#1A2744]/5'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] text-[#1A2744]/50 uppercase mr-2">Category /</span>
          {CAT_FILTERS.map((f, i) => (
            <button
              key={f}
              className={`px-4 py-2 border-2 font-mono text-[10px] uppercase font-bold transition-all ${i === 0 ? 'bg-[#E8705A] text-white border-[#E8705A]' : 'border-dashed border-[#1A2744]/20 text-[#1A2744]/50 hover:bg-[#1A2744]/5'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Event grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {events.map((ev, i) => (
          <EventsTabCard key={ev.id} event={ev} featured={i === 0} />
        ))}
        {events.length === 0 && (
          <div className="col-span-3 border-2 border-dashed border-[#E8705A]/30 p-16 text-center font-mono text-[12px] text-[#1A2744]/40 uppercase tracking-widest">
            NO UPCOMING EVENTS — MORE COMING SOON
          </div>
        )}
      </div>

      {/* Load more */}
      <div className="flex flex-col items-center mt-10">
        <button
          className="border-2 border-[#E8705A] text-[#E8705A] px-10 py-4 uppercase italic hover:bg-[#E8705A]/10 transition-all shadow-[4px_4px_0px_0px_rgba(232,112,90,0.2)] flex items-center gap-4"
          style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 36 }}
        >
          LOAD MORE EVENTS
          <span className="material-symbols-outlined text-[28px]">keyboard_double_arrow_down</span>
        </button>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-16 border-t border-dashed border-[#1A2744]/30" />
          <span className="font-mono text-[10px] text-[#1A2744]/60 uppercase">
            Showing {events.length} results
          </span>
          <div className="w-16 border-t border-dashed border-[#1A2744]/30" />
        </div>
      </div>
    </div>
  )
}

// ─── CREATORS tab ─────────────────────────────────────────────────────────────

const CREATOR_FILTERS = ['ALL', 'MUSIC', 'ART', 'TECH', 'SPOKEN WORD', 'FASHION'] as const

function CreatorsTabContent({ creators }: { creators: ExploreCreator[] }) {
  return (
    <div className="max-w-[1440px] mx-auto p-4 lg:p-6">
      {/* Section header */}
      <div className="py-4 lg:py-6">
        <div className="font-mono text-[10px] text-[#1A2744]/50 uppercase tracking-widest">
          CREATORS IN AHMEDABAD
        </div>
        <div className="font-mono text-[9px] text-[#9B8FFF] font-bold mt-1 uppercase">
          {creators.length} CREATORS FOUND
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
        {CREATOR_FILTERS.map((f, i) => (
          <button
            key={f}
            className={`px-4 py-2 border-2 font-mono text-[10px] uppercase font-bold whitespace-nowrap flex-shrink-0 transition-all ${i === 0 ? 'bg-[#9B8FFF] text-white border-[#9B8FFF]' : 'border-dashed border-[#1A2744]/20 text-[#1A2744] hover:border-[#9B8FFF]/50'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Creator cards */}
      <div className="flex flex-col gap-6 mt-2">
        {creators.map((c, i) => (
          <CreatorBoardingPass key={c.id} creator={c} index={i} />
        ))}
        {creators.length < 8 && <CreatorEmptyState />}
      </div>
    </div>
  )
}

function CreatorBoardingPass({ creator, index = 0 }: { creator: ExploreCreator; index?: number }) {
  const isAlternate = index % 2 === 1
  return (
    <Link
      href={profileUrl(creator.city, creator.username)}
      className="bg-[#FAF7F0] border border-[#1A2744] relative flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#9B8FFF]" />
      {/* Punch holes */}
      <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F5ECD7]" />
      <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F5ECD7]" />

      {/* Content */}
      <div className="p-4 pl-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#9B8FFF] flex items-center justify-center font-display font-black text-[18px] text-white flex-shrink-0">
          {initial(creator.display_name)}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-[2px]">
            <span className="font-black text-[22px] text-[#1A2744] uppercase leading-none truncate" style={{ fontFamily: 'var(--font-barlow)' }}>
              {creator.display_name}
            </span>
            <span className="bg-[#9B8FFF]/10 text-[#9B8FFF] font-mono text-[9px] px-2 py-[2px] border border-[#9B8FFF]/20 uppercase flex-shrink-0">
              {creator.creator_type.replace(/_/g, ' ').slice(0, 8)}
            </span>
          </div>
          <div className="font-mono text-[10px] text-[#1A2744]/50 uppercase">
            {creator.city} • @{creator.username}
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div className="h-px border-t border-dashed border-[#1A2744]/20 mx-4" />

      {/* Stub */}
      <div className="h-[30px] bg-[#1A2744]/5 flex items-center justify-between px-4 pl-6">
        <span className="font-mono text-[9px] text-[#1A2744] tracking-widest uppercase">VIEW PROFILE</span>
        <div style={{ height: 12, width: 48, background: 'repeating-linear-gradient(90deg, #1A2744, #1A2744 1px, transparent 1px, transparent 3px)', opacity: 0.3 }} />
      </div>

      {/* Postmark on alternating cards */}
      {isAlternate && (
        <div className="absolute -right-2 -top-2 w-12 h-12 border-2 border-dashed border-[#9B8FFF]/30 rounded-full flex items-center justify-center pointer-events-none rotate-[15deg] z-20">
          <span className="font-mono text-[7px] text-[#9B8FFF]/40 text-center leading-none uppercase">VERIFIED<br/>CRT</span>
        </div>
      )}
    </Link>
  )
}

function CreatorEmptyState() {
  return (
    <div className="border-2 border-dashed border-[#9B8FFF]/40 p-6 flex flex-col items-center gap-4 min-h-[180px] bg-[#F5ECD7]/50 justify-center text-center">
      <div className="w-12 h-12 border border-[#9B8FFF]/30 flex items-center justify-center text-[#9B8FFF]">
        <span className="material-symbols-outlined text-[24px]">person_add</span>
      </div>
      <div className="font-sans font-bold text-[#1A2744]">BE THE FIRST IN YOUR CITY</div>
      <div className="font-sans text-[13px] text-[#1A2744]/60 mt-1">
        Claim your spot in the Ahmedabad creative registry.
      </div>
      <Link href="/onboarding?persona=creator" className="block w-full bg-[#9B8FFF] text-white py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-center active:scale-95 transition-transform">
        CREATE PROFILE
      </Link>
    </div>
  )
}

// ─── VENUES tab helpers ───────────────────────────────────────────────────────

const VENUE_TYPE_FILTERS = ['ALL', 'CAFÉ', 'GALLERY', 'STUDIO', 'OUTDOOR', 'WAREHOUSE'] as const

function getVenueCardFormat(index: number): 'poster' | 'card' | 'flyer' {
  if (index === 0 || index === 3) return 'poster'
  if (index === 2 || index === 5) return 'flyer'
  return 'card'
}

function VenueBarcode({ vertical = false, light = false }: { vertical?: boolean; light?: boolean }) {
  const color = light ? 'rgba(93,217,208,0.6)' : 'rgba(26,39,68,0.2)'
  return (
    <div style={{
      height: vertical ? 32 : 20,
      width:  vertical ? 32 : 80,
      flexShrink: 0,
      background: vertical
        ? `repeating-linear-gradient(0deg, ${color}, ${color} 1px, transparent 1px, transparent 3px)`
        : `repeating-linear-gradient(90deg, ${color}, ${color} 1px, transparent 1px, transparent 4px)`,
    }} />
  )
}

// ─── Desktop FORMAT A: Pinned Poster ──────────────────────────────────────────

function VenuePosterCard({ venue }: { venue: ExploreVenue }) {
  return (
    <Link href={`/venue/${venue.slug}`} className="break-inside-avoid inline-block w-full mb-6">
      <div
        className="bg-[#1A2744] text-white relative overflow-hidden transition-transform duration-300 [transform:rotate(-0.5deg)] hover:[transform:rotate(0deg)] cursor-pointer"
        style={{ boxShadow: '6px 8px 20px 0px rgba(0,0,0,0.25)' }}
      >
        {/* Pushpin */}
        <Pushpin color="#5DD9D0" pinSize={20} bodyHeight={8} className="top-[-10px] left-1/2 -translate-x-1/2" />

        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" aria-hidden>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id={`poster-grain-${venue.id}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#poster-grain-${venue.id})`} />
          </svg>
        </div>

        <div className="p-6 flex flex-col gap-3">
          {/* Top strip */}
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] text-white/40 uppercase tracking-[0.3em]">VENUE</span>
            <RubberStamp text={"VERIFIED\nVENUE"} color="#5DD9D0" rotate={-12} size={56} />
          </div>

          {/* Venue name */}
          <h3 className="font-display font-black text-[36px] text-white uppercase leading-none mt-2"
              style={{ fontFamily: 'var(--font-barlow)' }}>
            {venue.name}
          </h3>

          {/* Neighbourhood + city */}
          <p className="font-mono text-[11px] text-white/50 uppercase">
            {venue.neighbourhood ? `${venue.neighbourhood}, ${venue.city}` : venue.city}
          </p>

          {/* Type chips */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(venue.venue_type ?? []).map(t => (
              <span key={t} className="bg-white/10 text-white/70 px-2 py-[2px] font-mono text-[9px] uppercase border border-white/20">
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* Image area */}
          <div className="w-full h-32 mt-4 relative overflow-hidden" style={{ backgroundColor: '#0d1b37' }}>
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(#5DD9D0 0.5px, transparent 0.5px)',
              backgroundSize: '8px 8px',
              opacity: 0.08,
            }} />
            <span className="absolute bottom-3 right-3 font-mono text-[10px] text-white/20 uppercase">
              {venue.city.toUpperCase()} · {venue.venue_type?.[0]?.toUpperCase().replace(/_/g, ' ') ?? 'VENUE'}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex justify-between items-end mt-4">
            <div>
              <div className="font-display font-black text-[28px] text-[#5DD9D0]">
                {venue.events_count ?? '—'}
              </div>
              <div className="font-mono text-[9px] text-white/40 uppercase">EVENTS / MONTH</div>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-[28px] text-white">
                {venue.capacity_max ?? '—'}
              </div>
              <div className="font-mono text-[9px] text-white/40 uppercase">CAPACITY</div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="h-10 border-t border-dashed border-[#5DD9D0]/30 flex items-center justify-between px-6"
          style={{ backgroundColor: 'rgba(93,217,208,0.10)' }}
        >
          <span className="font-mono text-[10px] text-[#5DD9D0] font-bold uppercase">VIEW VENUE →</span>
          <VenueBarcode light />
        </div>
      </div>
    </Link>
  )
}

// ─── Desktop FORMAT B: Business Card ──────────────────────────────────────────

function VenueDesktopBusinessCard({ venue }: { venue: ExploreVenue }) {
  return (
    <Link href={`/venue/${venue.slug}`} className="break-inside-avoid inline-block w-full mb-6">
      <div
        className="bg-[#FAF7F0] text-[#1A2744] relative overflow-hidden transition-transform duration-300 [transform:rotate(1deg)] hover:[transform:rotate(0deg)] cursor-pointer border border-[#1A2744]/10"
        style={{ boxShadow: '4px 6px 16px 0px rgba(0,0,0,0.15)', minHeight: 140 }}
      >
        {/* Pushpin */}
        <Pushpin color="#E8705A" pinSize={16} bodyHeight={6} className="top-[-8px] left-[40px]" />

        {/* Left teal edge */}
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#5DD9D0]" />

        <div className="p-4 pl-7 flex flex-col justify-between" style={{ minHeight: 140 }}>
          {/* Top row */}
          <div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-[8px] text-[#1A2744]/40 uppercase tracking-[0.3em]">VENUE PASS</span>
              {venue.venue_type?.[0] && (
                <span className="bg-[#5DD9D0]/20 text-[#5DD9D0] border border-[#5DD9D0]/40 font-mono text-[8px] px-2 py-[2px] uppercase">
                  {venue.venue_type[0].replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h3 className="font-display font-black text-[24px] text-[#1A2744] uppercase leading-none mt-2"
                style={{ fontFamily: 'var(--font-barlow)' }}>
              {venue.name}
            </h3>
            <p className="font-mono text-[10px] text-[#1A2744]/60 uppercase mt-1">
              {venue.neighbourhood ?? venue.city}
            </p>
          </div>

          {/* Bottom row */}
          <div className="flex justify-between items-end mt-auto pt-3">
            <div>
              <div className="font-mono text-[9px] text-[#1A2744]/40">Events this month</div>
              <div className="font-display font-black text-[20px] text-[#1A2744]">
                {venue.events_count != null ? `${venue.events_count} events` : '— events'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[8px] text-[#1A2744]/40 uppercase">CAP</div>
              <div className="font-display font-black text-[20px] text-[#1A2744]">
                {venue.capacity_max ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Rubber stamp */}
        <div className="absolute bottom-3 right-3">
          <RubberStamp text={"OPEN\nSPACE"} color="#5DD9D0" rotate={-8} size={48} />
        </div>
      </div>
    </Link>
  )
}

// ─── Desktop FORMAT C: Torn Flyer ─────────────────────────────────────────────

function VenueFlyerCard({ venue }: { venue: ExploreVenue }) {
  return (
    <Link href={`/venue/${venue.slug}`} className="break-inside-avoid inline-block w-full mb-6">
      <div
        className="bg-[#F5ECD7] text-[#1A2744] relative transition-transform duration-300 [transform:rotate(0.5deg)] hover:[transform:rotate(-0.5deg)] cursor-pointer"
        style={{ boxShadow: '3px 5px 12px 0px rgba(0,0,0,0.12)' }}
      >
        {/* Torn top edge — uses slightly darker board bg to simulate torn paper */}
        <div
          className="absolute top-0 left-0 right-0 z-10"
          style={{
            height: 12,
            backgroundColor: '#EDE0CC',
            clipPath: 'polygon(0 0, 5% 100%, 10% 20%, 15% 90%, 20% 10%, 25% 80%, 30% 0%, 35% 100%, 40% 20%, 45% 80%, 50% 0, 55% 100%, 60% 10%, 65% 90%, 70% 0, 75% 80%, 80% 20%, 85% 100%, 90% 0, 95% 70%, 100% 0)',
          }}
        />
        {/* Pushpin */}
        <Pushpin color="#9B8FFF" pinSize={12} bodyHeight={6} className="top-[-6px] right-[30px]" />

        {/* Card content — no top border, torn edge covers it */}
        <div className="pt-6 pb-4 px-4 flex flex-col gap-2 border border-[#1A2744]/10 border-t-0">
          <h3 className="font-display font-black text-[22px] text-[#1A2744] uppercase leading-none"
              style={{ fontFamily: 'var(--font-barlow)' }}>
            {venue.name}
          </h3>
          <p className="font-mono text-[10px] text-[#1A2744]/50 uppercase">
            {venue.neighbourhood ?? venue.city}
          </p>
          <div className="flex gap-2 flex-wrap mt-1">
            {(venue.venue_type ?? []).map(t => (
              <span key={t} className="bg-[#1A2744]/5 text-[#1A2744]/60 font-mono text-[8px] px-2 py-[2px] uppercase border border-[#1A2744]/10">
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          <div className="font-mono text-[8px] text-[#9B8FFF] uppercase font-bold">NEW VENUE</div>
          <div className="font-mono text-[9px] text-[#1A2744]/40 uppercase">
            CAP: {venue.capacity_max ?? '—'}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Mobile venue business card ───────────────────────────────────────────────

function VenueMobileCard({ venue }: { venue: ExploreVenue }) {
  return (
    <Link href={`/venue/${venue.slug}`} className="block">
      <div
        className="bg-[#FAF7F0] relative w-full overflow-hidden border border-[#1A2744]/10 flex active:scale-[0.98] transition-transform cursor-pointer"
        style={{ minHeight: 130, boxShadow: '4px 5px 0px 0px rgba(93,217,208,0.35)' }}
      >
        {/* Left teal strip */}
        <div className="w-3 bg-[#5DD9D0] flex-shrink-0" />

        {/* Main content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          {/* Top */}
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono text-[8px] text-[#1A2744]/40 uppercase tracking-[0.25em]">VENUE PASS</div>
              <h3 className="font-display font-black text-[22px] text-[#1A2744] uppercase leading-none mt-1"
                  style={{ fontFamily: 'var(--font-barlow)' }}>
                {venue.name}
              </h3>
              <p className="font-mono text-[10px] text-[#1A2744]/50 uppercase mt-0.5">
                {venue.neighbourhood ?? venue.city}
              </p>
            </div>
            <RubberStamp text={"VENUE\nVERIFIED"} color="#5DD9D0" rotate={-10} size={48} />
          </div>

          {/* Bottom row */}
          <div className="flex justify-between items-end mt-auto pt-3 border-t border-dashed border-[#1A2744]/10">
            <div className="flex gap-1 flex-wrap">
              {(venue.venue_type ?? []).slice(0, 2).map(t => (
                <span key={t} className="bg-[#5DD9D0]/15 text-[#5DD9D0] border border-[#5DD9D0]/30 font-mono text-[8px] px-2 py-[2px] uppercase">
                  {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <div className="text-right">
              <div className="font-mono text-[8px] text-[#1A2744]/40 uppercase">CAP</div>
              <div className="font-display font-black text-[18px] text-[#1A2744]">
                {venue.capacity_max ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Right stub */}
        <div className="w-14 bg-[#5DD9D0]/10 border-l-2 border-dashed border-[#1A2744]/10 flex flex-col items-center justify-center gap-2 flex-shrink-0">
          <div className="font-display font-black text-[20px] text-[#1A2744]">
            {venue.events_count ?? '—'}
          </div>
          <div className="font-mono text-[7px] text-[#1A2744]/40 uppercase">EVENTS</div>
          <VenueBarcode vertical />
        </div>
      </div>
    </Link>
  )
}

// ─── Map teaser ───────────────────────────────────────────────────────────────

function VenueMapTeaser({ count, city, desktop = false }: { count: number; city: string; desktop?: boolean }) {
  if (desktop) {
    return (
      <div className="bg-[#1A2744] p-8 relative overflow-hidden flex items-center justify-between">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="map-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#map-grain)" />
          </svg>
        </div>
        {/* Decorative grid */}
        <div className="absolute right-40 top-0 bottom-0 w-64" style={{
          backgroundImage: 'radial-gradient(#5DD9D0 0.5px, transparent 0.5px)',
          backgroundSize: '16px 16px', opacity: 0.05,
        }} />
        <div className="relative z-10">
          <h2 className="font-display font-black text-[40px] text-white uppercase leading-none"
              style={{ fontFamily: 'var(--font-barlow)' }}>
            SEE ALL VENUES<br />ON MAP
          </h2>
          <p className="font-mono text-[11px] text-[#5DD9D0] mt-2 uppercase">
            {count} Venues in {city.toUpperCase()}
          </p>
        </div>
        <Link
          href="/explore?tab=venues&view=map"
          className="relative z-10 font-display font-black px-8 py-4 bg-[#5DD9D0] text-[#1A2744] border-2 border-black uppercase"
          style={{ fontFamily: 'var(--font-barlow)', fontSize: 22, boxShadow: '4px 4px 0 rgba(0,0,0,1)' }}
        >
          OPEN MAP →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#1A2744] p-5 flex justify-between items-center">
      <div>
        <h2 className="font-display font-black text-[20px] text-white uppercase leading-tight"
            style={{ fontFamily: 'var(--font-barlow)' }}>
          SEE ALL<br />VENUES
        </h2>
        <p className="font-mono text-[9px] text-[#5DD9D0] mt-1 uppercase">
          {count} in {city.toUpperCase().slice(0, 3)}
        </p>
      </div>
      <Link
        href="/explore?tab=venues&view=map"
        className="font-display font-black px-4 py-3 bg-[#5DD9D0] text-[#1A2744] border-2 border-black uppercase flex items-center gap-2"
        style={{ fontFamily: 'var(--font-barlow)', boxShadow: '2px 2px 0px rgba(0,0,0,1)' }}
      >
        <span className="material-symbols-outlined text-[16px]">map</span>
        MAP →
      </Link>
    </div>
  )
}

// ─── VENUES tab ───────────────────────────────────────────────────────────────

function VenuesTabContent({ venues, city }: { venues: ExploreVenue[]; city: string }) {
  return (
    <>
      {/* ── DESKTOP: Notice Board ───────────────────────────────────────── */}
      <div className="hidden lg:block max-w-[1440px] mx-auto">
        {/* Filter row */}
        <div className="px-8 py-4 flex items-center gap-3 border-b-2 border-dashed border-[#57423e]">
          <span className="font-mono text-[10px] text-[#1A2744]/50 uppercase tracking-widest">TYPE:</span>
          {VENUE_TYPE_FILTERS.map((f, i) => (
            <button
              key={f}
              className={`px-4 py-2 border-2 font-mono text-[10px] uppercase font-bold transition-all ${
                i === 0
                  ? 'bg-[#5DD9D0] text-[#1A2744] border-[#5DD9D0]'
                  : 'border-dashed border-[#1A2744]/20 text-[#1A2744]/50 hover:border-solid hover:border-[#1A2744]/40'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex gap-3 items-center">
            <span className="font-mono text-[10px] text-[#1A2744]/40 uppercase">
              SHOWING {venues.length} VENUES
            </span>
            <button className="px-4 py-2 bg-[#5DD9D0] text-[#1A2744] border-2 border-[#5DD9D0] font-mono text-[10px] uppercase font-bold">
              MOST EVENTS
            </button>
            <button className="px-4 py-2 border-2 border-dashed border-[#1A2744]/20 text-[#1A2744]/50 font-mono text-[10px] uppercase font-bold hover:border-solid hover:border-[#1A2744]/40 transition-all">
              NEWEST
            </button>
          </div>
        </div>

        {/* Masonry notice board — CSS columns for true masonry */}
        <div className="px-8 py-8" style={{ columns: 3, columnGap: '1.5rem' }}>
          {venues.length === 0 && (
            <div className="break-inside-avoid inline-block w-full border-2 border-dashed border-[#5DD9D0]/40 p-12 text-center font-mono text-[12px] text-[#1A2744]/40 uppercase tracking-widest">
              NO VENUES FOUND IN {city.toUpperCase()} — CHECK BACK SOON
            </div>
          )}
          {venues.map((venue, index) => {
            const fmt = getVenueCardFormat(index)
            if (fmt === 'poster') return <VenuePosterCard           key={venue.id} venue={venue} />
            if (fmt === 'flyer')  return <VenueFlyerCard            key={venue.id} venue={venue} />
            return                       <VenueDesktopBusinessCard key={venue.id} venue={venue} />
          })}
        </div>

        {/* Map teaser */}
        <div className="mx-8 mb-8">
          <VenueMapTeaser count={venues.length} city={city} desktop />
        </div>
      </div>

      {/* ── MOBILE: Business Card Rolodex ──────────────────────────────── */}
      <div className="lg:hidden pt-2 pb-4 px-4 flex flex-col gap-6">
        {/* Section header */}
        <div className="flex justify-between items-end">
          <div>
            <div className="font-mono text-[10px] text-[#1A2744]/50 uppercase tracking-widest">
              VENUES IN {city.toUpperCase()}
            </div>
            <div className="font-mono text-[9px] text-[#5DD9D0] font-bold mt-1 uppercase">
              {venues.length} venues found
            </div>
          </div>
          {/* Decorative pushpin */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#5DD9D0]"
                 style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.3)' }} />
            <div className="w-[2px] h-3 bg-[#1A2744]/40 mt-[-1px]" />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {VENUE_TYPE_FILTERS.map((f, i) => (
            <button
              key={f}
              className={`px-4 py-2 border-2 font-mono text-[10px] uppercase font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                i === 0
                  ? 'bg-[#5DD9D0] text-[#1A2744] border-[#5DD9D0]'
                  : 'border-dashed border-[#1A2744]/20 text-[#1A2744]/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Business card stack */}
        <div className="flex flex-col gap-5">
          {venues.length === 0 && (
            <div className="border-2 border-dashed border-[#5DD9D0]/40 p-8 text-center font-mono text-[12px] text-[#1A2744]/40 uppercase tracking-widest">
              NO VENUES FOUND IN {city.toUpperCase()}
            </div>
          )}
          {venues.map(venue => (
            <VenueMobileCard key={venue.id} venue={venue} />
          ))}
        </div>

        {/* Map teaser */}
        <VenueMapTeaser count={venues.length} city={city} />
      </div>
    </>
  )
}

// ─── Live Ticker ──────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  'NEW EVENT IN GANDHINAGAR — THE UNDERGROUND HIP-HOP BATTLE',
  'ONLY 12 TICKETS LEFT FOR MIDNIGHT TECHNO',
  'CREATOR @wavemkr JUST WENT LIVE',
  '3 NEW VENUES VERIFIED IN AHMEDABAD',
  'WEEKEND OPEN MIC — SIGN UP NOW',
]

function LiveTicker() {
  const text = TICKER_ITEMS.join('   ·   ')
  return (
    <div className="fixed bottom-14 lg:bottom-0 w-full h-12 bg-[#E8705A] border-t-2 border-black z-[55] overflow-hidden">
      <div
        className="flex items-center h-full whitespace-nowrap"
        style={{ animation: 'tickerScroll 24s linear infinite' }}
      >
        {[text, text].map((t, i) => (
          <span key={i} className="font-mono text-[12px] text-[#1A2744] uppercase tracking-widest px-8">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { tab: 'all',      icon: 'explore',           label: 'EXPLORE'  },
  { tab: 'events',   icon: 'confirmation_number', label: 'EVENTS'   },
  { tab: 'creators', icon: 'person_search',      label: 'CREATORS' },
  { tab: 'venues',   icon: 'location_on',        label: 'VENUES'    },
] as const

function MobileBottomNav({ tab, city }: { tab: string; city: string }) {
  const activeColors: Record<string, string> = {
    all:      '#E8705A',
    events:   '#E8705A',
    creators: '#9B8FFF',
    venues:   '#5DD9D0',
  }

  return (
    <nav className="lg:hidden fixed bottom-0 w-full h-14 bg-[#F5ECD7] border-t-2 border-dashed border-[#57423e] z-[60] flex items-center">
      {NAV_ITEMS.map(item => {
        const isActive = tab === item.tab
        const color = isActive ? (activeColors[item.tab] ?? '#E8705A') : 'rgba(26,39,68,0.4)'
        return (
          <Link
            key={item.tab}
            href={`/explore?tab=${item.tab}&city=${city}`}
            className="flex-1 flex flex-col items-center justify-center pt-1"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{
                color,
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            <span className="font-mono text-[9px] uppercase mt-0.5" style={{ color }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all',      label: 'ALL',      icon: 'grid_view',           activeColor: 'bg-[#1A2744] text-white'                 },
  { id: 'events',   label: 'EVENTS',   icon: 'confirmation_number', activeColor: 'bg-[#E8705A] text-white'                 },
  { id: 'creators', label: 'CREATORS', icon: 'person',              activeColor: 'bg-[#9B8FFF] text-white'                 },
  { id: 'venues',   label: 'VENUES',    icon: 'location_on',         activeColor: 'bg-[#5DD9D0] text-[#1A2744] font-bold'  },
] as const

function TabBar({ activeTab, city, basePath = '/explore', stickyTop = 'top-[64px]' }: { activeTab: string; city: string; basePath?: string; stickyTop?: string }) {
  return (
    <div className={`sticky ${stickyTop} z-[50] bg-[#F2EDE3]/95 backdrop-blur border-b-2 border-dashed border-[#57423e] h-12 flex justify-between items-center`}>
      {/* Left tabs */}
      <div className="flex h-full">
        {TABS.map((t, i) => {
          const isActive = activeTab === t.id
          return (
            <Link
              key={t.id}
              href={`${basePath}?tab=${t.id}&city=${city}`}
              className={`flex items-center gap-2 px-4 lg:px-6 font-mono text-[10px] tracking-[0.24em] uppercase h-full transition-colors ${i > 0 ? 'border-l-2 border-dashed border-[#57423e]' : ''} ${isActive ? t.activeColor : 'text-[#1A2744]/60 hover:bg-[#1A2744]/5'}`}
            >
              <span className="material-symbols-outlined text-[14px] hidden lg:inline">{t.icon}</span>
              {t.label}
            </Link>
          )
        })}
      </div>
      {/* Right meta — desktop only */}
      <div className="hidden lg:block font-mono text-[10px] text-[#1A2744]/40 uppercase tracking-widest pr-6">
        42 results in {city.toUpperCase()} // [23.0225° N, 72.5714° E]
      </div>
    </div>
  )
}

// ─── Desktop Header ───────────────────────────────────────────────────────────

function DesktopHeader({ city, setCity }: { city: string; setCity: (c: string) => void }) {
  return (
    <header className="hidden lg:flex sticky top-0 z-[60] h-[64px] items-center justify-between px-6 bg-[#07070A]/95 backdrop-blur border-b-2 border-dashed border-[#57423e]">
      {/* Left */}
      <div className="flex items-center gap-4">
        <span className="font-display font-black text-[24px] text-[#E8705A] tracking-tighter uppercase">
          WIMC
        </span>
        <div className="h-8 w-px bg-[#57423e] rotate-12" />
        <div className="flex gap-2">
          {['Ahmedabad', 'Gandhinagar'].map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`px-4 py-1 border-2 font-mono text-[11px] uppercase font-bold transition-all ${
                city === c
                  ? 'bg-[#1A2744] text-white border-[#1A2744]'
                  : 'border-dashed border-[#1A2744]/30 text-[#1A2744]/50 hover:border-solid hover:border-[#1A2744] hover:text-[#1A2744] bg-transparent'
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#1A2744]/50">
            search
          </span>
          <input
            type="text"
            placeholder="FIND VIBE..."
            className="bg-transparent border-2 border-dashed border-[#57423e] py-2 pl-10 pr-4 font-mono text-[12px] text-[#1A2744] placeholder:text-[#1A2744]/40 focus:border-solid focus:outline-none w-48 group-hover:w-64 transition-all"
          />
        </div>
        <button className="text-[#1A2744] hover:text-[#E8705A] transition-colors">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <Link
          href="/events/create"
          className="bg-[#E8705A] text-white font-sans font-bold text-sm px-6 py-2 uppercase hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          CREATE EVENT
        </Link>
      </div>
    </header>
  )
}

// ─── Mobile Header ────────────────────────────────────────────────────────────

function MobileHeader({ city, setCity }: { city: string; setCity: (c: string) => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-[60] h-[64px] flex items-center justify-between px-4 bg-[#F5ECD7]/95 backdrop-blur border-b-2 border-dashed border-[#57423e]">
      <span className="font-display font-black text-[20px] text-[#E8705A] tracking-tighter uppercase">
        WIMC
      </span>
      <div className="flex gap-2">
        {(['Ahmedabad', 'Gandhinagar'] as const).map(c => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`px-3 py-1 border-2 font-mono text-[10px] uppercase font-bold transition-all ${
              city === c
                ? 'bg-[#1A2744] text-white border-[#1A2744]'
                : 'border-dashed border-[#1A2744]/30 text-[#1A2744]/50 hover:border-solid hover:text-[#1A2744]'
            }`}
          >
            {c === 'Ahmedabad' ? 'AHM' : 'GNR'}
          </button>
        ))}
      </div>
      <button className="text-[#1A2744]">
        <span className="material-symbols-outlined text-[24px]">search</span>
      </button>
    </header>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExploreClient({
  tab, city, events, creators, venues,
  subscribedPosts:   initialSubscribedPosts = [],
  followedCreatorIds = [],
  viewerUserId       = null,
  inDashboard        = false,
  basePath:          basePathProp,
}: Props) {
  const router = useRouter()
  const [subscribedPosts, setSubscribedPosts] = useState<SubscribedPost[]>(initialSubscribedPosts)

  // Realtime subscription: prepend new posts from followed creators
  useEffect(() => {
    if (!viewerUserId || followedCreatorIds.length === 0) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const channel = db
      .channel('explore-new-posts')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'creator_posts',
      }, async (payload: { new: { creator_id: string; id: string; is_subscriber_only: boolean } }) => {
        const p = payload.new
        // Only show public posts from followed creators
        if (!followedCreatorIds.includes(p.creator_id)) return
        if (p.is_subscriber_only) return

        // Fetch the full post with creator info
        const { data } = await db
          .from('creator_posts')
          .select(`
            id, post_type, content, image_url, link_url, link_title, created_at,
            creator:user_profiles!creator_id(display_name, username, creator_type, city)
          `)
          .eq('id', p.id)
          .single()

        if (data) {
          setSubscribedPosts((prev) => [data as SubscribedPost, ...prev].slice(0, 5))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [viewerUserId, followedCreatorIds])

  const basePath = basePathProp ?? (inDashboard ? '/dashboard/explore' : '/explore')
  const bgColor  = inDashboard ? '#F2EDE3' : '#F5ECD7'

  function setCity(c: string) {
    router.push(`${basePath}?tab=${tab}&city=${encodeURIComponent(c)}`)
  }

  if (inDashboard) {
    return (
      <>
        <style>{`
          @keyframes tickerScroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>

        <div className="min-h-screen" style={makePageBg(bgColor)}>
          <TabBar activeTab={tab} city={city} basePath={basePath} stickyTop="top-0" />

          <div className="pb-12">
            {tab === 'all'      && <AllTabContent      events={events} creators={creators} venues={venues} subscribedPosts={subscribedPosts} city={city} />}
            {tab === 'events'   && <EventsTabContent   events={events} />}
            {tab === 'creators' && <CreatorsTabContent creators={creators} />}
            {tab === 'venues'   && <VenuesTabContent venues={venues} city={city} />}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <Grain />

      <div className="fixed inset-0 z-[40] overflow-y-auto" style={makePageBg(bgColor)}>
        <DesktopHeader city={city} setCity={setCity} />
        <MobileHeader city={city} setCity={setCity} />
        <TabBar activeTab={tab} city={city} basePath={basePath} />

        {/* Content area */}
        <div className="pb-28 lg:pb-12">
          {tab === 'all'      && <AllTabContent      events={events} creators={creators} venues={venues} subscribedPosts={subscribedPosts} />}
          {tab === 'events'   && <EventsTabContent   events={events} />}
          {tab === 'creators' && <CreatorsTabContent creators={creators} />}
          {tab === 'venues'   && <VenuesTabContent venues={venues} city={city} />}
        </div>

        <LiveTicker />
        <MobileBottomNav tab={tab} city={city} />
      </div>
    </>
  )
}
