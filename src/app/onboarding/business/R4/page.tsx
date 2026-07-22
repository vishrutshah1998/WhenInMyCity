'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { BrandNoticeAd } from '@/components/onboarding/BoardingPassArtifact'

const ACCENT = '#F5A800'
const NAVY   = '#1A2744'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"
const OUTFIT = "'Outfit', sans-serif"

const SPRING_KEYFRAMES = `
@keyframes r4-spring {
  0%   { transform: scale(0.9); opacity: 0.5; }
  60%  { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes r4-postmark-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`

function BrandStepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const done   = i < current - 1
        const active = i === current - 1
        return (
          <div key={i} style={{
            width:      22, height: 8, borderRadius: 4,
            background: done || active ? ACCENT : 'rgba(255,255,255,0.10)',
            boxShadow:  active ? '0 0 10px rgba(245,168,0,0.5)' : 'none',
            transition: 'all 200ms',
          }} />
        )
      })}
      <span style={{ fontFamily: MONO, fontSize: 10, color: `${ACCENT}99`, letterSpacing: '0.10em', marginLeft: 6 }}>
        05 / 06
      </span>
    </div>
  )
}

const CATEGORIES = [
  { id: 'retail',    icon: 'storefront',     label: 'Retail',    desc: 'Products & stores'    },
  { id: 'agency',    icon: 'work',           label: 'Agency',    desc: 'Services & clients'   },
  { id: 'startup',   icon: 'rocket_launch',  label: 'Startup',   desc: 'Early stage & growth' },
  { id: 'creative',  icon: 'brush',          label: 'Creative',  desc: 'Design, art, photo'   },
  { id: 'fnb',       icon: 'restaurant',     label: 'F&B',       desc: 'Food & hospitality'   },
  { id: 'fashion',   icon: 'checkroom',      label: 'Fashion',   desc: 'Apparel & styling'    },
  { id: 'tech',      icon: 'devices',        label: 'Tech',      desc: 'Software & SaaS'      },
  { id: 'media',     icon: 'movie',          label: 'Media',     desc: 'Content & broadcast'  },
  { id: 'beauty',    icon: 'spa',            label: 'Beauty',    desc: 'Wellness & grooming'  },
  { id: 'education', icon: 'school',         label: 'Education', desc: 'Courses & coaching'   },
  { id: 'health',    icon: 'local_hospital', label: 'Health',    desc: 'Fitness & nutrition'  },
  { id: 'other',     icon: 'bolt',           label: 'Other',     desc: 'Something else'       },
] as const

const GOALS = [
  { id: 'reach_creators',  icon: 'groups',       label: 'Reach creators',  desc: 'Connect with performers, artists and local talent'   },
  { id: 'host_collabs',    icon: 'handshake',    label: 'Host collabs',    desc: 'Partner on events, pop-ups and projects'             },
  { id: 'sponsor_events',  icon: 'emoji_events', label: 'Sponsor events',  desc: 'Fund cultural nights and community shows'            },
  { id: 'build_community', icon: 'diversity_1',  label: 'Build community', desc: 'Grow a creator community around your brand'          },
  { id: 'grow_brand',      icon: 'trending_up',  label: 'Grow brand',      desc: 'Increase visibility in Tier-2 cities'               },
] as const

export default function R4Page() {
  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedGoals,    setSelectedGoals]    = useState<string[]>([])
  const [bName,            setBName]            = useState('')
  const [bCity,            setBCity]            = useState('')
  const [isWide,           setIsWide]           = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'brand') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    const city = sessionStorage.getItem(SK.b_city)
    if (city) setBCity(city)
    const savedCat = sessionStorage.getItem(SK.r_categories)
    if (savedCat) setSelectedCategory(savedCat)
    try {
      const savedGoals = sessionStorage.getItem(SK.r_goals)
      if (savedGoals) setSelectedGoals(JSON.parse(savedGoals) as string[])
    } catch {}
    const mq = window.matchMedia('(min-width: 520px)')
    setIsWide(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [router])

  function selectCategory(id: string) {
    const next = selectedCategory === id ? '' : id
    setSelectedCategory(next)
    try { sessionStorage.setItem(SK.r_categories, next) } catch {}
  }

  function toggleGoal(id: string) {
    setSelectedGoals(prev => {
      const next = prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
      try { sessionStorage.setItem(SK.r_goals, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handleNext() {
    if (!selectedCategory) return
    try {
      sessionStorage.setItem(SK.r_categories, selectedCategory)
      sessionStorage.setItem(SK.r_goals, JSON.stringify(selectedGoals))
    } catch {}
    router.push('/onboarding/business/R5')
  }

  const canProceed  = selectedCategory !== ''
  const filledCells = Math.ceil((selectedGoals.length / 5) * 36)
  const cols        = isWide ? 4 : 3

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: SPRING_KEYFRAMES }} />

      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <BrandNoticeAd
          name={bName || undefined}
          city={bCity || undefined}
          accent={ACCENT}
        />

        <BrandStepDots current={5} />

        <p style={{ fontFamily: MONO, fontSize: 9, color: `${ACCENT}99`, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          — BRAND PROFILE
        </p>
        <h1 style={{
          fontFamily: ABRIL,
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          What does your brand do?
        </h1>
        <p style={{ fontFamily: DM, fontSize: 14, color: '#9896B0', margin: '0 0 32px' }}>
          Pick a category and what you want from WIMC.
        </p>

        {/* ── Category section ──────────────────────────── */}
        <section style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 11, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
                CATEGORY — Pick one
              </span>
            </div>
            {/* Amber vertical badge */}
            <div style={{
              writingMode:    'vertical-rl' as const,
              transform:      'rotate(180deg)',
              background:     ACCENT,
              color:          NAVY,
              fontFamily:     BARLOW,
              fontWeight:     700,
              fontSize:       9,
              letterSpacing:  '0.20em',
              padding:        '10px 5px',
              flexShrink:     0,
              textTransform:  'uppercase' as const,
              lineHeight:     1,
            }}>
              BRAND PROFILE
            </div>
          </div>

          <div style={{
            display:             'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap:                 8,
            animation:           'r4-spring 600ms ease-out',
          }}>
            {CATEGORIES.map(cat => {
              const isSel = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  style={{
                    textAlign:     'left',
                    padding:       '14px 10px 12px',
                    position:      'relative',
                    overflow:      'hidden',
                    background:    isSel
                      ? `linear-gradient(145deg, ${ACCENT}22 0%, ${ACCENT}08 100%)`
                      : 'rgba(255,255,255,0.03)',
                    border:        `1px solid ${isSel ? ACCENT + '70' : 'rgba(255,255,255,0.08)'}`,
                    cursor:        'pointer',
                    transition:    'all 150ms',
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           5,
                  }}
                >
                  {isSel && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: ACCENT }} />
                  )}
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: isSel ? ACCENT : 'rgba(255,255,255,0.45)', lineHeight: 1 }}
                  >
                    {cat.icon}
                  </span>
                  <span style={{
                    fontFamily: OUTFIT, fontWeight: 700, fontSize: 11,
                    color:      isSel ? ACCENT : '#F0EFF8',
                    transition: 'color 150ms',
                    lineHeight: 1.2,
                  }}>{cat.label}</span>
                  {isWide && (
                    <span style={{ fontFamily: DM, fontSize: 10, color: '#5C5A72', lineHeight: 1.3 }}>
                      {cat.desc}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Goals section ─────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 11, color: '#9896B0', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
              GOALS — Multi-select
              {selectedGoals.length > 0 && (
                <span style={{ color: ACCENT, marginLeft: 8 }}>· {selectedGoals.length} selected</span>
              )}
            </span>
            {/* QR progress grid */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(6, 8px)',
              gap:                 2,
              flexShrink:          0,
            }}>
              {Array.from({ length: 36 }, (_, i) => (
                <div key={i} style={{
                  width:      8, height: 8,
                  background: i < filledCells ? ACCENT : 'rgba(255,255,255,0.08)',
                  transition: 'background 300ms',
                }} />
              ))}
            </div>
          </div>

          {isWide ? (
            /* Desktop: checkbox tiles */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {GOALS.map(goal => {
                const isSel = selectedGoals.includes(goal.id)
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    style={{
                      textAlign:  'left',
                      padding:    '14px 16px 12px',
                      position:   'relative',
                      overflow:   'hidden',
                      background: isSel ? `${ACCENT}12` : 'rgba(255,255,255,0.03)',
                      border:     `1px solid ${isSel ? ACCENT + '60' : 'rgba(255,255,255,0.08)'}`,
                      cursor:     'pointer',
                      transition: 'all 150ms',
                      display:    'flex',
                      alignItems: 'center',
                      gap:        12,
                    }}
                  >
                    {isSel && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: ACCENT }} />
                    )}
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20, color: isSel ? ACCENT : 'rgba(255,255,255,0.38)', flexShrink: 0 }}
                    >
                      {goal.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily:   OUTFIT, fontWeight: 700, fontSize: 14,
                        color:        isSel ? ACCENT : '#F0EFF8',
                        marginBottom: 2, transition: 'color 150ms',
                      }}>{goal.label}</div>
                      <div style={{ fontFamily: DM, fontSize: 12, color: '#5C5A72' }}>{goal.desc}</div>
                    </div>
                    <div style={{
                      width:           16, height: 16, flexShrink: 0,
                      border:          `1px solid ${isSel ? ACCENT + '80' : 'rgba(255,255,255,0.20)'}`,
                      background:      isSel ? `${ACCENT}20` : 'transparent',
                      display:         'flex', alignItems: 'center', justifyContent: 'center',
                      transition:      'all 150ms',
                    }}>
                      {isSel && <span style={{ fontSize: 10, color: ACCENT }}>✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            /* Mobile: chips */
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GOALS.map(goal => {
                const isSel = selectedGoals.includes(goal.id)
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        6,
                      padding:    '8px 14px',
                      background: isSel ? `${ACCENT}18` : 'transparent',
                      border:     `1px solid ${isSel ? ACCENT + '60' : 'rgba(255,255,255,0.15)'}`,
                      cursor:     'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14, color: isSel ? ACCENT : 'rgba(255,255,255,0.45)' }}
                    >
                      {goal.icon}
                    </span>
                    <span style={{
                      fontFamily:    BARLOW, fontWeight: 700, fontSize: 13,
                      color:         isSel ? ACCENT : '#F0EFF8',
                      letterSpacing: '0.04em',
                      transition:    'color 150ms',
                    }}>{goal.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Rotating postmark ─────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, paddingRight: 8, opacity: 0.22 }}>
          <svg
            width="68"
            height="68"
            viewBox="0 0 68 68"
            style={{ animation: 'r4-postmark-spin 14s linear infinite' }}
          >
            <circle cx="34" cy="34" r="28" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" />
            <circle cx="34" cy="34" r="18" fill="none" stroke={ACCENT} strokeWidth="0.8" />
            <text
              x="34" y="38"
              textAnchor="middle"
              fill={ACCENT}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="8"
              letterSpacing="1"
              fontWeight="700"
            >WIMC</text>
            <defs>
              <path id="r4-arc-top" d="M 8 34 A 26 26 0 0 1 60 34" />
              <path id="r4-arc-bot" d="M 8 34 A 26 26 0 0 0 60 34" />
            </defs>
            <text fill={ACCENT} fontFamily="'JetBrains Mono', monospace" fontSize="5.5" letterSpacing="1.8">
              <textPath href="#r4-arc-top" startOffset="8%">VERIFIED · BRAND ·</textPath>
            </text>
            <text fill={ACCENT} fontFamily="'JetBrains Mono', monospace" fontSize="5.5" letterSpacing="1.8">
              <textPath href="#r4-arc-bot" startOffset="8%">2025 · WIMC ·</textPath>
            </text>
          </svg>
        </div>
      </div>

      {/* ── Fixed footer ──────────────────────────────── */}
      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, height: 72,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: `linear-gradient(to top, ${NAVY} 60%, transparent 100%)`,
      }}>
        <button type="button" onClick={() => router.push('/onboarding/business/R3')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' as const }}>
              NODE_ID: R004-BRAND
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: canProceed ? ACCENT : 'rgba(255,255,255,0.20)', letterSpacing: '0.10em', textTransform: 'uppercase' as const }}>
              STATUS: {canProceed ? 'CATEGORY_SET' : 'AWAITING_CATEGORY'}
            </span>
          </div>
          <button type="button" onClick={handleNext} disabled={!canProceed}
            style={{
              background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
              color:         canProceed ? NAVY : 'rgba(255,255,255,0.22)',
              fontFamily:    ABRIL, fontSize: 15, textTransform: 'uppercase',
              padding:       '12px 28px', border: 'none',
              boxShadow:     canProceed ? '8px 8px 0px 0px rgba(0,0,0,0.9)' : 'none',
              cursor:        canProceed ? 'pointer' : 'not-allowed',
              transition:    'all 150ms',
            }}>
            NEXT STEP →
          </button>
        </div>
      </footer>
    </>
  )
}
