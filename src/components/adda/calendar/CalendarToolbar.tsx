'use client'

import type { ToolbarProps, View } from 'react-big-calendar'
import type { CalendarEvent } from '@/lib/adda/mock/calendarEvents'

interface Props extends ToolbarProps<CalendarEvent, object> {
  onBlockTime: () => void
  onSyncGoogle: () => void
}

const VIEW_LABELS: Record<string, string> = {
  month: 'Month',
  week:  'Week',
  day:   'Day',
}

export default function CalendarToolbar({ label, view, views, onNavigate, onView, onBlockTime, onSyncGoogle }: Props) {
  const viewList = Array.isArray(views) ? views : (Object.keys(views) as View[])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--adda-border-subtle)',
      background: 'var(--adda-bg-surface)',
      flexWrap: 'wrap',
      gap: 10,
      flexShrink: 0,
    }}>
      {/* Left: nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onNavigate('TODAY')} style={ghostBtn}>Today</button>
        <button onClick={() => onNavigate('PREV')} style={iconBtn} aria-label="Previous">‹</button>
        <button onClick={() => onNavigate('NEXT')} style={iconBtn} aria-label="Next">›</button>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--adda-text-primary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          minWidth: 140,
          marginLeft: 4,
        }}>
          {label}
        </span>
      </div>

      {/* Center: view toggle */}
      <div style={{
        display: 'flex',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--adda-border-default)',
      }}>
        {viewList.map((v) => (
          <button
            key={v}
            onClick={() => onView(v as View)}
            style={{
              padding: '6px 14px',
              background: view === v ? 'var(--adda-amber)' : 'transparent',
              color: view === v ? '#000' : 'var(--adda-text-secondary)',
              border: 'none',
              borderRight: v !== viewList[viewList.length - 1] ? '1px solid var(--adda-border-default)' : 'none',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 12.5,
              fontWeight: view === v ? 700 : 500,
              cursor: 'pointer',
              transition: 'background 120ms ease, color 120ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {VIEW_LABELS[v] ?? v}
          </button>
        ))}
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBlockTime} style={blockTimeBtn}>
          + Block Time
        </button>
        <button onClick={onSyncGoogle} style={syncBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.478 22 2 17.522 2 12S6.478 2 12 2s10 4.478 10 10-4.478 10-10 10z"/>
            <path d="M17.294 7.291l-9.002 9 1.414 1.414 9.002-9-1.414-1.414zM8.292 8.705l-1.414 1.414 5.005 5.005 1.414-1.414-5.005-5.005z" opacity=".4"/>
          </svg>
          Sync Google Cal
        </button>
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--adda-border-default)',
  background: 'transparent',
  color: 'var(--adda-text-secondary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid var(--adda-border-default)',
  background: 'transparent',
  color: 'var(--adda-text-secondary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 18,
  fontWeight: 400,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  lineHeight: 1,
  padding: 0,
}

const blockTimeBtn: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 6,
  border: '1px solid var(--adda-border-default)',
  background: 'var(--adda-bg-elevated)',
  color: 'var(--adda-text-secondary)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const syncBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  borderRadius: 6,
  border: '1px solid var(--adda-amber-border)',
  background: 'var(--adda-amber-tint)',
  color: 'var(--adda-amber)',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
