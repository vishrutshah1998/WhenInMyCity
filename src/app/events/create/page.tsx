'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WimcWordmark } from '@/components/WimcWordmark'
import { createEvent, publishEvent } from '@/app/actions/events'
import { uploadEventCover } from '@/app/actions/upload'
import type { CreateEventInput } from '@/types/events'

// ── Constants ────────────────────────────────────────────────────────────────

const GRAIN_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const CITIES = ['Ahmedabad', 'Gandhinagar', 'Surat', 'Vadodara', 'Rajkot']

type PosterStyle = 'underground' | 'zine' | 'electric' | 'upload'
type VenueMode = 'wimc' | 'custom'

interface WimcVenue {
  id: string
  name: string
  city: string
  address: string
  lat: number | null
  lng: number | null
  google_maps_url: string | null
  source: 'venue' | 'directory'
}

// ── Smart Palette System ─────────────────────────────────────────────────────

// ── Category detection ────────────────────────────────────────────────────────

interface CategoryMeta { label: string; color: string }

const CATEGORY_META: Record<string, CategoryMeta> = {
  jazz:       { label: 'JAZZ',       color: '#CC7722' },
  electronic: { label: 'ELECTRONIC', color: '#00E87A' },
  comedy:     { label: 'COMEDY',     color: '#FFD700' },
  art:        { label: 'ART',        color: '#E05050' },
  food:       { label: 'FOOD',       color: '#FF6F00' },
  wellness:   { label: 'WELLNESS',   color: '#00BCD4' },
  general:    { label: 'CREATIVE',   color: '#9C6FFF' },
}

/**
 * Returns a font size (px) that keeps the longest word in `title` within
 * `containerWidth` without ever breaking a word mid-character.
 *
 * Multiplier 0.72 is empirically tuned for Abril Fatface uppercase.
 */
function getPosterFontSize(
  title: string,
  containerWidth = 290,
  charMultiplier = 0.72,
  maxSize = 66,
): number {
  if (!title) return maxSize
  const words = title.trim().split(/\s+/)
  const maxWordLen = words.reduce((m, w) => Math.max(m, w.length), 0)
  const byWord     = Math.floor(containerWidth / (maxWordLen * charMultiplier))
  const nonSpace   = title.replace(/\s+/g, '').length
  const byLength   = nonSpace > 38 ? 24 : nonSpace > 28 ? 30 : nonSpace > 18 ? 40 : nonSpace > 10 ? 52 : maxSize
  return Math.max(18, Math.min(maxSize, Math.min(byWord, byLength)))
}

function detectCategory(t: string): string | null {
  if (t.trim().length < 3) return null
  const s = t.toLowerCase()
  if (/jazz|blues|soul|swing|bossa|saxophone|trumpet|bebop/.test(s))            return 'jazz'
  if (/rave|techno|electronic|dj set|bass drop|house|edm|dnb|psytrance|synth/.test(s)) return 'electronic'
  if (/comedy|stand.?up|laugh|joke|open.?mic|roast|humor/.test(s))             return 'comedy'
  if (/cook|bake|chef|kitchen|recipe|food|bazaar|market|feast|dinner|brunch|café|cafe|culinary|taste|bite|drink|brew|tasting|supper/.test(s)) return 'food'
  if (/yoga|wellness|meditat|mindful|sound.?bath|breath|heal|zen|retreat|stretch|pilates/.test(s)) return 'wellness'
  if (/art|exhibit|gallery|paint|draw|sketch|sculpture|photo|portrait|mural/.test(s)) return 'art'
  if (/poetry|spoken|literature|reading|book|verse|haiku|ghazal|shayari|kavita|mehfil/.test(s)) return 'art'
  if (/music|concert|gig|band|live music|perform|stage/.test(s))               return 'jazz'
  if (/dance|salsa|kathak|bharatnatyam|folk|classical/.test(s))                return 'art'
  if (/workshop|masterclass|class|session|tutorial|seminar|bootcamp|hackathon/.test(s)) return 'general'
  return 'general'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} / ${MONTH_NAMES[d.getMonth()]} / ${d.getFullYear()}`
}

function formatTimeDisplay(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} HRS`
}

function buildStartsAt(d: Date, h: number, m: number): string {
  const out = new Date(d)
  out.setHours(h, m, 0, 0)
  return out.toISOString()
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// ── Calendar overlay ──────────────────────────────────────────────────────────

function CalendarOverlay({ onConfirm, onClose }: { onConfirm: (d: Date) => void; onClose: () => void }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [picked, setPicked] = useState<Date | null>(null)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-start"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#FAF7F0] w-full md:w-[40%] border-t-2 border-r-2 border-[#1A2744] p-5 md:p-8"
           style={{ animation: 'slideUp 200ms ease-out' }}>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: 'var(--font-barlow)' }} className="text-[#1A2744] text-[24px] font-bold uppercase tracking-wide">SELECT DATE</span>
          <button onClick={onClose} className="text-[#1A2744] hover:rotate-90 transition-transform duration-200 text-[24px] leading-none w-11 h-11 flex items-center justify-center">×</button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }} className="text-[#1A2744] hover:text-[#E8705A] transition-colors p-3">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#1A2744] text-[13px] font-bold uppercase tracking-widest">{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }} className="text-[#1A2744] hover:text-[#E8705A] transition-colors p-3">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {['SU','MO','TU','WE','TH','FR','SA'].map(d => (
            <div key={d} style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-center text-[10px] text-[#1A2744]/40 uppercase py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const thisDate = new Date(year, month, day)
            const isPicked = picked?.toDateString() === thisDate.toDateString()
            const isToday = thisDate.toDateString() === today.toDateString()
            return (
              <button key={day} onClick={() => setPicked(thisDate)} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                      className={['w-full h-11 flex items-center justify-center text-[13px] transition-colors', isPicked ? 'bg-[#E8705A] text-white' : isToday ? 'border border-[#E8705A] text-[#E8705A]' : 'text-[#1A2744] hover:bg-[#1A2744]/5'].join(' ')}>
                {day}
              </button>
            )
          })}
        </div>
        <button onClick={() => picked && (onConfirm(picked), onClose())} disabled={!picked}
                className="mt-6 w-full bg-[#E8705A] text-white py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
          CONFIRM DATE
        </button>
      </div>
    </div>
  )
}

// ── Time overlay ──────────────────────────────────────────────────────────────

function TimeOverlay({ onConfirm, onClose }: { onConfirm: (h: number, m: number) => void; onClose: () => void }) {
  const [hour, setHour] = useState(21)
  const [minute, setMinute] = useState(0)

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-start"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#FAF7F0] w-full md:w-[40%] border-t-2 border-r-2 border-[#1A2744] p-5 md:p-8"
           style={{ animation: 'slideUp 200ms ease-out' }}>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: 'var(--font-barlow)' }} className="text-[#1A2744] text-[24px] font-bold uppercase tracking-wide">SELECT TIME</span>
          <button onClick={onClose} className="text-[#1A2744] hover:rotate-90 transition-transform duration-200 text-[24px] leading-none w-11 h-11 flex items-center justify-center">×</button>
        </div>
        <div className="mb-6">
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[10px] text-[#1A2744]/50 uppercase tracking-widest mb-3">HOUR</div>
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 24 }, (_, i) => (
              <button key={i} onClick={() => setHour(i)}
                      className={['h-11 text-[12px] transition-colors', hour === i ? 'bg-[#E8705A] text-white' : 'bg-[#1A2744]/5 text-[#1A2744] hover:bg-[#1A2744]/10'].join(' ')}
                      style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                {String(i).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[10px] text-[#1A2744]/50 uppercase tracking-widest mb-3">MINUTE</div>
          <div className="flex gap-3">
            {[0, 15, 30, 45].map(m => (
              <button key={m} onClick={() => setMinute(m)}
                      className={['flex-1 h-12 text-[13px] transition-colors', minute === m ? 'bg-[#E8705A] text-white' : 'bg-[#1A2744]/5 text-[#1A2744] hover:bg-[#1A2744]/10'].join(' ')}
                      style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                :{String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-center text-[#1A2744] text-[28px] font-bold tracking-widest mb-4">
          {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} HRS
        </div>
        <button onClick={() => { onConfirm(hour, minute); onClose() }}
                className="w-full bg-[#E8705A] text-white py-3 hover:brightness-110 transition-all"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
          CONFIRM TIME
        </button>
      </div>
    </div>
  )
}

// ── Poster thumbnail components ──────────────────────────────────────────────

function UndergroundThumb({ active }: { active: boolean }) {
  return (
    <div className="aspect-[3/4] w-full relative overflow-hidden" style={{ backgroundColor: '#0D0B0A' }}>
      <div className="absolute inset-0 opacity-[0.04]" style={GRAIN_STYLE} />
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: '#E8705A' }} />
      <div className="p-3 pt-4 flex flex-col h-full">
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(232,112,90,0.5)' }} className="text-[5px] uppercase tracking-widest mb-1">WIMC · 2024</div>
        <div style={{ fontFamily: 'var(--font-syne)', color: '#fff', fontWeight: 900, lineHeight: 0.85 }} className="text-[14px] uppercase mt-auto mb-1">
          UNDER<br />GROUND
        </div>
        <div className="flex gap-[1px] mt-1">
          {[3,5,2,4,3,6,2,4,5].map((h, i) => (
            <div key={i} style={{ width: 2, height: h * 2, backgroundColor: '#E8705A', opacity: 0.5 }} />
          ))}
        </div>
        <div className="mt-1 h-[2px] w-full" style={{ backgroundColor: 'rgba(232,112,90,0.3)' }} />
      </div>
      {active && <span className="material-symbols-outlined absolute top-2 right-2 text-[#E8705A] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
    </div>
  )
}

function ZineThumb({ active }: { active: boolean }) {
  return (
    <div className="aspect-[3/4] w-full relative overflow-hidden" style={{ backgroundColor: '#F2EDE3' }}>
      {/* Perf dots top/bottom */}
      <div className="absolute top-0 left-0 right-0 h-[10px]"
           style={{ backgroundImage: 'radial-gradient(circle, #1B3A8C 3px, transparent 3px)', backgroundSize: '10px 10px', backgroundPosition: '5px center' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[10px]"
           style={{ backgroundImage: 'radial-gradient(circle, #1B3A8C 3px, transparent 3px)', backgroundSize: '10px 10px', backgroundPosition: '5px center' }} />
      <div className="absolute top-[10px] bottom-[10px] left-0 w-[10px]"
           style={{ backgroundImage: 'radial-gradient(circle, #1B3A8C 3px, transparent 3px)', backgroundSize: '10px 10px', backgroundPosition: 'center 5px' }} />
      <div className="absolute top-[10px] bottom-[10px] right-0 w-[10px]"
           style={{ backgroundImage: 'radial-gradient(circle, #1B3A8C 3px, transparent 3px)', backgroundSize: '10px 10px', backgroundPosition: 'center 5px' }} />
      {/* Inner content */}
      <div className="absolute inset-[10px] border border-[#1B3A8C] flex flex-col p-2">
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#1B3A8C' }} className="text-[5px] uppercase tracking-widest">INDIA CULTURE</div>
        <div className="h-[1px] w-full bg-[#1B3A8C] my-1 opacity-30" />
        <div style={{ fontFamily: 'var(--font-abril)', color: '#1B3A8C', lineHeight: 0.9 }} className="text-[13px] uppercase mt-1 flex-1">
          ZINE
        </div>
        {/* Postmark */}
        <div className="absolute bottom-6 right-3 w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center"
             style={{ borderColor: '#C8281E', transform: 'rotate(-15deg)' }}>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#C8281E' }} className="text-[4px] text-center uppercase leading-tight">
            WIMC<br/>POST
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#1B3A8C', opacity: 0.4 }} className="text-[4px] uppercase">SERIES 001</div>
      </div>
      {active && <span className="material-symbols-outlined absolute top-2 right-2 text-[#C8281E] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
    </div>
  )
}

function ElectricThumb({ active }: { active: boolean }) {
  return (
    <div className="aspect-[3/4] w-full relative overflow-hidden" style={{ backgroundColor: '#08080F' }}>
      {/* Color bar */}
      <div className="h-[18px] w-full" style={{ background: 'linear-gradient(90deg, #FF2D55, #FF6B35)' }} />
      <div className="p-3 flex flex-col" style={{ height: 'calc(100% - 18px)' }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,45,85,0.6)' }} className="text-[5px] uppercase tracking-widest mb-1">WHEN IN MY CITY</div>
        <div style={{ fontFamily: 'var(--font-syne)', color: '#FFFFFF', fontWeight: 900, lineHeight: 0.85 }} className="text-[16px] uppercase mt-1">
          ELEC<br />TRIC
        </div>
        {/* Cyan line */}
        <div className="mt-auto mb-1 h-[1px] w-full" style={{ backgroundColor: '#00E5FF', opacity: 0.6 }} />
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF2D55' }} />
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#00E5FF' }} className="text-[5px] uppercase">FREE · LIVE</div>
        </div>
      </div>
      {active && <span className="material-symbols-outlined absolute top-2 right-2 text-[#FF2D55] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
    </div>
  )
}

function UploadThumb({ active, previewUrl }: { active: boolean; previewUrl: string | null }) {
  if (previewUrl) {
    return (
      <div className="aspect-[3/4] w-full relative overflow-hidden">
        <img src={previewUrl} alt="poster" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
        {active && <span className="material-symbols-outlined absolute top-2 right-2 text-[#E8705A] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
      </div>
    )
  }
  return (
    <div className="aspect-[3/4] w-full relative overflow-hidden flex flex-col items-center justify-center gap-2"
         style={{ backgroundColor: '#0D0B12', border: `1px dashed ${active ? '#E8705A55' : 'rgba(255,255,255,0.1)'}` }}>
      <span className="material-symbols-outlined text-[28px]" style={{ color: active ? '#E8705A' : 'rgba(255,255,255,0.2)' }}>add_photo_alternate</span>
      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: active ? '#E8705A55' : 'rgba(255,255,255,0.15)', fontSize: 7 }} className="uppercase tracking-widest text-center leading-relaxed">
        YOUR<br />POSTER
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const router = useRouter()

  const [posterStyle, setPosterStyle] = useState<PosterStyle>('underground')
  const [title, setTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null)
  const [city, setCity] = useState('Ahmedabad')
  const [isFree, setIsFree] = useState(true)
  const [ticketPrice, setTicketPrice] = useState<number>(0)
  const [isInviteOnly, setIsInviteOnly] = useState(false)
  const [isSeries, setIsSeries] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Category detection
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null)

  // Upload poster
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [uploadedPosterUrl, setUploadedPosterUrl] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFile(file)
    setUploadedPosterUrl(URL.createObjectURL(file))
    setPosterStyle('upload')
  }
  const [showDateOverlay, setShowDateOverlay] = useState(false)
  const [showTimeOverlay, setShowTimeOverlay] = useState(false)

  // Venue
  const [venueMode, setVenueMode] = useState<VenueMode>('wimc')
  const [wimcVenues, setWimcVenues] = useState<WimcVenue[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<WimcVenue | null>(null)
  const [customVenueName, setCustomVenueName] = useState('')
  const [customVenueAddress, setCustomVenueAddress] = useState('')
  const [customVenueMapsUrl, setCustomVenueMapsUrl] = useState('')

  const posterTitleRef = useRef<HTMLHeadingElement>(null)
  const stampRef = useRef<HTMLDivElement>(null)

  const dateDisplay = selectedDate ? formatDateDisplay(selectedDate) : null
  const timeDisplay = (selectedHour !== null && selectedMinute !== null) ? formatTimeDisplay(selectedHour, selectedMinute) : null
  const dateDay   = selectedDate ? String(selectedDate.getDate()).padStart(2, '0') : null
  const dateMonth = selectedDate ? MONTH_NAMES[selectedDate.getMonth()] : null

  const activeVenueName    = venueMode === 'wimc' ? (selectedVenue?.name ?? '') : customVenueName.trim()
  const activeVenueAddress = venueMode === 'wimc' ? (selectedVenue?.address ?? city) : (customVenueAddress.trim() || city)
  const activeMapsUrl      = venueMode === 'wimc' ? (selectedVenue?.google_maps_url ?? '') : customVenueMapsUrl.trim()
  const filteredVenues     = venueSearch.trim() ? wimcVenues.filter(v => v.name.toLowerCase().includes(venueSearch.toLowerCase())) : wimcVenues

  // Poster title punch animation on type
  useEffect(() => {
    const el = posterTitleRef.current
    if (!el || !title) return
    el.style.transform = 'scale(1.02)'
    const t = setTimeout(() => { el.style.transform = 'scale(1)' }, 50)
    return () => clearTimeout(t)
  }, [title])

  // Stamp thump
  useEffect(() => {
    const id = setInterval(() => {
      const el = stampRef.current
      if (!el) return
      el.style.animation = 'none'
      void el.offsetWidth
      el.style.animation = 'stampThump 350ms cubic-bezier(0.22,1,0.36,1)'
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // Load venues by city
  useEffect(() => {
    async function loadVenues() {
      setIsLoadingVenues(true)
      setSelectedVenue(null)
      const supabase = createClient()
      const [{ data: venues }, { data: dirs }] = await Promise.all([
        supabase.from('venue_profiles').select('id, name, city, address, lat, lng').ilike('city', `%${city}%`).eq('is_active', true).limit(12),
        supabase.from('venue_directory').select('id, name, city, address, lat, lng, google_maps_url').ilike('city', `%${city}%`).eq('is_active', true).limit(12),
      ])
      setWimcVenues([
        ...(venues ?? []).map(a => ({ id: a.id, name: a.name, city: a.city, address: a.address, lat: a.lat, lng: a.lng, google_maps_url: null, source: 'venue' as const })),
        ...(dirs ?? []).map(d => ({ id: d.id, name: d.name, city: d.city, address: d.address, lat: d.lat, lng: d.lng, google_maps_url: d.google_maps_url, source: 'directory' as const })),
      ])
      setIsLoadingVenues(false)
    }
    loadVenues()
  }, [city])

  // Debounced category detection
  useEffect(() => {
    const t = setTimeout(() => setDetectedCategory(detectCategory(title)), 300)
    return () => clearTimeout(t)
  }, [title])

  // ── Submit logic ─────────────────────────────────────────────────────────

  function buildInput(): CreateEventInput | string {
    if (!title.trim()) return 'Please enter an event title.'
    if (title.trim().length < 3) return 'Event title must be at least 3 characters.'
    const vAddr = activeVenueAddress.trim()
    if (vAddr.length < 5) return venueMode === 'wimc' ? 'Please select a WIMC venue or switch to Custom Venue.' : 'Please enter the full venue address (at least 5 characters).'
    const startsAt = (selectedDate && selectedHour !== null && selectedMinute !== null)
      ? buildStartsAt(selectedDate, selectedHour, selectedMinute)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    return {
      title: title.trim(),
      venue_name: activeVenueName || 'TBA',
      venue_address: vAddr,
      google_maps_url: activeMapsUrl || undefined,
      venue_lat: venueMode === 'wimc' ? (selectedVenue?.lat ?? undefined) : undefined,
      venue_lng: venueMode === 'wimc' ? (selectedVenue?.lng ?? undefined) : undefined,
      starts_at: startsAt,
      ticket_price: isFree ? 0 : ticketPrice * 100,
    }
  }

  async function resolvedCoverUrl(): Promise<string | undefined> {
    if (posterStyle !== 'upload' || !uploadedFile) return undefined
    const fd = new FormData()
    fd.append('file', uploadedFile)
    const result = await uploadEventCover(fd)
    return result.url ?? undefined
  }

  async function handlePublish() {
    setPublishError(null)
    const input = buildInput()
    if (typeof input === 'string') { setPublishError(input); return }
    setIsPublishing(true)
    const coverUrl = await resolvedCoverUrl()
    const cr = await createEvent({ ...input, cover_image_url: coverUrl })
    if (cr.error || !cr.event) { setPublishError(cr.error ?? 'Could not create event.'); setIsPublishing(false); return }
    const pr = await publishEvent(cr.event.id)
    if (pr.error) { setPublishError(pr.error); setIsPublishing(false); return }
    router.push(`/dashboard/events/${cr.event.id}/manage`)
  }

  async function handleSaveDraft() {
    setPublishError(null)
    const input = buildInput()
    if (typeof input === 'string') { setPublishError(input); return }
    setIsSavingDraft(true)
    const coverUrl = await resolvedCoverUrl()
    const cr = await createEvent({ ...input, cover_image_url: coverUrl })
    if (cr.error || !cr.event) { setPublishError(cr.error ?? 'Could not save draft.'); setIsSavingDraft(false); return }
    router.push(`/dashboard/events/${cr.event.id}/manage`)
  }

  const priceLabel = isFree ? 'FREE' : ticketPrice ? `₹${ticketPrice}` : '₹ — — —'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes stampThump {
          0%   { transform: scale(1) rotate(-12deg); }
          30%  { transform: scale(0.92) rotate(-12deg); }
          70%  { transform: scale(1.04) rotate(-12deg); }
          100% { transform: scale(1) rotate(-12deg); }
        }
        @keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-marquee-create { animation: marqueeScroll 20s linear infinite; }
        @keyframes zinePostmarkSpin { from { transform: rotate(-12deg); } to { transform: rotate(-12deg) scale(1.05); } }
        @keyframes electricPulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
      `}</style>

      <div className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.028]" style={GRAIN_STYLE} />

      {showDateOverlay && <CalendarOverlay onConfirm={d => setSelectedDate(d)} onClose={() => setShowDateOverlay(false)} />}
      {showTimeOverlay && <TimeOverlay onConfirm={(h, m) => { setSelectedHour(h); setSelectedMinute(m) }} onClose={() => setShowTimeOverlay(false)} />}

      <div className="bg-[#07070A] min-h-screen flex flex-col">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-50 h-16 bg-[#07070A]/95 backdrop-blur border-b-2 border-dashed border-[#57423e] flex items-center justify-between px-8">
          <WimcWordmark color="#E8705A" height={22} />
          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white text-[11px] uppercase tracking-widest">NEW EVENT</div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white/50 text-[9px] uppercase tracking-widest">DASHBOARD / EVENTS / CREATE</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveDraft} disabled={!title || isSavingDraft || isPublishing}
                    className="border border-dashed border-[#E8705A] text-[#E8705A] px-4 py-1 hover:bg-[#E8705A]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>
              {isSavingDraft ? 'SAVING...' : 'SAVE DRAFT'}
            </button>
            <button onClick={() => router.push('/dashboard')} className="text-white hover:rotate-90 transition-transform duration-200 text-[20px] leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

          {/* ── LEFT FORM PANEL ── */}
          <div className="w-[40%] bg-[#1A2744] border-r-2 border-dashed border-[#57423e] flex flex-col overflow-y-auto pb-[100px] relative">
            <div className="flex-1 p-8 space-y-12 overflow-y-auto">

              {/* 01. Poster Style */}
              <div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[10px] uppercase tracking-[0.2em] mb-6">01. POSTER STYLE</div>

                {/* Hidden file input */}
                <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                       onChange={handleFileSelect} />

                <div className="grid grid-cols-4 gap-3">
                  {([
                    { id: 'underground' as const, label: 'UNDERGROUND' },
                    { id: 'zine' as const, label: 'ZINE' },
                    { id: 'electric' as const, label: 'ELECTRIC' },
                  ]).map(s => (
                    <button key={s.id} onClick={() => setPosterStyle(s.id)}
                            className={['flex flex-col items-center gap-2 p-2 border-2 cursor-pointer transition-all', posterStyle === s.id ? 'bg-[#131317] border-[#E8705A]' : 'bg-[#131317] border-white/20 hover:border-[#E8705A]/50'].join(' ')}>
                      {s.id === 'underground' && <UndergroundThumb active={posterStyle === 'underground'} />}
                      {s.id === 'zine' && <ZineThumb active={posterStyle === 'zine'} />}
                      {s.id === 'electric' && <ElectricThumb active={posterStyle === 'electric'} />}
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                            className={['text-[8px] uppercase tracking-widest', posterStyle === s.id ? 'text-white' : 'text-white/40'].join(' ')}>
                        {s.label}
                      </span>
                    </button>
                  ))}

                  {/* Upload tile */}
                  <button
                    onClick={() => posterStyle === 'upload' && uploadedPosterUrl ? uploadInputRef.current?.click() : uploadInputRef.current?.click()}
                    className={['flex flex-col items-center gap-2 p-2 border-2 cursor-pointer transition-all', posterStyle === 'upload' ? 'bg-[#131317] border-[#E8705A]' : 'bg-[#131317] border-white/20 hover:border-[#E8705A]/50'].join(' ')}>
                    <UploadThumb active={posterStyle === 'upload'} previewUrl={uploadedPosterUrl} />
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                          className={['text-[8px] uppercase tracking-widest', posterStyle === 'upload' ? 'text-white' : 'text-white/40'].join(' ')}>
                      {uploadedPosterUrl ? 'CHANGE' : 'UPLOAD'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 02. Event Identity */}
              <div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[10px] uppercase tracking-[0.2em] mb-6">02. EVENT IDENTITY</div>
                <input type="text" value={title} onChange={e => { setPublishError(null); setTitle(e.target.value) }} maxLength={60}
                       placeholder="THE MIDNIGHT BAZAAR"
                       className="w-full bg-transparent border-b-2 border-white/20 py-3 focus:border-[#E8705A] outline-none transition-colors text-white placeholder:text-white/10"
                       style={{ fontFamily: 'var(--font-abril)', fontSize: 36, lineHeight: 1.1 }} />
              </div>

              {/* 03. Chronology */}
              <div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[10px] uppercase tracking-[0.2em] mb-6">03. CHRONOLOGY</div>
                <div className="grid grid-cols-2 gap-6">
                  <button onClick={() => setShowDateOverlay(true)}
                          className="bg-[#201f23] p-6 border border-[#57423e] relative cursor-pointer hover:bg-[#2a292d] group transition-colors text-left">
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white/40 text-[10px] uppercase absolute top-3 left-4">DATE</span>
                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white text-[20px] pt-6">{dateDisplay || '24 / OCT / 2024'}</div>
                    <span className="material-symbols-outlined absolute bottom-3 right-3 text-[#E8705A] opacity-0 group-hover:opacity-100 transition-opacity text-[18px]">calendar_today</span>
                  </button>
                  <button onClick={() => setShowTimeOverlay(true)}
                          className="bg-[#201f23] p-6 border border-[#57423e] relative cursor-pointer hover:bg-[#2a292d] group transition-colors text-left">
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white/40 text-[10px] uppercase absolute top-3 left-4">TIME</span>
                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white text-[20px] pt-6">{timeDisplay || '21:00 HRS'}</div>
                    <span className="material-symbols-outlined absolute bottom-3 right-3 text-[#E8705A] opacity-0 group-hover:opacity-100 transition-opacity text-[18px]">schedule</span>
                  </button>
                </div>
              </div>

              {/* 04. Geography */}
              <div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[10px] uppercase tracking-[0.2em] mb-6">04. GEOGRAPHY</div>
                <div className="flex gap-3 flex-wrap mb-6">
                  {CITIES.map(c => (
                    <button key={c} onClick={() => { setCity(c); setSelectedVenue(null) }}
                            className={['border-2 px-4 py-2 cursor-pointer transition-colors', city === c ? 'bg-[#E8705A]/20 border-[#E8705A] border-solid text-[#E8705A]' : 'border-dashed border-white/20 text-white/50 hover:border-white/40'].join(' ')}
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  {(['wimc', 'custom'] as const).map(mode => (
                    <button key={mode} onClick={() => { setVenueMode(mode); setSelectedVenue(null) }}
                            className={['flex-1 py-2 border-2 transition-colors text-center', venueMode === mode ? 'border-[#E8705A] bg-[#E8705A]/10 text-[#E8705A]' : 'border-dashed border-white/20 text-white/40 hover:border-white/30'].join(' ')}
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {mode === 'wimc' ? 'WIMC VENUES' : 'CUSTOM VENUE'}
                    </button>
                  ))}
                </div>

                {venueMode === 'wimc' ? (
                  <div>
                    <div className="relative group mb-3">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#E8705A] transition-colors text-[18px]">search</span>
                      <input type="text" value={venueSearch} onChange={e => setVenueSearch(e.target.value)} placeholder="Filter venues..."
                             className="w-full bg-white/5 border-2 border-dashed border-white/10 focus:border-[#E8705A] outline-none px-4 py-3 pl-12 text-white placeholder:text-white/30 transition-colors"
                             style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13 }} />
                    </div>
                    {isLoadingVenues ? (
                      <div className="flex items-center gap-2 py-4 text-white/30" style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10 }}>
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        LOADING VENUES...
                      </div>
                    ) : filteredVenues.length === 0 ? (
                      <div className="py-4 text-white/30 text-center" style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10 }}>
                        NO VENUES IN {city.toUpperCase()} — USE CUSTOM VENUE
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {filteredVenues.map(v => (
                          <button key={`${v.source}-${v.id}`} onClick={() => setSelectedVenue(selectedVenue?.id === v.id ? null : v)}
                                  className={['w-full flex items-start gap-3 py-3 px-4 border text-left transition-colors', selectedVenue?.id === v.id ? 'border-[#E8705A] bg-[#E8705A]/10' : 'border-dashed border-white/10 hover:bg-white/5'].join(' ')}>
                            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5"
                                 style={{ backgroundColor: v.source === 'venue' ? '#5DD9D0' : '#E8705A', fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 12, color: '#07070A' }}>
                              {v.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span style={{ fontFamily: 'var(--font-barlow)' }} className="text-white text-[15px]">{v.name}</span>
                                {v.source === 'venue' && (
                                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[8px] text-[#5DD9D0] border border-[#5DD9D0]/40 px-1 py-0.5 uppercase">VENUE</span>
                                )}
                              </div>
                              <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white/50 text-[10px] uppercase truncate">{v.address}</div>
                            </div>
                            {selectedVenue?.id === v.id && <span className="material-symbols-outlined text-[#E8705A] text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input type="text" value={customVenueName} onChange={e => setCustomVenueName(e.target.value)} placeholder="Venue name (e.g. The Rooftop Café)"
                           className="w-full bg-white/5 border-2 border-dashed border-white/10 focus:border-[#E8705A] outline-none px-4 py-3 text-white placeholder:text-white/30 transition-colors"
                           style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13 }} />
                    <input type="text" value={customVenueAddress} onChange={e => setCustomVenueAddress(e.target.value)} placeholder="Full address (e.g. 12 MG Road, Navrangpura)"
                           className="w-full bg-white/5 border-2 border-dashed border-white/10 focus:border-[#E8705A] outline-none px-4 py-3 text-white placeholder:text-white/30 transition-colors"
                           style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13 }} />
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#E8705A] transition-colors text-[16px]">map</span>
                      <input type="url" value={customVenueMapsUrl} onChange={e => setCustomVenueMapsUrl(e.target.value)} placeholder="Google Maps link (optional)"
                             className="w-full bg-white/5 border-2 border-dashed border-white/10 focus:border-[#E8705A] outline-none px-4 py-3 pl-12 text-white placeholder:text-white/30 transition-colors"
                             style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }} />
                    </div>
                  </div>
                )}
              </div>

              {/* 05. Admission Logic */}
              <div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[10px] uppercase tracking-[0.2em] mb-6">05. ADMISSION LOGIC</div>
                <div className="flex gap-4">
                  {[
                    { key: 'free', icon: 'confirmation_number', label: 'FREE EVENT', active: isFree, set: () => setIsFree(v => !v) },
                    { key: 'invite', icon: 'mail', label: 'INVITE ONLY', active: isInviteOnly, set: () => setIsInviteOnly(v => !v) },
                    { key: 'series', icon: 'event_repeat', label: 'SERIES', active: isSeries, set: () => setIsSeries(v => !v) },
                  ].map(t => (
                    <button key={t.key} onClick={t.set}
                            className={['flex-1 flex items-center justify-center gap-2 p-4 border-2 cursor-pointer transition-colors', t.active ? 'border-[#E8705A] bg-[#E8705A]/10 text-[#E8705A]' : 'border-dashed border-white/20 text-white/40 hover:border-white/30'].join(' ')}>
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
                {!isFree && (
                  <div className="mt-4 flex flex-col gap-1">
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[10px] uppercase tracking-widest text-white/40">TICKET PRICE (₹)</span>
                    <div className="flex items-center gap-3 border-b-2 border-white/20 py-3 focus-within:border-[#E8705A] transition-colors">
                      <span className="font-black text-[28px] text-[#E8705A]" style={{ fontFamily: 'var(--font-syne)' }}>₹</span>
                      <input type="number" min="0" value={ticketPrice || ''} onChange={e => setTicketPrice(Number(e.target.value))}
                             className="bg-transparent border-none outline-none font-black text-[28px] text-white w-full" style={{ fontFamily: 'var(--font-syne)' }} placeholder="299" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="fixed bottom-0 left-0 w-[40%] h-[80px] bg-[#07070A]/90 border-t-2 border-dashed border-[#57423e] backdrop-blur flex items-center justify-between px-8 z-40">
              <div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white/40 text-[11px] uppercase">READY TO PUBLISH?</div>
                {!title && <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-white/20 text-[10px]">ENTER EVENT TITLE FIRST</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-black translate-x-1 translate-y-1 group-active:translate-x-0 group-active:translate-y-0 transition-transform" />
                  <button onClick={handlePublish} disabled={!title || isPublishing || isSavingDraft}
                          className="relative bg-[#E8705A] text-white px-10 py-3 border-2 border-black flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                          style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>
                    {isPublishing ? 'PUBLISHING...' : 'PUBLISH EVENT →'}
                  </button>
                </div>
                {publishError && <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] text-red-400 uppercase tracking-widest">{publishError}</p>}
              </div>
            </div>
          </div>

          {/* ── RIGHT PREVIEW PANEL ── */}
          <div className="w-[60%] overflow-y-auto p-12 relative pb-20"
               style={{ backgroundColor: '#F5ECD7', backgroundImage: 'radial-gradient(#57423e 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }}>

            <div className="mb-8 flex justify-between items-end">
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900 }} className="text-[#1A2744] text-[24px] uppercase">LIVE POSTER</div>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#1A2744]/60 text-[12px]">Draft preview synced in real-time</div>
              </div>
              <div className="flex items-center gap-2 text-[#E8705A] animate-pulse">
                <div className="w-2 h-2 bg-[#E8705A]" />
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[10px]">SYNCED</span>
              </div>
            </div>

            {/* ═══════════════════════════════════════════
                UNDERGROUND POSTER
            ═══════════════════════════════════════════ */}
            {posterStyle === 'underground' && (() => {
              const cat = detectedCategory ? CATEGORY_META[detectedCategory] : null
              return (
                <div className="w-full max-w-[500px] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden"
                     style={{ backgroundColor: '#0D0B0A', minHeight: 520 }}>
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={GRAIN_STYLE} />
                  {/* Left bar — category color when detected */}
                  <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: cat ? cat.color : '#E8705A' }} />

                  {/* Header strip */}
                  <div className="h-8 border-b border-dashed border-white/10 flex items-center justify-between px-4"
                       style={{ backgroundColor: cat ? `${cat.color}08` : 'transparent' }}>
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.3)' }} className="text-[8px] uppercase tracking-widest">WIMC-GEN-TRX-2024-X</span>
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: cat ? cat.color : 'rgba(255,255,255,0.3)' }} className="text-[8px] uppercase tracking-widest">
                      {cat ? cat.label : 'AUTHENTIC CULTURE'}
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-10 flex flex-col justify-center relative">
                    {/* Rotated stamp — fully category-coloured */}
                    <div ref={stampRef} className="absolute top-10 right-10 w-28 h-28 border-2 border-dashed flex items-center justify-center pointer-events-none"
                         style={{ borderColor: cat ? `${cat.color}80` : 'rgba(232,112,90,0.4)', transform: 'rotate(-12deg)' }}>
                      <div className="w-20 h-20 flex flex-col items-center justify-center gap-0.5"
                           style={{ backgroundColor: cat ? `${cat.color}15` : 'transparent' }}>
                        <div className="w-full h-full flex items-center justify-center border border-dashed"
                             style={{ borderColor: cat ? `${cat.color}50` : 'rgba(232,112,90,0.3)' }}>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: cat ? cat.color : 'rgba(232,112,90,0.7)' }} className="text-[11px] text-center uppercase leading-tight font-bold">
                            {cat ? cat.label : 'CULT'}<br />STAMP
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: cat ? cat.color : '#E8705A' }} className="text-[12px] tracking-[0.3em] mb-4 uppercase">WHEN IN MY CITY PRESENTS</div>

                    <h2 ref={posterTitleRef}
                        style={{
                          fontFamily: 'var(--font-abril)',
                          fontSize: getPosterFontSize(title, 290),
                          lineHeight: 0.95,
                          textTransform: 'uppercase',
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          hyphens: 'none',
                          color: title ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                          transition: 'transform 50ms ease',
                        }}>
                      {title || 'YOUR EVENT'}
                    </h2>

                    <div className="flex items-center gap-6 mt-8">
                      <div className="px-4 py-2 flex flex-col items-center min-w-[80px]"
                           style={{ backgroundColor: cat ? cat.color : '#E8705A' }}>
                        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#000', opacity: 0.7 }} className="text-[10px] font-bold">{dateMonth || 'OCT'}</span>
                        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, color: '#000' }} className="text-[24px] leading-none">{dateDay || '24'}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.5)' }} className="text-[10px] uppercase tracking-widest">VENUE LOCATION</div>
                        <div style={{ fontFamily: 'var(--font-dm-sans)', color: '#ffffff' }} className="text-[18px]">{activeVenueName || 'TO BE ANNOUNCED'}</div>
                      </div>
                    </div>

                    <div className="flex gap-10 mt-6">
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: cat ? cat.color : '#E8705A' }} className="text-[24px]">{priceLabel}</div>
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.8)' }} className="text-[24px]">LIMITLESS</div>
                    </div>
                  </div>

                  {/* Category band — prominent full-width strip */}
                  {cat && (
                    <div className="px-6 py-2.5 flex items-center gap-4"
                         style={{ backgroundColor: `${cat.color}18`, borderTop: `1px solid ${cat.color}40` }}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: cat.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.3em' }}>
                        {cat.label}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: `${cat.color}30` }} />
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: `${cat.color}70`, fontSize: 9 }}>CULTURE</span>
                    </div>
                  )}

                  {/* Stub */}
                  <div className="h-[30px] border-t border-dashed border-white/15 flex items-center px-4 justify-between overflow-hidden"
                       style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.35)' }} className="text-[8px] uppercase tracking-[0.4em]">ADMIT ONE // NO REFUND</span>
                    <div className="h-full w-20 opacity-25" style={{ background: `repeating-linear-gradient(to right, ${cat ? cat.color : '#E8705A'} 0, ${cat ? cat.color : '#E8705A'} 1px, transparent 1px, transparent 4px)` }} />
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.2)' }} className="text-[8px]">WIMC V1.0</span>
                  </div>

                  <div className="absolute -left-[10px] bottom-[17px] w-5 h-5 rounded-full bg-[#F5ECD7] border-r-2 border-black" />
                  <div className="absolute -right-[10px] bottom-[17px] w-5 h-5 rounded-full bg-[#F5ECD7] border-l-2 border-black" />
                </div>
              )
            })()}

            {/* ═══════════════════════════════════════════
                ZINE POSTER — risograph / postal print
            ═══════════════════════════════════════════ */}
            {posterStyle === 'zine' && (
              <div className="w-full max-w-[500px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
                   style={{ backgroundColor: '#F2EDE3', minHeight: 520 }}>

                {/* Perforated stamp edges */}
                <div className="absolute top-0 left-0 right-0 h-[18px] z-10"
                     style={{ backgroundImage: 'radial-gradient(circle, #F2EDE3 5px, transparent 5px)', backgroundSize: '18px 18px', backgroundPosition: '9px center', backgroundColor: '#1B3A8C' }} />
                <div className="absolute bottom-0 left-0 right-0 h-[18px] z-10"
                     style={{ backgroundImage: 'radial-gradient(circle, #F2EDE3 5px, transparent 5px)', backgroundSize: '18px 18px', backgroundPosition: '9px center', backgroundColor: '#1B3A8C' }} />
                <div className="absolute top-[18px] bottom-[18px] left-0 w-[18px] z-10"
                     style={{ backgroundImage: 'radial-gradient(circle, #F2EDE3 5px, transparent 5px)', backgroundSize: '18px 18px', backgroundPosition: 'center 9px', backgroundColor: '#1B3A8C' }} />
                <div className="absolute top-[18px] bottom-[18px] right-0 w-[18px] z-10"
                     style={{ backgroundImage: 'radial-gradient(circle, #F2EDE3 5px, transparent 5px)', backgroundSize: '18px 18px', backgroundPosition: 'center 9px', backgroundColor: '#1B3A8C' }} />

                {/* Inner paper */}
                <div className="absolute inset-[18px] flex flex-col overflow-hidden border border-[#1B3A8C]/30">

                  {/* Registration marks */}
                  {[['top-1 left-1', ''], ['top-1 right-1', 'rotate-90'], ['bottom-1 left-1', '-rotate-90'], ['bottom-1 right-1', 'rotate-180']].map(([pos, rot], i) => (
                    <div key={i} className={`absolute ${pos} w-4 h-4 flex items-center justify-center pointer-events-none`}>
                      <div className={`${rot} relative w-3 h-3`}>
                        <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: '#C8281E', opacity: 0.6 }} />
                        <div className="absolute top-1/2 left-0 right-0 h-px" style={{ backgroundColor: '#C8281E', opacity: 0.6 }} />
                        <div className="absolute inset-0 m-auto w-2 h-2 rounded-full border" style={{ borderColor: 'rgba(200,40,30,0.4)' }} />
                      </div>
                    </div>
                  ))}

                  {/* Header bar */}
                  <div className="px-5 pt-4 pb-3 border-b border-[#1B3A8C]/20">
                    <div className="flex items-center justify-between">
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#1B3A8C' }} className="text-[9px] uppercase tracking-[0.2em]">INDIA CULTURE POST · 2024</div>
                      <div className="flex items-center gap-2">
                        <div className="border border-[#1B3A8C] px-2 py-0.5" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#1B3A8C', fontSize: 10, fontWeight: 700 }}>₹ 5</div>
                      </div>
                    </div>
                  </div>

                  {/* Main body */}
                  <div className="flex-1 px-5 py-5 relative flex flex-col">

                    {/* Postmark circle — category colored */}
                    {(() => {
                      const zcat = detectedCategory ? CATEGORY_META[detectedCategory] : null
                      const pmColor = zcat ? zcat.color : '#C8281E'
                      return (
                        <div className="absolute top-4 right-3 w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center pointer-events-none"
                             style={{ borderColor: `${pmColor}60`, transform: 'rotate(-15deg)', backgroundColor: `${pmColor}08` }}>
                          <div className="w-[86px] h-[86px] rounded-full border flex flex-col items-center justify-center gap-1"
                               style={{ borderColor: `${pmColor}40` }}>
                            {zcat && (
                              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: pmColor, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }} className="uppercase">
                                {zcat.label}
                              </div>
                            )}
                            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: `${pmColor}80` }} className="text-[7px] uppercase text-center leading-relaxed">
                              {dateDay || '24'} {dateMonth || 'OCT'}<br />{city.toUpperCase()}<br />WIMC POST
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#1B3A8C', opacity: 0.5 }} className="text-[9px] uppercase tracking-[0.15em] mb-3">
                      WHEN IN MY CITY PRESENTS
                    </div>

                    {/* Title — large serif, overprinted blue */}
                    <div style={{
                      fontFamily: 'var(--font-abril)',
                      color: title ? '#1B3A8C' : 'rgba(27,58,140,0.15)',
                      fontSize: getPosterFontSize(title, 268),
                      lineHeight: 0.95,
                      textTransform: 'uppercase',
                      wordBreak: 'normal',
                      overflowWrap: 'break-word',
                      hyphens: 'none',
                      maxWidth: '70%',
                    }}>
                      {title || 'YOUR EVENT'}
                    </div>

                    {/* Horizontal rule — category colored */}
                    {(() => {
                      const zcat = detectedCategory ? CATEGORY_META[detectedCategory] : null
                      const lineColor = zcat ? zcat.color : '#1B3A8C'
                      return (
                        <>
                          <div className="my-4 flex items-center gap-2">
                            <div className="flex-1 h-[2px]" style={{ backgroundColor: lineColor, opacity: zcat ? 0.6 : 0.25 }} />
                            <div className="w-2 h-2 rotate-45" style={{ backgroundColor: zcat ? lineColor : 'transparent', border: zcat ? 'none' : `1px solid rgba(27,58,140,0.4)`, opacity: 0.7 }} />
                            <div className="flex-1 h-[2px]" style={{ backgroundColor: lineColor, opacity: zcat ? 0.6 : 0.25 }} />
                          </div>

                          {/* Event details */}
                          <div className="space-y-1.5">
                            {[
                              { label: 'DATE',  val: `${dateDay || '24'} ${dateMonth || 'OCT'} 2024${timeDisplay ? ` · ${timeDisplay}` : ''}` },
                              { label: 'VENUE', val: activeVenueName || 'TO BE ANNOUNCED' },
                              { label: 'ADMIT', val: priceLabel },
                            ].map(row => (
                              <div key={row.label} className="flex items-baseline gap-3">
                                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: lineColor, fontSize: 9, opacity: 0.8 }} className="uppercase tracking-wider w-12 flex-shrink-0 font-bold">{row.label}</span>
                                <span style={{ fontFamily: 'var(--font-barlow)', color: '#1B3A8C', fontSize: 15, fontWeight: 600 }}>{row.val}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Footer strip */}
                  <div className="border-t border-[#1B3A8C]/20 px-5 py-2 flex items-center justify-between">
                    <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#1B3A8C', opacity: 0.4 }} className="text-[8px] uppercase tracking-[0.2em]">SERIES 001 · ADMIT ONE</div>
                    {detectedCategory ? (
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: CATEGORY_META[detectedCategory].color, border: `1px solid ${CATEGORY_META[detectedCategory].color}`, padding: '1px 5px', fontSize: 7, letterSpacing: '0.12em' }}>
                        {CATEGORY_META[detectedCategory].label}
                      </span>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#C8281E', opacity: 0.6 }} className="text-[8px] font-bold">WIMC</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════
                ELECTRIC POSTER — modern festival / neon
            ═══════════════════════════════════════════ */}
            {posterStyle === 'electric' && (
              <div className="w-full max-w-[500px] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden"
                   style={{ backgroundColor: '#08080F', minHeight: 520 }}>

                {/* Top color block — category tints the gradient */}
                {(() => {
                  const ecat = detectedCategory ? CATEGORY_META[detectedCategory] : null
                  const grad = ecat
                    ? `linear-gradient(135deg, ${ecat.color} 0%, #FF6B35 100%)`
                    : 'linear-gradient(135deg, #FF2D55 0%, #FF6B35 100%)'
                  return (
                    <div className="relative" style={{ background: grad, padding: '16px 24px 14px' }}>
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.8)' }} className="text-[9px] uppercase tracking-[0.3em] mb-0.5">WHEN IN MY CITY PRESENTS</div>
                      {ecat && (
                        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em' }}>
                          {ecat.label} EVENT
                        </div>
                      )}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 grid grid-cols-4 gap-1 opacity-30">
                        {Array.from({ length: 12 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
                      </div>
                    </div>
                  )
                })()}

                {/* Main body */}
                <div className="flex-1 flex flex-col px-8 py-6 relative">

                  {/* Decorative circle — large, faint */}
                  <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border pointer-events-none"
                       style={{ borderColor: 'rgba(0,229,255,0.08)' }} />
                  <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full border pointer-events-none"
                       style={{ borderColor: 'rgba(0,229,255,0.05)' }} />

                  {/* Title */}
                  <div style={{
                    fontFamily: 'var(--font-syne)',
                    color: title ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                    fontWeight: 900,
                    fontSize: getPosterFontSize(title, 370, 0.75, 72),
                    lineHeight: 0.92,
                    textTransform: 'uppercase',
                    wordBreak: 'normal',
                    overflowWrap: 'break-word',
                    hyphens: 'none',
                    letterSpacing: '-0.01em',
                  }}>
                    {title || 'YOUR EVENT'}
                  </div>

                  {/* Divider — category color */}
                  {(() => {
                    const ecat = detectedCategory ? CATEGORY_META[detectedCategory] : null
                    const divCol = ecat ? ecat.color : '#00E5FF'
                    return (
                      <>
                        <div className="flex items-center gap-3 mt-5 mb-5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: divCol }} />
                          <div className="flex-1 h-px" style={{ backgroundColor: `${divCol}55` }} />
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: divCol }} />
                        </div>

                        {/* Date + venue block */}
                        <div className="flex items-start gap-5">
                          <div className="flex-shrink-0 border-2 px-4 py-3 flex flex-col items-center min-w-[72px]" style={{ borderColor: divCol }}>
                            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: divCol }} className="text-[10px] font-bold uppercase">{dateMonth || 'OCT'}</span>
                            <span style={{ fontFamily: 'var(--font-syne)', color: '#FFFFFF', fontWeight: 900 }} className="text-[28px] leading-none">{dateDay || '24'}</span>
                            {timeDisplay && <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.5)' }} className="text-[9px] mt-1">{timeDisplay}</span>}
                          </div>
                          <div className="flex flex-col justify-center py-1">
                            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: `${divCol}BB` }} className="text-[9px] uppercase tracking-widest mb-1">VENUE</div>
                            <div style={{ fontFamily: 'var(--font-dm-sans)', color: '#FFFFFF', fontWeight: 700 }} className="text-[18px] leading-tight">{activeVenueName || 'TO BE ANNOUNCED'}</div>
                            {activeVenueAddress && activeVenueAddress !== city && (
                              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.35)' }} className="text-[10px] mt-1 uppercase">{activeVenueAddress}</div>
                            )}
                          </div>
                        </div>

                        {/* Price row */}
                        <div className="mt-5 flex items-center gap-4">
                          <div className="flex items-center gap-2 px-4 py-2"
                               style={{ backgroundColor: `${divCol}12`, border: '1px solid', borderColor: `${divCol}40` }}>
                            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: divCol, fontWeight: 700 }} className="text-[18px]">{priceLabel}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.3)' }} className="text-[12px]">// LIMITLESS</div>
                        </div>
                      </>
                    )
                  })()}

                  {/* Bottom decorative row */}
                  <div className="mt-auto pt-6 flex items-center gap-3">
                    {[0,1,2,3,4,5,6,7].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i < 3 ? '#FF2D55' : i < 6 ? 'rgba(255,45,85,0.2)' : 'transparent', border: i >= 6 ? '1px solid rgba(255,45,85,0.15)' : 'none' }} />
                    ))}
                    <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    {detectedCategory ? (
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: CATEGORY_META[detectedCategory].color, border: `1px solid ${CATEGORY_META[detectedCategory].color}66`, padding: '1px 6px', fontSize: 8, letterSpacing: '0.15em' }}>
                        {CATEGORY_META[detectedCategory].label}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.2)' }} className="text-[9px] uppercase tracking-widest">WIMC · 2024</span>
                    )}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="h-[6px]" style={{ background: 'linear-gradient(90deg, #FF2D55, #FF6B35, #00E5FF)' }} />
              </div>
            )}

            {/* ═══════════════════════════════════════════
                UPLOAD POSTER — custom image with category overlay
            ═══════════════════════════════════════════ */}
            {posterStyle === 'upload' && (() => {
              const cat = detectedCategory ? CATEGORY_META[detectedCategory] : null
              const accent = cat ? cat.color : '#E8705A'
              return (
                <div className="w-full max-w-[500px] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col"
                     style={{ minHeight: 520, backgroundColor: '#0D0B0A', cursor: !uploadedPosterUrl ? 'pointer' : 'default' }}
                     onClick={!uploadedPosterUrl ? () => uploadInputRef.current?.click() : undefined}>

                  {/* Background image */}
                  {uploadedPosterUrl ? (
                    <img src={uploadedPosterUrl} alt="uploaded poster" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 border-2 border-dashed border-white/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[36px] text-white/20">upload_file</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.3)', fontSize: 10 }} className="uppercase tracking-widest text-center">
                        Click to upload<br />your poster image
                      </div>
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>JPEG · PNG · WEBP · MAX 5MB</div>
                    </div>
                  )}

                  {/* Dark gradient scrim at bottom */}
                  {uploadedPosterUrl && (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 35%, transparent 60%)' }} />
                  )}

                  {/* Top-left WIMC badge */}
                  <div className="absolute top-3 left-4 z-10 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.5)', fontSize: 8 }} className="uppercase tracking-widest">WIMC</span>
                  </div>

                  {/* Change image button (when image uploaded) */}
                  {uploadedPosterUrl && (
                    <button onClick={() => uploadInputRef.current?.click()}
                            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 bg-black/60 hover:bg-black/80 transition-colors"
                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                      <span className="material-symbols-outlined text-[12px] text-white/70">edit</span>
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.7)', fontSize: 8 }} className="uppercase">CHANGE</span>
                    </button>
                  )}

                  {/* Bottom overlay — grows from bottom */}
                  <div className="absolute bottom-0 left-0 right-0 z-10">
                    {/* Category stripe — always full-width with category color */}
                    <div className="flex items-center gap-3 px-5 py-2"
                         style={{ backgroundColor: accent }}>
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: '#000', fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', opacity: 0.85 }}>
                        {cat ? cat.label : 'CULTURE'}
                      </span>
                      <div className="flex-1 h-px bg-black/20" />
                      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(0,0,0,0.55)', fontSize: 9 }}>WIMC · 2024</span>
                    </div>

                    {/* Event info block */}
                    <div className="px-5 pt-3 pb-4" style={{ backgroundColor: 'rgba(0,0,0,0.82)', borderLeft: `4px solid ${accent}` }}>
                      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.4)', fontSize: 8 }} className="uppercase tracking-widest mb-1.5">
                        WHEN IN MY CITY PRESENTS
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-syne)',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: Math.min(26, getPosterFontSize(title, 390, 0.75, 26)),
                        lineHeight: 1.05,
                        textTransform: 'uppercase',
                        wordBreak: 'normal',
                        overflowWrap: 'break-word',
                        hyphens: 'none',
                      }}>
                        {title || 'YOUR EVENT'}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: accent, fontSize: 11, fontWeight: 700 }}>
                          {dateDay || '24'} {dateMonth || 'OCT'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>
                          {activeVenueName || 'TBA'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: accent, fontSize: 10, fontWeight: 700 }}>
                          {priceLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Tips card */}
            <div className="mt-12 bg-[#FAF7F0] border-2 border-[#1A2744] p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8705A]" />
              <div className="absolute -left-[10px] top-[50%] w-5 h-5 rounded-full bg-[#F5ECD7] border-r-2 border-[#1A2744]" />
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[#E8705A] text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[10px] uppercase tracking-widest mb-0.5">PRO TIPS</div>
                  <div style={{ fontFamily: 'var(--font-dm-sans)' }} className="text-[#1A2744] text-[18px] font-bold">TIPS FOR A GREAT EVENT</div>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  'Choose a punchy title — under 40 chars works best on mobile feeds',
                  'Late-night events (after 21:00) see 30% higher Gen Z engagement',
                  'You can add tickets, lineup, and description after publishing',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-4 items-start hover:translate-x-1 transition-transform">
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)' }} className="text-[#E8705A] text-[12px] mt-1 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p style={{ fontFamily: 'var(--font-dm-sans)' }} className="text-[#1A2744]/80 text-[14px] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-8" />
          </div>
        </div>

        {/* ── Marquee ── */}
        <div className="fixed bottom-0 right-0 w-[60%] h-8 bg-[#1A2744] border-t-2 border-black z-50 overflow-hidden flex items-center">
          <div className="flex animate-marquee-create whitespace-nowrap">
            {[1, 2].map(n => (
              <span key={n} style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'rgba(255,255,255,0.4)' }} className="text-[9px] uppercase mr-8">
                WIMC CULTURE PLATFORM — CREATE EVENT MODE — DRAFT SAVED — PREVIEW SYNCED — BRUTALIST AESTHETIC —&nbsp;
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
