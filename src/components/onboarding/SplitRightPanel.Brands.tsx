'use client'

import React from 'react'
import { Snap, DARK } from './SplitRightPanel.shared'

// ── R4 — Cream bg + rotating postmark + category watermark ────────────────────
function R4RightPanel({ snap }: { snap: Snap }) {
  const accent   = '#F5A800'
  const name     = snap.b_name
  const category = snap.r_categories

  return (
    <div style={{ width: '100%', height: '100%', background: DARK.bg, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 40 }}>
      {/* Noise grain */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: DARK.grain, opacity: 0.028, pointerEvents: 'none', zIndex: 0 }} />
      {/* Rotating postmark */}
      <div style={{ position: 'absolute', top: 40, right: 40, width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 12s linear infinite' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', fill: accent, opacity: 0.8 }}>
          <path id="R4circle" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
          <text fontFamily="JetBrains Mono" fontSize="7.5" fontWeight="700">
            <textPath href="#R4circle">
              WIMC BRAND PARTNER • WIMC BRAND PARTNER •
            </textPath>
          </text>
        </svg>
        <span className="material-symbols-outlined" style={{ position: 'absolute', fontSize: 36, color: accent }}>token</span>
      </div>

      {/* Category floating watermark */}
      <div style={{ position: 'absolute', top: '33%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', userSelect: 'none' }}>
        <h4 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: accent, lineHeight: 1, fontSize: 180, opacity: 0.10, margin: 0, whiteSpace: 'nowrap' }}>
          {category ? category.toUpperCase() : 'BRAND'}
        </h4>
      </div>

      {/* Identity stack at bottom */}
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 10 }}>
        <h5 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', lineHeight: 0.8, fontSize: 80, opacity: 0.10, margin: 0 }}>BRAND.</h5>
        <h5 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, lineHeight: 0.8, fontSize: 80, color: accent, opacity: 0.70, margin: 0 }}>
          [{name ? name.toUpperCase() : 'YOUR BRAND'}]
        </h5>
        <h5 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', lineHeight: 0.8, fontSize: 80, opacity: 0.10, margin: 0 }}>MEETS CULTURE.</h5>
        <div style={{ width: 192, height: 4, backgroundColor: accent, marginTop: 16 }} />
        <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 12, color: DARK.muted, marginTop: 16, letterSpacing: '0.20em', textTransform: 'uppercase' }}>
          www.wimc.world/brand/registration
        </p>
      </div>

      {/* Vertical amber badge */}
      <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 32, background: `${accent}CC`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderLeft: `1px solid ${DARK.border}` }}>
        <div style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: DARK.bg, letterSpacing: '0.40em', textTransform: 'uppercase', whiteSpace: 'nowrap', writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)' }}>
          BRAND PARTNER • WIMC • BRAND PARTNER • WIMC •
        </div>
      </div>

      {/* R4 watermark */}
      <div style={{ position: 'absolute', bottom: -20, right: 80, pointerEvents: 'none', opacity: 0.03 }}>
        <h6 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 240, margin: 0, lineHeight: 1 }}>R4</h6>
      </div>
    </div>
  )
}

// ── R5 — Ambient glow + editorial typography + floating brand card ─────────────
function R5RightPanel({ snap }: { snap: Snap }) {
  const accent    = '#F5A800'
  const navy      = '#1A2744'
  const name      = snap.b_name
  const city      = snap.b_city
  const catRaw    = snap.r_categories
  const catLabels: Record<string, string> = {
    retail: 'Retail', agency: 'Agency', startup: 'Startup', creative: 'Creative',
    fnb: 'F&B', fashion: 'Fashion', tech: 'Tech', media: 'Media',
    beauty: 'Beauty', education: 'Education', health: 'Health', other: 'Other',
  }
  const catIcons: Record<string, string> = {
    retail: 'storefront', agency: 'work', startup: 'rocket_launch', creative: 'brush',
    fnb: 'restaurant', fashion: 'checkroom', tech: 'devices', media: 'movie',
    beauty: 'spa', education: 'school', health: 'local_hospital', other: 'bolt',
  }
  const catLabel  = catLabels[catRaw] ?? catRaw
  const catIcon   = catIcons[catRaw]  ?? 'storefront'
  const email     = snap.r_contact.email     ?? ''
  const instagram = snap.r_contact.instagram ?? ''
  const bio       = snap.r_contact.bio       ?? ''

  return (
    <div style={{ width: '100%', height: '100%', background: DARK.bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 48px 48px 64px' }}>
      {/* Noise grain */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: DARK.grain, opacity: 0.028, pointerEvents: 'none', zIndex: 0 }} />
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', backgroundColor: 'rgba(245,168,0,0.06)' }} />

      {/* Amber vertical badge — LEFT side */}
      <div style={{
        position:      'absolute',
        left:          0,
        top:           '50%',
        transform:     'translateY(-50%)',
        writingMode:   'vertical-lr' as const,
        rotate:        '180deg',
        background:    `${accent}CC`,
        color:         DARK.bg,
        fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
        fontWeight:    700,
        fontSize:      12,
        letterSpacing: '0.30em',
        textTransform: 'uppercase' as const,
        padding:       '48px 8px',
        borderRight:   `1px solid ${DARK.border}`,
        borderTop:     `1px solid ${DARK.border}`,
        borderBottom:  `1px solid ${DARK.border}`,
        boxShadow:     `4px 0 0 0 rgba(0,0,0,0.5)`,
        pointerEvents: 'none',
      }}>
        VERIFY · LAUNCH · DISCOVER
      </div>

      {/* Editorial typography stack — bottom-left */}
      <div style={{ position: 'absolute', bottom: 48, left: 64, display: 'flex', flexDirection: 'column', pointerEvents: 'none', zIndex: 0 }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', lineHeight: 0.85, fontSize: 72, opacity: 0.10 }}>BRAND.</span>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, lineHeight: 0.85, fontSize: 72, color: accent, opacity: 0.38 }}>
          {name ? name.toUpperCase() : 'YOUR BRAND'}
        </span>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', lineHeight: 0.85, fontSize: 72, opacity: 0.10 }}>MEETS CULTURE.</span>
        <div style={{ marginTop: 16, width: 48, height: 4, background: '#5DD9D0', marginBottom: 8 }} />
        {instagram && (
          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 13, color: DARK.muted, letterSpacing: '0.06em' }}>@{instagram}</span>
        )}
        {email && (
          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 13, color: DARK.muted, letterSpacing: '0.06em' }}>{email}</span>
        )}
      </div>

      {/* Floating brand card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 380, transform: 'rotate(-2deg) scale(0.9)', transition: 'transform 500ms' }}>
        <div style={{ background: DARK.surface, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: `12px 12px 0px 0px rgba(0,0,0,0.80)`, border: `1px solid ${DARK.border}` }}>
          {/* Left amber bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: accent, borderRight: `1px solid ${DARK.border}`, zIndex: 10 }} />

          {/* Postmark */}
          <div style={{ position: 'absolute', top: 24, right: 24, opacity: 0.14, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="white" strokeDasharray="4 4" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="1" fill="none" />
              <text x="50" y="52" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="bold" fill="white">WIMC BRAND</text>
              <text x="50" y="65" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="white">VERIFIED</text>
            </svg>
          </div>

          <div style={{ padding: '28px 28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid rgba(255,255,255,0.10)`, paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-abril), 'Abril Fatface', serif", fontSize: 32, color: DARK.text, lineHeight: 1, margin: '0 0 4px', textTransform: 'uppercase' as const }}>
                  {name || 'BRAND NAME'}
                </h3>
                <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: DARK.muted, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                  {[catLabel, city].filter(Boolean).join(' · ') || 'YOUR CITY · YOUR CATEGORY'}
                </span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: accent, flexShrink: 0, marginLeft: 8 }}>{catIcon}</span>
            </div>

            {/* Content stub */}
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Left: ID + barcode */}
              <div style={{ width: '35%', borderRight: `1px solid rgba(255,255,255,0.10)`, paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: DARK.muted, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 2 }}>ID</div>
                  <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: DARK.text }}>#R-882</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: DARK.muted, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 2 }}>EST</div>
                  <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: DARK.text }}>2025</div>
                </div>
                <div style={{ marginTop: 'auto', fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 20, letterSpacing: '-0.22em', color: 'rgba(255,255,255,0.20)', lineHeight: 1 }}>|||||||||||||||||||</div>
              </div>
              {/* Right: bio + contact */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: accent, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 4 }}>DESCRIPTION</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: bio ? 'rgba(240,239,248,0.70)' : 'rgba(240,239,248,0.25)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                    {bio ? (bio.length > 100 ? bio.slice(0, 100) + '…' : bio) : 'Describe your brand vibe…'}
                  </p>
                </div>
                {(instagram || email) && (
                  <div>
                    <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: accent, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 4 }}>CONTACT</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {instagram && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, color: DARK.muted }}>alternate_email</span>
                          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, color: DARK.muted }}>{instagram}</span>
                        </div>
                      )}
                      {email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, color: DARK.muted }}>mail</span>
                          <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 11, color: DARK.muted }}>{email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* R5 watermark */}
      <div style={{ position: 'absolute', bottom: -20, right: -10, pointerEvents: 'none', opacity: 0.03 }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 240, lineHeight: 1 }}>R5</span>
      </div>
    </div>
  )
}

// ── Shared identity card used by R1, R2, R3 ───────────────────────────────────
function BrandIdentityCard({
  serialCode, name, fields, progress, progressLabel, logoUrl,
}: {
  serialCode: string
  name: string
  fields: Array<{ label: string; value: string; amber?: boolean; muted?: boolean; wide?: boolean; large?: boolean }>
  progress: number
  progressLabel: string
  logoUrl?: string
}) {
  const accent = '#F5A800'
  const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"

  return (
    <div style={{
      width: '100%', maxWidth: 520,
      background: DARK.surface,
      border: `1px solid ${DARK.border}`,
      boxShadow: `20px 20px 0px 0px rgba(0,0,0,0.70)`,
      display: 'flex', overflow: 'hidden',
    }}>
      {/* Left stub */}
      <div style={{ width: 56, flexShrink: 0, background: 'rgba(255,255,255,0.03)', borderRight: `1px dashed rgba(255,255,255,0.08)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: DARK.muted, writingMode: 'vertical-rl' as const, whiteSpace: 'nowrap', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          {serialCode}
        </span>
        <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.10)' }} />
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: DARK.muted }}>confirmation_number</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
            {logoUrl && (
              <div style={{
                width: 48, height: 48, flexShrink: 0,
                border: `2px solid ${accent}`,
                background: DARK.elevated,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Brand logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: DARK.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                MEMBERSHIP_V0{serialCode.slice(-1)}
              </p>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: DARK.text, lineHeight: 1, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
                {name || 'NAME_PENDING'}
              </h2>
            </div>
          </div>
          <div style={{ width: 40, height: 40, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: DARK.bg, fontWeight: 700 }}>
              {serialCode.slice(-2)}
            </span>
          </div>
        </div>

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {fields.map(f => (
            <div key={f.label} style={{ gridColumn: f.wide ? '1 / -1' : undefined }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: DARK.muted, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 4px' }}>{f.label}</p>
              <p style={{
                fontFamily: f.large ? "'Outfit', sans-serif" : MONO,
                fontWeight: 700,
                fontSize:   f.large ? 22 : 12,
                color:      f.amber ? accent : f.muted ? DARK.muted : DARK.text,
                margin:     0,
                textTransform: 'uppercase',
              }}>
                {f.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 'auto', borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DARK.muted, whiteSpace: 'nowrap' }}>{progressLabel}</span>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RightPanelShell({ children, screen }: { children: React.ReactNode; screen: string }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: DARK.bg,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 48px 60px',
    }}>
      {/* Noise grain */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: DARK.grain, opacity: 0.028, pointerEvents: 'none', zIndex: 0 }} />
      {children}
      {/* Bottom barcode strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 48px', borderTop: `1px solid rgba(255,255,255,0.07)`, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>ORIGIN: WIMC_BRAND_REGISTRY</span>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 20, letterSpacing: '-0.15em', color: 'rgba(255,255,255,0.12)' }}>{'||||| | || |||| | ||| |'}</span>
      </div>
      {/* Screen watermark */}
      <div style={{ position: 'absolute', bottom: 32, right: 80, fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 120, opacity: 0.03, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>{screen}</div>
    </div>
  )
}

// ── R1 — Brand Name + Logo Upload ─────────────────────────────────────────────
function R1RightPanel({ snap }: { snap: Snap }) {
  const accent = '#F5A800'
  const name   = snap.b_name

  return (
    <RightPanelShell screen="R1">
      {/* Rotating postmark */}
      <div style={{ position: 'absolute', top: 40, right: 48, width: 128, height: 128, animation: 'spin 14s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <path id="R1circle" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
          <text fontFamily="JetBrains Mono" fontSize="7" fontWeight="700" fill={accent}>
            <textPath href="#R1circle">BRAND REGISTRY • WIMC 2025 • BRAND REGISTRY •</textPath>
          </text>
        </svg>
        <span className="material-symbols-outlined" style={{ position: 'absolute', fontSize: 26, color: accent, opacity: 0.7 }}>badge</span>
      </div>

      {/* Corner decoratives */}
      <div style={{ position: 'absolute', top: 48, left: 48, fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 64, opacity: 0.04, userSelect: 'none', pointerEvents: 'none', lineHeight: 1 }}>ID_001</div>
      <div style={{ position: 'absolute', bottom: 64, right: 48, fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 64, opacity: 0.04, userSelect: 'none', pointerEvents: 'none', lineHeight: 1 }}>V_R1</div>

      {/* Identity card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        <BrandIdentityCard
          serialCode="SERIAL_R1"
          name={name}
          logoUrl={snap.b_logo_url || undefined}
          fields={[
            { label: 'ACCESS TIER', value: 'LEVEL_PHANTOM' },
            { label: 'STATUS',      value: 'REGISTERED', amber: true },
            { label: 'CATEGORY',   value: 'UNASSIGNED', muted: true },
            { label: 'LOCATION',   value: 'PENDING',    muted: true },
          ]}
          progress={20}
          progressLabel="20%_LOAD"
        />
      </div>

      {/* Amber vertical badge */}
      <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 28, background: `${accent}CC`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderLeft: `1px solid ${DARK.border}`, zIndex: 20 }}>
        <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: DARK.bg, letterSpacing: '0.35em', textTransform: 'uppercase', whiteSpace: 'nowrap', writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)' }}>
          BRAND PARTNER • WIMC • BRAND PARTNER • WIMC •
        </div>
      </div>
    </RightPanelShell>
  )
}

// ── R2 — Brand Location ────────────────────────────────────────────────────────
function R2RightPanel({ snap }: { snap: Snap }) {
  const name = snap.b_name
  const city = snap.b_city
  const MONO = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 48px 60px',
      background: 'linear-gradient(to bottom, #2a2a3a 0%, #07070A 100%)',
    }}>
      {/* Grid texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)', pointerEvents: 'none' }} />

      {/* Large location_on watermark */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none', overflow: 'hidden' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 480, color: 'rgba(255,255,255,0.03)', fontVariationSettings: "'FILL' 1" }}>location_on</span>
      </div>

      {/* Identity card centered, with city stamp overlaid on it */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 520, width: '100%', margin: '0 auto' }}>
        <BrandIdentityCard
          serialCode="SERIAL_R2"
          name={name}
          logoUrl={snap.b_logo_url || undefined}
          fields={[
            { label: 'BRAND',  value: name || '——' },
            { label: 'CITY',   value: city ? city.toUpperCase() : 'UPDATING...', amber: !city, muted: !city },
            { label: 'STATUS', value: 'REGISTERED', amber: true },
            { label: 'AESTHETIC', value: '——', muted: true },
          ]}
          progress={40}
          progressLabel="40%_LOAD"
        />

        {/* City postal stamp — sits on the card, bottom-right quadrant */}
        <div style={{
          position: 'absolute', bottom: 32, right: 32,
          transform: city ? 'rotate(-6deg) scale(1)' : 'rotate(-6deg) scale(0.5)',
          opacity: city ? 1 : 0,
          transition: 'all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 20,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 88, height: 88,
            borderRadius: '50%',
            background: '#E8705A',
            border: '3px solid rgba(255,255,255,0.25)',
            boxShadow: '0 0 0 3px #E8705A, 0 0 0 5px rgba(255,255,255,0.20)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: 8,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.6, textTransform: 'uppercase', whiteSpace: 'pre-line', fontWeight: 700 }}>
              {`${city ? city.toUpperCase() : ''}\nINDIA\nPOSTAGE`}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom barcode strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 48px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>ORIGIN: WIMC_BRAND_REGISTRY</span>
        <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '-0.15em', color: 'rgba(255,255,255,0.12)' }}>{'||||| | || |||| | ||| |'}</span>
      </div>

      {/* Screen watermark */}
      <div style={{ position: 'absolute', bottom: 32, right: 80, fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 120, opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>R2</div>

      {/* Amber vertical badge */}
      <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 28, background: 'rgba(245,168,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderLeft: '1px solid rgba(0,0,0,0.30)', zIndex: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: DARK.bg, letterSpacing: '0.35em', textTransform: 'uppercase', whiteSpace: 'nowrap', writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)' }}>
          BRAND PARTNER • WIMC • BRAND PARTNER • WIMC •
        </div>
      </div>
    </div>
  )
}

// ── R3 — Brand Aesthetic ───────────────────────────────────────────────────────
function R3RightPanel({ snap }: { snap: Snap }) {
  const accent    = '#F5A800'
  const name      = snap.b_name
  const city      = snap.b_city
  const aesthetic = snap.r_aesthetic
  const MONO      = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 48px 60px',
      background: 'linear-gradient(to bottom, #2a2a3a 0%, #07070A 100%)',
    }}>
      {/* Grid texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)', pointerEvents: 'none' }} />

      {/* Rotating postmark */}
      <div style={{ position: 'absolute', top: 40, right: 80, width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 12s linear infinite' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', fill: accent, opacity: 0.50 }}>
          <path id="R3circle" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
          <text fontFamily="JetBrains Mono" fontSize="7.5" fontWeight="700">
            <textPath href="#R3circle">WIMC BRAND PARTNER • WIMC BRAND PARTNER •</textPath>
          </text>
        </svg>
        <span className="material-symbols-outlined" style={{ position: 'absolute', fontSize: 28, color: accent, opacity: 0.70 }}>token</span>
      </div>

      {/* Aesthetic name watermark */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none', overflow: 'hidden' }}>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 900, fontSize: 140,
          color: accent, opacity: aesthetic ? 0.08 : 0.03,
          lineHeight: 1, textTransform: 'uppercase', whiteSpace: 'nowrap',
          transition: 'opacity 300ms',
        }}>
          {aesthetic ? aesthetic.toUpperCase() : 'AESTHETIC'}
        </span>
      </div>

      {/* IDENTITY_PASSPORT card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 520,
        background: DARK.surface,
        border: `1px solid ${DARK.border}`,
        boxShadow: '20px 20px 0px 0px rgba(0,0,0,0.70)',
        display: 'flex', overflow: 'hidden',
      }}>

        {/* Main content area */}
        <div style={{
          flex: 1, padding: '28px 28px 22px',
          display: 'flex', flexDirection: 'column',
          borderRight: `1px dashed rgba(255,255,255,0.08)`,
          minHeight: 360,
        }}>
          {/* Header: QR icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, background: DARK.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: DARK.amber, fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
            </div>
            <div>
              <p style={{ fontFamily: MONO, fontSize: 9, color: DARK.text, letterSpacing: '0.14em', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>IDENTITY_PASSPORT</p>
              <p style={{ fontFamily: MONO, fontSize: 8, color: DARK.muted, margin: 0, letterSpacing: '0.10em' }}>ISSUED_BY_WIMC_SYSTEMS</p>
            </div>
          </div>

          {/* Large brand name */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: name && name.length > 14 ? 'clamp(24px, 3vw, 38px)' : 'clamp(30px, 4.5vw, 52px)',
              color: DARK.text, lineHeight: 1,
              textTransform: 'uppercase', letterSpacing: '-0.03em',
              margin: 0, wordBreak: 'break-word',
            }}>
              {name || 'YOUR BRAND'}
            </h2>
          </div>

          {/* Bottom fields */}
          <div style={{ paddingTop: 14, borderTop: `1px solid rgba(255,255,255,0.08)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <div>
              <p style={{ fontFamily: MONO, fontSize: 9, color: DARK.muted, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 4px' }}>
                AESTHETIC_PREFERENCE
              </p>
              <p style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900, fontSize: 22,
                color: accent, margin: 0, lineHeight: 1,
                animation: aesthetic ? 'none' : 'pulse 2s ease-in-out infinite',
              }}>
                {aesthetic ? aesthetic.toUpperCase() : 'SELECTING...'}
              </p>
            </div>
            {city && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: MONO, fontSize: 9, color: DARK.muted, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 4px' }}>CITY</p>
                <p style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, color: DARK.text, margin: 0, letterSpacing: '0.06em' }}>
                  {city.toUpperCase()}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: DARK.muted, whiteSpace: 'nowrap' }}>60%_LOAD</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ width: '60%', height: '100%', background: accent }} />
            </div>
          </div>
        </div>

        {/* Right stub — dark surface */}
        <div style={{
          width: 80, flexShrink: 0,
          background: DARK.elevated,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 16px',
        }}>
          {/* Token badge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `${accent}18`, border: `1.5px solid ${accent}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: accent }}>token</span>
            </div>
            <div style={{ padding: '2px 6px', border: `1px solid ${accent}40` }}>
              <span style={{ fontFamily: MONO, fontSize: 7, color: accent, letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>VERIFIED</span>
            </div>
          </div>

          {/* Vertical auth key */}
          <span style={{
            fontFamily: MONO, fontSize: 8,
            color: 'rgba(255,255,255,0.20)',
            writingMode: 'vertical-rl' as const,
            textTransform: 'uppercase', letterSpacing: '0.35em',
            whiteSpace: 'nowrap',
          }}>
            AUTH_KEY_229_R3
          </span>

          {/* Mini barcode */}
          <div style={{ padding: 6, background: 'rgba(255,255,255,0.06)', width: 58 }}>
            <div style={{ display: 'flex', gap: 1, height: 26, alignItems: 'stretch' }}>
              {[2,1,3,1,2,1,4,1,2,3,1].map((w, i) => (
                <div key={i} style={{ width: w, background: 'rgba(255,255,255,0.45)' }} />
              ))}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '4px 0 0' }}>#BRND-R3</p>
          </div>
        </div>
      </div>

      {/* Decorative system tokens */}
      <div style={{ position: 'absolute', bottom: 52, right: 56, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: 8, height: 8, background: DARK.surface }} />
          <div style={{ width: 8, height: 8, background: accent }} />
          <div style={{ width: 8, height: 8, background: '#E26B56' }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.20)', textTransform: 'uppercase' }}>v3.0.1_R_SYSTEM</span>
      </div>

      {/* Bottom barcode strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 48px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>ORIGIN: WIMC_BRAND_REGISTRY</span>
        <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '-0.15em', color: 'rgba(255,255,255,0.12)' }}>{'||||| | || |||| | ||| |'}</span>
      </div>

      {/* Screen watermark */}
      <div style={{ position: 'absolute', bottom: 32, right: 80, fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: 'white', fontSize: 120, opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>R3</div>

      {/* Amber vertical badge */}
      <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 28, background: 'rgba(245,168,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderLeft: '1px solid rgba(0,0,0,0.30)', zIndex: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: DARK.bg, letterSpacing: '0.35em', textTransform: 'uppercase', whiteSpace: 'nowrap', writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)' }}>
          BRAND PARTNER • WIMC • BRAND PARTNER • WIMC •
        </div>
      </div>
    </div>
  )
}

export { R1RightPanel, R2RightPanel, R3RightPanel, R4RightPanel, R5RightPanel }
