// Shared static profile preview used on C8 (polish + reveal) and the right panel.
// Theme color props override the default WIMC Classic boarding-pass palette.

const CORAL = '#E8705A'
const NAVY  = '#1A2744'

const CATEGORY_LABELS: Record<string, string> = {
  music: 'MUSICIAN', theatre: 'THEATRE', art: 'ARTIST',
  video: 'VIDEO CREATOR', education: 'EDUCATOR', comedy: 'COMEDIAN',
  podcasts: 'PODCASTER', photo: 'PHOTOGRAPHER', events: 'EVENT HOST',
  dance: 'DANCER', writing: 'WRITER', lifestyle: 'CREATOR',
  comedy_theatre: 'COMEDIAN', art_design: 'ARTIST', video_content: 'VIDEO CREATOR',
  teaching_coaching: 'EDUCATOR', lifestyle_wellness: 'WELLNESS', business_brand: 'BRAND',
  professional_portfolio: 'PROFESSIONAL', community_impact: 'COMMUNITY',
  exploring: 'EXPLORER',
}

const BARCODE = [3,1,4,2,1,3,1,2,4,1,3,2,1,4,2,1,3,4,1,2,3,1]

const PLATFORM_COLORS: Record<string, string> = {
  instagram:  '#E1306C',
  youtube:    '#FF0000',
  x:          '#1DA1F2',
  spotify:    '#1DB954',
  soundcloud: '#FF3300',
  website:    '#5DD9D0',
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram:  'photo_camera',
  youtube:    'play_circle',
  x:          'close',
  spotify:    'music_note',
  soundcloud: 'cloud',
  website:    'language',
}

interface Props {
  displayName: string
  username:    string
  city:        string
  category:    string
  subTypes:    string[]
  bio?:        string
  avatarUrl?:  string | null
  socialLinks?: Record<string, string>
  // Optional theme overrides — when provided, replace the default WIMC Classic palette
  previewPrimary?: string
  previewBg?:      string
  previewSurface?: string
  previewText?:    string
  previewLight?:   boolean
}

export default function ProfilePreview({
  displayName, username, city, category, subTypes, bio, avatarUrl, socialLinks,
  previewPrimary, previewBg, previewSurface, previewText, previewLight,
}: Props) {
  const primary = previewPrimary ?? CORAL
  const bg      = previewBg      ?? NAVY
  const surface = previewSurface ?? '#FAF7F0'
  const light   = previewLight   ?? false

  const label    = CATEGORY_LABELS[category] ?? 'CREATOR'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const issueNum = username.slice(-3).toUpperCase() || '001'

  // Adaptive text colors for dark vs light themes
  const mutedText  = light ? 'rgba(0,0,0,0.30)'  : 'rgba(255,255,255,0.25)'
  const bodyText   = light ? (previewText ?? '#1A1A1A') : '#F0EFF8'
  const subText    = light ? 'rgba(0,0,0,0.45)'  : 'rgba(255,255,255,0.45)'
  const dotFill    = light ? 'rgba(0,0,0,0.04)'  : 'rgba(255,255,255,0.04)'
  const divider    = `${primary}35`
  const badgeText  = light ? bg : '#ffffff'
  const statText   = light ? (previewText ?? '#1A1A1A') : primary
  const barColor   = light ? `rgba(0,0,0,0.15)` : 'rgba(255,255,255,0.15)'

  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(${dotFill} 1px, transparent 0)`,
        backgroundSize: '14px 14px',
        pointerEvents: 'none',
      }} />

      {/* Zine header strip */}
      <div style={{
        borderBottom: `1px dashed ${divider}`,
        padding: '10px 14px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <span style={{ fontSize: 7, letterSpacing: '0.15em', color: mutedText, textTransform: 'uppercase' }}>
          ISSUE № {issueNum}
        </span>
        <span style={{ fontSize: 7, letterSpacing: '0.15em', color: mutedText, textTransform: 'uppercase' }}>
          {city ? city.toUpperCase() : 'INDIA'}
        </span>
        <span style={{ fontSize: 7, letterSpacing: '0.15em', color: mutedText, textTransform: 'uppercase' }}>
          2025
        </span>
      </div>

      {/* Avatar + name */}
      <div style={{
        padding: '14px 14px 8px',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: avatarUrl ? 'transparent' : `${primary}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          border: `2px solid ${primary}30`,
          overflow: 'hidden',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, color: light ? bg : NAVY, lineHeight: 1 }}>{initials}</span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <span style={{
            display: 'inline-block',
            background: primary, color: badgeText,
            fontSize: 7, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', padding: '2px 6px', marginBottom: 4,
          }}>{label}</span>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 900,
            fontSize: 20, color: bodyText, lineHeight: 1,
            textTransform: 'uppercase', letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{displayName || 'YOUR NAME'}</div>
          <div style={{ fontSize: 9, color: subText, marginTop: 2, letterSpacing: '0.05em' }}>
            @{username || 'username'}
          </div>
        </div>
      </div>

      {/* City */}
      {city && (
        <div style={{
          padding: '0 14px 8px',
          display: 'flex', alignItems: 'center', gap: 5,
          flexShrink: 0, position: 'relative', zIndex: 1,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 11, color: primary }}>location_on</span>
          <span style={{ fontSize: 9, color: subText, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            CREATING IN {city.toUpperCase()}
          </span>
        </div>
      )}

      {/* Bio */}
      {bio && (
        <div style={{
          padding: '0 14px 10px',
          flexShrink: 0, position: 'relative', zIndex: 1,
        }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10, color: subText,
            margin: 0, lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{bio}</p>
        </div>
      )}

      {/* Sub-type pills */}
      {subTypes.length > 0 && (
        <div style={{
          padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 4,
          flexShrink: 0, position: 'relative', zIndex: 1,
        }}>
          {subTypes.slice(0, 3).map(s => (
            <span key={s} style={{
              background: `${primary}15`, border: `1px solid ${primary}30`,
              color: subText, fontSize: 7,
              padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>{s.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: `1px dashed ${divider}`, margin: '0 14px', flexShrink: 0, position: 'relative', zIndex: 1 }} />

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        padding: '10px 14px', gap: 8,
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {[['0', 'EVENTS HOSTED'], [city ? '1' : '0', 'CITIES ACTIVE'], [String(subTypes.length || '—'), 'STYLES']].map(([val, lbl]) => (
          <div key={lbl} style={{ background: surface, padding: '6px 8px' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, color: statText, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 6, color: `${statText}70`, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <div style={{ padding: '0 14px 10px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          background: primary, color: badgeText,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px', fontWeight: 700,
          fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>link</span>
          COPY MY LINK
        </div>
      </div>

      {/* Upcoming events */}
      <div style={{ padding: '0 14px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 14, height: 2, background: primary, flexShrink: 0 }} />
          <span style={{ fontSize: 7, letterSpacing: '0.25em', color: mutedText, textTransform: 'uppercase' }}>UPCOMING EVENTS</span>
        </div>
        <div style={{ border: `1px dashed ${divider}`, padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: mutedText, letterSpacing: '0.2em', textTransform: 'uppercase' }}>NO UPCOMING EVENTS</div>
          <div style={{ fontSize: 8, color: `${mutedText}`, marginTop: 3, opacity: 0.6 }}>Events will appear here</div>
        </div>
      </div>

      {/* Social platform badges */}
      {socialLinks && Object.keys(socialLinks).some(k => socialLinks[k]?.trim()) && (
        <div style={{
          padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap',
          flexShrink: 0, position: 'relative', zIndex: 1,
        }}>
          {Object.entries(socialLinks).filter(([, v]) => v?.trim()).map(([pid]) => (
            <div key={pid} style={{
              width: 20, height: 20, borderRadius: '50%',
              background: PLATFORM_COLORS[pid] ?? primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 10, color: '#fff' }}>
                {PLATFORM_ICONS[pid] ?? 'link'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Barcode strip */}
      <div style={{
        marginTop: 'auto', padding: '8px 14px',
        borderTop: `1px dashed ${divider}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <span style={{ fontSize: 6, color: mutedText, letterSpacing: '0.1em' }}>WHENINMYCITY.COM</span>
        <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 12 }}>
          {BARCODE.map((w, i) => (
            <div key={i} style={{ width: w, background: barColor, height: `${40 + ((i * 13) % 60)}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
