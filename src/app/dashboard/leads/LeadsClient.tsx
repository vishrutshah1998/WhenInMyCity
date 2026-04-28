'use client'

import { useState } from 'react'
import type { UserTier } from '@/types/database'

interface Subscriber {
  id: string
  email: string
  subscribed_at: string
  source: 'newsletter_block' | 'rsvp_confirmation'
  is_active: boolean
}

interface LeadsClientProps {
  subscribers: Subscriber[]
  total: number
  tier: UserTier
}

const SOURCE_LABEL: Record<string, string> = {
  newsletter_block: 'Newsletter',
  rsvp_confirmation: 'Event RSVP',
}

export default function LeadsClient({ subscribers, total, tier }: LeadsClientProps) {
  const [search, setSearch] = useState('')
  const canExport = tier === 'lantern' || tier === 'beacon'

  const filtered = subscribers.filter(
    (s) => !search || s.email.toLowerCase().includes(search.toLowerCase())
  )

  function handleExport() {
    const csv = ['Email,Source,Subscribed At', ...filtered.map((s) =>
      `${s.email},${SOURCE_LABEL[s.source] ?? s.source},${new Date(s.subscribed_at).toLocaleDateString('en-IN')}`
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Leads</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--wimc-text-secondary)' }}>search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails…"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--wimc-text-primary)', width: 180, fontFamily: 'var(--font-dm-sans)' }}
            />
          </div>
          {canExport ? (
            <button
              onClick={handleExport}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)', border: 'none',
                background: 'var(--wimc-coral)', color: '#fff', cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
              Export CSV
            </button>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--wimc-amber)', fontFamily: 'var(--font-jetbrains-mono)', padding: '6px 12px', background: 'var(--wimc-amber-dim)', borderRadius: 8 }}>
              CSV export unlocks at Lantern tier
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Leads', value: total, color: 'var(--wimc-coral)' },
            { label: 'From Events', value: subscribers.filter((s) => s.source === 'rsvp_confirmation').length, color: 'var(--wimc-teal)' },
            { label: 'From Page', value: subscribers.filter((s) => s.source === 'newsletter_block').length, color: 'var(--wimc-amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ border: '2px dashed var(--wimc-border-default)', borderRadius: 18, padding: 48, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 12 }}>group</span>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{search ? 'No matches' : 'No leads yet'}</div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
              {search ? 'Try a different search term.' : 'Add a newsletter block to your page or run a paid event to collect leads.'}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
              padding: '12px 24px', borderBottom: '1px solid var(--wimc-border-subtle)',
              fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
              letterSpacing: '0.8px', color: 'var(--wimc-text-secondary)',
            }}>
              {['Email', 'Source', 'Subscribed'].map((h) => <div key={h}>{h}</div>)}
            </div>
            {filtered.map((sub, i) => (
              <div key={sub.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                padding: '13px 24px', alignItems: 'center', fontSize: 13,
                borderBottom: i < filtered.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                transition: 'background 200ms',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-overlay)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ fontWeight: 500 }}>{sub.email}</div>
                <div>
                  <span style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 9999, fontWeight: 600,
                    fontFamily: 'var(--font-jetbrains-mono)',
                    background: sub.source === 'rsvp_confirmation' ? 'var(--wimc-teal-dim)' : 'var(--wimc-coral-dim)',
                    color: sub.source === 'rsvp_confirmation' ? 'var(--wimc-teal)' : 'var(--wimc-coral)',
                  }}>
                    {SOURCE_LABEL[sub.source] ?? sub.source}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {new Date(sub.subscribed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
