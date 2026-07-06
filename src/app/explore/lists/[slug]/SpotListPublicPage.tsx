'use client'

import { useState, useTransition } from 'react'
import { flagSpotList }   from '@/app/actions/spotLists'
import type { PublicSpotList } from '@/app/actions/spotLists'

// ── Category emoji ────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  heritage: '🏛', park: '🌳', market: '🛍', food: '🍽', temple: '🛕',
  nature: '🌿', arts: '🎨', shopping: '🏬', attraction: '⭐',
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { list: PublicSpotList }

// ── Component ─────────────────────────────────────────────────────────────────

export default function SpotListPublicPage({ list }: Props) {
  const [showFlag,    setShowFlag]    = useState(false)
  const [flagReason,  setFlagReason]  = useState('')
  const [flagDone,    setFlagDone]    = useState(false)
  const [flagError,   setFlagError]   = useState<string | null>(null)
  const [,            startTransition]= useTransition()

  function handleFlag() {
    if (!flagReason.trim()) return
    startTransition(async () => {
      const res = await flagSpotList(list.id, flagReason)
      if (!res.success) { setFlagError(res.error); return }
      setFlagDone(true)
      setFlagError(null)
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 48px' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {/* WIMC watermark */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)',
          marginBottom: 14,
        }}>
          When In My City · Favorite Spots
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 800, color: 'var(--wimc-text-primary)',
          fontFamily: 'var(--font-syne)', lineHeight: 1.2, margin: '0 0 10px',
        }}>
          {list.title}
        </h1>

        {list.description && (
          <p style={{
            fontSize: 14, color: 'var(--wimc-text-secondary)',
            fontFamily: 'var(--font-dm-sans)', lineHeight: 1.7, margin: '0 0 12px',
          }}>
            {list.description}
          </p>
        )}

        <div style={{
          fontSize: 11, color: 'var(--wimc-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)',
          display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          <span>By {list.author_name}</span>
          <span>·</span>
          <span>{list.items.length} place{list.items.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{fmtDate(list.created_at)}</span>
        </div>
      </div>

      {/* ── Scope note ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '9px 12px', borderRadius: 8,
        background: 'rgba(155,143,255,0.06)',
        border: '1px solid rgba(155,143,255,0.15)',
        fontSize: 11, color: 'var(--wimc-text-muted)',
        fontFamily: 'var(--font-jetbrains-mono)', marginBottom: 20, lineHeight: 1.5,
      }}>
        A curated list of places — not a review of individuals.
        Lists are moderated by the WIMC team.
      </div>

      {/* ── Places ─────────────────────────────────────────────────────── */}
      {list.items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 24px',
          color: 'var(--wimc-text-secondary)', fontSize: 14,
        }}>
          No places added to this list yet.
        </div>
      ) : (
        <div style={{
          background: 'var(--wimc-bg-elevated)',
          border: '1px solid var(--wimc-border-default)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {list.items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px',
                borderBottom: i < list.items.length - 1
                  ? '1px solid var(--wimc-border-subtle)' : 'none',
              }}
            >
              {/* Position + emoji */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--wimc-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 22 }}>
                  {item.place_category ? (CAT_EMOJI[item.place_category] ?? '📍') : '📍'}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 700, color: 'var(--wimc-text-primary)',
                  fontFamily: 'var(--font-syne)', lineHeight: 1.2,
                }}>
                  {item.place_name}
                </div>
                {item.place_category && (
                  <span style={{
                    display: 'inline-block', marginTop: 4,
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
                    background: 'rgba(155,143,255,0.1)',
                    color: '#9B8FFF',
                    fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {item.place_category}
                  </span>
                )}
                {item.note && (
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: 13, color: 'var(--wimc-text-secondary)',
                    fontFamily: 'var(--font-dm-sans)', lineHeight: 1.6,
                  }}>
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 32, paddingTop: 20,
        borderTop: '1px solid var(--wimc-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{
          fontSize: 11, color: 'var(--wimc-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)', lineHeight: 1.6,
        }}>
          Created with When In My City —{' '}
          <a href="/explore" style={{ color: 'var(--wimc-coral)', textDecoration: 'none' }}>
            explore more
          </a>
        </div>

        {/* Report / flag affordance */}
        <button
          onClick={() => setShowFlag(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid var(--wimc-border-default)',
            background: 'transparent', color: 'var(--wimc-text-muted)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>flag</span>
          Report this list
        </button>
      </div>

      {/* ── Flag form ───────────────────────────────────────────────────── */}
      {showFlag && !flagDone && (
        <div style={{
          marginTop: 12, padding: '14px',
          background: 'var(--wimc-bg-elevated)',
          border: '1px solid var(--wimc-border-default)',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-secondary)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            Why are you reporting this list?
          </div>
          <textarea
            value={flagReason}
            onChange={e => setFlagReason(e.target.value.slice(0, 200))}
            placeholder="Briefly describe the issue (max 200 chars)"
            rows={2}
            style={{
              width: '100%', padding: '9px 11px', borderRadius: 8,
              border: '1px solid var(--wimc-border-subtle)',
              background: 'var(--wimc-bg-base)',
              color: 'var(--wimc-text-primary)',
              fontSize: 12, lineHeight: 1.5, resize: 'vertical',
              fontFamily: 'var(--font-dm-sans)',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          {flagError && (
            <div style={{ fontSize: 11, color: '#EF5350' }}>{flagError}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowFlag(false)}
              style={{
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--wimc-border-default)',
                background: 'transparent', color: 'var(--wimc-text-secondary)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleFlag}
              disabled={!flagReason.trim()}
              style={{
                padding: '6px 14px', borderRadius: 6,
                background: flagReason.trim() ? '#C62828' : 'var(--wimc-bg-overlay)',
                color: flagReason.trim() ? '#fff' : 'var(--wimc-text-muted)',
                fontSize: 11, fontWeight: 600, border: 'none',
                cursor: flagReason.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Submit report
            </button>
          </div>
        </div>
      )}

      {flagDone && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'rgba(77,210,177,0.08)',
          border: '1px solid rgba(77,210,177,0.2)',
          borderRadius: 8, fontSize: 12, color: 'var(--wimc-teal)',
          fontFamily: 'var(--font-jetbrains-mono)',
        }}>
          ✓ Report received. The WIMC team will review this list within 48 hours.
        </div>
      )}

    </div>
  )
}
