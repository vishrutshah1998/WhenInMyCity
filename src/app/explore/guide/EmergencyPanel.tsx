'use client'

// Emergency contacts hard-coded from the official 112 ERSS set and verified
// national helplines published by the Ministry of Home Affairs.
// Do NOT scrape or source these from a live feed.
// Do NOT add ERSS panic/SOS dispatch — it is a closed government system.

const HELPLINES: { label: string; number: string; emoji: string; color: string }[] = [
  { label: 'Ambulance (GVK EMRI)',    number: '108',   emoji: '🚑', color: '#C62828' },
  { label: 'Police Control Room',     number: '100',   emoji: '🚔', color: '#1565C0' },
  { label: 'Fire Brigade',            number: '101',   emoji: '🚒', color: '#BF360C' },
  { label: 'Women Helpline',          number: '181',   emoji: '🆘', color: '#6A1B9A' },
  { label: 'Childline',               number: '1098',  emoji: '🧒', color: '#00695C' },
  { label: 'Disaster Management',     number: '1070',  emoji: '⚠️', color: '#E65100' },
  { label: 'Senior Citizen Helpline', number: '14567', emoji: '🧓', color: '#37474F' },
]

// Calm, assertive red — not alarming, but unmistakable
const RED = '#C62828'

const storeLink: React.CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  gap:            6,
  padding:        '8px 16px',
  borderRadius:   8,
  border:         '1px solid var(--wimc-border-default)',
  color:          'var(--wimc-text-primary)',
  textDecoration: 'none',
  fontSize:       12,
  fontWeight:     500,
  fontFamily:     'var(--font-dm-sans)',
}

export default function EmergencyPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Primary 112 card ──────────────────────────────────────────────── */}
      <div style={{
        borderRadius:   16,
        background:     `rgba(198,40,40,0.06)`,
        border:         `2px solid rgba(198,40,40,0.30)`,
        overflow:       'hidden',
      }}>
        <div style={{ padding: '22px 20px 18px' }}>
          {/* Icon + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: RED,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
            }}>
              🆘
            </div>
            <div>
              <div style={{
                fontSize: 24, fontWeight: 800, color: RED,
                fontFamily: 'var(--font-syne)', lineHeight: 1.1,
              }}>
                112
              </div>
              <div style={{
                fontSize: 12, color: 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-dm-sans)', marginTop: 4, lineHeight: 1.4,
              }}>
                Police · Ambulance · Fire — all in one number
              </div>
            </div>
          </div>

          {/* Primary dial CTA */}
          <a
            href="tel:112"
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             10,
              width:           '100%',
              padding:         '16px 20px',
              borderRadius:    12,
              background:      RED,
              color:           '#fff',
              fontSize:        18,
              fontWeight:      800,
              textDecoration:  'none',
              fontFamily:      'var(--font-outfit)',
              boxSizing:       'border-box',
              letterSpacing:   '0.01em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
              call
            </span>
            Call 112
          </a>
        </div>

        <div style={{
          padding: '10px 20px 14px',
          fontSize: 11, color: 'var(--wimc-text-secondary)',
          fontFamily: 'var(--font-dm-sans)', lineHeight: 1.5,
          borderTop: 'rgba(198,40,40,0.15) solid 1px',
        }}>
          112 connects to the Emergency Response Support System (ERSS), operated by the Ministry of Home Affairs, Government of India.
        </div>
      </div>

      {/* ── 112 India app ────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 14,
        background:   'var(--wimc-bg-elevated)',
        border:       '1px solid var(--wimc-border-default)',
        padding:      '16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `rgba(198,40,40,0.09)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            📱
          </div>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)',
            }}>
              112 India App
            </div>
            <div style={{
              fontSize: 12, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-dm-sans)', marginTop: 3, lineHeight: 1.45,
            }}>
              Official government app — shares live location with emergency services automatically.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="https://play.google.com/store/apps/details?id=com.nic.erss"
            target="_blank"
            rel="noopener noreferrer"
            style={storeLink}
          >
            <span style={{ fontSize: 14 }}>▶</span> Play Store
          </a>
          <a
            href="https://apps.apple.com/in/app/112-india/id1369986999"
            target="_blank"
            rel="noopener noreferrer"
            style={storeLink}
          >
            <span style={{ fontSize: 14 }}>🍎</span> App Store
          </a>
        </div>
      </div>

      {/* ── Helplines list ───────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 14,
        background:   'var(--wimc-bg-elevated)',
        border:       '1px solid var(--wimc-border-default)',
        overflow:     'hidden',
      }}>
        <div style={{
          padding:         '11px 16px',
          borderBottom:    '1px solid var(--wimc-border-subtle)',
          fontSize:        10,
          fontWeight:      700,
          letterSpacing:   '0.12em',
          textTransform:   'uppercase',
          color:           'var(--wimc-text-secondary)',
          fontFamily:      'var(--font-jetbrains-mono)',
        }}>
          National Helplines
        </div>

        {HELPLINES.map(({ label, number, emoji, color }, i) => (
          <a
            key={number}
            href={`tel:${number}`}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 16px',
              borderBottom:   i < HELPLINES.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
              textDecoration: 'none',
              color:          'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>
                {emoji}
              </span>
              <span style={{
                fontSize: 13, color: 'var(--wimc-text-primary)',
                fontFamily: 'var(--font-dm-sans)',
              }}>
                {label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 15, fontWeight: 700, color,
              }}>
                {number}
              </span>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 16,
                  color: 'var(--wimc-text-muted)',
                  fontVariationSettings: "'FILL' 0",
                }}
              >
                call
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <div style={{
        fontSize:    10,
        color:       'var(--wimc-text-muted)',
        fontFamily:  'var(--font-jetbrains-mono)',
        lineHeight:  1.65,
        padding:     '0 2px',
      }}>
        Numbers sourced from the official 112 ERSS documentation and the Government of India helpline
        registry. Verify critical contacts with local authorities. WIMC does not dispatch emergency
        services and is not affiliated with ERSS.
      </div>

    </div>
  )
}
