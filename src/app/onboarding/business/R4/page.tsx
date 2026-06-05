'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#F5A800'
const WARM_BG = '#FFFBF0'

const CATEGORIES: Array<{ id: string; emoji: string; label: string }> = [
  { id: 'retail',    emoji: '🛍️', label: 'Retail'    },
  { id: 'agency',    emoji: '💼', label: 'Agency'    },
  { id: 'startup',   emoji: '🚀', label: 'Startup'   },
  { id: 'creative',  emoji: '🎨', label: 'Creative'  },
  { id: 'fnb',       emoji: '🍽️', label: 'F&B'       },
  { id: 'fashion',   emoji: '👗', label: 'Fashion'   },
  { id: 'tech',      emoji: '💻', label: 'Tech'      },
  { id: 'media',     emoji: '🎬', label: 'Media'     },
  { id: 'beauty',    emoji: '✨', label: 'Beauty'    },
  { id: 'education', emoji: '📚', label: 'Education' },
  { id: 'health',    emoji: '💚', label: 'Health'    },
  { id: 'other',     emoji: '⚡', label: 'Other'     },
]

const GOALS = [
  { id: 'reach_creators',  label: 'Reach creators',   desc: 'Connect with performers, artists and creators' },
  { id: 'host_collabs',    label: 'Host collabs',      desc: 'Partner on events, shoots and pop-ups'        },
  { id: 'sponsor_events',  label: 'Sponsor events',    desc: 'Fund cultural nights and community shows'     },
  { id: 'build_community', label: 'Build community',   desc: 'Build a creator community around your brand'  },
  { id: 'grow_brand',      label: 'Grow brand',        desc: 'Increase visibility in Tier-2 cities'         },
] as const

export default function R4Page() {
  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedGoals,    setSelectedGoals]    = useState<string[]>([])
  const [bName,            setBName]            = useState('')
  const [bCity,            setBCity]            = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'brand') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    const savedCat = sessionStorage.getItem(SK.r_categories)
    if (savedCat) setSelectedCategory(savedCat)
    try {
      const savedGoals = sessionStorage.getItem(SK.r_goals)
      if (savedGoals) setSelectedGoals(JSON.parse(savedGoals) as string[])
    } catch {}
  }, [router])

  function toggleGoal(id: string) {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  function handleNext() {
    if (!selectedCategory) return
    try {
      sessionStorage.setItem(SK.r_categories, selectedCategory)
      sessionStorage.setItem(SK.r_goals, JSON.stringify(selectedGoals))
    } catch {}
    router.push('/onboarding/business/R5')
  }

  const canProceed = selectedCategory !== ''

  return (
    <>

      <div style={{ minHeight: '100%', /* bg transparent — navy from layout panel */ overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,44px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          What kind of brand are you?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.5)', margin: '0 0 40px', maxWidth: 400 }}>
          Shapes your page and how creators discover you
        </p>

        {/* Category — rounded-full pills */}
        <section style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(240,239,248,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Category</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
            {CATEGORIES.map(cat => {
              const isSel = selectedCategory === cat.id
              return (
                <button key={cat.id} type="button" onClick={() => setSelectedCategory(isSel ? '' : cat.id)}
                  style={{ padding: '10px 18px', borderRadius: 999, cursor: 'pointer', transition: 'all 150ms', border: isSel ? 'none' : '1px solid rgba(255,255,255,0.14)', background: isSel ? ACCENT : 'rgba(255,255,255,0.9)', color: isSel ? '#07070A' : '#1A1A1A', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{cat.emoji}</span>{cat.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Goals */}
        <section>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(240,239,248,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            What do you want from WIMC?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
            {GOALS.map(goal => {
              const isSel = selectedGoals.includes(goal.id)
              return (
                <button key={goal.id} type="button" onClick={() => toggleGoal(goal.id)}
                  style={{ textAlign: 'left', padding: 16, cursor: 'pointer', transition: 'all 150ms', display: 'flex', gap: 14, alignItems: 'flex-start', borderLeft: `4px solid ${isSel ? ACCENT : 'transparent'}`, borderTop: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`, borderRight: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`, borderBottom: `1px solid ${isSel ? `${ACCENT}30` : 'rgba(255,255,255,0.09)'}`, background: isSel ? `${ACCENT}12` : 'rgba(255,255,255,0.85)' }}>
                  <div style={{ width: 16, height: 16, border: `1px solid ${ACCENT}`, flexShrink: 0, marginTop: 2, background: isSel ? `${ACCENT}30` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSel && <span className="material-symbols-outlined" style={{ fontSize: 12, color: ACCENT }}>check</span>}
                  </div>
                  <div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: isSel ? ACCENT : 'rgba(26,26,26,0.75)', display: 'block', marginBottom: 2 }}>{goal.label}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(240,239,248,0.45)' }}>{goal.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(to top, #1A2744 60%, transparent 100%)` }}>
        <button type="button" onClick={() => router.push('/onboarding/business/B3')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleNext} disabled={!canProceed}
          style={{ background: canProceed ? ACCENT : 'rgba(255,255,255,0.10)', color: canProceed ? '#07070A' : 'rgba(26,26,26,0.25)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'background 200ms' }}>
          Continue
        </button>
      </footer>
    </>
  )
}
