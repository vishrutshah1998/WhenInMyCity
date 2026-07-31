'use client'

import Link from 'next/link'
import Image from 'next/image'
import { EVENT_TAGS, CITIES } from './data'

export function EntryPassFace() {
  const marquee = [...CITIES, ...CITIES]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Postal strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 15px 5px 20px', background: 'rgba(32,26,18,0.03)', borderBottom: '1px solid rgba(32,26,18,0.05)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 6.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.4)' }}>FROM: WIMC · TO: TIER-2 INDIA</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 6.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(32,26,18,0.4)' }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF6B35', animation: 'wimc-bloom-pulse 2s ease-in-out infinite' }} />
          POSTING NOW
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 18px 4px 20px', position: 'relative' }}>
        <h1 className="font-vib-stamp" style={{ fontSize: 30, lineHeight: 1.0, letterSpacing: '-0.01em', color: '#201A12' }}>
          Culture lives<br />
          <span className="font-vib-script" style={{ fontWeight: 700, color: '#FF6B35' }}>offline.</span><br />
          <span style={{ color: '#8A8070', fontSize: 25 }}>We keep it</span><br />
          connected.
        </h1>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#58503F', marginTop: 9 }}>
          WIMC is where India&apos;s Tier-2 cities build their offline culture — creators who perform, Venues that host, communities who show up.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-start', marginTop: 12 }}>
          <Link href="/signin?next=/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 15px', color: '#fff', background: '#FF6B35', textDecoration: 'none' }}>
            Start for free →
          </Link>
          <Link href="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(32,26,18,0.22)', color: '#58503F', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em', padding: '9px 15px', textDecoration: 'none' }}>
            BROWSE EVENTS →
          </Link>
          <Link href="/vishrut_797" style={{ fontFamily: 'monospace', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8070', textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            → See an example page
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12, position: 'relative', zIndex: 2 }}>
          {EVENT_TAGS.map((tag) => (
            <span key={tag.label} style={{ fontFamily: 'monospace', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '4px 7px', border: `1px solid ${tag.color}`, color: tag.color }}>
              {tag.label}
            </span>
          ))}
        </div>

        {/* Watermark stamp — bleeds off bottom-right */}
        <div aria-hidden style={{ position: 'absolute', right: -46, bottom: -14, width: 220, height: 260, opacity: 0.42, pointerEvents: 'none' }}>
          <Image src="/logo-stamp.png" alt="" width={220} height={220} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
        </div>
      </div>

      {/* Cities marquee */}
      <div style={{ overflow: 'hidden', margin: '4px 0 0', padding: '6px 0', background: '#F3E8D6', flexShrink: 0 }}>
        <div className="marquee-normal flex items-center whitespace-nowrap" style={{ width: 'max-content' }}>
          {marquee.map((city, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 10px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A8070', whiteSpace: 'nowrap' }}>{city}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,107,53,0.5)' }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
