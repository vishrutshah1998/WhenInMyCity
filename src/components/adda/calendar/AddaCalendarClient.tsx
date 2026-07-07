'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import type { View } from 'react-big-calendar'
import CalendarToolbar from './CalendarToolbar'
import BlockTimeModal, { type BlockTimePayload } from './BlockTimeModal'
import ResizeConfirmModal from './ResizeConfirmModal'
import GoogleSyncDrawer from './GoogleSyncDrawer'
import MobileCalendarView from './MobileCalendarView'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  MOCK_CALENDAR_EVENTS,
  getDayRevenueSummary,
  type CalendarEvent,
} from '@/lib/adda/mock/calendarEvents'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar)

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

    case 'tentative':
      return {
        style: {
          ...base,
          background: 'transparent',
          border: '2px dashed #f59e0b',
          color: '#d97706',
          fontStyle: 'italic',
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
    case 'tentative':  return '?'
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
// Day revenue summary (Day view header)
// ---------------------------------------------------------------------------

function DayRevenueSummary({ date }: { date: Date }) {
  const { confirmedPaise, pendingPaise } = getDayRevenueSummary(date)
  if (confirmedPaise === 0 && pendingPaise === 0) return null

  function fmt(p: number) { return '₹' + Math.round(p / 100).toLocaleString('en-IN') }

  return (
    <div style={{
      padding: '6px 16px',
      background: 'var(--venue-bg-elevated)',
      borderBottom: '1px solid var(--venue-border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      fontSize: 12,
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      color: 'var(--venue-text-muted)',
      flexShrink: 0,
    }}>
      <span>Today:</span>
      {confirmedPaise > 0 && (
        <span style={{ fontWeight: 600, color: 'var(--venue-amber)' }}>
          {fmt(confirmedPaise)} confirmed
        </span>
      )}
      {pendingPaise > 0 && (
        <span style={{ color: '#d97706' }}>
          · {fmt(pendingPaise)} pending
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pending dot for month cells
// ---------------------------------------------------------------------------

function MonthDateHeader({ date, label }: { date: Date; label: string }) {
  const hasPending = MOCK_CALENDAR_EVENTS.some(ev => {
    const sameDay = ev.start.toDateString() === date.toDateString()
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
            background: 'rgba(245,158,11,0.06)',
            border: '1px dashed rgba(245,158,11,0.3)',
            borderRadius: 3,
            color: 'rgba(245,158,11,0.6)',
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
  addaId: string
  googleCalendarConnected: boolean
}

export default function AddaCalendarClient({ venueName, addaId, googleCalendarConnected }: Props) {
  const isMobile = useIsMobile()
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_CALENDAR_EVENTS)
  const [view, setView] = useState<View>(Views.WEEK)
  const [date, setDate] = useState(new Date())
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockInitialDate, setBlockInitialDate] = useState<string | undefined>()
  const [blockInitialStart, setBlockInitialStart] = useState<string | undefined>()
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false)
  const [resizePending, setResizePending] = useState<{ event: CalendarEvent; newEnd: Date } | null>(null)

  // ── Dragging/resizing ────────────────────────────────────────────────────

  const handleEventResize = useCallback(({ event, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    if (event.isLocked || event.status !== 'confirmed') return
    setResizePending({ event, newEnd: new Date(end) })
  }, [])

  function confirmResize() {
    if (!resizePending) return
    setEvents(prev => prev.map(ev =>
      ev.id === resizePending.event.id ? { ...ev, end: resizePending.newEnd } : ev
    ))
    setResizePending(null)
  }

  const handleEventDrop = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    if (event.isLocked) return
    setEvents(prev => prev.map(ev =>
      ev.id === event.id ? { ...ev, start: new Date(start), end: new Date(end) } : ev
    ))
  }, [])

  // ── Block time ───────────────────────────────────────────────────────────

  function handleBlockFromSlot(slotDate: Date) {
    const dateStr = slotDate.toISOString().slice(0, 10)
    const hh = String(slotDate.getHours()).padStart(2, '0')
    const mm = String(slotDate.getMinutes()).padStart(2, '0')
    setBlockInitialDate(dateStr)
    setBlockInitialStart(`${hh}:${mm}`)
    setBlockModalOpen(true)
  }

  function handleBlockConfirm(payload: BlockTimePayload) {
    const start = new Date(`${payload.date}T${payload.startTime}`)
    const end   = new Date(`${payload.date}T${payload.endTime}`)
    const newEvent: CalendarEvent = {
      id: `blk-${Date.now()}`,
      title: `Blocked · ${payload.reason}`,
      start,
      end,
      status: 'blocked',
      isLocked: true,
    }
    setEvents(prev => [...prev, newEvent])
  }

  // ── Slot select (week/day double-click → block modal) ────────────────────

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    handleBlockFromSlot(start)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slot wrapper components (memoized to avoid re-render spam) ───────────

  const components = useMemo(() => {
    // Wrap with closures so component signatures match react-big-calendar's expected types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ToolbarWrapper = (props: any) => (
      <CalendarToolbar
        {...props}
        onBlockTime={() => setBlockModalOpen(true)}
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
      month: { dateHeader: MonthDateHeader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timeSlotWrapper: SlotWrapperBound as any,
    }
  }, [handleBlockFromSlot]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mobile view — rendered below 768px, desktop calendar untouched above ──

  if (isMobile) {
    return (
      <div className="venue-theme" style={{ height: '100%' }}>
        <MobileCalendarView
          events={events}
          onBlockTime={() => {
            setBlockInitialDate(undefined)
            setBlockInitialStart(undefined)
            setBlockModalOpen(true)
          }}
        />
        <BlockTimeModal
          open={blockModalOpen}
          initialDate={blockInitialDate}
          initialStart={blockInitialStart}
          onClose={() => {
            setBlockModalOpen(false)
            setBlockInitialDate(undefined)
            setBlockInitialStart(undefined)
          }}
          onConfirm={handleBlockConfirm}
        />
      </div>
    )
  }

  const isDay = view === Views.DAY

  return (
    <div className="venue-theme" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--venue-bg-base)',
      color: 'var(--venue-text-primary)',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      {/* Day view revenue summary */}
      {isDay && <DayRevenueSummary date={date} />}

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
          onSelectSlot={handleSelectSlot}
          selectable
          resizable
          resizableAccessor={(event: CalendarEvent) =>
            event.status === 'confirmed' && !event.isLocked
          }
          draggableAccessor={(event: CalendarEvent) => !event.isLocked}
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
        onClose={() => { setBlockModalOpen(false); setBlockInitialDate(undefined); setBlockInitialStart(undefined) }}
        onConfirm={handleBlockConfirm}
      />

      <ResizeConfirmModal
        event={resizePending?.event ?? null}
        newEnd={resizePending?.newEnd ?? null}
        onConfirm={confirmResize}
        onCancel={() => setResizePending(null)}
      />

      <GoogleSyncDrawer
        open={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
        addaId={addaId}
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
          background: rgba(245,158,11,0.04) !important;
        }
        .rbc-header.rbc-today {
          color: var(--venue-amber) !important;
          background: rgba(245,158,11,0.08) !important;
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
          color: var(--venue-amber) !important;
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
          border-radius: 10px;
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
          outline: 2px solid var(--venue-amber) !important;
          outline-offset: 1px;
        }

        /* Background events */
        .rbc-background-event {
          opacity: 0.55;
          pointer-events: none;
        }

        /* Selection highlight when dragging to create */
        .rbc-slot-selection {
          background: rgba(245,158,11,0.12) !important;
          border: 1px dashed var(--venue-amber-border) !important;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
