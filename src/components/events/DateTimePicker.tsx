'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa']

function getDaysInGrid(year: number, month: number): (number | null)[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  return grid
}

function generateTimeSlots() {
  const slots: { label: string; hours: number; minutes: number }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const period = h < 12 ? 'AM' : 'PM'
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
      const displayM = m.toString().padStart(2, '0')
      slots.push({ label: `${displayH}:${displayM} ${period}`, hours: h, minutes: m })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

// ─── Component ───────────────────────────────────────────────────────────────

interface DateTimePickerProps {
  value: Date | null
  onChange: (date: Date) => void
  minDate: Date
  isOpen: boolean
  onClose: () => void
}

export function DateTimePicker({ value, onChange, minDate, isOpen, onClose }: DateTimePickerProps) {
  const minDateNorm = new Date(minDate)
  minDateNorm.setHours(0, 0, 0, 0)

  const [viewYear,  setViewYear ] = useState(value?.getFullYear()  ?? minDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(value?.getMonth()     ?? minDate.getMonth())

  const selectedTimeRef = useRef<HTMLButtonElement | null>(null)
  const timeListRef     = useRef<HTMLDivElement   | null>(null)

  // Sync view to value when opened
  useEffect(() => {
    if (isOpen && value) {
      setViewYear(value.getFullYear())
      setViewMonth(value.getMonth())
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll time list to selected slot
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        selectedTimeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 60)
    }
  }, [isOpen])

  if (!isOpen) return null

  // ── Calendar helpers ──────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function isDayDisabled(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day)
    d.setHours(0, 0, 0, 0)
    return d < minDateNorm
  }
  function isDaySelected(day: number): boolean {
    if (!value) return false
    return (
      value.getFullYear() === viewYear &&
      value.getMonth()    === viewMonth &&
      value.getDate()     === day
    )
  }
  function isToday(day: number): boolean {
    const now = new Date()
    return (
      now.getFullYear() === viewYear &&
      now.getMonth()    === viewMonth &&
      now.getDate()     === day
    )
  }

  function handleDayClick(day: number) {
    const d = value ? new Date(value) : new Date()
    d.setFullYear(viewYear, viewMonth, day)
    if (!value) d.setHours(18, 0, 0, 0)
    onChange(d)
  }

  // ── Time helpers ──────────────────────────────────────────────────────────
  function isSlotSelected(h: number, m: number): boolean {
    if (!value) return false
    return value.getHours() === h && value.getMinutes() === m
  }

  function handleTimeClick(h: number, m: number) {
    const d = value ? new Date(value) : new Date()
    d.setHours(h, m, 0, 0)
    onChange(d)
  }

  const grid = getDaysInGrid(viewYear, viewMonth)

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Picker card */}
      <div
        className="relative z-10 bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ width: 320, maxHeight: '90dvh' }}
      >
        {/* ── Calendar ── */}
        <div className="p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-white text-sm font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_ABBR.map((d) => (
              <div key={d} className="text-center text-[11px] text-[#555] py-1 font-medium">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {grid.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />
              const disabled = isDayDisabled(day)
              const selected = isDaySelected(day)
              const today    = isToday(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !disabled && handleDayClick(day)}
                  disabled={disabled}
                  className={`
                    w-full aspect-square flex items-center justify-center text-sm rounded-lg
                    transition-colors font-medium
                    ${selected  ? 'bg-[#E8572A] text-white'               : ''}
                    ${!selected && today    ? 'text-[#E8572A] font-bold'  : ''}
                    ${!selected && !today && !disabled ? 'text-white hover:bg-white/10' : ''}
                    ${disabled  ? 'text-[#333] cursor-not-allowed'        : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#2A2A2A] mx-4" />

        {/* ── Time list ── */}
        <div
          ref={timeListRef}
          className="overflow-y-auto"
          style={{ maxHeight: 180 }}
        >
          {TIME_SLOTS.map((slot) => {
            const sel = isSlotSelected(slot.hours, slot.minutes)
            return (
              <button
                key={slot.label}
                ref={sel ? selectedTimeRef : null}
                type="button"
                onClick={() => handleTimeClick(slot.hours, slot.minutes)}
                className={`w-full px-4 text-sm text-left transition-colors ${
                  sel
                    ? 'bg-[#E8572A] text-white font-semibold'
                    : 'text-[#ccc] hover:bg-white/8 hover:text-white'
                }`}
                style={{ height: 40 }}
              >
                {slot.label}
              </button>
            )
          })}
        </div>

        {/* Done button */}
        <div className="p-3 border-t border-[#2A2A2A]">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 bg-white text-black text-sm font-bold rounded-xl hover:bg-[#F0F0F0] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
