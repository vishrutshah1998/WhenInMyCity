import React from 'react'

export function BauhausTheme() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Background */}
        <rect width="400" height="400" fill="#FFF8EE" />

        {/* Large pink circle — top left quadrant */}
        <circle cx="105" cy="95" r="88" fill="#F4A7B9" />

        {/* Teal rectangle — top right */}
        <rect x="220" y="30" width="155" height="185" fill="#2D9CDB" />

        {/* Golden yellow circle — mid left */}
        <circle cx="58" cy="270" r="72" fill="#F2C94C" />

        {/* Deep purple semicircle (top half) — center */}
        <path d="M180 190 A80 80 0 0 1 340 190 Z" fill="#6B4EFF" />

        {/* Coral red diamond — lower center */}
        <rect x="185" y="255" width="74" height="74" fill="#EB5757" transform="rotate(45 222 292)" />

        {/* Sage green tall rect — far right */}
        <rect x="340" y="230" width="60" height="130" fill="#27AE60" />

        {/* Peach small circle — lower center-left */}
        <circle cx="150" cy="355" r="36" fill="#FFD6C4" />

        {/* Dark outline circle accent */}
        <circle cx="310" cy="360" r="28" fill="none" stroke="#222" strokeWidth="4" />

        {/* Horizontal rule lines */}
        <line x1="0" y1="195" x2="180" y2="195" stroke="#222" strokeWidth="3" />
        <line x1="220" y1="222" x2="400" y2="222" stroke="#222" strokeWidth="3" />

        {/* Small accent dots */}
        <circle cx="200" cy="30"  r="8"  fill="#EB5757" />
        <circle cx="220" cy="360" r="6"  fill="#6B4EFF" />
        <circle cx="385" cy="180" r="10" fill="#F2C94C" />
        <circle cx="10"  cy="160" r="7"  fill="#2D9CDB" />

        {/* Triangle accent — bottom left */}
        <polygon points="0,400 70,270 140,400" fill="#F4A7B9" opacity="0.7" />
      </svg>
    </div>
  )
}

export const BauhausSwatch: React.CSSProperties = {
  background: 'linear-gradient(to right, #F4A7B9 25%, #2D9CDB 25% 50%, #F2C94C 50% 75%, #6B4EFF 75%)',
  borderRadius: 4,
}
