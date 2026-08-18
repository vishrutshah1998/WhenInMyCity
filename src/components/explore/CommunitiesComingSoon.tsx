'use client'

const LAVENDER = '#9B8FFF'
const PANEL    = '#131317'
const BORDER   = 'rgba(155,143,255,0.15)'
const MUTED    = '#9896B0'

// Real planned feature, not built yet — do not substitute gamification badges
// or fabricate memberships here. Shared between ExplorerProfileHubClient.tsx
// (where this block originated) and the Explorer carousel's Communities page,
// so the two surfaces never drift on copy/styling.
export default function CommunitiesComingSoon() {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 10, fontWeight: 700,
        color: LAVENDER, letterSpacing: '0.2em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        Communities
      </div>
      <div style={{
        background: PANEL, border: `1px solid ${BORDER}`,
        padding: '20px 20px', textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: MUTED, display: 'block', marginBottom: 8 }}>
          groups
        </span>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Coming soon — join scenes like Salsa In My City or Read In My City.
        </p>
      </div>
    </div>
  )
}
