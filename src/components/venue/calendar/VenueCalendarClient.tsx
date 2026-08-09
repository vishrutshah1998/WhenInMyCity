'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import { subMinutes, addMinutes, startOfMonth, endOfMonth, addDays, format } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import type { View } from 'react-big-calendar'
import CalendarToolbar from './CalendarToolbar'
import BlockTimeModal, { type BlockTimePayload } from './BlockTimeModal'
import GoogleSyncDrawer from './GoogleSyncDrawer'
import MobileCalendarView from './MobileCalendarView'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  getVenueCalendarEvents,
  blockVenueTime,
  unblockVenueTime,
  moveVenueBlock,
  type CalendarEvent,
  type VenueBufferConfig,
} from '@/app/actions/venue-calendar'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar)

const DEFAULT_BUFFER_CONFIG: VenueBufferConfig = { bufferBeforeMinutes: 30, bufferAfterMinutes: 45 }

// ---------------------------------------------------------------------------
// Buffer generation — synthetic background events around confirmed bookings
// ---------------------------------------------------------------------------

function generateBuffers(events: CalendarEvent[], config: VenueBufferConfig): CalendarEvent[] {
  const buffers: CalendarEvent[] = []
  for (const ev of events) {
    if (ev.status !== 'confirmed') continue

    if (config.bufferBeforeMinutes > 0) {
      buffers.push({
        id: `buf-before-${ev.id}`,
        title: `Setup ${config.bufferBeforeMinutes}m`,
        start: subMinutes(ev.start, config.bufferBeforeMinutes),
        end: ev.start,
        status: 'buffer',
        source: 'block',
        display: 'background',
        bufferFor: ev.id,
        isLocked: true,
      })
    }

    if (config.bufferAfterMinutes > 0) {
      buffers.push({
        id: `buf-after-${ev.id}`,
        title: `Teardown ${config.bufferAfterMinutes}m`,
        start: ev.end,
        end: addMinutes(ev.end, config.bufferAfterMinutes),
        status: 'buffer',
        source: 'block',
        display: 'background',
        bufferFor: ev.id,
        isLocked: true,
      })
    }
  }
  return buffers
}

// ---------------------------------------------------------------------------
// Event style getters
// ---------------------------------------------------------------------------

function getEventStyle(event: CalendarEvent) {
  const base: React.CSSProperties = {
    borderRadius: 5,
    fontSize: 12,
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
    padding: '2px 6px',
    lineHeight: 1.35,
  }

  switch (event.status) {
    case 'confirmed':
      return {
        style: {
          ...base,
          background: '#f59e0b',
          border: '1px solid #f59e0b',
          color: '#000',
          fontWeight: 600,
        },
      }

    case 'pending':
      return {
        style: {
          ...base,
          background: 'repeating-linear-gradient(-45deg, rgba(245,158,11,0.14) 0px, rgba(245,158,11,0.14) 4px, transparent 4px, transparent 8px)',
          backgroundColor: 'rgba(245,158,11,0.08)',
          border: '1.5px dashed #f59e0b',
          color: '#f59e0b',
          fontWeight: 500,
        },
      }

    case 'blocked':
      return {
        style: {
          ...base,
          background: '#27272a',
          border: '1px dotted #52525b',
          color: '#71717a',
        },
      }

    case 'external':
      return {
        style: {
          ...base,
          background: 'rgba(16,185,129,0.2)',
          border: '1px solid rgba(16,185,129,0.4)',
          color: '#10b981',
        },
      }

    case 'buffer':
      return {
        style: {
          background: 'repeating-linear-gradient(45deg, rgba(100,100,100,0.07) 0px, rgba(100,100,100,0.07) 3px, transparent 3px, transparent 6px)',
          border: 'none',
          color: '#71717a',
          fontSize: 10,
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          pointerEvents: 'none' as const,
        },
      }

    default:
      return { style: base }
  }
}

// ---------------------------------------------------------------------------
// Status icon
// ---------------------------------------------------------------------------

function statusIcon(status: CalendarEvent['status']): string {
  switch (status) {
    case 'confirmed':  return '✓'
    case 'pending':    return '⏱'
    case 'blocked':    return '🔒'
    case 'external':   return '●'
    default:           return ''
  }
}

// ---------------------------------------------------------------------------
// Custom event component
// ---------------------------------------------------------------------------

function EventComponent({ event }: { event: CalendarEvent }) {
  const icon = statusIcon(event.status)

  if (event.status === 'buffer') {
    return (
      <span style={{ fontSize: 10, color: '#71717a', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
        {event.title}
      </span>
    )
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
      {icon && (
        <span style={{ fontSize: 10, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.title}
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Slot hover affordance — shown on empty slots in week/day view
// ---------------------------------------------------------------------------

function SlotWrapper({ children, value, resource, onBlockFromSlot }: {
  children: React.ReactNode
  value: Date
  resource?: unknown
  onBlockFromSlot: (date: Date) => void
}) {
  const [hovered, setHovered] = useState(false)
  void resource

  return (
    <div
      style={{ position: 'relative', height: '100%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <button
          onClick={() => onBlockFromSlot(value)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(93,217,208,0.06)',
            border: '1px dashed rgba(93,217,208,0.3)',
            borderRadius: 3,
            color: 'rgba(93,217,208,0.6)',
            fontSize: 16,
            cursor: 'pointer',
            zIndex: 1,
            fontFamily: 'monospace',
          }}
          aria-label="Block this time slot"
        >
          +
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  venueName: string
  venueId: string
  googleCalendarConnected: boolean
}

export default function VenueCalendarClient({ venueName, venueId, googleCalendarConnected }: Props) {
  const isMobile = useIsMobile()
  const [bookings, setBookings] = useState<CalendarEvent[]>([])
  const [bufferConfig, setBufferConfig] = useState<VenueBufferConfig>(DEFAULT_BUFFER_CONFIG)
  const [view, setView] = useState<View>(Views.WEEK)
  const [date, setDate] = useState(new Date())
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockInitialDate, setBlockInitialDate] = useState<string | undefined>()
  const [blockInitialStart, setBlockInitialStart] = useState<string | undefined>()
  const [blockError, setBlockError] = useState<string | null>(null)
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false)

  const events = useMemo(() => [...bookings, ...generateBuffers(bookings, bufferConfig)], [bookings, bufferConfig])

  // ── Fetch real events for a window covering the visible month/week/day ───

  useEffect(() => {
    const rangeStart = format(subMinutes(startOfMonth(date), 7 * 24 * 60), 'yyyy-MM-dd')
    const rangeEnd = format(addDays(endOfMonth(date), 7), 'yyyy-MM-dd')

    let cancelled = false
    getVenueCalendarEvents(venueId, rangeStart, rangeEnd).then((result) => {
      if (cancelled) return
      if (result.error) {
        console.error('[VenueCalendarClient] fetch events', result.error)
        return
      }
      setBookings(result.events.map(ev => ({ ...ev, start: new Date(ev.start), end: new Date(ev.end) })))
      setBufferConfig(result.bufferConfig)
    })

    return () => { cancelled = true }
  }, [venueId, date])

  // ── Dragging/resizing — blocked (venue-owned) events only ────────────────

  const handleEventResize = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    if (event.status !== 'blocked') return
    const newStart = new Date(start)
    const newEnd = new Date(end)
    moveVenueBlock(
      venueId,
      event.id,
      format(newStart, 'yyyy-MM-dd'),
      format(newStart, 'HH:mm'),
      format(newEnd, 'HH:mm'),
    ).then((result) => {
      if (result.error) {
        console.error('[VenueCalendarClient] resize block', result.error)
        return
      }
      setBookings(prev => prev.map(ev => ev.id === event.id ? { ...ev, start: newStart, end: newEnd } : ev))
    })
  }, [venueId])

  const handleEventDrop = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    if (event.status !== 'blocked') return
    const newStart = new Date(start)
    const newEnd = new Date(end)
    moveVenueBlock(
      venueId,
      event.id,
      format(newStart, 'yyyy-MM-dd'),
      format(newStart, 'HH:mm'),
      format(newEnd, 'HH:mm'),
    ).then((result) => {
      if (result.error) {
        console.error('[VenueCalendarClient] move block', result.error)
        return
      }
      setBookings(prev => prev.map(ev => ev.id === event.id ? { ...ev, start: newStart, end: newEnd } : ev))
    })
  }, [venueId])

  // ── Select an existing block to remove it ────────────────────────────────

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.status !== 'blocked') return
    if (!window.confirm(`Remove "${event.title}"?`)) return
    unblockVenueTime(venueId, event.id).then((result) => {
      if (result.error) {
        console.error('[VenueCalendarClient] unblock', result.error)
        return
      }
      setBookings(prev => prev.filter(ev => ev.id !== event.id))
    })
  }, [venueId])

  // ── Block time ───────────────────────────────────────────────────────────

  function handleBlockFromSlot(slotDate: Date) {
    const dateStr = slotDate.toISOString().slice(0, 10)
    const hh = String(slotDate.getHours()).padStart(2, '0')
    const mm = String(slotDate.getMinutes()).padStart(2, '0')
    setBlockError(null)
    setBlockInitialDate(dateStr)
    setBlockInitialStart(`${hh}:${mm}`)
    setBlockModalOpen(true)
  }

  function handleBlockConfirm(payload: BlockTimePayload) {
    setBlockError(null)
    blockVenueTime(venueId, payload).then((result) => {
      if (result.error) {
        setBlockError(result.error)
        return
      }
      const start = new Date(`${payload.date}T${payload.startTime}:00`)
      const end = new Date(`${payload.date}T${payload.endTime}:00`)
      setBookings(prev => [...prev, {
        id: result.id,
        title: `Blocked · ${payload.reason}`,
        start,
        end,
        status: 'blocked',
        source: 'block',
        isLocked: false,
      }])
      setBlockModalOpen(false)
    })
  }

  // ── Slot select (week/day double-click → block modal) ────────────────────

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    handleBlockFromSlot(start)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pending dot for month cells ───────────────────────────────────────────

  const monthDateHeader = useCallback(({ date: cellDate, label }: { date: Date; label: string }) => {
    const hasPending = events.some(ev => {
      const sameDay = ev.start.toDateString() === cellDate.toDateString()
      return sameDay && ev.status === 'pending'
    })

    return (
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {hasPending && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--venue-amber)',
            flexShrink: 0,
          }} />
        )}
      </span>
    )
  }, [events])

  // ── Slot wrapper components (memoized to avoid re-render spam) ───────────

  const components = useMemo(() => {
    // Wrap with closures so component signatures match react-big-calendar's expected types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ToolbarWrapper = (props: any) => (
      <CalendarToolbar
        {...props}
        onBlockTime={() => { setBlockError(null); setBlockModalOpen(true) }}
        onSyncGoogle={() => setSyncDrawerOpen(true)}
      />
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SlotWrapperBound = (props: any) => (
      <SlotWrapper {...props} onBlockFromSlot={handleBlockFromSlot} />
    )
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolbar: ToolbarWrapper as any,
      event: EventComponent,
      month: { dateHeader: monthDateHeader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timeSlotWrapper: SlotWrapperBound as any,
    }
  }, [monthDateHeader]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mobile view — rendered below 768px, desktop calendar untouched above ──

  if (isMobile) {
    return (
      <div className="venue-theme" style={{ height: '100%' }}>
        <MobileCalendarView
          events={events}
          onBlockTime={() => {
            setBlockError(null)
            setBlockInitialDate(undefined)
            setBlockInitialStart(undefined)
            setBlockModalOpen(true)
          }}
        />
        <BlockTimeModal
          open={blockModalOpen}
          initialDate={blockInitialDate}
          initialStart={blockInitialStart}
          serverError={blockError}
          onClose={() => {
            setBlockModalOpen(false)
            setBlockError(null)
            setBlockInitialDate(undefined)
            setBlockInitialStart(undefined)
          }}
          onConfirm={handleBlockConfirm}
        />
      </div>
    )
  }

  return (
    <div className="venue-theme" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--venue-bg-base)',
      color: 'var(--venue-text-primary)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      {/* Calendar */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onEventResize={handleEventResize}
          onEventDrop={handleEventDrop}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          resizable
          resizableAccessor={(event: CalendarEvent) => event.status === 'blocked'}
          draggableAccessor={(event: CalendarEvent) => event.status === 'blocked'}
          backgroundEvents={events.filter(e => e.display === 'background')}
          step={30}
          timeslots={2}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.WEEK}
          components={components}
          eventPropGetter={getEventStyle}
          style={{ height: '100%' }}
          popup
          showMultiDayTimes
          culture="en-IN"
        />
      </div>

      {/* Modals */}
      <BlockTimeModal
        open={blockModalOpen}
        initialDate={blockInitialDate}
        initialStart={blockInitialStart}
        serverError={blockError}
        onClose={() => { setBlockModalOpen(false); setBlockError(null); setBlockInitialDate(undefined); setBlockInitialStart(undefined) }}
        onConfirm={handleBlockConfirm}
      />

      <GoogleSyncDrawer
        open={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
        venueId={venueId}
        initiallyConnected={googleCalendarConnected}
      />

      {/* Calendar CSS overrides — dark theme */}
      <style>{`
        .rbc-calendar {
          background: var(--venue-bg-base);
          color: var(--venue-text-primary);
          font-family: var(--font-inter), system-ui, sans-serif;
          height: 100%;
        }

        /* Header row */
        .rbc-header {
          background: var(--venue-bg-surface);
          border-color: var(--venue-border-subtle) !important;
          color: var(--venue-text-muted);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 8px 6px;
        }

        /* Time gutter */
        .rbc-time-gutter .rbc-timeslot-group {
          border-color: var(--venue-border-subtle);
        }
        .rbc-label {
          color: var(--venue-text-muted);
          font-size: 11px;
          font-family: var(--font-jetbrains-mono), monospace;
        }

        /* Slots */
        .rbc-time-slot {
          border-color: var(--venue-border-subtle) !important;
        }
        .rbc-timeslot-group {
          border-color: var(--venue-border-subtle) !important;
        }
        .rbc-day-slot .rbc-time-slot {
          border-top-color: var(--venue-border-subtle) !important;
        }

        /* Day columns */
        .rbc-day-bg + .rbc-day-bg {
          border-color: var(--venue-border-subtle) !important;
        }
        .rbc-time-content > * + * > * {
          border-color: var(--venue-border-subtle) !important;
        }

        /* Today highlight */
        .rbc-today {
          background: rgba(93,217,208,0.04) !important;
        }
        .rbc-header.rbc-today {
          color: var(--venue-accent) !important;
          background: rgba(93,217,208,0.08) !important;
        }

        /* Current time indicator — red line + dot */
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }
        .rbc-current-time-indicator::before {
          content: '';
          display: block;
          position: absolute;
          left: -4px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef4444;
        }

        /* Month grid */
        .rbc-month-view {
          border-color: var(--venue-border-subtle) !important;
        }
        .rbc-month-row + .rbc-month-row {
          border-color: var(--venue-border-subtle) !important;
        }
        .rbc-day-bg.rbc-off-range-bg {
          background: rgba(0,0,0,0.3) !important;
        }
        .rbc-date-cell {
          color: var(--venue-text-secondary);
          font-size: 12px;
          padding: 4px 6px;
        }
        .rbc-off-range .rbc-date-cell {
          color: var(--venue-text-muted) !important;
        }
        .rbc-show-more {
          color: var(--venue-accent) !important;
          font-size: 11px;
          font-weight: 600;
          background: transparent;
          padding: 1px 4px;
        }

        /* DnD drag preview */
        .rbc-addons-dnd-drag-preview {
          opacity: 0.75;
        }
        .rbc-addons-dnd-resizable-month-event-anchor {
          display: none;
        }
        .rbc-addons-dnd .rbc-addons-dnd-row-body:hover .rbc-addons-dnd-drag-row-anchor {
          opacity: 1;
        }

        /* Resize handle */
        .rbc-addons-dnd .rbc-addons-dnd-resize-ns-anchor:last-child .rbc-addons-dnd-resize-ns-icon {
          border-top: 3px double var(--venue-amber-border);
        }

        /* Scrollbar for time view */
        .rbc-time-content {
          overflow-y: auto;
        }

        /* Off hours dimming */
        .rbc-slots-unavailable {
          background: rgba(0,0,0,0.25);
        }

        /* Popup (month "+X more") */
        .rbc-overlay {
          background: var(--venue-bg-elevated);
          border: 1px solid var(--venue-border-default);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          z-index: 80;
        }
        .rbc-overlay-header {
          border-bottom: 1px solid var(--venue-border-subtle);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--venue-text-secondary);
          font-family: var(--font-inter), system-ui, sans-serif;
        }

        /* Toolbar is handled by our component */
        .rbc-toolbar {
          display: none;
        }

        /* Event inner text */
        .rbc-event-label {
          display: none;
        }
        .rbc-event-content {
          font-size: 12px;
          line-height: 1.3;
        }

        /* Event shape */
        .rbc-event {
          border-radius: 4px !important;
          padding: 2px 5px !important;
          border: none !important;
        }
        .rbc-event:focus {
          outline: 2px solid var(--venue-accent) !important;
          outline-offset: 1px;
        }

        /* Background events */
        .rbc-background-event {
          opacity: 0.55;
          pointer-events: none;
        }

        /* Selection highlight when dragging to create */
        .rbc-slot-selection {
          background: rgba(93,217,208,0.12) !important;
          border: 1px dashed var(--venue-accent-border) !important;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
