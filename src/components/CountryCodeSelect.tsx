'use client'

import { useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

// Built from libphonenumber-js's metadata + Intl.DisplayNames rather than a
// hand-maintained list, so it can't silently drift out of date.

interface DialCountry {
  iso:      CountryCode
  name:     string
  dialCode: string
  flag:     string
}

function isoToFlagEmoji(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const DIAL_COUNTRIES: DialCountry[] = (() => {
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
  const list = getCountries().map((iso) => ({
    iso,
    name: regionNames.of(iso) ?? iso,
    dialCode: getCountryCallingCode(iso),
    flag: isoToFlagEmoji(iso),
  }))
  // India pinned first (domestic-first product), then alphabetical by name.
  list.sort((a, b) => (a.iso === 'IN' ? -1 : b.iso === 'IN' ? 1 : a.name.localeCompare(b.name)))
  return list
})()

interface CountryCodeSelectProps {
  value: CountryCode
  onChange: (iso: CountryCode) => void
  className?: string
  /** 'select' (default, unchanged) is the original inline <select> — still used
   *  by guest-RSVP checkout. 'sheet' renders a tappable chip that opens a
   *  searchable vaul bottom sheet (India pinned first) — used by /signin. */
  variant?: 'select' | 'sheet'
}

export function CountryCodeSelect({ value, onChange, className, variant = 'select' }: CountryCodeSelectProps) {
  if (variant === 'sheet') {
    return <CountryCodeSheet value={value} onChange={onChange} className={className} />
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CountryCode)}
      className={className ?? 'bg-surface-container-low border-none rounded-xl px-3 py-4 text-on-surface font-semibold shrink-0 focus:outline-none focus:ring-2 focus:ring-outline'}
    >
      {DIAL_COUNTRIES.map((c) => (
        <option key={c.iso} value={c.iso}>{c.flag} {c.name} +{c.dialCode}</option>
      ))}
    </select>
  )
}

function CountryCodeSheet({ value, onChange, className }: Omit<CountryCodeSelectProps, 'variant'>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = DIAL_COUNTRIES.find((c) => c.iso === value) ?? DIAL_COUNTRIES[0]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DIAL_COUNTRIES
    return DIAL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q))
  }, [query])

  function select(iso: CountryCode) {
    onChange(iso)
    setOpen(false)
    setQuery('')
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button type="button" className={className} aria-label="Choose country code">
          <span>{selected.flag}</span>
          <span>+{selected.dialCode}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[101] bg-[#1b1b1f] border-t border-[#57423e] outline-none max-h-[75vh] flex flex-col">
          <Drawer.Title className="sr-only">Choose a country</Drawer.Title>
          <Drawer.Handle style={{ marginTop: 12, marginBottom: 8, background: '#57423e' }} />
          <div className="px-5 pb-3 shrink-0">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full bg-[#131317] border border-[#57423e] rounded-lg px-3 py-2.5 text-[#e5e1e6] text-sm outline-none focus:border-[#ffb4a6]"
            />
          </div>
          <div className="overflow-y-auto pb-6">
            {filtered.map((c) => (
              <button
                key={c.iso}
                type="button"
                onClick={() => select(c.iso)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition-colors"
                style={{ color: c.iso === value ? '#ffb4a6' : '#e5e1e6' }}
              >
                <span style={{ fontSize: 20 }}>{c.flag}</span>
                <span className="flex-1 text-sm">{c.name}</span>
                <span className="text-sm opacity-70">+{c.dialCode}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-5 py-4 text-sm text-[#dec0ba]">No matching country.</p>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
