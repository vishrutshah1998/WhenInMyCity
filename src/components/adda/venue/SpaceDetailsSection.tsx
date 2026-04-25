'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { VenueFormState } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ADDA_TYPES = [
  { slug: 'cafe',           label: 'Café',            icon: 'local_cafe' },
  { slug: 'coworking',      label: 'Coworking',       icon: 'laptop_mac' },
  { slug: 'gallery',        label: 'Gallery',         icon: 'museum' },
  { slug: 'community_hall', label: 'Community Hall',  icon: 'account_balance' },
  { slug: 'rooftop',        label: 'Rooftop',         icon: 'roofing' },
  { slug: 'garden',         label: 'Garden',          icon: 'park' },
  { slug: 'studio',         label: 'Studio',          icon: 'mic' },
  { slug: 'library',        label: 'Library',         icon: 'library_books' },
  { slug: 'restaurant',     label: 'Restaurant',      icon: 'restaurant' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--adda-text-muted)',
      fontFamily: 'var(--font-inter), sans-serif',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, disabled, multiline, rows,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled: boolean
  multiline?: boolean
  rows?: number
}) {
  const sharedStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    background: disabled ? 'transparent' : 'var(--adda-bg-elevated)',
    border: disabled ? '1px solid transparent' : '1px solid var(--adda-border-default)',
    color: 'var(--adda-text-primary)',
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: 13,
    outline: 'none',
    resize: multiline ? 'vertical' : undefined,
    caretColor: 'var(--adda-amber)',
    boxSizing: 'border-box' as const,
    transition: 'border-color 150ms',
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows ?? 4}
        style={sharedStyle}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--adda-amber)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--adda-border-default)' }}
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={sharedStyle}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--adda-amber)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--adda-border-default)' }}
    />
  )
}

function NumberInput({
  value, onChange, placeholder, disabled,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  disabled: boolean
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
      placeholder={placeholder}
      disabled={disabled}
      min={1}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        background: disabled ? 'transparent' : 'var(--adda-bg-elevated)',
        border: disabled ? '1px solid transparent' : '1px solid var(--adda-border-default)',
        color: 'var(--adda-text-primary)',
        fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 13,
        outline: 'none', caretColor: 'var(--adda-amber)',
        boxSizing: 'border-box',
        transition: 'border-color 150ms',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--adda-amber)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--adda-border-default)' }}
    />
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  state: Pick<VenueFormState, 'name' | 'adda_type' | 'description' | 'capacity_min' | 'capacity_max' | 'parking_details' | 'accessibility_notes'>
  onChange: <K extends 'name' | 'adda_type' | 'description' | 'capacity_min' | 'capacity_max' | 'parking_details' | 'accessibility_notes'>(
    key: K, value: Props['state'][K]
  ) => void
  isEditing: boolean
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function SpaceDetailsSection({ state, onChange, isEditing }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  function toggleType(slug: string) {
    const current = state.adda_type
    const next = current.includes(slug)
      ? current.filter(t => t !== slug)
      : [...current, slug]
    onChange('adda_type', next)
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--adda-border-subtle)',
      paddingBottom: 24,
      marginBottom: 24,
    }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--adda-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--adda-amber)' }}>
            apartment
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 14 }}>
            Space Details
          </span>
        </div>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18, color: 'var(--adda-text-muted)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Venue name */}
              <div>
                <FieldLabel>Venue Name</FieldLabel>
                <TextInput
                  value={state.name}
                  onChange={v => onChange('name', v)}
                  placeholder="e.g. The Roastery"
                  disabled={!isEditing}
                />
              </div>

              {/* Venue type — chip selector */}
              <div>
                <FieldLabel>Venue Type</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ADDA_TYPES.map(t => {
                    const on = state.adda_type.includes(t.slug)
                    return (
                      <button
                        key={t.slug}
                        onClick={() => isEditing && toggleType(t.slug)}
                        style={{
                          height: 34, display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '0 12px', borderRadius: 6,
                          border: on ? '1.5px solid var(--adda-amber-border)' : '1px solid var(--adda-border-default)',
                          background: on ? 'var(--adda-amber-tint)' : 'var(--adda-bg-elevated)',
                          color: on ? 'var(--adda-amber)' : 'var(--adda-text-secondary)',
                          fontSize: 12, fontWeight: on ? 500 : 400,
                          fontFamily: 'var(--font-inter), sans-serif',
                          cursor: isEditing ? 'pointer' : 'default',
                          transition: 'all 120ms ease',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Description</FieldLabel>
                <TextInput
                  value={state.description}
                  onChange={v => onChange('description', v)}
                  placeholder="Tell makers what makes your space special — atmosphere, history, what events thrive here…"
                  disabled={!isEditing}
                  multiline
                  rows={5}
                />
              </div>

              {/* Capacity — 2 column */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel>Min Capacity</FieldLabel>
                  <NumberInput
                    value={state.capacity_min}
                    onChange={v => onChange('capacity_min', v)}
                    placeholder="10"
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <FieldLabel>Max Capacity</FieldLabel>
                  <NumberInput
                    value={state.capacity_max}
                    onChange={v => onChange('capacity_max', v)}
                    placeholder="120"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Parking details */}
              <div>
                <FieldLabel>Parking Details</FieldLabel>
                <TextInput
                  value={state.parking_details}
                  onChange={v => onChange('parking_details', v)}
                  placeholder="e.g. 20 free spots in the basement, street parking available on weekends"
                  disabled={!isEditing}
                />
              </div>

              {/* Accessibility */}
              <div>
                <FieldLabel>Accessibility Notes</FieldLabel>
                <TextInput
                  value={state.accessibility_notes}
                  onChange={v => onChange('accessibility_notes', v)}
                  placeholder="e.g. Step-free entrance via side door, accessible restroom on ground floor"
                  disabled={!isEditing}
                />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
