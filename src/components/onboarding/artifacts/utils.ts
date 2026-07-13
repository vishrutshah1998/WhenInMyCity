// =============================================================================
// WIMC — Reveal artifact utilities: deterministic derivations from real user
// data (no hardcoded/fabricated values). Same seed always produces the same
// visual output for a given user, but different users don't look identical.
// =============================================================================

/** djb2 string hash — deterministic, fast, good-enough distribution for decoration. */
export function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** mulberry32 PRNG — deterministic sequence of [0,1) floats from an integer seed. */
export function mulberry32(seed: number): () => number {
  let t = seed
  return function () {
    t |= 0
    t = (t + 0x6D2B79F5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Derives a 3-letter uppercase city code from a real city name (e.g. "Indore" → "IND"). */
export function cityCode(city?: string | null): string {
  const c = (city || '').replace(/[^a-zA-Z\s]/g, '').trim()
  if (!c) return 'WIM'
  const words = c.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase().padEnd(3, 'X')
  const initialsCode = words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
  if (initialsCode.length >= 3) return initialsCode.slice(0, 3)
  return (initialsCode + words[0].slice(1)).toUpperCase().slice(0, 3).padEnd(3, 'X')
}

/** Initials (1-2 letters) from a display name, for avatar-placeholder fallbacks. */
export function initials(name?: string | null): string {
  const n = (name || '').trim()
  if (!n) return '?'
  const words = n.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Deterministic bar-width sequence (1-4px) for DecorativeBarcode, seeded per user. */
export function barcodeWidths(seed: string, count: number): number[] {
  const rand = mulberry32(hashString(seed))
  return Array.from({ length: count }, () => 1 + Math.floor(rand() * 4))
}

/** Deterministic 5-digit "ticket number" derived from a real account id — not a separate counter. */
export function ticketNumber(id: string): string {
  return String(hashString(id) % 100000).padStart(5, '0')
}

/** "MM.YYYY" formatted from a real signup date. */
export function formatMemberSince(date?: string | Date | null): string {
  const d = date ? new Date(date) : new Date()
  if (isNaN(d.getTime())) return '—'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${mm}.${d.getFullYear()}`
}

/** Cycle of the 5 vibrant palette colors, used by DecorativeBarcode / luggage-tag stripes. */
export const VIBRANT_PALETTE = ['#FF6B35', '#FFC53D', '#1F8A70', '#6B4EFF', '#D8432E'] as const
