'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UserTier } from '@/types/database'
import { TierGate } from '@/components/dashboard/TierGate'

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
  eventsHosted: number
}

const SOURCE_LABEL: Record<string, string> = {
  newsletter_block: 'Newsletter',
  rsvp_confirmation: 'Event RSVP',
}

export default function LeadsClient({ subscribers, total, tier, eventsHosted }: LeadsClientProps) {
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
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  return (
    <>
      <header style={topbar}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 2 }}>
            Creator Studio
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Leads</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-default)', borderRadius: 0 }}>
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
                padding: '6px 14px', borderRadius: 0, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)', border: 'none',
                background: 'var(--wimc-coral)', color: '#fff', cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
              Export CSV
            </button>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--wimc-bg-overlay)',
              border: '1px solid var(--wimc-border-default)',
              borderRadius: 9999, padding: '4px 10px',
              fontSize: 11, fontWeight: 600,
              color: 'var(--wimc-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>lock</span>
              Lantern+
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* CSV tier gate */}
        {!canExport && (
          <TierGate current={tier} required="lantern" eventsHosted={eventsHosted} />
        )}
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total Leads', value: total, color: 'var(--wimc-coral)' },
            { label: 'From Events', value: subscribers.filter((s) => s.source === 'rsvp_confirmation').length, color: 'var(--wimc-teal)' },
            { label: 'From Page', value: subscribers.filter((s) => s.source === 'newsletter_block').length, color: 'var(--wimc-amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderLeft: `3px solid ${color}`, borderRadius: 0, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ border: '2px dashed var(--wimc-border-default)', borderRadius: 0, padding: 48, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-text-secondary)', display: 'block', marginBottom: 12 }}>group</span>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{search ? 'No matches' : 'No leads yet'}</div>
            <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', marginBottom: search ? 0 : 20 }}>
              {search ? 'Try a different search term.' : 'Add a newsletter block to your page or run a paid event to collect leads.'}
            </div>
            {!search && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/dashboard/events/create"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px', borderRadius: 0, fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-dm-sans)', background: 'var(--wimc-coral)',
                    color: '#fff', textDecoration: 'none',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
                  Create event
                </Link>
                <Link
                  href="/dashboard/studio"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px', borderRadius: 0, fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-dm-sans)', background: 'var(--wimc-bg-elevated)',
                    color: 'var(--wimc-text-primary)', textDecoration: 'none',
                    border: '1px solid var(--wimc-border-default)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add_box</span>
                  Add newsletter block
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0 }}>
            <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', minWidth: 400,
              padding: '12px 24px', borderBottom: '1px solid var(--wimc-border-subtle)',
              fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
              letterSpacing: '0.8px', color: 'var(--wimc-text-secondary)',
            }}>
              {['Email', 'Source', 'Subscribed'].map((h) => <div key={h}>{h}</div>)}
            </div>
            {filtered.map((sub, i) => (
              <div key={sub.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', minWidth: 400,
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
            </div>{/* /overflowX */}
          </div>
        )}
      </div>
    </>
  )
}
