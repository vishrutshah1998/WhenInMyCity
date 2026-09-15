import Link from 'next/link'
import type { Community } from '@/app/actions/communities'
import PaperCard from '@/components/ui/PaperCard'
import IconChip from '@/components/ui/IconChip'

// Real wiring for the Explorer carousel's Communities tab — replaces the
// CommunitiesComingSoon stub for THIS one embed only. CommunitiesComingSoon
// itself is untouched and still used elsewhere (ExplorerProfileHubClient).
//
// /circles (browse-all) now exists — empty state offers both Browse and
// Start, not just Start.
//
// Paper-cutout pass: swapped the old hardcoded LAVENDER/PANEL/BORDER/MUTED/
// TEXT hex constants for PaperCard/IconChip + the shared --venue-* tokens
// (this surface resolves them to lavender/violet via the .explorer-variant
// class applied in explore/dashboard/layout.tsx — see venue-tokens.css).
export default function ExplorerCommunitiesPanel({ communities }: { communities: Community[] }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 10, fontWeight: 700,
        color: 'var(--venue-accent)', letterSpacing: '0.2em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        Communities
      </div>

      {communities.length === 0 ? (
        <PaperCard
          borderColor="var(--venue-text-primary)"
          background="var(--venue-bg-elevated)"
          padding="20px 20px"
          style={{ textAlign: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--venue-text-secondary)', display: 'block', marginBottom: 8 }}>
            groups
          </span>
          <p style={{ fontSize: 12, color: 'var(--venue-text-secondary)', margin: '0 0 14px' }}>
            You haven&apos;t joined a circle yet — like Garba In My City or Read In My City.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/circles"
              style={{
                display: 'inline-block', padding: '9px 16px', borderRadius: 999,
                border: '1px solid var(--venue-accent)', color: 'var(--venue-accent)', textDecoration: 'none',
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
              }}
            >
              Browse Circles
            </Link>
            <Link
              href="/circles/new"
              style={{
                display: 'inline-block', padding: '9px 16px', borderRadius: 999,
                background: 'var(--venue-accent)', color: 'var(--venue-bg-base)', textDecoration: 'none',
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
              }}
            >
              Start a Circle
            </Link>
          </div>
        </PaperCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {communities.map((c) => (
            <PaperCard
              key={c.id}
              href={`/circles/${c.slug}`}
              borderColor="var(--venue-text-primary)"
              background="var(--venue-bg-elevated)"
              padding="14px 16px"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <IconChip
                color="var(--venue-accent-tint)"
                iconColor="var(--venue-accent)"
                radius={999}
                style={c.cover_image_url ? {
                  backgroundImage: `url(${c.cover_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : undefined}
              >
                {!c.cover_image_url && (
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>groups</span>
                )}
              </IconChip>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--venue-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                  {c.name}
                </div>
                {c.city && (
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9.5, color: 'var(--venue-text-secondary)', textTransform: 'uppercase', marginTop: 2 }}>
                    {c.city}
                  </div>
                )}
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-text-muted)', flexShrink: 0 }}>
                chevron_right
              </span>
            </PaperCard>
          ))}
          <Link
            href="/circles/new"
            style={{
              textAlign: 'center', padding: '10px 0', border: '1px dashed var(--venue-border-default)',
              color: 'var(--venue-accent)', textDecoration: 'none',
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
