import Link from 'next/link'
import type { Community } from '@/app/actions/communities'

const LAVENDER = '#9B8FFF'
const PANEL    = '#131317'
const BORDER   = 'rgba(155,143,255,0.15)'
const MUTED    = '#9896B0'
const TEXT     = '#F0EFF8'

// Real wiring for the Explorer carousel's Communities tab — replaces the
// CommunitiesComingSoon stub for THIS one embed only. CommunitiesComingSoon
// itself is untouched and still used elsewhere (ExplorerProfileHubClient).
//
// /circles (browse-all) now exists — empty state offers both Browse and
// Start, not just Start.
export default function ExplorerCommunitiesPanel({ communities }: { communities: Community[] }) {
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

      {communities.length === 0 ? (
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: '20px 20px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 26, color: MUTED, display: 'block', marginBottom: 8 }}>
            groups
          </span>
          <p style={{ fontSize: 12, color: MUTED, margin: '0 0 14px' }}>
            You haven&apos;t joined a circle yet — like Garba In My City or Read In My City.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/circles"
              style={{
                display: 'inline-block', padding: '9px 16px', borderRadius: 999,
                border: `1px solid ${LAVENDER}`, color: LAVENDER, textDecoration: 'none',
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
              }}
            >
              Browse Circles
            </Link>
            <Link
              href="/circles/new"
              style={{
                display: 'inline-block', padding: '9px 16px', borderRadius: 999,
                background: LAVENDER, color: '#0A0814', textDecoration: 'none',
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
              }}
            >
              Start a Circle
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/circles/${c.slug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: PANEL, border: `1px solid ${BORDER}`, textDecoration: 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 999, flexShrink: 0,
                background: c.cover_image_url ? undefined : 'rgba(155,143,255,0.12)',
                backgroundImage: c.cover_image_url ? `url(${c.cover_image_url})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!c.cover_image_url && <span className="material-symbols-outlined" style={{ fontSize: 16, color: LAVENDER }}>groups</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{c.name}</div>
                {c.city && (
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9.5, color: MUTED, textTransform: 'uppercase', marginTop: 2 }}>
                    {c.city}
                  </div>
                )}
              </div>
            </Link>
          ))}
          <Link
            href="/circles/new"
            style={{
              textAlign: 'center', padding: '10px 0', border: `1px dashed ${BORDER}`,
              color: LAVENDER, textDecoration: 'none',
              fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
            }}
          >
            + Start another Circle
          </Link>
        </div>
      )}
    </div>
  )
}
