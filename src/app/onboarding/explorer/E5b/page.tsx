'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const ACCENT  = '#9B8FFF'
const TEAL    = '#5DD9D0'
const NAVY    = '#1A2744'

const FORMAT_OPTIONS = [
  { id: 'small_group',  label: 'Small Groups', emoji: '👥' },
  { id: 'workshop',     label: 'Workshops',    emoji: '🛠️' },
  { id: 'performance',  label: 'Performances', emoji: '🎭' },
  { id: 'networking',   label: 'Networking',   emoji: '🤝' },
  { id: 'outdoor',      label: 'Outdoor',      emoji: '🌿' },
  { id: 'dining',       label: 'Dining',       emoji: '🍽️' },
]

export default function E5bPage() {
  const router = useRouter()
  const [formats,     setFormats]     = useState<string[]>([])
  const [priceMax,    setPriceMax]    = useState(1000)
  const [notifWa,     setNotifWa]     = useState(true)
  const [digestFreq,  setDigestFreq]  = useState<'daily' | 'weekly' | 'never'>('weekly')
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const interests = sessionStorage.getItem(SK.e_interests)
    if (interests === null) { router.replace('/onboarding/explorer/E5'); return }
    try {
      const savedFormats = JSON.parse(sessionStorage.getItem(SK.e_formats) || '[]') as string[]
      if (savedFormats.length > 0) setFormats(savedFormats)
    } catch {}
    const savedPrice = sessionStorage.getItem(SK.e_price_max)
    if (savedPrice) setPriceMax(Number(savedPrice))
    const savedWa = sessionStorage.getItem(SK.e_notif_wa)
    if (savedWa !== null) setNotifWa(savedWa === 'true')
    const savedDigest = sessionStorage.getItem(SK.e_digest_freq)
    if (savedDigest) setDigestFreq(savedDigest as 'daily' | 'weekly' | 'never')
  }, [router])

  function toggleFormat(id: string) {
    setFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  function handleContinue() {
    if (isAdvancing) return
    setIsAdvancing(true)
    try {
      sessionStorage.setItem(SK.e_formats,     JSON.stringify(formats))
      sessionStorage.setItem(SK.e_price_max,   String(priceMax))
      sessionStorage.setItem(SK.e_notif_wa,    String(notifWa))
      sessionStorage.setItem(SK.e_digest_freq, digestFreq)
    } catch {}
    router.push('/onboarding/explorer/E6')
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily:    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
    fontSize:      9,
    fontWeight:    700,
    color:         ACCENT,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom:  12,
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 40px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          How do you like to explore?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 40px', maxWidth: 400 }}>
          We&apos;ll use this to match your event feed.
        </p>

        {/* Preferred Formats */}
        <div style={{ marginBottom: 40 }}>
          <div style={sectionLabelStyle}>Preferred Formats</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 520 }}>
            {FORMAT_OPTIONS.map(fmt => {
              const isSel = formats.includes(fmt.id)
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => toggleFormat(fmt.id)}
                  style={{
                    padding:      '9px 16px',
                    borderRadius: 9999,
                    border:       `1px solid ${isSel ? TEAL : 'rgba(93,217,208,0.2)'}`,
                    background:   isSel ? 'rgba(93,217,208,0.12)' : 'transparent',
                    color:        isSel ? TEAL : 'rgba(255,255,255,0.50)',
                    fontFamily:   "'DM Sans', sans-serif",
                    fontWeight:   500,
                    fontSize:     13,
                    cursor:       'pointer',
                    transition:   'all 150ms',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          6,
                  }}
                >
                  <span>{fmt.emoji}</span>
                  {fmt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Max Ticket Price */}
        <div style={{ marginBottom: 40, maxWidth: 480 }}>
          <div style={sectionLabelStyle}>Max Ticket Price</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 32, color: '#F0EFF8', marginBottom: 12 }}>
            {priceMax === 0 ? 'Free only' : `₹${priceMax.toLocaleString('en-IN')}`}
          </div>
          <input
            type="range"
            min={0} max={2000} step={50}
            value={priceMax}
            onChange={e => setPriceMax(Number(e.target.value))}
            style={{ width: '100%', accentColor: ACCENT }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9896B0', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
            <span>₹0 — Free only</span><span>₹2,000</span>
          </div>
        </div>

        {/* Notifications */}
        <div style={{ maxWidth: 480 }}>
          <div style={sectionLabelStyle}>Notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifWa}
                onChange={e => setNotifWa(e.target.checked)}
                style={{ accentColor: ACCENT, width: 16, height: 16 }}
              />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#F0EFF8' }}>
                WhatsApp event updates
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9896B0' }}>Digest:</span>
              {(['daily', 'weekly', 'never'] as const).map(f => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="digest"
                    value={f}
                    checked={digestFreq === f}
                    onChange={() => setDigestFreq(f)}
                    style={{ accentColor: ACCENT }}
                  />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#F0EFF8', textTransform: 'capitalize' }}>{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E5')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={isAdvancing}
          style={{
            background:    ACCENT,
            color:         NAVY,
            fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight:    700,
            fontSize:      15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     '8px 8px 0px 0px #000000',
            cursor:        isAdvancing ? 'wait' : 'pointer',
            opacity:       isAdvancing ? 0.7 : 1,
          }}>
          Continue →
        </button>
      </footer>
    </>
  )
}
