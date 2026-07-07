'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { VenueFormState, IncludedItem } from './types'

// ─── Cancellation policy ──────────────────────────────────────────────────────

const POLICIES = [
  {
    id: 'flexible' as const,
    label: 'Flexible',
    icon: 'sentiment_very_satisfied',
    description: 'Maker-friendly, higher booking rate',
    rows: [
      { window: '48h+ before', creator: '100%', venue: '0%' },
      { window: '24–48h before', creator: '50%', venue: '50%' },
      { window: '<24h before', creator: '0%', venue: '100%' },
    ],
  },
  {
    id: 'moderate' as const,
    label: 'Moderate',
    icon: 'sentiment_satisfied',
    description: 'Balanced for both parties',
    rows: [
      { window: '7d+ before', creator: '100%', venue: '0%' },
      { window: '2–7d before', creator: '50%', venue: '50%' },
      { window: '<48h before', creator: '0%', venue: '100%' },
    ],
  },
  {
    id: 'strict' as const,
    label: 'Strict',
    icon: 'sentiment_neutral',
    description: 'Protects your revenue, fewer bookings',
    rows: [
      { window: '30d+ before', creator: '50%', venue: '50%' },
      { window: '<30d before', creator: '0%', venue: '100%' },
    ],
  },
]

function CancellationCard({
  policy,
  selected,
  onSelect,
  isEditing,
}: {
  policy: typeof POLICIES[number]
  selected: boolean
  onSelect: () => void
  isEditing: boolean
}) {
  return (
    <button
      onClick={() => isEditing && onSelect()}
      style={{
        flex: 1, minWidth: 160,
        padding: 16, borderRadius: 10, textAlign: 'left',
        border: selected
          ? '2px solid var(--venue-amber)'
          : '1px solid var(--venue-border-subtle)',
        background: selected ? 'var(--venue-amber-tint)' : 'var(--venue-bg-elevated)',
        cursor: isEditing ? 'pointer' : 'default',
        transition: 'all 140ms ease',
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 18,
          color: selected ? 'var(--venue-amber)' : 'var(--venue-text-muted)',
        }}>
          {policy.icon}
        </span>
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 700, fontSize: 13,
          color: selected ? 'var(--venue-amber)' : 'var(--venue-text-primary)',
        }}>
          {policy.label}
        </span>
        {selected && (
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--venue-amber)', marginLeft: 'auto' }}>
            check_circle
          </span>
        )}
      </div>

      <p style={{
        fontSize: 11, color: 'var(--venue-text-muted)',
        fontFamily: 'var(--font-inter), sans-serif',
        margin: '0 0 12px', lineHeight: 1.4,
      }}>
        {policy.description}
      </p>

      {/* Refund table */}
      <div style={{
        borderRadius: 6,
        border: '1px solid var(--venue-border-subtle)',
        overflow: 'hidden',
        fontSize: 11,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px',
          padding: '4px 8px',
          background: 'var(--venue-bg-overlay)',
          color: 'var(--venue-text-muted)',
          borderBottom: '1px solid var(--venue-border-subtle)',
        }}>
          <span>When</span>
          <span style={{ textAlign: 'right' }}>Creator</span>
          <span style={{ textAlign: 'right' }}>You</span>
        </div>

        {policy.rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 60px',
              padding: '5px 8px',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              color: 'var(--venue-text-secondary)',
              borderBottom: i < policy.rows.length - 1 ? '1px solid var(--venue-border-subtle)' : undefined,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--venue-text-muted)' }}>{row.window}</span>
            <span style={{ textAlign: 'right', color: '#4ade80' }}>{row.creator}</span>
            <span style={{ textAlign: 'right', color: 'var(--venue-amber)' }}>{row.venue}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

// ─── What's included repeater ─────────────────────────────────────────────────

function IncludedItemsRepeater({
  items,
  onChange,
  isEditing,
}: {
  items: IncludedItem[]
  onChange: (items: IncludedItem[]) => void
  isEditing: boolean
}) {
  const [newName, setNewName] = useState('')

  function toggle(id: string) {
    onChange(items.map(i => i.id === id ? { ...i, included: !i.included } : i))
  }

  function remove(id: string) {
    onChange(items.filter(i => i.id !== id))
  }

  function addItem() {
    const name = newName.trim()
    if (!name) return
    onChange([...items, { id: `item-${Date.now()}`, name, included: true }])
    setNewName('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--venue-bg-elevated)',
            border: '1px solid var(--venue-border-subtle)',
          }}
        >
          {/* Toggle */}
          <button
            onClick={() => isEditing && toggle(item.id)}
            style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              background: item.included ? 'var(--venue-amber)' : 'var(--venue-bg-overlay)',
              border: item.included ? 'none' : '1.5px solid var(--venue-border-default)',
              cursor: isEditing ? 'pointer' : 'default',
              display: 'grid', placeItems: 'center',
            }}
          >
            {item.included && (
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#000' }}>check</span>
            )}
          </button>

          <span style={{
            flex: 1, fontSize: 13,
            color: item.included ? 'var(--venue-text-primary)' : 'var(--venue-text-muted)',
            fontFamily: 'var(--font-inter), sans-serif',
            textDecoration: item.included ? 'none' : 'line-through',
          }}>
            {item.name}
          </span>

          <span style={{
            fontSize: 10, fontWeight: 600,
            fontFamily: 'var(--font-inter), sans-serif',
            color: item.included ? 'var(--venue-success)' : 'var(--venue-text-muted)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {item.included ? 'Included' : 'Excluded'}
          </span>

          {isEditing && (
            <button
              onClick={() => remove(item.id)}
              style={{
                width: 20, height: 20, borderRadius: 4,
                background: 'transparent', border: 'none',
                color: 'var(--venue-text-muted)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
            </button>
          )}
        </div>
      ))}

      {isEditing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add item (e.g. Tables & chairs)"
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              background: 'var(--venue-bg-elevated)',
              border: '1px dashed var(--venue-border-default)',
              color: 'var(--venue-text-primary)',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            onClick={addItem}
            style={{
              padding: '0 14px', borderRadius: 8,
              background: 'var(--venue-amber-tint)',
              border: '1px solid var(--venue-amber-border)',
              color: 'var(--venue-amber)', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-inter), sans-serif',
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  houseRules: string
  includedItems: IncludedItem[]
  cancellationPolicy: 'flexible' | 'moderate' | 'strict'
  onChangeRules: (v: string) => void
  onChangeItems: (v: IncludedItem[]) => void
  onChangePolicy: (v: 'flexible' | 'moderate' | 'strict') => void
  isEditing: boolean
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function HouseRulesSection({
  houseRules,
  includedItems,
  cancellationPolicy,
  onChangeRules,
  onChangeItems,
  onChangePolicy,
  isEditing,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ paddingBottom: 24 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--venue-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-amber)' }}>
            gavel
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 14 }}>
            House Rules & Policies
          </span>
        </div>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18, color: 'var(--venue-text-muted)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* House Rules */}
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--venue-text-secondary)',
                  fontFamily: 'var(--font-inter), sans-serif', marginBottom: 8,
                }}>
                  House Rules
                </div>
                <textarea
                  value={houseRules}
                  onChange={e => onChangeRules(e.target.value)}
                  disabled={!isEditing}
                  placeholder={`• No smoking inside the venue\n• Music to stop by 10pm\n• Caterers must use the service entrance\n• Damage deposit required for events over 50 guests`}
                  rows={6}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: isEditing ? 'var(--venue-bg-elevated)' : 'transparent',
                    border: isEditing ? '1px solid var(--venue-border-default)' : '1px solid transparent',
                    color: 'var(--venue-text-primary)',
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: 13,
                    outline: 'none', resize: 'vertical',
                    caretColor: 'var(--venue-amber)',
                    boxSizing: 'border-box',
                    lineHeight: 1.6,
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--venue-amber)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--venue-border-default)' }}
                />
                <p style={{
                  fontSize: 11, color: 'var(--venue-text-muted)', marginTop: 4,
                  fontFamily: 'var(--font-inter), sans-serif',
                }}>
                  Use bullet points (•) for clarity. Makers see this before booking.
                </p>
              </div>

              {/* What's included */}
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--venue-text-secondary)',
                  fontFamily: 'var(--font-inter), sans-serif', marginBottom: 8,
                }}>
                  What&apos;s Included
                </div>
                <IncludedItemsRepeater
                  items={includedItems}
                  onChange={onChangeItems}
                  isEditing={isEditing}
                />
              </div>

              {/* Cancellation policy */}
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--venue-text-secondary)',
                  fontFamily: 'var(--font-inter), sans-serif', marginBottom: 12,
                }}>
                  Cancellation Policy
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {POLICIES.map(p => (
                    <CancellationCard
                      key={p.id}
                      policy={p}
                      selected={cancellationPolicy === p.id}
                      onSelect={() => onChangePolicy(p.id)}
                      isEditing={isEditing}
                    />
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
