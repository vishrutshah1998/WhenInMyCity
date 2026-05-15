'use client'

import { useRouter } from 'next/navigation'
import { WimcLogo } from '@/components/WimcLogo'

const GOALS = [
  {
    id: 'creator',
    icon: '🎤',
    title: 'Creator',
    description: 'Host events, build your stage, sell tickets',
    color: '#E8705A',
    bg: 'rgba(232,112,90,0.08)',
    border: 'rgba(232,112,90,0.3)',
  },
  {
    id: 'business',
    icon: '🏢',
    title: 'Business',
    description: 'Promote your venue, brand, or space',
    color: '#3B6BCC',
    bg: 'rgba(59,107,204,0.08)',
    border: 'rgba(59,107,204,0.3)',
  },
  {
    id: 'personal',
    icon: '✨',
    title: 'Personal',
    description: 'Share your links and connect with people',
    color: '#5DD9D0',
    bg: 'rgba(93,217,208,0.08)',
    border: 'rgba(93,217,208,0.3)',
  },
] as const

export default function RolePickerClient() {
  const router = useRouter()

  function handleSelect(goalId: string) {
    sessionStorage.setItem('wimc_goal', goalId)
    router.push('/onboarding/screen-1')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0b', color: '#fff', fontFamily: 'var(--font-dm-sans), sans-serif' }}>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(232,112,90,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 350, height: 350, background: 'radial-gradient(circle, rgba(93,217,208,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        <WimcLogo size="sm" color="white" />
      </header>

      {/* Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-jetbrains-mono, monospace)', marginBottom: 12 }}>
              Welcome
            </div>
            <h1 style={{ fontFamily: 'var(--font-syne, serif)', fontSize: 32, fontWeight: 800, lineHeight: 1.15, margin: 0, marginBottom: 10 }}>
              What brings you<br />to WIMC?
            </h1>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              We'll tailor your setup based on your goal.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleSelect(goal.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 20px', borderRadius: 16, textAlign: 'left',
                  background: goal.bg, border: `2px solid ${goal.border}`,
                  cursor: 'pointer', transition: 'all 200ms ease', width: '100%',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.background = goal.bg.replace('0.08', '0.14')
                  el.style.borderColor = goal.color
                  el.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.background = goal.bg
                  el.style.borderColor = goal.border
                  el.style.transform = ''
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: 24,
                  background: `${goal.color}18`,
                }}>
                  {goal.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-syne, serif)', marginBottom: 3 }}>
                    {goal.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {goal.description}
                  </div>
                </div>
                <span style={{ color: goal.color, fontSize: 20, opacity: 0.7 }}>›</span>
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            By continuing, you agree to our{' '}
            <a href="#" style={{ color: '#E8705A', textDecoration: 'none' }}>Terms</a>
            {' '}and{' '}
            <a href="#" style={{ color: '#E8705A', textDecoration: 'none' }}>Privacy Policy</a>
          </p>
        </div>
      </main>
    </div>
  )
}
