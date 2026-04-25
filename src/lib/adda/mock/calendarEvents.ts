import { subMinutes, addMinutes } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'tentative'
  | 'blocked'
  | 'external'
  | 'buffer'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: BookingStatus
  creatorName?: string
  hourlyRate?: number        // paise per hour
  isLocked?: boolean         // prevents resize/drag
  display?: 'background'     // react-big-calendar background event
  bufferFor?: string         // id of the booking this buffer belongs to
  resource?: string
}

export interface VenueConfig {
  bufferBefore: number  // minutes
  bufferAfter: number   // minutes
  hourlyRate: number    // paise
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function d(year: number, month: number, day: number, hour: number, min = 0) {
  return new Date(year, month - 1, day, hour, min)
}

const now = new Date()
const Y = now.getFullYear()
const M = now.getMonth() + 1  // 1-based

// ---------------------------------------------------------------------------
// Venue config
// TODO: replace with actual venue settings from Supabase adda_profiles
// ---------------------------------------------------------------------------

export const MOCK_VENUE_CONFIG: VenueConfig = {
  bufferBefore: 30,
  bufferAfter:  45,
  hourlyRate:   150000,   // ₹1,500/hr in paise
}

// ---------------------------------------------------------------------------
// Raw bookings — no buffers yet
// TODO: replace with Supabase query:
//   supabase
//     .from('venue_bookings')
//     .select('*')
//     .eq('venue_id', currentVenueId)
//     .gte('start_time', startOfRange.toISOString())
//     .lte('end_time', endOfRange.toISOString())
// ---------------------------------------------------------------------------

const RAW_BOOKINGS: CalendarEvent[] = [
  // ── Confirmed ────────────────────────────────────────────────────────────
  {
    id: 'bk-01',
    title: 'Arjun Singh · 3h',
    start: d(Y, M,  3, 10,  0),
    end:   d(Y, M,  3, 13,  0),
    status: 'confirmed',
    creatorName: 'Arjun Singh',
    hourlyRate: 150000,
  },
  {
    id: 'bk-02',
    title: 'Meera Nair · 4h',
    start: d(Y, M,  7, 14,  0),
    end:   d(Y, M,  7, 18,  0),
    status: 'confirmed',
    creatorName: 'Meera Nair',
    hourlyRate: 150000,
  },
  {
    id: 'bk-03',
    title: 'Kabir Sharma · 2h',
    start: d(Y, M, 12, 11,  0),
    end:   d(Y, M, 12, 13,  0),
    status: 'confirmed',
    creatorName: 'Kabir Sharma',
    hourlyRate: 150000,
    isLocked: true,  // payment received — cannot resize
  },
  {
    id: 'bk-04',
    title: 'Priya Mehta · 3h',
    start: d(Y, M, 18, 16,  0),
    end:   d(Y, M, 18, 19,  0),
    status: 'confirmed',
    creatorName: 'Priya Mehta',
    hourlyRate: 150000,
  },
  {
    id: 'bk-05',
    title: 'Rahul Verma · 5h',
    start: d(Y, M, 22, 10,  0),
    end:   d(Y, M, 22, 15,  0),
    status: 'confirmed',
    creatorName: 'Rahul Verma',
    hourlyRate: 150000,
  },

  // ── Pending ───────────────────────────────────────────────────────────────
  {
    id: 'bk-06',
    title: 'Pending · Divya Rao',
    start: d(Y, M,  5, 15,  0),
    end:   d(Y, M,  5, 18,  0),
    status: 'pending',
    creatorName: 'Divya Rao',
  },
  {
    id: 'bk-07',
    title: 'Pending · Siddharth K',
    start: d(Y, M, 14, 11,  0),
    end:   d(Y, M, 14, 14,  0),
    status: 'pending',
    creatorName: 'Siddharth K',
  },
  {
    id: 'bk-08',
    title: 'Pending · Ananya Das',
    start: d(Y, M, 25, 17,  0),
    end:   d(Y, M, 25, 20,  0),
    status: 'pending',
    creatorName: 'Ananya Das',
  },

  // ── Tentative / Hold ─────────────────────────────────────────────────────
  {
    id: 'bk-09',
    title: '? Hold · Kiran Bhat',
    start: d(Y, M,  9, 14,  0),
    end:   d(Y, M,  9, 17,  0),
    status: 'tentative',
    creatorName: 'Kiran Bhat',
  },
  {
    id: 'bk-10',
    title: '? Hold · Ayesha Q',
    start: d(Y, M, 20, 10,  0),
    end:   d(Y, M, 20, 13,  0),
    status: 'tentative',
    creatorName: 'Ayesha Q',
  },

  // ── Blocked / Maintenance ─────────────────────────────────────────────────
  {
    id: 'bk-11',
    title: 'Blocked · Deep Clean',
    start: d(Y, M, 16, 8,   0),
    end:   d(Y, M, 16, 12,  0),
    status: 'blocked',
    isLocked: true,
  },
  {
    id: 'bk-12',
    title: 'Blocked · Setup',
    start: d(Y, M, 24, 9,   0),
    end:   d(Y, M, 24, 11,  0),
    status: 'blocked',
    isLocked: true,
  },

  // ── External (Google Calendar synced) ────────────────────────────────────
  {
    id: 'bk-13',
    title: 'Founder meetup (GCal)',
    start: d(Y, M, 10, 18,  0),
    end:   d(Y, M, 10, 21,  0),
    status: 'external',
    isLocked: true,
  },
  {
    id: 'bk-14',
    title: 'Personal block (GCal)',
    start: d(Y, M, 19, 10,  0),
    end:   d(Y, M, 19, 12,  0),
    status: 'external',
    isLocked: true,
  },
  {
    id: 'bk-15',
    title: 'Wedding ceremony (GCal)',
    start: d(Y, M, 27, 11,  0),
    end:   d(Y, M, 27, 22,  0),
    status: 'external',
    isLocked: true,
  },
]

// ---------------------------------------------------------------------------
// Buffer generation — run against confirmed bookings only
// These are synthetic background events that visually communicate prep time.
// ---------------------------------------------------------------------------

function generateBuffers(
  bookings: CalendarEvent[],
  config: VenueConfig,
): CalendarEvent[] {
  const buffers: CalendarEvent[] = []
  for (const bk of bookings) {
    if (bk.status !== 'confirmed') continue

    if (config.bufferBefore > 0) {
      buffers.push({
        id: `buf-before-${bk.id}`,
        title: `Setup ${config.bufferBefore}m`,
        start: subMinutes(bk.start, config.bufferBefore),
        end: bk.start,
        status: 'buffer',
        display: 'background',
        bufferFor: bk.id,
        isLocked: true,
      })
    }

    if (config.bufferAfter > 0) {
      buffers.push({
        id: `buf-after-${bk.id}`,
        title: `Teardown ${config.bufferAfter}m`,
        start: bk.end,
        end: addMinutes(bk.end, config.bufferAfter),
        status: 'buffer',
        display: 'background',
        bufferFor: bk.id,
        isLocked: true,
      })
    }
  }
  return buffers
}

// ---------------------------------------------------------------------------
// Exported events — bookings + synthetic buffers
// ---------------------------------------------------------------------------

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  ...RAW_BOOKINGS,
  ...generateBuffers(RAW_BOOKINGS, MOCK_VENUE_CONFIG),
]

// ---------------------------------------------------------------------------
// Revenue helpers
// ---------------------------------------------------------------------------

export function getDayRevenueSummary(date: Date): { confirmedPaise: number; pendingPaise: number } {
  const dateStr = date.toISOString().slice(0, 10)
  let confirmed = 0
  let pending = 0

  for (const ev of RAW_BOOKINGS) {
    const evDate = ev.start.toISOString().slice(0, 10)
    if (evDate !== dateStr) continue
    if (!ev.hourlyRate) continue
    const hours = (ev.end.getTime() - ev.start.getTime()) / 3_600_000
    const amount = Math.round(ev.hourlyRate * hours)
    if (ev.status === 'confirmed') confirmed += amount
    if (ev.status === 'pending')   pending   += amount
  }

  return { confirmedPaise: confirmed, pendingPaise: pending }
}
