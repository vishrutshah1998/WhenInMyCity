'use client'

const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const OUTFIT = "'Outfit', sans-serif"

// ─── Blinking cursor ───────────────────────────────────────────────────────────
export function BlinkingCursor({ accent }: { accent: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 2, height: 16,
      verticalAlign: 'middle', marginLeft: 4,
      backgroundColor: accent, animation: 'blink 1s step-end infinite',
    }} />
  )
}

// ─── Creator Event Ticket ──────────────────────────────────────────────────────
// Shown on C3–C7: looks like a physical Indian concert/event ticket
// Top header bar → Body with artist name + info grid → Tear perforation → Stub

export function CreatorEventTicket({
  name,
  category,
  city,
  accent = '#E8705A',
}: {
  name?: string
  category?: string
  city?: string
  accent?: string
}) {
  const BARCODE = [2,1,3,1,2,1,1,2,3,1,2,1,2,1,3,1,2,1]

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      background:   '#FAF7F0',
      color:        '#1A2744',
      overflow:     'hidden',
      marginBottom: 28,
      flexShrink:   0,
      boxShadow:    `8px 8px 0px 0px ${accent}`,
      border:       '1px solid rgba(0,0,0,0.18)',
    }}>
      {/* Top header bar */}
      <div style={{
        height:          32,
        background:      accent,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 16px',
      }}>
        <span style={{
          fontFamily:    MONO,
          fontSize:      9,
          color:         '#FAF7F0',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight:    700,
        }}>
          WIMC PRESENTS
        </span>
        <span style={{ fontSize: 13, color: '#FAF7F0', lineHeight: 1 }}>★</span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 20px 12px' }}>
        {/* Artist name */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{
              fontFamily:    OUTFIT,
              fontWeight:    900,
              fontSize:      22,
              color:         '#1A2744',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              lineHeight:    1,
              margin:        0,
            }}>
              {name || ''}
            </p>
            {!name && <BlinkingCursor accent={accent} />}
          </div>
        </div>

        {/* Info grid: GENRE / CITY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 2px' }}>
              GENRE
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontFamily:    BARLOW,
                fontWeight:    700,
                fontSize:      13,
                textTransform: 'uppercase',
                color:         category ? accent : 'rgba(26,39,68,0.25)',
              }}>
                {category ? category.slice(0, 9).toUpperCase() : '———'}
              </span>
              {!category && name && <BlinkingCursor accent={accent} />}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 2px' }}>
              CITY
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontFamily:    BARLOW,
                fontWeight:    700,
                fontSize:      13,
                textTransform: 'uppercase',
                color:         city ? '#1A2744' : 'rgba(26,39,68,0.25)',
              }}>
                {city ? city.toUpperCase() : '———'}
              </span>
              {!city && category && <BlinkingCursor accent={accent} />}
            </div>
          </div>
        </div>
      </div>

      {/* Tear perforation line with side notches */}
      <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position:   'absolute',
          left:       -8,
          width:      16,
          height:     16,
          background: '#1A2744',
          borderRadius: 999,
          zIndex:     10,
        }} />
        <div style={{
          flex:       1,
          height:     1,
          margin:     '0 8px',
          background: 'repeating-linear-gradient(90deg, rgba(26,39,68,0.35) 0px, rgba(26,39,68,0.35) 4px, transparent 4px, transparent 8px)',
        }} />
        <div style={{
          position:   'absolute',
          right:      -8,
          width:      16,
          height:     16,
          background: '#1A2744',
          borderRadius: 999,
          zIndex:     10,
        }} />
      </div>

      {/* Stub */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '10px 20px',
        background:      `${accent}0D`,
      }}>
        <div>
          <div style={{
            fontFamily:    OUTFIT,
            fontWeight:    900,
            fontSize:      10,
            color:         accent,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            ★ ADMIT ONE ★
          </div>
          <div style={{
            fontFamily: MONO,
            fontSize:   8,
            color:      'rgba(26,39,68,0.38)',
            marginTop:  2,
          }}>
            SERIAL #WIMC-C-2025
          </div>
        </div>
        {/* Barcode */}
        <div style={{
          display:    'flex',
          gap:        1,
          alignItems: 'flex-end',
          height:     22,
          background: 'rgba(26,39,68,0.05)',
          padding:    3,
        }}>
          {BARCODE.map((w, i) => (
            <div key={i} style={{ width: w * 1.5, height: '100%', backgroundColor: 'rgba(26,39,68,0.45)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Legacy: Creator Boarding Pass ────────────────────────────────────────────
// Kept for C2 right-panel (builds its own card inline) — not used elsewhere now

export function CreatorBoardingPass({
  name,
  category,
  city,
  accent = '#E8705A',
}: {
  name?: string
  category?: string
  city?: string
  accent?: string
}) {
  const isAmber = accent === '#F5A800'

  return (
    <div style={{
      position:   'relative',
      width:      '100%',
      background: '#FAF7F0',
      color:      '#1A2744',
      overflow:   'hidden',
      marginBottom: 28,
      flexShrink: 0,
      boxShadow:  '8px 8px 0px 0px #000000',
      border:     '1px solid rgba(0,0,0,0.15)',
      clipPath:   isAmber ? 'polygon(0 10px, 10px 0, 100% 0, 100% 100%, 0 100%)' : undefined,
    }}>
      {isAmber && (
        <div style={{ height: 8, width: '100%', backgroundColor: accent }} />
      )}

      {!isAmber && (
        <>
          <div style={{
            position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 32, background: '#1A2744', borderRadius: 999,
            border: '1px solid black', zIndex: 10,
          }} />
          <div style={{
            position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 32, background: '#1A2744', borderRadius: 999,
            border: '1px solid black', zIndex: 10,
          }} />
        </>
      )}

      {!isAmber && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          backgroundColor: accent,
        }} />
      )}

      <div style={{ padding: 20, paddingLeft: isAmber ? 20 : 28 }}>
        {isAmber ? (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              borderBottom: '2px dashed #45464d', paddingBottom: 14, marginBottom: 14,
            }}>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 10, color: '#8f9098', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
                  PASSENGER / CREATOR
                </p>
                <p style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 20, color: '#1A2744', textTransform: 'uppercase', lineHeight: 1, margin: 0 }}>
                  {name?.toUpperCase() || ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: MONO, fontSize: 10, color: '#8f9098', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
                  CLASS
                </p>
                {category ? (
                  <span style={{
                    fontFamily: BARLOW, fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                    padding: '2px 8px', color: accent, backgroundColor: `${accent}1A`, display: 'inline-block',
                  }}>
                    {category.slice(0, 8).toUpperCase()}
                  </span>
                ) : (
                  <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 12, color: 'rgba(143,144,152,0.50)', textTransform: 'uppercase' }}>
                    ———
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 10, color: '#8f9098', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
                  ROLE
                </p>
                <p style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 18, color: '#1A2744', textTransform: 'uppercase', margin: 0 }}>
                  CREATOR
                </p>
              </div>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 10, color: '#8f9098', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>
                  TO / CITY
                </p>
                {city ? (
                  <p style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: accent, margin: 0 }}>
                    {city.toUpperCase()}
                  </p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: 'rgba(143,144,152,0.50)', marginRight: 4 }}>
                      SELECT_
                    </span>
                    <BlinkingCursor accent={accent} />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.50)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                SERIAL #WIMC-C-01
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(26,39,68,0.20)' }}>
                qr_code_2
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>NAME</p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                    {name || ''}
                  </span>
                  {!name && <BlinkingCursor accent={accent} />}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>CITY</p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: city ? '#1A2744' : 'rgba(26,39,68,0.30)' }}>
                    {city || '---'}
                  </span>
                  {!city && name && <BlinkingCursor accent={accent} />}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>ROLE</p>
                <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                  CREATOR
                </span>
              </div>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>CLASS</p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: category ? accent : 'rgba(26,39,68,0.30)' }}>
                    {category ? category.slice(0, 6).toUpperCase() : '---'}
                  </span>
                  {!category && name && <BlinkingCursor accent={accent} />}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '2px dashed rgba(26,39,68,0.20)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', lineHeight: 1.4 }}>
                GATE C01 // ONBOARDING<br />BOARDING TIME: IMMEDIATE
              </div>
              <div style={{ height: 28, display: 'flex', gap: 2, alignItems: 'flex-end', background: 'rgba(26,39,68,0.05)', padding: 4 }}>
                {[1,2,1,3,1,2,1,1,3,1,2,1,2,1].map((w, i) => (
                  <div key={i} style={{ width: w * 2, height: '100%', backgroundColor: 'rgba(26,39,68,0.40)' }} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Explorer Pass ─────────────────────────────────────────────────────────────
// Used on E2–E6 left panels — boarding pass aesthetic (airport style)

export function ExplorerPass({
  name,
  city,
  scene,
}: {
  name?: string
  city?: string
  scene?: string
}) {
  const accent = '#9B8FFF'

  return (
    <div style={{
      position:   'relative',
      width:      '100%',
      background: '#FAF7F0',
      color:      '#1A2744',
      display:    'flex',
      overflow:   'hidden',
      marginBottom: 28,
      flexShrink: 0,
      boxShadow:  '8px 8px 0px 0px #000000',
      border:     '1px solid black',
    }}>
      <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 16, height: 32, background: '#1A2744', borderRadius: 999, border: '1px solid black', zIndex: 10 }} />
      <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 16, height: 32, background: '#1A2744', borderRadius: 999, border: '1px solid black', zIndex: 10 }} />

      {/* Left accent bar */}
      <div style={{ width: 4, flexShrink: 0, alignSelf: 'stretch', backgroundColor: accent }} />

      <div style={{ flexGrow: 1, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.50)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            SERIAL #WIMC-E-01
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(26,39,68,0.20)' }}>explore</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>NAME</p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                {name || ''}
              </span>
              {!name && <BlinkingCursor accent={accent} />}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>CITY</p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: city ? '#1A2744' : 'rgba(26,39,68,0.30)' }}>
                {city || '---'}
              </span>
              {!city && name && <BlinkingCursor accent={accent} />}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>ROLE</p>
            <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>EXPLORER</span>
          </div>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', textTransform: 'uppercase', margin: '0 0 3px' }}>SCENE</p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: scene ? accent : 'rgba(26,39,68,0.30)' }}>
                {scene ? scene.slice(0, 8).toUpperCase() : '---'}
              </span>
              {!scene && city && <BlinkingCursor accent={accent} />}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '2px dashed rgba(26,39,68,0.20)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.40)', lineHeight: 1.4 }}>
            GATE E01 // EXPLORER PASS<br />VALID: ALL CITIES
          </div>
          <div style={{ height: 28, display: 'flex', gap: 2, alignItems: 'flex-end', background: 'rgba(26,39,68,0.05)', padding: 4 }}>
            {[1,2,1,3,1,2,1,1,3,1,2,1].map((w, i) => (
              <div key={i} style={{ width: w * 2, height: '100%', backgroundColor: 'rgba(26,39,68,0.40)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Venue Notice Poster ───────────────────────────────────────────────────────
// Used on V4–V7: looks like a notice board poster pinned to a corkboard
// Slightly tilted, thumbtack at top, cream paper, teal accent

export function VenueNoticePoster({
  name,
  city,
  type,
  capacity,
  accent = '#5DD9D0',
}: {
  name?: string
  city?: string
  type?: string
  capacity?: number
  accent?: string
}) {
  const VENUE_EMOJIS: Record<string, string> = {
    cafe: '☕', coworking: '🏠', studio: '🎙️', rooftop: '🌿', gallery: '🏛️',
    theatre: '🎭', event_hall: '🎪', bar: '🍺', outdoor: '🌳', library: '📚',
    sports: '⚽', hotel_hall: '🏨', garden: '🌸', workshop: '🔧',
  }
  const venueEmoji = type ? (VENUE_EMOJIS[type] ?? '🏛️') : '🏛️'

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      marginBottom: 28,
      flexShrink:   0,
      transform:    'rotate(-1.5deg)',
    }}>
      {/* Thumbtack */}
      <div style={{
        position:     'absolute',
        top:          -6,
        left:         '50%',
        transform:    'translateX(-50%)',
        width:        12,
        height:       12,
        borderRadius: '50%',
        background:   '#3A3A3A',
        boxShadow:    '0 2px 5px rgba(0,0,0,0.50)',
        zIndex:       10,
        border:       '1px solid #222',
      }} />

      <div style={{
        background: '#FAF7F0',
        border:     '1px solid rgba(26,39,68,0.18)',
        boxShadow:  `6px 6px 0px 0px ${accent}`,
        overflow:   'hidden',
      }}>
        {/* Header bar */}
        <div style={{
          background:      accent,
          padding:         '8px 16px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
        }}>
          <span style={{
            fontFamily:    MONO,
            fontSize:      9,
            color:         '#1A2744',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight:    700,
          }}>
            SPACE FOR HIRE
          </span>
          <span style={{ fontSize: 13, lineHeight: 1 }}>{venueEmoji}</span>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {/* Venue name */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{
                fontFamily:    OUTFIT,
                fontWeight:    900,
                fontSize:      20,
                color:         '#1A2744',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                lineHeight:    1,
                margin:        0,
              }}>
                {name || 'YOUR SPACE'}
              </p>
              {!name && (
                <span style={{ display: 'inline-block', width: 8, height: 22, backgroundColor: accent, animation: 'blink 1s step-end infinite' }} />
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {[
              { emoji: '📍', value: city || '———', dim: !city },
              { emoji: '🏛️', value: type ? type.replace(/_/g, ' ').toUpperCase() : '———', dim: !type },
              ...(capacity ? [{ emoji: '👥', value: `UP TO ${capacity} PEOPLE`, dim: false }] : []),
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{row.emoji}</span>
                <span style={{
                  fontFamily:    MONO,
                  fontSize:      10,
                  color:         row.dim ? 'rgba(26,39,68,0.28)' : '#1A2744',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(26,39,68,0.12)', marginBottom: 10 }} />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily:    MONO,
              fontSize:      8,
              color:         'rgba(26,39,68,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              BOOK VIA WIMC
            </span>
            <div style={{
              background:    accent,
              padding:       '2px 8px',
              fontFamily:    MONO,
              fontSize:      8,
              color:         '#1A2744',
              fontWeight:    700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}>
              CULTURE PARTNER
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Brand Notice Ad ──────────────────────────────────────────────────────────
// Used on R1–R4: looks like a community notice board advertisement
// Slightly tilted, thumbtack, and India-specific tear strips at the bottom

export function BrandNoticeAd({
  name,
  city,
  category,
  accent = '#F5A800',
}: {
  name?: string
  city?: string
  category?: string
  accent?: string
}) {
  const TEAR_COUNT = 8

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      marginBottom: 28,
      flexShrink:   0,
      transform:    'rotate(1.5deg)',
    }}>
      {/* Thumbtack */}
      <div style={{
        position:     'absolute',
        top:          -6,
        left:         '50%',
        transform:    'translateX(-50%)',
        width:        12,
        height:       12,
        borderRadius: '50%',
        background:   '#3A3A3A',
        boxShadow:    '0 2px 5px rgba(0,0,0,0.50)',
        zIndex:       10,
        border:       '1px solid #222',
      }} />

      <div style={{
        background: '#FAF7F0',
        border:     '1px solid rgba(26,39,68,0.20)',
        boxShadow:  `8px 8px 0px 0px ${accent}`,
        overflow:   'hidden',
      }}>
        {/* Brand header box */}
        <div style={{ padding: '14px 16px 10px', borderBottom: `3px solid ${accent}` }}>
          <div style={{
            border:        `2px solid ${accent}`,
            padding:       '8px 12px',
            display:       'inline-block',
            marginBottom:  8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{
                fontFamily:    OUTFIT,
                fontWeight:    900,
                fontSize:      18,
                color:         '#1A2744',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                lineHeight:    1,
                margin:        0,
              }}>
                {name || 'BRAND NAME'}
              </p>
              {!name && (
                <span style={{ display: 'inline-block', width: 8, height: 20, backgroundColor: accent, animation: 'blink 1s step-end infinite' }} />
              )}
            </div>
            {category && (
              <div style={{
                fontFamily:    MONO,
                fontSize:      8,
                color:         accent,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginTop:     3,
                fontWeight:    700,
              }}>
                {category.toUpperCase()}
              </div>
            )}
          </div>

          <p style={{
            fontFamily: MONO,
            fontSize:   10,
            color:      'rgba(26,39,68,0.55)',
            lineHeight: 1.5,
            margin:     0,
          }}>
            Connecting with creators &amp;<br />
            culture enthusiasts
            {city ? (
              <> in <span style={{ color: accent, fontWeight: 700 }}>{city.toUpperCase()}</span></>
            ) : (
              <> across <span style={{ color: 'rgba(26,39,68,0.30)' }}>YOUR CITY</span></>
            )}
          </p>
        </div>

        {/* Contact row */}
        <div style={{ padding: '8px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily:    MONO,
            fontSize:      8,
            color:         'rgba(26,39,68,0.40)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
          }}>
            FIND US ON WIMC
          </span>
          <span style={{
            fontFamily: MONO,
            fontSize:   8,
            color:      accent,
            letterSpacing: '0.05em',
          }}>
            wimc.in/...
          </span>
        </div>

        {/* Tear strips — India-style notice board ad */}
        <div style={{
          borderTop: `1px dashed rgba(26,39,68,0.40)`,
          display:   'flex',
          height:    38,
          overflow:  'hidden',
        }}>
          {Array.from({ length: TEAR_COUNT }, (_, i) => (
            <div key={i} style={{
              flex:        1,
              borderRight: i < TEAR_COUNT - 1 ? `1px dashed rgba(26,39,68,0.28)` : 'none',
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              overflow:    'hidden',
              background:  i % 2 === 0 ? `${accent}08` : 'transparent',
            }}>
              <span style={{
                fontFamily:   MONO,
                fontSize:     6,
                color:        accent,
                textTransform:'uppercase',
                letterSpacing:'0.04em',
                writingMode:  'vertical-rl',
                transform:    'rotate(180deg)',
                whiteSpace:   'nowrap',
                fontWeight:   700,
                lineHeight:   1,
              }}>
                {name ? name.slice(0, 5).toUpperCase() : 'WIMC'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Business Card Artifact ────────────────────────────────────────────────────
// Used on B2, B3 (shared steps before venue/brand fork) — kept as-is

export function BusinessCardArtifact({
  name,
  city,
  type,
  accent = '#5DD9D0',
}: {
  name?: string
  city?: string
  type?: string
  accent?: string
}) {
  return (
    <div className="ob-biz-card" style={{
      position:   'relative',
      width:      '100%',
      background: '#FAF7F0',
      display:    'flex',
      overflow:   'hidden',
      marginBottom: 28,
      flexShrink: 0,
      boxShadow:  `8px 8px 0px 0px ${accent}`,
      border:     '1px solid #1A2744',
      transform:  'rotate(-0.5deg)',
    }}>
      <div style={{
        position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
        width: 16, height: 16, background: '#1A2744', borderRadius: 999, zIndex: 10,
      }} />

      {/* Left content */}
      <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '2px dashed rgba(26,39,68,0.20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.50)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Business Pass
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.50)', letterSpacing: '0.05em' }}>
            WIMC·B·01
          </span>
        </div>

        <div style={{ margin: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <h3 style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 18, color: '#1A2744', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1, margin: 0 }}>
              {name || 'BUSINESS NAME'}
            </h3>
            {!name && (
              <span style={{ display: 'inline-block', width: 8, height: 22, backgroundColor: accent, animation: 'blink 1s step-end infinite' }} />
            )}
          </div>
          <p style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(26,39,68,0.60)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '4px 0 0' }}>
            CITY: <span style={{ color: accent }}>{city || '———'}</span>
            {' | '}TYPE: <span style={{ color: accent }}>{type || '———'}</span>
          </p>
        </div>

        <div style={{ paddingTop: 10, borderTop: '1px solid rgba(26,39,68,0.10)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accent}33` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: accent }}>qr_code_2</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(26,39,68,0.40)', lineHeight: 1.3 }}>
            VERIFICATION STATUS<br />
            <span style={{ color: 'rgba(26,39,68,0.70)', fontWeight: 700, textTransform: 'uppercase' }}>
              {name ? 'PENDING_APPROVAL' : 'AWAITING_INPUT'}
            </span>
          </div>
        </div>
      </div>

      {/* Stub */}
      <div style={{ width: 64, padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${accent}0D` }}>
        <div style={{ fontFamily: BARLOW, fontSize: 7, color: 'rgba(26,39,68,0.50)', textTransform: 'uppercase', letterSpacing: '0.10em', writingMode: 'vertical-rl' }}>
          WHEN IN MY CITY · CULTURE PARTNER
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.6, width: '100%' }}>
          <div style={{ height: 26, width: '100%', display: 'flex', gap: 1, padding: 3, backgroundColor: '#1A2744' }}>
            {[1,2,1,3,1,2,4,1,2].map((w, i) => (
              <div key={i} style={{ backgroundColor: 'white', height: '100%', width: w }} />
            ))}
          </div>
          <span style={{ fontFamily: MONO, fontSize: 6, color: '#1A2744' }}>2025-WIMC-B</span>
        </div>
      </div>
    </div>
  )
}
