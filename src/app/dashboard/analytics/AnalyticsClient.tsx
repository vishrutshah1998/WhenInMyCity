'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { LinkClickStats, AudienceBreakdown } from '@/app/actions/analytics'

interface SlimBlock {
  id: string
  block_type: string
}

export interface EventStat {
  id:           string
  title:        string
  starts_at:    string
  status:       string
  rsvpCount:    number
  revenuePaise: number
}

interface AnalyticsClientProps {
  stats7:      LinkClickStats
  stats30:     LinkClickStats
  stats365:    LinkClickStats
  blocks:      SlimBlock[]
  username:    string
  profilePath: string
  eventStats:  EventStat[]
  audience:    AudienceBreakdown
}

type Window = '7d' | '30d' | 'all'

// ---------------------------------------------------------------------------
// Concentric ring audience chart
// ---------------------------------------------------------------------------

const TIER_RING: Array<{ key: keyof Omit<AudienceBreakdown,'total'>; label: string; color: string; r: number; stroke: number }> = [
  { key: 'wanderer', label: 'Wanderers', color: 'rgba(26,39,68,0.22)', r: 80, stroke: 18 },
  { key: 'local',    label: 'Locals',    color: 'var(--wimc-teal)',        r: 56, stroke: 18 },
  { key: 'lantern',  label: 'Lanterns',  color: 'var(--wimc-amber)',       r: 32, stroke: 18 },
  { key: 'beacon',   label: 'Beacons',   color: '#a855f7',                 r: 12, stroke: 10 },
]

function AudienceSection({ audience }: { audience: AudienceBreakdown }) {
  const total = audience.total

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)',
      borderRadius: 0, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-abril)', fontSize: 22 }}>
        Your Audience
      </div>

      {total === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13 }}>
          No followers yet. Share your profile to grow your audience.
        </div>
      ) : (
        <div style={{ padding: 24, display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* SVG concentric rings */}
          <div style={{ flexShrink: 0 }}>
            <svg width={200} height={200} viewBox="0 0 200 200">
              <circle cx={100} cy={100} r={96} fill="none" stroke="var(--wimc-border-subtle)" strokeWidth={2} />
              {TIER_RING.map(({ key, color, r, stroke }) =>
                audience[key] > 0 ? (
                  <circle
                    key={key}
                    cx={100} cy={100} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    opacity={0.85}
                  />
                ) : null
              )}
              {/* Centre label */}
              <text x={100} y={95} textAnchor="middle" fill="var(--wimc-text-primary)" fontSize={22} fontWeight={800} fontFamily="var(--font-syne)">
                {total}
              </text>
              <text x={100} y={113} textAnchor="middle" fill="var(--wimc-text-muted)" fontSize={10} fontFamily="var(--font-jetbrains-mono)">
                FOLLOWERS
              </text>
            </svg>
          </div>

          {/* Legend + counts */}
          <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TIER_RING.map(({ key, label, color }) => {
              const count = audience[key]
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>{label}</span>
                      <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {count} · {pct}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--wimc-border-subtle)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 600ms ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}
    </div>
  )
}

function formatInr(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_COLORS: Record<string, string> = {
  published:  'var(--wimc-teal)',
  draft:      'var(--wimc-amber)',
  cancelled:  'var(--wimc-coral)',
  completed:  'var(--wimc-text-secondary)',
}

export default function AnalyticsClient({ stats7, stats30, stats365, blocks, username, profilePath, eventStats, audience }: AnalyticsClientProps) {
  const [win, setWin] = useState<Window>('30d')

  const stats = win === '7d' ? stats7 : win === '30d' ? stats30 : stats365
  const blockMap = useMemo(
    () => Object.fromEntries(blocks.map((b) => [b.id, b])),
    [blocks],
  )

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  const deviceRawTotal = stats.deviceBreakdown.mobile + stats.deviceBreakdown.tablet + stats.deviceBreakdown.desktop
  const deviceTotal = deviceRawTotal || 1
  const deviceBars = useMemo(() => [
    { label: 'Mobile',  value: stats.deviceBreakdown.mobile,  color: 'var(--wimc-coral)' },
    { label: 'Desktop', value: stats.deviceBreakdown.desktop, color: 'var(--wimc-teal)' },
    { label: 'Tablet',  value: stats.deviceBreakdown.tablet,  color: 'var(--wimc-amber)' },
  ], [stats.deviceBreakdown.mobile, stats.deviceBreakdown.desktop, stats.deviceBreakdown.tablet])

  // Build chart data: daily for 7d/30d, monthly buckets for all
  const chartData = useMemo(() => {
    if (win === 'all') {
      const monthMap: Record<string, number> = {}
      for (const { date, count } of stats365.byDay) {
        const key = date.slice(0, 7) // YYYY-MM
        monthMap[key] = (monthMap[key] ?? 0) + count
      }
      return Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({
          label: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short' }),
          count,
        }))
    }
    const source = win === '7d' ? stats7.byDay : stats30.byDay
    return source.map(({ date, count }) => ({
      label: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      count,
    }))
  }, [win, stats7.byDay, stats30.byDay, stats365.byDay])

  const chartMax = useMemo(() => Math.max(...chartData.map((d) => d.count), 1), [chartData])

  // Week-over-week comparison (only meaningful for 7d/30d)
  const prevClicksLabel = win === '7d' ? 'vs prev 7d' : win === '30d' ? 'vs prev 30d' : null
  const currentTotal = stats.totalClicks

  const isEmpty = eventStats.length === 0 && stats365.totalClicks === 0 && audience.total === 0

  return (
    <>
      <header style={topbar}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-muted)', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 2 }}>
            Creator Studio
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Analytics</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--wimc-bg-elevated)', borderRadius: 0, border: '1px solid var(--wimc-border-default)' }}>
          {(['7d', '30d', 'all'] as const).map((w) => (
            <button key={w} onClick={() => setWin(w)} style={{
              padding: '4px 14px', borderRadius: 0, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono)', cursor: 'pointer', border: 'none',
              background: win === w ? 'var(--wimc-coral)' : 'transparent',
              color: win === w ? '#fff' : 'var(--wimc-text-secondary)',
            }}>
              {w === 'all' ? 'All' : w}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 40px) 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 py-16">
            <div
              className="flex items-center justify-center w-16 h-16"
              style={{ background: 'rgba(232,112,90,0.08)', border: '1px solid rgba(232,112,90,0.2)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#E8705A' }}>
                analytics
              </span>
            </div>
            <div className="text-center flex flex-col gap-2 max-w-sm">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 900, color: '#F0EFF8', margin: 0 }}>
                No data yet
              </h3>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9896B0', lineHeight: 1.6, margin: 0 }}>
                Publish your first event and share your page to start seeing
                traffic, ticket sales, and audience data here.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <Link
                href="/dashboard/events/create"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-colors"
                style={{
                  background: '#E8705A', color: '#07070A',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Create event
              </Link>
              <Link
                href="/dashboard/studio"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-colors"
                style={{
                  background: 'transparent', border: '1px solid #57423e',
                  color: '#9896B0', fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#F0EFF8'; e.currentTarget.style.borderColor = '#F0EFF8' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9896B0'; e.currentTarget.style.borderColor = '#57423e' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                Edit your page
              </Link>
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#57423e', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Analytics update daily
            </p>
          </div>
        ) : (
          <>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total Link Clicks', value: currentTotal, color: 'var(--wimc-coral)', icon: 'ads_click', sub: prevClicksLabel },
            { label: 'Active Blocks',     value: blocks.length,                                 color: 'var(--wimc-teal)',  icon: 'grid_view',  sub: null },
            {
              label: 'Avg Clicks / Block',
              value: blocks.length ? (currentTotal / blocks.length).toFixed(1) : '0',
              color: 'var(--wimc-amber)', icon: 'bar_chart', sub: null,
            },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderLeft: `3px solid ${color}`, borderRadius: 0, padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 0, background: `${color}22`, display: 'grid', placeItems: 'center', color, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 48, fontWeight: 900, lineHeight: 1, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Clicks over time chart */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22, marginBottom: 20 }}>
            Clicks Over Time
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 400, fontSize: 11, color: 'var(--wimc-text-secondary)', marginLeft: 10 }}>
              {win === 'all' ? 'monthly' : 'daily'}
            </span>
          </div>
          {chartData.every((d) => d.count === 0) ? (
            <div style={{ textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13, padding: '24px 0' }}>
              No clicks recorded in this window yet.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: win === '30d' ? 3 : 6, height: 100, overflowX: 'auto' }}>
              {chartData.map(({ label, count }) => (
                <div key={label} title={`${label}: ${count}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '1 0 auto', minWidth: win === '30d' ? 10 : 28 }}>
                  <div style={{
                    width: '100%',
                    height: Math.max(3, Math.round((count / chartMax) * 80)),
                    background: count > 0 ? 'var(--wimc-coral)' : 'rgba(26,39,68,0.08)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 300ms ease',
                  }} />
                  {win !== '30d' && (
                    <div style={{ fontSize: 9, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                      {label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {/* Device breakdown */}
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-abril)', fontSize: 22, marginBottom: 20 }}>Device Breakdown</div>
            {deviceRawTotal === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13, padding: '24px 0' }}>
                No visitor data yet — this will populate once people view your page.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {deviceBars.map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 6 }}>
                      <span style={{ color: 'var(--wimc-text-secondary)' }}>{label}</span>
                      <span style={{ color }}>{value} ({Math.round((value / deviceTotal) * 100)}%)</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--wimc-bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((value / deviceTotal) * 100)}%`, background: color, borderRadius: 4, transition: 'width 500ms ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top blocks */}
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-abril)', fontSize: 22 }}>
              Top Blocks
            </div>
            {stats.byBlock.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 13 }}>
                No clicks recorded yet in this window.
              </div>
            ) : (
              stats.byBlock.slice(0, 6).map((b, i) => {
                const block = blockMap[b.blockId]
                const pct = Math.round((b.count / (stats.byBlock[0]?.count || 1)) * 100)
                return (
                  <div key={b.blockId} style={{
                    padding: '12px 24px',
                    borderBottom: i < Math.min(5, stats.byBlock.length - 1) ? '1px solid var(--wimc-border-subtle)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--wimc-text-secondary)' }}>
                        {block?.block_type?.replace(/_/g, ' ') ?? b.blockId.slice(0, 12) + '…'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--wimc-coral)' }}>{b.count}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--wimc-bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--wimc-coral)', borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Event performance table */}
        {eventStats.length > 0 && (
          <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wimc-border-subtle)', fontFamily: 'var(--font-abril)', fontSize: 22 }}>
              Event Performance
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wimc-border-subtle)' }}>
                    {['Event', 'Date', 'Status', 'RSVPs', 'Revenue'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 20px', textAlign: h === 'RSVPs' || h === 'Revenue' ? 'right' : 'left',
                        fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600,
                        color: 'var(--wimc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventStats.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < eventStats.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDate(e.starts_at)}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
                          fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono)',
                          background: `${STATUS_COLORS[e.status] ?? 'var(--wimc-text-secondary)'}22`,
                          color: STATUS_COLORS[e.status] ?? 'var(--wimc-text-secondary)',
                          textTransform: 'capitalize',
                        }}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, color: 'var(--wimc-teal)' }}>
                        {e.rsvpCount}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, color: e.revenuePaise > 0 ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)' }}>
                        {e.revenuePaise > 0 ? formatInr(e.revenuePaise) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audience breakdown */}
        <AudienceSection audience={audience} />

        {/* Public page link */}
        <div style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid rgba(26,39,68,0.14)', borderRadius: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--wimc-teal)', fontSize: 20 }}>link</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 3 }}>Your public page</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>wheninmycity.com{profilePath}</div>
          </div>
          <a
            href={profilePath}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wimc-coral)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-dm-sans)', fontWeight: 600 }}
          >
            View <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          </a>
        </div>
          </>
        )}
      </div>
    </>
  )
}
