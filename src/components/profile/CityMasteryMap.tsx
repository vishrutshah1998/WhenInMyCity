import type { MasteryNeighbourhood } from '@/app/actions/analytics'

interface Props {
  neighbourhoods: MasteryNeighbourhood[]
  isOwner: boolean
  sharingEnabled: boolean
}

const BADGE_COLORS = [
  { bg: 'rgba(232,87,42,0.12)', border: 'rgba(232,87,42,0.30)', text: '#E8572A' },
  { bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.30)', text: '#818CF8' },
  { bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.30)', text: '#22D3EE' },
  { bg: 'rgba(110,231,183,0.12)', border: 'rgba(110,231,183,0.30)', text: '#059669' },
  { bg: 'rgba(245,168,0,0.12)', border: 'rgba(245,168,0,0.30)', text: '#d97706' },
  { bg: 'rgba(224,29,72,0.10)', border: 'rgba(224,29,72,0.25)', text: '#E11D48' },
]

export default function CityMasteryMap({ neighbourhoods, isOwner, sharingEnabled }: Props) {
  if (neighbourhoods.length === 0) {
    if (!isOwner) return null
    return (
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-base">explore</span>
          <span className="text-sm font-semibold">City Mastery Map</span>
        </div>
        <p className="text-xs text-on-surface-variant/70 leading-relaxed">
          Attend your first event to start filling your map. Your explored neighbourhoods will appear here.
        </p>
      </section>
    )
  }

  const uniqueCities = [...new Set(neighbourhoods.map((n) => n.city))]
  const totalNeighbourhoods = neighbourhoods.length

  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            explore
          </span>
          <span className="text-sm font-bold text-on-surface">City Mastery Map</span>
        </div>
        <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
          {totalNeighbourhoods} {totalNeighbourhoods === 1 ? 'neighbourhood' : 'neighbourhoods'}
        </span>
      </div>

      {/* City groups */}
      {uniqueCities.map((city) => {
        const spots = neighbourhoods.filter((n) => n.city === city)
        return (
          <div key={city} className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">{city}</p>
            <div className="flex flex-wrap gap-2">
              {spots.map((spot, i) => {
                const palette = BADGE_COLORS[i % BADGE_COLORS.length]
                return (
                  <div
                    key={spot.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background:   palette.bg,
                      border:       `1px solid ${palette.border}`,
                      color:        palette.text,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}
                    >
                      location_on
                    </span>
                    {spot.label}
                    {spot.eventCount > 1 && (
                      <span
                        className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: palette.border, color: palette.text }}
                      >
                        ×{spot.eventCount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Owner hint when not sharing */}
      {isOwner && !sharingEnabled && (
        <p className="text-[11px] text-on-surface-variant/60 leading-relaxed border-t border-outline-variant/20 pt-3">
          Only you can see this. Toggle &ldquo;Share city mastery map&rdquo; in your profile settings to make it public.
        </p>
      )}
    </section>
  )
}
