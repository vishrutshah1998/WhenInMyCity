'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangePreset = '1d' | '7d' | '30d' | '90d' | 'ytd'

export const PRESETS: { key: RangePreset; label: string }[] = [
  { key: '1d',  label: 'Today' },
  { key: '7d',  label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'ytd', label: 'This year' },
]

// ---------------------------------------------------------------------------
// DateRangeBar
// ---------------------------------------------------------------------------

interface Props {
  currentRange: RangePreset
  compareEnabled: boolean
}

export default function DateRangeBar({ currentRange, compareEnabled }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const toggleCompare = () => update('compare', compareEnabled ? 'false' : 'true')
  const setRange      = (r: RangePreset) => update('range', r)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      {/* Preset pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {PRESETS.map(({ key, label }) => {
          const active = currentRange === key
          return (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 500,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                cursor: 'pointer',
                border: active
                  ? '1px solid var(--adda-amber-border)'
                  : '1px solid var(--adda-border-default)',
                background: active ? 'var(--adda-amber-tint)' : 'transparent',
                color: active ? 'var(--adda-amber)' : 'var(--adda-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Compare toggle */}
      <button
        onClick={toggleCompare}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 12px',
          borderRadius: 6,
          fontSize: 12.5,
          fontWeight: 500,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          cursor: 'pointer',
          border: compareEnabled
            ? '1px solid var(--adda-amber-border)'
            : '1px solid var(--adda-border-default)',
          background: compareEnabled ? 'var(--adda-amber-tint)' : 'transparent',
          color: compareEnabled ? 'var(--adda-amber)' : 'var(--adda-text-secondary)',
          transition: 'all 0.15s',
        }}
      >
        {/* Toggle track */}
        <span
          style={{
            display: 'inline-block',
            width: 28,
            height: 15,
            borderRadius: 99,
            background: compareEnabled ? 'var(--adda-amber)' : 'var(--adda-bg-hover)',
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: compareEnabled ? 14 : 2,
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
            }}
          />
        </span>
        Compare to previous period
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// URL param helpers (used by the page + client)
// ---------------------------------------------------------------------------

export function rangeFromParams(params: URLSearchParams): RangePreset {
  const r = params.get('range')
  if (r && PRESETS.some(p => p.key === r)) return r as RangePreset
  return '30d'
}

export function compareFromParams(params: URLSearchParams): boolean {
  return params.get('compare') === 'true'
}

/** Compute [from, to] Date range from a preset key */
export function presetToDates(preset: RangePreset): { from: Date; to: Date } {
  const to  = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(to)

  switch (preset) {
    case '1d':
      from.setHours(0, 0, 0, 0)
      break
    case '7d':
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)
      break
    case '30d':
      from.setDate(from.getDate() - 29)
      from.setHours(0, 0, 0, 0)
      break
    case '90d':
      from.setDate(from.getDate() - 89)
      from.setHours(0, 0, 0, 0)
      break
    case 'ytd':
      from.setMonth(0, 1)
      from.setHours(0, 0, 0, 0)
      break
  }

  return { from, to }
}

/** Compute the equivalent previous period for comparison */
export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const span  = to.getTime() - from.getTime()
  const pTo   = new Date(from.getTime() - 1)
  const pFrom = new Date(pTo.getTime() - span)
  return { from: pFrom, to: pTo }
}
