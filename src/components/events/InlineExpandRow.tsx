'use client'

import { useState } from 'react'

interface InlineExpandRowProps {
  icon: string
  label: string
  subtitle?: string
  rightContent?: React.ReactNode
  /** children receives a collapse() callback */
  children: (collapse: () => void) => React.ReactNode
  defaultExpanded?: boolean
  /** When true, removes border-radius (for use inside a grouped container) */
  grouped?: boolean
  className?: string
}

export function InlineExpandRow({
  icon,
  label,
  subtitle,
  rightContent,
  children,
  defaultExpanded = false,
  grouped = false,
  className = '',
}: InlineExpandRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const roundedCls = grouped ? '' : 'rounded-xl'

  return (
    <div className={`${roundedCls} overflow-hidden bg-surface-container-lowest border border-white/5 ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="material-symbols-outlined text-xl shrink-0 text-on-surface-variant">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-on-surface font-semibold leading-tight">{label}</span>
          {subtitle && !expanded && (
            <span className="block text-xs text-on-surface-variant mt-0.5 leading-tight truncate">{subtitle}</span>
          )}
        </span>
        {rightContent && (
          <span className="flex items-center gap-1.5 text-on-surface-variant text-sm shrink-0">
            {rightContent}
          </span>
        )}
        <span
          className={`material-symbols-outlined text-base shrink-0 text-on-surface-variant transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      <div
        style={{
          maxHeight: expanded ? '600px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.2s ease-in-out',
        }}
      >
        <div className="border-t border-outline-variant/20">
          {children(() => setExpanded(false))}
        </div>
      </div>
    </div>
  )
}

interface StaticRowProps {
  icon: string
  label: string
  rightContent: React.ReactNode
  note?: React.ReactNode
  grouped?: boolean
  className?: string
}

export function StaticRow({ icon, label, rightContent, note, grouped = false, className = '' }: StaticRowProps) {
  const roundedCls = grouped ? '' : 'rounded-xl'
  return (
    <div className={`${roundedCls} bg-surface-container-lowest border border-white/5 ${className}`}>
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="material-symbols-outlined text-xl shrink-0 text-on-surface-variant">{icon}</span>
        <span className="flex-1 text-sm text-on-surface font-semibold">{label}</span>
        {rightContent}
      </div>
      {note && <div>{note}</div>}
    </div>
  )
}

interface PillToggleProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}

export function PillToggle({ options, value, onChange }: PillToggleProps) {
  return (
    <div className="flex p-1 bg-surface-container-high rounded-full gap-1 w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
            value === opt.value
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
        checked ? 'bg-primary' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
