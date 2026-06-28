'use client'

export interface PreviewData {
  name?:      string
  username?:  string
  category?:  string
  city?:      string
  accent?:    string
  bio?:       string
  platforms?: string[]
}

export function PagePreviewCard({ data }: { data: PreviewData }) {
  const accent = data.accent || '#E8705A'

  return (
    <div
      style={{
        position:      'fixed',
        top:           72,
        right:         16,
        zIndex:        40,
        width:         140,
        background:    '#111116',
        border:        '1px solid rgba(255,255,255,0.10)',
        borderRadius:  8,
        overflow:      'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Phone notch */}
      <div style={{ height: 6, background: '#07070A', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 32, height: 3, background: 'rgba(255,255,255,0.10)', borderRadius: 99 }} />
      </div>

      {/* Zine cover mini */}
      <div style={{ background: '#1A2744', padding: '8px 8px 4px', position: 'relative', overflow: 'hidden', minHeight: 80 }}>
        {/* Category badge */}
        {data.category && (
          <div style={{ display: 'inline-block', padding: '2px 6px', marginBottom: 4, background: accent }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 7, color: '#1A2744', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {data.category}
            </span>
          </div>
        )}

        {/* Name */}
        <div style={{
          fontFamily:  "'Outfit', sans-serif",
          fontWeight:  900,
          fontSize:    13,
          color:       '#ffffff',
          textTransform: 'uppercase',
          lineHeight:  1,
          overflow:    'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:  'nowrap',
        }}>
          {data.name || <span style={{ color: 'rgba(255,255,255,0.20)' }}>YOUR NAME</span>}
        </div>

        {/* Handle */}
        {data.username && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 7, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
            @{data.username}
          </div>
        )}

        {/* City strip */}
        {data.city && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 6, color: 'rgba(255,255,255,0.25)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {data.city} · CULTURE
          </div>
        )}

        {/* Bio preview */}
        {data.bio && (
          <div style={{
            fontFamily:  "'DM Sans', sans-serif",
            fontSize:    6,
            color:       'rgba(255,255,255,0.50)',
            marginTop:   4,
            lineHeight:  1.4,
            display:     '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow:    'hidden',
          }}>
            {data.bio}
          </div>
        )}

        {/* Platform dots */}
        {data.platforms && data.platforms.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {data.platforms.slice(0, 4).map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, background: 'rgba(255,255,255,0.80)', borderRadius: 2 }} />
            ))}
          </div>
        )}
      </div>

      {/* Tear line */}
      <div style={{
        height: 2,
        background: `repeating-linear-gradient(90deg, ${accent}, ${accent} 3px, transparent 3px, transparent 6px)`,
      }} />

      {/* Stats mini */}
      <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
        {['0 events', '0 attended'].map((s, i) => (
          <div key={i} style={{ background: '#07070A', padding: '2px 4px', flex: 1 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 5, color: 'rgba(255,255,255,0.30)' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* URL bar */}
      <div style={{ padding: '0 8px 8px' }}>
        <div style={{ background: '#07070A', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: accent }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 5, color: 'rgba(255,255,255,0.30)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            wimc/{data.username || '...'}
          </span>
        </div>
      </div>
    </div>
  )
}
