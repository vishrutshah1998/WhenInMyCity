import { requireProfile } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewRow {
  rating:        number
  review:        string | null
  rated_at:      string | null
  event_title:   string
  reviewer_name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className="material-symbols-outlined"
          style={{
            fontSize:              size,
            fontVariationSettings: `'FILL' ${s <= rating ? 1 : 0}`,
            color:                 '#F59E0B',
          }}
        >star</span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TestimonialsPage() {
  const { profile } = await requireProfile()
  const admin       = createAdminClient()

  // Fetch all creator events
  const { data: events } = await admin
    .from('events')
    .select('id, title')
    .eq('creator_id', profile.id)

  const eventIds   = (events ?? []).map((e) => e.id)
  const eventMap   = Object.fromEntries((events ?? []).map((e) => [e.id, e.title]))

  let reviews: ReviewRow[] = []

  if (eventIds.length > 0) {
    const { data: histories } = await admin
      .from('explorer_event_history')
      .select('rating, review, rated_at, event_id, explorer_id')
      .in('event_id', eventIds)
      .not('rating', 'is', null)
      .order('rated_at', { ascending: false })

    if (histories?.length) {
      const explorerIds = histories.map((h) => h.explorer_id)
      const { data: explorers } = await admin
        .from('explorer_profiles')
        .select('id, display_name')
        .in('id', explorerIds)

      const explorerMap = Object.fromEntries((explorers ?? []).map((e) => [e.id, e.display_name]))

      reviews = histories
        .filter((h): h is typeof h & { rating: number } => h.rating !== null)
        .map((h) => ({
          rating:        h.rating,
          review:        h.review,
          rated_at:      h.rated_at,
          event_title:   eventMap[h.event_id] ?? 'Unknown event',
          reviewer_name: explorerMap[h.explorer_id] ?? 'Anonymous',
        }))
    }
  }

  // Summary stats
  const totalReviews = reviews.length
  const avgRating    = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length
  const highlighted   = reviews.filter((r) => r.rating >= 4)

  const topbar: React.CSSProperties = {
    height: 64, borderBottom: '1px solid var(--wimc-border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', zIndex: 40,
  }

  const card: React.CSSProperties = {
    background:   'var(--wimc-bg-elevated)',
    border:       '1px solid var(--wimc-border-default)',
    borderRadius: 18,
    padding:      24,
  }

  return (
    <>
      <header style={topbar}>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700 }}>Testimonials</div>
        {totalReviews > 0 && (
          <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
            {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {totalReviews === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 48 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--wimc-coral-dim)', border: '1px solid rgba(232,112,90,0.3)',
              display: 'grid', placeItems: 'center', margin: '0 auto 20px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--wimc-coral)' }}>reviews</span>
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
              No reviews yet
            </div>
            <div style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Attendees receive a WhatsApp review prompt 24 hours after your event ends. Reviews will appear here once they come in.
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Total Reviews',  value: String(totalReviews) },
                { label: 'Average Rating', value: avgRating.toFixed(1) + ' / 5' },
                { label: '5-Star Reviews', value: `${fiveStarCount} (${totalReviews > 0 ? Math.round(fiveStarCount / totalReviews * 100) : 0}%)` },
              ].map(({ label, value }) => (
                <div key={label} style={card}>
                  <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-syne)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Top picks */}
            {highlighted.length > 0 && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#F59E0B' }}>star</span>
                  Top Reviews
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {highlighted.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ ...card, padding: 20, borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--wimc-coral-dim)',
                            display: 'grid', placeItems: 'center',
                            fontSize: 13, fontWeight: 700, color: 'var(--wimc-coral)',
                          }}>
                            {r.reviewer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reviewer_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)' }}>{r.event_title}</div>
                          </div>
                        </div>
                        <StarRow rating={r.rating} />
                      </div>
                      {r.review && (
                        <p style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                          &ldquo;{r.review}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All reviews table */}
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>All Reviews</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {reviews.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 80px 100px',
                      gap: 16,
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: i < reviews.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.reviewer_name}</div>
                      {r.review && (
                        <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          &ldquo;{r.review}&rdquo;
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.event_title}
                    </div>
                    <StarRow rating={r.rating} size={14} />
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', textAlign: 'right' }}>
                      {r.rated_at ? new Date(r.rated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </>
  )
}
