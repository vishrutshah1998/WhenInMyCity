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
}

export function CountryCodeSelect({ value, onChange, className }: CountryCodeSelectProps) {
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
