'use client'

import Link from 'next/link'
import Image from 'next/image'

interface RoleSelectFaceProps {
  eyebrow: string
  price: string
  titleLines: [string, string]
  watermarkNum: string
  accent: string
  bodyText: string
  features: string[]
  ctaLabel: string
  ctaHref: string
  ctaBg: string
  ctaColor: string
  chipsLabel: string
  chips: { emoji: string; label: string }[]
}

export function RoleSelectFace(props: RoleSelectFaceProps) {
  const { eyebrow, price, titleLines, watermarkNum, accent, bodyText, features, ctaLabel, ctaHref, ctaBg, ctaColor, chipsLabel, chips } = props
  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', padding: '18px 18px 20px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ maxWidth: 240 }}>
        <h2 className="font-vib-stamp" style={{ fontSize: 27, lineHeight: 1.0, letterSpacing: '-0.01em', color: '#201A12' }}>Choose<br />your role.</h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#58503F', marginTop: 9 }}>
          Two paths, one platform. Whether you make the culture or make the space — WIMC has a home for you.
        </p>
      </div>

      <div style={{ marginTop: 14, border: `1px solid ${accent}59`, paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 13px 3px', position: 'relative', overflow: 'hidden' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.5)' }}>{eyebrow}</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 6, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(32,26,18,0.4)' }}>India</div>
            <div className="font-vib-stamp" style={{ fontSize: 17, color: accent }}>{price}</div>
          </div>
        </div>
        <div style={{ fontSize: 25, lineHeight: 0.92, padding: '5px 13px 10px', color: '#201A12', position: 'relative' }}>
          <span className="font-vib-stamp">{titleLines[0]}<br />{titleLines[1]}</span>
          <span aria-hidden className="font-vib-stamp" style={{ position: 'absolute', right: -4, bottom: -14, fontSize: 68, lineHeight: 1, letterSpacing: '-0.05em', color: `${accent}14`, pointerEvents: 'none' }}>{watermarkNum}</span>
        </div>
        <div style={{ padding: '9px 13px 0' }}>
          <p style={{ fontSize: 11, lineHeight: 1.45, color: '#58503F' }}>{bodyText}</p>
          <ul style={{ listStyle: 'none', margin: '8px 0 10px', display: 'flex', flexDirection: 'column', gap: 5, padding: 0 }}>
            {features.map((f) => (
              <li key={f} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 10.5, color: '#58503F' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: accent }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ margin: '0 13px' }}>
          <Link href={ctaHref} className="inline-flex items-center gap-2" style={{ padding: '9px 15px', fontSize: 12, fontWeight: 700, background: ctaBg, color: ctaColor, textDecoration: 'none' }}>
            {ctaLabel} <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
          </Link>
        </div>
        <div style={{ margin: '12px 13px 0' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.45)', marginBottom: 6 }}>{chipsLabel}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((c) => (
              <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, padding: '5px 9px', border: '1px solid rgba(32,26,18,0.14)', background: 'rgba(32,26,18,0.02)', color: '#58503F' }}>
                <span style={{ fontSize: 12 }}>{c.emoji}</span>{c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Image src="/logo-stamp.png" alt="" width={64} height={64} priority style={{ width: 64, height: 64, opacity: 0.5 }} />
      </div>
    </div>
  )
}
