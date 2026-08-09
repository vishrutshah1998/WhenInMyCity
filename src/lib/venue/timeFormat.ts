// ---------------------------------------------------------------------------
// Time formatting helpers for venue_availability/maker_venue_proposals'
// start_time/end_time columns. App boundary convention is 'HH:MM' (matches
// PricingRule.time_from/to and BlockTimeModal's <input type="time">);
// Postgres `time` columns round-trip through supabase-js as 'HH:MM:SS'.
// ---------------------------------------------------------------------------

/** 'HH:MM:SS' (or 'HH:MM') from the DB -> 'HH:MM' for app/UI use. */
export function fromPgTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

export function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** e.g. formatTimeRange('09:00', '13:00') -> '9:00 AM – 1:00 PM' */
export function formatTimeRange(startTime: string | null | undefined, endTime: string | null | undefined): string {
  const start = fromPgTime(startTime)
  const end = fromPgTime(endTime)
  if (!start || !end) return ''
  return `${to12Hour(start)} – ${to12Hour(end)}`
}

/** Compact form for narrow UI, e.g. '9am', '6:30pm'. */
export function formatShortTime(t: string | null | undefined): string {
  const hhmm = fromPgTime(t)
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`
}

/** Duration in hours between two 'HH:MM' strings. */
export function hoursBetween(startTime: string, endTime: string): number {
  const [fromH, fromM] = startTime.split(':').map(Number)
  const [toH, toM] = endTime.split(':').map(Number)
  return (toH * 60 + toM - (fromH * 60 + fromM)) / 60
}

/** e.g. formatDuration('18:00', '22:30') -> '4h 30m'. Empty string if end <= start. */
export function formatDuration(startTime: string, endTime: string): string {
  const totalMinutes = Math.round(hoursBetween(startTime, endTime) * 60)
  if (totalMinutes <= 0) return ''
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
