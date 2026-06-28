'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  url: string
  variant?: 'dark' | 'light'
}

export default function DashPageLink({ url, variant = 'dark' }: Props) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const isDark = variant === 'dark'

  const displayUrl = url.replace(/^https?:\/\//, '')
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&margin=10`

  async function copy() {
    try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ url, title: 'My WIMC Page' }) } catch { /* ignore */ }
    } else {
      copy()
    }
  }

  const surface   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,39,68,0.04)'
  const border    = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(26,39,68,0.10)'
  const primary   = isDark ? '#F0EFF8' : '#1A2744'
  const muted     = isDark ? 'rgba(240,239,248,0.40)' : 'rgba(26,39,68,0.40)'
  const btnBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,39,68,0.07)'
  const accent    = '#F5A800'

  const btn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 11, fontFamily: 'var(--font-jetbrains-mono), monospace',
    fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap',
    background: active ? accent : btnBg,
    color: active ? '#07070A' : muted,
    transition: 'background 140ms ease, color 140ms ease',
  })

  return (
    <div style={{ padding: '10px 24px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: surface, border: `1px solid ${border}`,
        borderRadius: showQR ? '8px 8px 0 0' : 8,
        padding: '8px 12px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: accent, flexShrink: 0 }}>link</span>
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, fontSize: 12, fontFamily: 'var(--font-jetbrains-mono), monospace',
            color: primary, textDecoration: 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {displayUrl}
        </Link>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={copy} style={btn(copied)}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={share} style={btn(false)}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>ios_share</span>
            Share
          </button>
          <button onClick={() => setShowQR(v => !v)} style={btn(showQR)}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>qr_code</span>
            QR
          </button>
        </div>
      </div>

      {showQR && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: surface, border: `1px solid ${border}`, borderTop: 'none',
          borderRadius: '0 0 8px 8px', padding: '14px 16px',
        }}>
          <div style={{ width: 80, height: 80, borderRadius: 6, overflow: 'hidden', background: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR code for your page" width={80} height={80} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono), monospace', color: primary, marginBottom: 4 }}>
              Scan to open your page
            </div>
            <div style={{ fontSize: 10, color: muted, fontFamily: 'var(--font-jetbrains-mono), monospace', lineHeight: 1.6 }}>
              {displayUrl}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
