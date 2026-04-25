'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { VenueFormState, PricingRule } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
]

function dayLabel(days: string[]): string {
  if (days.length === 7) return 'All days'
  if (JSON.stringify(days.sort()) === JSON.stringify(['mon','tue','wed','thu','fri'].sort())) return 'Mon–Fri'
  if (JSON.stringify(days.sort()) === JSON.stringify(['sat','sun'].sort())) return 'Sat–Sun'
  return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
}

function formatRate(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}/hr`
}

function formatTimeRange(from: string, to: string): string {
  if (from === '00:00' && to === '23:59') return 'All hours'
  return `${from}–${to}`
}

// ─── Rule form (used in the drawer) ──────────────────────────────────────────

function RuleForm({
  draft,
  onChange,
}: {
  draft: PricingRule
  onChange: (updated: PricingRule) => void
}) {
  function patch<K extends keyof PricingRule>(key: K, value: PricingRule[K]) {
    onChange({ ...draft, [key]: value })
  }

  function toggleDay(d: string) {
    const next = draft.days.includes(d)
      ? draft.days.filter(x => x !== d)
      : [...draft.days, d]
    patch('days', next)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--adda-text-muted)',
    fontFamily: 'var(--font-inter), sans-serif',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginBottom: 6, display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'var(--adda-bg-elevated)',
    border: '1px solid var(--adda-border-default)',
    color: 'var(--adda-text-primary)',
    fontFamily: 'var(--font-inter), sans-serif', fontSize: 13,
    outline: 'none', caretColor: 'var(--adda-amber)',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Rule name */}
      <div>
        <span style={labelStyle}>Rule name</span>
        <input
          type="text"
          value={draft.name}
          onChange={e => patch('name', e.target.value)}
          placeholder="e.g. Weekend Peak"
          style={inputStyle}
        />
      </div>

      {/* Rate per hour */}
      <div>
        <span style={labelStyle}>Rate (₹ per hour)</span>
        <input
          type="number"
          value={draft.rate_per_hour_paise / 100}
          onChange={e => patch('rate_per_hour_paise', parseInt(e.target.value || '0', 10) * 100)}
          placeholder="1500"
          min={0}
          style={{ ...inputStyle, fontFamily: 'var(--font-jetbrains-mono), monospace' }}
        />
      </div>

      {/* Min hours */}
      <div>
        <span style={labelStyle}>Minimum hours</span>
        <input
          type="number"
          value={draft.min_hours}
          onChange={e => patch('min_hours', parseInt(e.target.value || '1', 10))}
          min={1}
          max={24}
          style={{ ...inputStyle, fontFamily: 'var(--font-jetbrains-mono), monospace' }}
        />
      </div>

      {/* Days */}
      <div>
        <span style={labelStyle}>Days of week</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAYS.map(d => {
            const on = draft.days.includes(d.key)
            return (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: on ? 'none' : '1px solid var(--adda-border-default)',
                  background: on ? 'var(--adda-amber)' : 'var(--adda-bg-elevated)',
                  color: on ? '#000' : 'var(--adda-text-secondary)',
                  fontWeight: 700, fontSize: 12,
                  fontFamily: 'var(--font-inter), sans-serif',
                  cursor: 'pointer',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time window */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <span style={labelStyle}>From</span>
          <input
            type="time"
            value={draft.time_from}
            onChange={e => patch('time_from', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <span style={labelStyle}>To</span>
          <input
            type="time"
            value={draft.time_to}
            onChange={e => patch('time_to', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Active toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => patch('active', !draft.active)}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: draft.active ? 'var(--adda-amber)' : 'var(--adda-bg-overlay)',
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'background 200ms',
          }}
        >
          <div style={{
            position: 'absolute', top: 3, borderRadius: '50%', width: 16, height: 16,
            background: '#fff',
            left: draft.active ? 21 : 3,
            transition: 'left 200ms',
          }} />
        </button>
        <span style={{
          fontSize: 13, color: 'var(--adda-text-secondary)',
          fontFamily: 'var(--font-inter), sans-serif',
        }}>
          {draft.active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}

// ─── Pricing preview ──────────────────────────────────────────────────────────

function PricingPreview({ rules }: { rules: PricingRule[] }) {
  const [hours, setHours] = useState(3)
  const [dayKey, setDayKey] = useState('sat')
  const [timeStr, setTimeStr] = useState('15:00')

  const time = parseInt(timeStr.split(':')[0], 10) * 60 + parseInt(timeStr.split(':')[1], 10)

  function ruleMatches(rule: PricingRule): boolean {
    if (!rule.active) return false
    if (!rule.days.includes(dayKey)) return false
    if (hours < rule.min_hours) return false
    if (rule.time_from !== '00:00' || rule.time_to !== '23:59') {
      const from = parseInt(rule.time_from.split(':')[0], 10) * 60 + parseInt(rule.time_from.split(':')[1], 10)
      const to   = parseInt(rule.time_to.split(':')[0], 10)   * 60 + parseInt(rule.time_to.split(':')[1], 10)
      if (time < from || time > to) return false
    }
    return true
  }

  // Pick highest-priority matching rule (most specific = most constraints met)
  const matched = rules.filter(ruleMatches).sort((a, b) => {
    const aScore = (a.days.length < 7 ? 1 : 0) + (a.time_from !== '00:00' ? 1 : 0)
    const bScore = (b.days.length < 7 ? 1 : 0) + (b.time_from !== '00:00' ? 1 : 0)
    return bScore - aScore
  })[0]

  const totalPaise = matched ? matched.rate_per_hour_paise * hours : null

  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: 'var(--adda-bg-elevated)',
      border: '1px solid var(--adda-border-subtle)',
      marginTop: 16,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--adda-text-muted)',
        fontFamily: 'var(--font-inter), sans-serif',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
      }}>
        Pricing Preview
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), sans-serif' }}>
            Hours:
          </span>
          <input
            type="number"
            value={hours}
            onChange={e => setHours(Math.max(1, parseInt(e.target.value || '1', 10)))}
            min={1}
            max={24}
            style={{
              width: 56, padding: '5px 8px', borderRadius: 6,
              background: 'var(--adda-bg-overlay)',
              border: '1px solid var(--adda-border-default)',
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12,
              outline: 'none', textAlign: 'center',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), sans-serif' }}>
            Day:
          </span>
          <select
            value={dayKey}
            onChange={e => setDayKey(e.target.value)}
            style={{
              padding: '5px 8px', borderRadius: 6,
              background: 'var(--adda-bg-overlay)',
              border: '1px solid var(--adda-border-default)',
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: 12,
              outline: 'none',
            }}
          >
            {DAYS.map(d => <option key={d.key} value={d.key}>{d.key.charAt(0).toUpperCase() + d.key.slice(1)}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), sans-serif' }}>
            Time:
          </span>
          <input
            type="time"
            value={timeStr}
            onChange={e => setTimeStr(e.target.value)}
            style={{
              padding: '5px 8px', borderRadius: 6,
              background: 'var(--adda-bg-overlay)',
              border: '1px solid var(--adda-border-default)',
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Result */}
      {matched ? (
        <div>
          <div style={{
            fontSize: 12, color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), sans-serif', marginBottom: 6,
          }}>
            Applies rule: <span style={{ color: 'var(--adda-amber)', fontWeight: 600 }}>{matched.name}</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontSize: 13, color: 'var(--adda-text-secondary)',
          }}>
            {formatRate(matched.rate_per_hour_paise)} × {hours}h
            {' = '}
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--adda-amber)' }}>
              ₹{Math.round((totalPaise ?? 0) / 100).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          fontSize: 12, color: 'var(--adda-text-muted)',
          fontFamily: 'var(--font-inter), sans-serif',
        }}>
          No active rule matches this booking scenario.
          {hours > 0 && rules.length > 0 && ' Check minimum hours or day restrictions.'}
        </div>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pricingRules: VenueFormState['pricing_rules']
  pricingModel: VenueFormState['pricing_model']
  onChange: (rules: PricingRule[]) => void
  isEditing: boolean
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function RuleDrawer({
  rule,
  onSave,
  onClose,
}: {
  rule: PricingRule
  onSave: (r: PricingRule) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<PricingRule>(rule)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 380, maxWidth: '90vw',
          background: 'var(--adda-bg-surface)',
          borderLeft: '1px solid var(--adda-border-subtle)',
          height: '100%', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--adda-border-subtle)',
          flexShrink: 0,
        }}>
          <h3 style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 700, fontSize: 15, color: 'var(--adda-text-primary)',
            margin: 0,
          }}>
            {rule.name === '' ? 'New Pricing Rule' : `Edit: ${rule.name}`}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--adda-bg-overlay)', border: 'none',
              color: 'var(--adda-text-muted)', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <RuleForm draft={draft} onChange={setDraft} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--adda-border-subtle)',
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button
            onClick={() => onSave(draft)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              background: 'var(--adda-amber)', border: 'none',
              color: '#000', fontWeight: 700, fontSize: 13,
              fontFamily: 'var(--font-inter), sans-serif',
              cursor: 'pointer',
            }}
          >
            Save rule
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 8,
              background: 'var(--adda-bg-overlay)', border: '1px solid var(--adda-border-subtle)',
              color: 'var(--adda-text-secondary)', fontSize: 13,
              fontFamily: 'var(--font-inter), sans-serif',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PricingRulesSection({ pricingRules, onChange, isEditing }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerRule, setDrawerRule] = useState<PricingRule | null>(null)

  function openNewRule() {
    setDrawerRule({
      id: `rule-${Date.now()}`,
      name: '',
      rate_per_hour_paise: 100000,
      min_hours: 2,
      days: ['mon','tue','wed','thu','fri'],
      time_from: '00:00',
      time_to: '23:59',
      active: true,
    })
  }

  function saveRule(updated: PricingRule) {
    const exists = pricingRules.some(r => r.id === updated.id)
    if (exists) {
      onChange(pricingRules.map(r => r.id === updated.id ? updated : r))
    } else {
      onChange([...pricingRules, updated])
    }
    setDrawerRule(null)
  }

  function deleteRule(id: string) {
    onChange(pricingRules.filter(r => r.id !== id))
  }

  function toggleActive(id: string) {
    onChange(pricingRules.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  return (
    <>
      <div style={{
        borderBottom: '1px solid var(--adda-border-subtle)',
        paddingBottom: 24, marginBottom: 24,
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
              price_change
            </span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 14 }}>
              Pricing Rules
            </span>
            <span style={{
              padding: '1px 8px', borderRadius: 9999,
              background: 'var(--adda-bg-overlay)',
              fontSize: 11, fontFamily: 'var(--font-jetbrains-mono), monospace',
              color: 'var(--adda-text-muted)',
            }}>
              {pricingRules.filter(r => r.active).length} active
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
              {/* Rules table */}
              <div style={{
                borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--adda-border-subtle)',
              }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 110px 80px 1fr 80px',
                  padding: '8px 14px',
                  background: 'var(--adda-bg-overlay)',
                  borderBottom: '1px solid var(--adda-border-subtle)',
                }}>
                  {['Rule', 'Rate', 'Min Hrs', 'Days / Time', 'Status'].map(h => (
                    <span key={h} style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--adda-text-muted)',
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                    }}>
                      {h}
                    </span>
                  ))}
                </div>

                {pricingRules.length === 0 ? (
                  <div style={{
                    padding: '20px 14px', textAlign: 'center',
                    color: 'var(--adda-text-muted)', fontSize: 13,
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>
                    No pricing rules yet. Add one below.
                  </div>
                ) : (
                  pricingRules.map((rule, i) => (
                    <div
                      key={rule.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 110px 80px 1fr 80px',
                        padding: '10px 14px',
                        alignItems: 'center',
                        background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                        borderBottom: i < pricingRules.length - 1 ? '1px solid var(--adda-border-subtle)' : undefined,
                      }}
                    >
                      {/* Name + edit */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--adda-text-primary)',
                          fontFamily: 'var(--font-inter), sans-serif',
                        }}>
                          {rule.name}
                        </span>
                        {isEditing && (
                          <button
                            onClick={() => setDrawerRule(rule)}
                            style={{
                              width: 22, height: 22, borderRadius: 5,
                              background: 'var(--adda-bg-overlay)', border: 'none',
                              color: 'var(--adda-text-muted)', cursor: 'pointer',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>edit</span>
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => deleteRule(rule.id)}
                            style={{
                              width: 22, height: 22, borderRadius: 5,
                              background: 'transparent', border: 'none',
                              color: 'var(--adda-text-muted)', cursor: 'pointer',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>delete</span>
                          </button>
                        )}
                      </div>

                      {/* Rate */}
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--adda-amber)',
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                      }}>
                        {formatRate(rule.rate_per_hour_paise)}
                      </span>

                      {/* Min hours */}
                      <span style={{
                        fontSize: 12, color: 'var(--adda-text-secondary)',
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                      }}>
                        {rule.min_hours}h min
                      </span>

                      {/* Days + time */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--adda-text-secondary)', fontFamily: 'var(--font-inter), sans-serif' }}>
                          {dayLabel(rule.days)}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                          {formatTimeRange(rule.time_from, rule.time_to)}
                        </span>
                      </div>

                      {/* Status toggle */}
                      <button
                        onClick={() => isEditing && toggleActive(rule.id)}
                        style={{
                          padding: '3px 8px', borderRadius: 9999,
                          background: rule.active ? 'rgba(74,222,128,0.15)' : 'var(--adda-bg-overlay)',
                          border: rule.active ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--adda-border-subtle)',
                          color: rule.active ? '#4ade80' : 'var(--adda-text-muted)',
                          fontSize: 10, fontWeight: 600,
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          cursor: isEditing ? 'pointer' : 'default',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {rule.active ? 'Active' : 'Off'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add rule button */}
              {isEditing && (
                <button
                  onClick={openNewRule}
                  style={{
                    marginTop: 10,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8,
                    background: 'var(--adda-amber-tint)',
                    border: '1px solid var(--adda-amber-border)',
                    color: 'var(--adda-amber)', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-inter), sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Add pricing rule
                </button>
              )}

              {/* Pricing preview */}
              <PricingPreview rules={pricingRules} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rule drawer */}
      <AnimatePresence>
        {drawerRule && (
          <RuleDrawer
            rule={drawerRule}
            onSave={saveRule}
            onClose={() => setDrawerRule(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
